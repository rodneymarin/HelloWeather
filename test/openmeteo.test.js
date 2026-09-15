import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createOpenMeteoClient, ApiError } from '../src/openmeteo.js'

function jsonResponse(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

test('getWeather builds a forecast URL with open-meteo params', async () => {
  const calls = []
  const client = createOpenMeteoClient({
    fetchImpl: async (url) => {
      calls.push(url.toString())
      return jsonResponse({ current: {}, hourly: { time: [] }, daily: { time: [] } })
    },
  })
  const result = await client.getWeather({ lat: 10.66, lon: -71.61 })
  assert.deepEqual(result.current, {})
  const url = new URL(calls[0])
  assert.equal(url.pathname, '/v1/forecast')
  assert.equal(url.searchParams.get('latitude'), '10.66')
  assert.equal(url.searchParams.get('longitude'), '-71.61')
  assert.equal(url.searchParams.get('timezone'), 'auto')
  assert.equal(url.searchParams.get('forecast_days'), '5')
  assert.equal(url.searchParams.get('forecast_hours'), '48')
  assert.match(url.searchParams.get('current'), /temperature_2m/)
  assert.match(url.searchParams.get('hourly'), /precipitation_probability/)
  assert.match(url.searchParams.get('daily'), /uv_index_max/)
})

test('getWeather propagates non-2xx errors', async () => {
  const client = createOpenMeteoClient({ fetchImpl: async () => jsonResponse({}, 500) })
  await assert.rejects(
    () => client.getWeather({ lat: 1, lon: 2 }),
    (err) => err instanceof ApiError && err.status === 500,
  )
})

test('geocode maps results into the place shape and returns [] when empty', async () => {
  const client = createOpenMeteoClient({
    fetchImpl: async (url) => {
      const u = url.toString()
      if (u.includes('name=Maracaibo')) {
        return jsonResponse({
          results: [{ name: 'Maracaibo', country_code: 'VE', admin1: 'Estado Zulia', latitude: 10.66, longitude: -71.61 }],
        })
      }
      return jsonResponse({})
    },
  })
  const results = await client.geocode('Maracaibo')
  assert.equal(results[0].name, 'Maracaibo')
  assert.equal(results[0].country, 'VE')
  assert.equal(results[0].state, 'Estado Zulia')
  assert.equal(results[0].lat, 10.66)
  const empty = await client.geocode('Nowhere')
  assert.deepEqual(empty, [])
})

test('reverseGeocode calls Nominatim with a User-Agent and maps address', async () => {
  const calls = []
  const client = createOpenMeteoClient({
    fetchImpl: async (url, init) => {
      calls.push({ url: url.toString(), init })
      return jsonResponse({
        name: 'Maracaibo',
        address: { city: 'Maracaibo', country_code: 've', state: 'Estado Zulia' },
      })
    },
  })
  const results = await client.reverseGeocode(10.66, -71.61)
  assert.equal(results[0].name, 'Maracaibo')
  assert.equal(results[0].country, 've')
  assert.equal(results[0].state, 'Estado Zulia')
  const url = new URL(calls[0].url)
  assert.equal(url.pathname, '/reverse')
  assert.equal(url.searchParams.get('lat'), '10.66')
  assert.equal(url.searchParams.get('lon'), '-71.61')
  assert.equal(url.searchParams.get('format'), 'jsonv2')
  assert.match(calls[0].init.headers['User-Agent'], /HelloWeather/)
})