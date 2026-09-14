import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatTempRange, formatPrecipProb, compassLabel } from '../public/js/lib/format.js'
import { uvClass } from '../public/js/lib/uv.js'

test('formatTempRange renders min and max', () => {
  assert.equal(formatTempRange(28, 35, 'metric'), '28°C – 35°C')
  assert.equal(formatTempRange(0, 100, 'imperial'), '32°F – 212°F')
})

test('formatPrecipProb renders mm and percent', () => {
  assert.equal(formatPrecipProb(2.2, 0.48, 'metric'), '2.2 mm / 48%')
  assert.equal(formatPrecipProb(0, 1, 'metric'), '0.0 mm / 100%')
})

test('compassLabel maps degrees to 16-point compass', () => {
  assert.equal(compassLabel(0), 'N')
  assert.equal(compassLabel(90), 'E')
  assert.equal(compassLabel(180), 'S')
  assert.equal(compassLabel(270), 'W')
  assert.equal(compassLabel(22.5), 'NNE')
})

test('uvClass buckets UV index into severity', () => {
  assert.equal(uvClass(0), 'low')
  assert.equal(uvClass(2), 'low')
  assert.equal(uvClass(3), 'moderate')
  assert.equal(uvClass(5), 'moderate')
  assert.equal(uvClass(6), 'high')
  assert.equal(uvClass(7), 'high')
  assert.equal(uvClass(8), 'extreme')
  assert.equal(uvClass(11), 'extreme')
})