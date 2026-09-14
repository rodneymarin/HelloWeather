import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createOpenWeatherClient, ApiError } from '../src/openweather.js'

function jsonResponse(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

test('getWeather uses One Call endpoint with appid and metric units', async () => {
  const calls = []
  const client = createOpenWeatherClient({
    apiKey: 'secret',
    fetchImpl: async (url) => {
      calls.push(url.toString())
      return jsonResponse({ hourly: [], daily: [] })
    },
  })
  const result = await client.getWeather({ lat: 10.66, lon: -71.61 })
  assert.equal(result.source, 'onecall')
  const url = new URL(calls[0])
  assert.equal(url.pathname, '/data/3.0/onecall')
  assert.equal(url.searchParams.get('appid'), 'secret')
  assert.equal(url.searchParams.get('units'), 'metric')
  assert.equal(url.searchParams.get('lat'), '10.66')
  assert.equal(url.searchParams.get('lon'), '-71.61')
  assert.equal(url.searchParams.get('exclude'), 'minutely,alerts')
})

test('getWeather falls back to Current + Forecast on 401', async () => {
  const calls = []
  const client = createOpenWeatherClient({
    apiKey: 'secret',
    fetchImpl: async (url) => {
      const u = url.toString()
      calls.push(u)
      if (u.includes('/data/3.0/onecall')) return jsonResponse({}, 401)
      return jsonResponse({ name: 'Maracaibo' })
    },
  })
  const result = await client.getWeather({ lat: 10.66, lon: -71.61 })
  assert.equal(result.source, 'current-forecast')
  assert.equal(calls.filter((c) => c.includes('/data/2.5/weather')).length, 1)
  assert.equal(calls.filter((c) => c.includes('/data/2.5/forecast')).length, 1)
})

test('non-auth errors propagate', async () => {
  const client = createOpenWeatherClient({
    apiKey: 'secret',
    fetchImpl: async () => jsonResponse({}, 500),
  })
  await assert.rejects(() => client.getWeather({ lat: 1, lon: 2 }), (err) => err instanceof ApiError && err.status === 500)
})

test('geocode hits geo endpoint', async () => {
  const calls = []
  const client = createOpenWeatherClient({
    apiKey: 'secret',
    fetchImpl: async (url) => {
      calls.push(url.toString())
      return jsonResponse([{ name: 'Maracaibo', lat: 10.66, lon: -71.61 }])
    },
  })
  const results = await client.geocode('Maracaibo')
  assert.equal(results[0].name, 'Maracaibo')
  const url = new URL(calls[0])
  assert.equal(url.pathname, '/geo/1.0/direct')
  assert.equal(url.searchParams.get('q'), 'Maracaibo')
  assert.equal(url.searchParams.get('limit'), '5')
})

test('reverseGeocode hits the reverse geo endpoint with coords', async () => {
  const calls = []
  const client = createOpenWeatherClient({
    apiKey: 'secret',
    fetchImpl: async (url) => {
      calls.push(url.toString())
      return jsonResponse([{ name: 'Maracaibo', lat: 10.66, lon: -71.61 }])
    },
  })
  const results = await client.reverseGeocode(10.66, -71.61)
  assert.equal(results[0].name, 'Maracaibo')
  const url = new URL(calls[0])
  assert.equal(url.pathname, '/geo/1.0/reverse')
  assert.equal(url.searchParams.get('lat'), '10.66')
  assert.equal(url.searchParams.get('lon'), '-71.61')
  assert.equal(url.searchParams.get('limit'), '1')
})