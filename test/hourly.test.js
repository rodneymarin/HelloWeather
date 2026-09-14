import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildTempArea, scrollIndicator } from '../public/js/ui/hourly.js'

const ITEMS = [
  { dt: 1757844930, tempC: 30, icon: '04d', windKmh: 18, windDeg: 90, gustKmh: 30, pop: 0.2 },
  { dt: 1757855730, tempC: 28, icon: '10d', windKmh: 14.4, windDeg: 120, gustKmh: null, pop: 0.48 },
  { dt: 1757866530, tempC: 29, icon: '04d', windKmh: 21.6, windDeg: 150, gustKmh: 40, pop: 0.1 },
]

test('buildTempArea draws a smoothed curve with on-curve temps', () => {
  const html = buildTempArea(ITEMS, 'metric')
  assert.match(html, /<path d="M /)
  assert.match(html, / C /)
  assert.ok(!html.includes('polyline'))
  assert.equal((html.match(/chart-temp/g) || []).length, ITEMS.length)
  assert.ok(html.includes('30°') && html.includes('28°') && html.includes('29°'))
})

test('buildTempArea handles a single item without a path', () => {
  const html = buildTempArea([ITEMS[0]], 'metric')
  assert.ok(!html.includes('<path'))
  assert.equal((html.match(/chart-temp/g) || []).length, 1)
  assert.ok(html.includes('30°'))
})

test('buildTempArea positions temps as area percentages aligned with the line', () => {
  const flat = buildTempArea([ITEMS[0]], 'metric')
  assert.match(flat, /top:55\.00%/)

  const low = [{ ...ITEMS[0], tempC: 20 }]
  const two = buildTempArea([{ ...ITEMS[0], tempC: 30 }, ...low], 'metric')
  const tops = [...two.matchAll(/top:([0-9.]+)%/g)].map((m) => m[1])
  assert.deepEqual(tops, ['30.00', '80.00'])
})

test('scrollIndicator hides when content fits', () => {
  assert.deepEqual(scrollIndicator(800, 600, 100), { widthPct: 0, leftPct: 0 })
})

test('scrollIndicator maps visible fraction and scroll progress', () => {
  assert.deepEqual(scrollIndicator(500, 1000, 0), { widthPct: 50, leftPct: 0 })
  assert.deepEqual(scrollIndicator(500, 1000, 500), { widthPct: 50, leftPct: 50 })
})

test('scrollIndicator clamps very small visible fractions', () => {
  assert.deepEqual(scrollIndicator(100, 5000, 0), { widthPct: 12, leftPct: 0 })
})