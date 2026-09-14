import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fetchIpLocation } from '../public/js/api.js'

test('fetchIpLocation hits /api/location', async () => {
  const calls = []
  const original = globalThis.fetch
  globalThis.fetch = async (url) => {
    calls.push(url.toString())
    return { ok: true, json: async () => ({ name: 'Maracaibo', lat: 10.64, lon: -71.61 }) }
  }
  try {
    const place = await fetchIpLocation()
    assert.deepEqual(calls, ['/api/location'])
    assert.equal(place.name, 'Maracaibo')
  } finally {
    globalThis.fetch = original
  }
})