import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cToF, kmhToMph, mmToIn, formatTemp, formatSpeed, formatPrecip, UNIT_SYSTEMS } from '../public/js/lib/units.js'

test('cToF converts Celsius to Fahrenheit', () => {
  assert.equal(cToF(0), 32)
  assert.equal(cToF(100), 212)
})

test('kmhToMph converts km/h to miles/h', () => {
  assert.equal(kmhToMph(0), 0)
  assert.ok(Math.abs(kmhToMph(10) - 6.21371) < 1e-6)
})

test('mmToIn converts mm to inches', () => {
  assert.equal(mmToIn(25.4), 1)
})

test('formatTemp rounds and appends degree mark', () => {
  assert.equal(formatTemp(30.4, 'metric'), '30°')
  assert.equal(formatTemp(85.6, 'metric'), '86°')
  assert.equal(formatTemp(0, 'metric'), '0°')
  assert.equal(formatTemp(30, 'imperial'), '86°')
  assert.equal(formatTemp(30.6, 'imperial'), '87°')
})

test('formatSpeed rounds and appends unit label', () => {
  assert.equal(formatSpeed(18, 'metric'), '18 km/h')
  assert.equal(formatSpeed(18, 'imperial'), '11 mph')
})

test('formatPrecip keeps one decimal and appends unit label', () => {
  assert.equal(formatPrecip(2.25, 'metric'), '2.3 mm')
  assert.equal(formatPrecip(25.4, 'imperial'), '1.0 in')
})

test('UNIT_SYSTEMS exposes labels', () => {
  assert.equal(UNIT_SYSTEMS.metric.temp, '°C')
  assert.equal(UNIT_SYSTEMS.imperial.temp, '°F')
})