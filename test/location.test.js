import { test } from 'node:test'
import assert from 'node:assert/strict'
import { preferCityLabel } from '../public/js/lib/location.js'

test('preferCityLabel prefers a city-level place label', () => {
  const city = { name: 'Maracaibo', state: 'Estado Zulia', country: 'VE' }
  const sector = { name: 'El Pedregal', state: 'Zulia State', country: 'VE' }
  assert.equal(preferCityLabel(city, sector), 'Maracaibo, Estado Zulia, VE')
})

test('preferCityLabel falls back to the sector label when no city is known', () => {
  const sector = { name: 'El Pedregal', state: 'Zulia State', country: 'VE' }
  assert.equal(preferCityLabel(null, sector), 'El Pedregal, Zulia State, VE')
})

test('preferCityLabel returns null when neither place is known', () => {
  assert.equal(preferCityLabel({}, null), null)
  assert.equal(preferCityLabel(null, {}), null)
})