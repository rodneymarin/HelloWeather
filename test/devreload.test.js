import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { createApp } from '../src/app.js'
import { createDevReload } from '../src/devreload.js'

const BOOT_KEY = 'boot:test:key'

function fakeClient() {
  return {
    geocode: async () => [],
    reverseGeocode: async () => [],
    getWeather: async () => { throw new Error('unused') },
  }
}

function start(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      resolve({ server, baseUrl: `http://127.0.0.1:${server.address().port}` })
    })
  })
}

function trigger() {
  let resolve
  const promise = new Promise((r) => { resolve = r })
  return { promise, resolve: () => resolve() }
}

function makeHtml(extra = '') {
  return `<!doctype html><html><head><title>HelloWeather</title></head><body>${extra}<script>document.body.dataset.booted = true</script></body></html>`
}

async function tmpPublicDir() {
  return mkdtemp(path.join(os.tmpdir(), 'hw-public-'))
}

async function withDevServer(t, { bootKey = BOOT_KEY, publicDir = null } = {}) {
  const dir = publicDir || (await tmpPublicDir())
  await writeFile(path.join(dir, 'index.html'), makeHtml(), 'utf8')
  const devReload = createDevReload({ publicDir: dir, bootKey })
  const app = createApp({ client: fakeClient(), config: { port: 0, defaultLocation: 'Maracaibo' }, middleware: [devReload.router], publicDir: dir })
  const s = await start(app)
  t.after(() => new Promise((resolve) => {
    try {
      s.server.closeAllConnections()
    } catch {
      // not available on all Node versions
    }
    s.server.close(resolve)
  }))
  t.after(() => devReload.close())
  t.after(() => rm(dir, { recursive: true, force: true }))
  return { baseUrl: s.baseUrl, dir, devReload }
}

function openSse(baseUrl, { headers = {} } = {}) {
  const ctrl = new AbortController()
  const states = {
    connected: trigger(),
    reload: trigger(),
    restart: trigger(),
  }
  const task = fetch(`${baseUrl}/__dev/events`, { headers, signal: ctrl.signal }).then(async (res) => {
    assert.equal(res.status, 200)
    assert.match(res.headers.get('content-type') || '', /text\/event-stream/)
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) return
      const chunk = decoder.decode(value, { stream: true })
      if (chunk.includes('data: connected')) states.connected.resolve()
      if (chunk.includes('event: reload')) states.reload.resolve()
      if (chunk.includes('data: restart')) states.restart.resolve()
    }
  }).catch(() => {})
  return { ctrl, states, task }
}

async function closeSse(sse) {
  sse.ctrl.abort()
  await sse.task
}

test('injects the reload client into served HTML', async (t) => {
  const { baseUrl } = await withDevServer(t)
  const res = await fetch(`${baseUrl}/`)
  assert.equal(res.status, 200)
  assert.match(res.headers.get('content-type') || '', /text\/html/)
  const html = await res.text()
  assert.ok(html.includes('/__dev/events'), 'expected SSE endpoint in injected script')
  assert.ok(html.includes('EventSource'), 'expected EventSource client')
})

test('does not touch non-html responses', async (t) => {
  const { baseUrl, dir } = await withDevServer(t)
  await writeFile(path.join(dir, 'robots.txt'), 'User-agent: *\n', 'utf8')
  const res = await fetch(`${baseUrl}/robots.txt`)
  assert.equal(res.status, 200)
  const body = await res.text()
  assert.ok(!body.includes('EventSource'))
})

test('pushes a reload event when a watched file changes', async (t) => {
  const { baseUrl, dir } = await withDevServer(t)
  const sse = openSse(baseUrl)
  await Promise.race([sse.states.connected.promise, delay(3000).then(() => { throw new Error('never connected') })])
  await writeFile(path.join(dir, 'js-main.js'), 'console.log("changed")\n', 'utf8')
  await Promise.race([sse.states.reload.promise, delay(3000).then(() => { throw new Error('reload never arrived') })])
  await closeSse(sse)
})

test('pushes a reload immediately when Last-Event-ID differs from the boot key', async (t) => {
  const { baseUrl } = await withDevServer(t)
  const sse = openSse(baseUrl, { headers: { 'Last-Event-ID': 'boot:old:key' } })
  await Promise.race([
    Promise.all([sse.states.connected.promise, sse.states.restart.promise]),
    delay(3000).then(() => { throw new Error('restart reload never arrived') }),
  ])
  await closeSse(sse)
})

test('does not reload when Last-Event-ID matches the boot key', async (t) => {
  const { baseUrl } = await withDevServer(t)
  const sse = openSse(baseUrl, { headers: { 'Last-Event-ID': BOOT_KEY } })
  await sse.states.connected.promise
  const reloaded = await Promise.race([sse.states.reload.promise.then(() => true), delay(400).then(() => false)])
  await closeSse(sse)
  assert.equal(reloaded, false)
})

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}