import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../src/app.js'
import { onecallFixture } from './fixtures/onecall.js'

const IP_PLACE = { name: 'Maracaibo', state: 'Estado Zulia', country: 'VE', lat: 10.64, lon: -71.61 }

function start(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      resolve({ server, baseUrl: `http://127.0.0.1:${server.address().port}` })
    })
  })
}

function fakeClient(overrides = {}) {
  const state = { failures: 0 }
  return {
    state,
    async geocode(q) {
      if (q === 'Nowhere') return []
      return [{ name: 'Maracaibo', lat: 10.66, lon: -71.61 }]
    },
    async reverseGeocode(lat, lon) {
      return [{ name: 'Maracaibo', lat, lon }]
    },
    async getWeather() {
      if (state.failures > 0) {
        state.failures -= 1
        throw new Error('boom')
      }
      return { source: 'onecall', data: onecallFixture }
    },
    ...overrides,
  }
}

let ctx
let ctxServer

before(async () => {
  const s = await start(createApp({ client: fakeClient(), config: { port: 0, apiKey: 'k', defaultLocation: 'Maracaibo' } }))
  ctx = s
  ctxServer = s.server
})

after(() => new Promise((resolve) => ctxServer.close(resolve)))

test('serves /api/health', async () => {
  const res = await fetch(`${ctx.baseUrl}/api/health`)
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { ok: true })
})

test('serves /api/weather by city name', async () => {
  const res = await fetch(`${ctx.baseUrl}/api/weather?q=Maracaibo`)
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.location.name, 'Maracaibo')
  assert.equal(body.source, 'onecall')
  assert.equal(body.current.tempC, 30)
  assert.equal(body.stale, undefined)
})

test('/api/weather returns 400 without params', async () => {
  const res = await fetch(`${ctx.baseUrl}/api/weather`)
  assert.equal(res.status, 400)
})

test('/api/weather returns 404 for unknown location', async () => {
  const res = await fetch(`${ctx.baseUrl}/api/weather?q=Nowhere`)
  assert.equal(res.status, 404)
})

test('/api/weather serves stale cache when provider fails', async () => {
  const calls = { failures: 0 }
  const app = createApp({
    client: {
      geocode: async (q) => (q === 'Nowhere' ? [] : [{ name: 'Maracaibo', lat: 10.66, lon: -71.61 }]),
      getWeather: async () => {
        if (calls.failures > 0) {
          calls.failures -= 1
          throw new Error('boom')
        }
        return { source: 'onecall', data: onecallFixture }
      },
    },
    config: { port: 0, apiKey: 'k', defaultLocation: 'Maracaibo' },
  })
  const s = await start(app)
  const url = `${s.baseUrl}/api/weather?lat=10.66&lon=-71.61`
  const first = await fetch(url)
  assert.equal(first.status, 200)
  calls.failures = 1
  const second = await fetch(url)
  assert.equal(second.status, 200)
  const body = await second.json()
  assert.equal(body.stale, true)
  assert.ok(body.staleSince)
  await new Promise((resolve) => s.server.close(resolve))
})

test('/api/weather returns 502 without cache when provider fails', async () => {
  const client = fakeClient()
  client.state.failures = 1
  const s = await start(createApp({ client, config: { port: 0, apiKey: 'k', defaultLocation: 'Maracaibo' } }))
  const res = await fetch(`${s.baseUrl}/api/weather?lat=10.66&lon=-71.61`)
  assert.equal(res.status, 502)
  await new Promise((resolve) => s.server.close(resolve))
})

test('/api/geocode returns trimmed place list', async () => {
  const res = await fetch(`${ctx.baseUrl}/api/geocode?q=Maracaibo`)
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.deepEqual(body, [{ name: 'Maracaibo', lat: 10.66, lon: -71.61 }])
})

test('/api/geocode returns 400 without q', async () => {
  const res = await fetch(`${ctx.baseUrl}/api/geocode`)
  assert.equal(res.status, 400)
})

test('/api/geocode reverse-resolves by coordinates', async () => {
  const res = await fetch(`${ctx.baseUrl}/api/geocode?lat=10.66&lon=-71.61`)
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.deepEqual(body, [{ name: 'Maracaibo', lat: 10.66, lon: -71.61 }])
})

test('/api/location resolves a place from the client IP', async () => {
  const app = createApp({
    client: fakeClient(),
    ipLocator: { resolve: async () => IP_PLACE },
    config: { port: 0, apiKey: 'k', defaultLocation: 'Maracaibo' },
  })
  const s = await start(app)
  const res = await fetch(`${s.baseUrl}/api/location`)
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), IP_PLACE)
  await new Promise((resolve) => s.server.close(resolve))
})

test('/api/location returns 502 when the IP provider fails', async () => {
  const app = createApp({
    client: fakeClient(),
    ipLocator: { resolve: async () => { throw new Error('boom') } },
    config: { port: 0, apiKey: 'k', defaultLocation: 'Maracaibo' },
  })
  const s = await start(app)
  const res = await fetch(`${s.baseUrl}/api/location`)
  assert.equal(res.status, 502)
  await new Promise((resolve) => s.server.close(resolve))
})