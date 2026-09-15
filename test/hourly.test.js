import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderHourly, buildTempArea } from '../public/js/ui/hourly.js'

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

test('buildTempArea extends the curve ends near the block edges', () => {
  const html = buildTempArea(ITEMS.slice(0, 2), 'metric')
  const d = html.match(/<path d="([^"]+)" \/>/)[1]
  assert.match(d, /^M 1\.50 /)
  assert.match(d, / 98\.50 \d+\.\d+$/)
})

test('renderHourly renders a column per hour with pop bar and footer', () => {
  const model = {
    timezone: 0,
    hourly: [
      { dt: 0, tempC: 30, icon: 'sun', windKmh: 10, windDeg: 90, gustKmh: 20, pop: 0.4, precipMm: 1.2 },
      { dt: 3600, tempC: 29, icon: 'cloud', windKmh: 8, windDeg: 90, gustKmh: null, pop: 0, precipMm: null },
    ],
  }
  const html = renderHourly(model, 'metric')
  assert.equal((html.match(/class="hourly-col/g) || []).length, 2)
  assert.ok(html.includes('style="--pop-num: 40"'), 'probability bar height set')
  assert.ok(html.includes('40% · 1.2 mm'), 'footer with percent and mm')
  assert.ok(!html.includes('--pop-num: 0'), 'zero-pop column has no bar')
  assert.ok(html.includes('class="pop-foot"></span>'), 'empty footer for dry hour')
})