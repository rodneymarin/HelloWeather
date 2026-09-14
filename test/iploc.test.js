import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isPrivateIp, buildIpLookupUrl, normalizeIpPlace, createIpLocator } from '../src/iploc.js'

test('isPrivateIp flags loopback and private ranges', () => {
  for (const ip of ['127.0.0.1', '::1', '::ffff:127.0.0.1', '10.0.0.5', '192.168.1.99', '172.16.0.1', '172.31.255.255', '169.254.1.1']) {
    assert.equal(isPrivateIp(ip), true, `${ip} should be private`)
  }
  for (const ip of ['8.8.8.8', '156.231.234.254', '2001:4860:4860::8888', '172.32.0.1']) {
    assert.equal(isPrivateIp(ip), false, `${ip} should be public`)
  }
})

test('buildIpLookupUrl uses auto-detect for private IPs and forces the IP otherwise', () => {
  assert.equal(buildIpLookupUrl('127.0.0.1'), 'https://ipwho.is/')
  assert.equal(buildIpLookupUrl('8.8.8.8'), 'https://ipwho.is/?q=8.8.8.8')
})

test('normalizeIpPlace maps the ipwho response shape', () => {
  assert.equal(normalizeIpPlace({ success: false }), null)
  assert.equal(normalizeIpPlace({ success: true, city: '' }), null)
  const place = normalizeIpPlace({ success: true, city: 'Maracaibo', region: 'Estado Zulia', country_code: 'VE', latitude: 10.64, longitude: -71.61 })
  assert.deepEqual(place, { name: 'Maracaibo', state: 'Estado Zulia', country: 'VE', lat: 10.64, lon: -71.61 })
})

test('createIpLocator resolves a place or throws', async () => {
  const ok = createIpLocator({ fetchImpl: async () => ({ ok: true, json: async () => ({ success: true, city: 'Maracaibo', country_code: 'VE', latitude: 10.64, longitude: -71.61 }) }) })
  const place = await ok.resolve('8.8.8.8')
  assert.equal(place.name, 'Maracaibo')

  const bad = createIpLocator({ fetchImpl: async () => ({ ok: false }) })
  await assert.rejects(() => bad.resolve('8.8.8.8'))
})