import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../src/app.js'
import { drawerHtml } from '../public/js/ui/drawer.js'

let server
let baseUrl

before(async () => {
  server = await new Promise((resolve) => {
    const s = createApp({ config: { port: 0, apiKey: 'k', defaultLocation: 'Maracaibo' } }).listen(0, () => resolve(s))
  })
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(() => new Promise((resolve) => server.close(resolve)))

test('serves index.html at /', async () => {
  const res = await fetch(`${baseUrl}/`)
  assert.equal(res.status, 200)
  const html = await res.text()
  assert.match(html, /<title>HelloWeather<\/title>/)
  assert.match(html, /id="hero"/)
  assert.ok(!html.includes('Powered by OpenWeather'))
})

test('serves css and js assets', async () => {
  for (const path of ['/css/style.css', '/js/main.js']) {
    const res = await fetch(`${baseUrl}${path}`)
    assert.equal(res.status, 200)
  }
})

test('drawer footer credits Open-Meteo, not OpenWeather', () => {
  const html = drawerHtml({ theme: 'system', favorites: [] })
  assert.ok(html.includes('Powered by Open-Meteo'))
  assert.ok(!html.includes('Powered by OpenWeather'))
})