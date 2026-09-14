import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getConfig } from '../config.js'

test('getConfig uses provided PORT', () => {
  const config = getConfig({ PORT: '8080', OPENWEATHER_API_KEY: 'k' })
  assert.equal(config.port, 8080)
})

test('getConfig defaults port to 2829 when missing or invalid', () => {
  assert.equal(getConfig({}).port, 2829)
  assert.equal(getConfig({ PORT: 'not-a-number', OPENWEATHER_API_KEY: 'k' }).port, 2829)
})

test('getConfig falls back to CONCEPT.md API key when env missing', () => {
  const config = getConfig({})
  assert.equal(config.apiKey, '')
})

test('getConfig prefers env API key', () => {
  assert.equal(getConfig({ OPENWEATHER_API_KEY: 'env-secret' }).apiKey, 'env-secret')
})

test('getConfig uses DEFAULT_LOCATION with fallback', () => {
  assert.equal(getConfig({ DEFAULT_LOCATION: 'Caracas' }).defaultLocation, 'Caracas')
  assert.equal(getConfig({}).defaultLocation, 'Maracaibo')
})