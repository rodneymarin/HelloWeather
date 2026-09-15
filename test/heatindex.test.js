import { test } from 'node:test'
import assert from 'node:assert/strict'
import { heatIndexC, solarBoostC, feelsLikeC } from '../src/heatindex.js'

test('heatIndexC raises the felt temperature under heat and humidity', () => {
  const felt = heatIndexC(30.1, 62)
  assert.ok(felt > 30.1, 'heat index exceeds the air temperature')
  assert.ok(felt < 45, 'heat index stays in a plausible range')
})

test('solarBoostC ramps from 0 up to a cap of 8 with shortwave radiation', () => {
  assert.equal(solarBoostC(0), 0)
  assert.equal(solarBoostC(null), 0)
  assert.ok(solarBoostC(400) > 0)
  assert.ok(solarBoostC(400) < solarBoostC(800), 'boost grows with radiation')
  assert.equal(solarBoostC(5000), 8, 'boost caps at 8')
})

test('feelsLikeC returns the raw temperature when humidity is missing', () => {
  assert.equal(feelsLikeC(30.1, null, 600), 30.1)
})

test('feelsLikeC returns null when the temperature is missing', () => {
  assert.equal(feelsLikeC(null, 62, 600), null)
})

test('feelsLikeC returns the raw temperature below the heat-index threshold', () => {
  assert.equal(feelsLikeC(20, 90, 800), 20)
})

test('feelsLikeC combines heat index with the solar boost', () => {
  const felt = feelsLikeC(30.1, 62, 600)
  assert.equal(felt, heatIndexC(30.1, 62) + solarBoostC(600))
})