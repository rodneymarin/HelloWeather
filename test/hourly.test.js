import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { renderHourly, buildTempArea } from '../public/js/ui/hourly.js'

const css = readFileSync(new URL('../public/css/style.css', import.meta.url), 'utf8')

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
  assert.match(flat, /top:61\.09%/, 'flat temp centered in the usable band (12-36.875)')

  const low = [{ ...ITEMS[0], tempC: 20 }]
  const two = buildTempArea([{ ...ITEMS[0], tempC: 30 }, ...low], 'metric')
  const tops = [...two.matchAll(/top:([0-9.]+)%/g)].map((m) => m[1])
  assert.deepEqual(tops, ['30.00', '92.19'], 'max at top (30%), min 5px above the bottom (92.19%)')
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
  assert.ok(html.includes('style="--pop-num: 40"'), 'bar height based on mm (1.2mm = 40%)')
  assert.ok(html.includes('40%') && html.includes('1.2 mm'), 'footer with percent and mm')
  assert.equal((html.match(/class="pop-bar"/g) || []).length, 1, 'only one pop-bar for the rainy hour')
  assert.equal((html.match(/class="pop-foot"/g) || []).length, 1, 'only one pop-foot for the rainy hour')
})

test('renderHourly suppresses the bar and mm text when precipitation is zero', () => {
  const model = {
    timezone: 0,
    hourly: [
      { dt: 0, tempC: 30, icon: 'sun', windKmh: 10, windDeg: 90, gustKmh: 20, pop: 0, precipMm: 0 },
      { dt: 3600, tempC: 29, icon: 'cloud', windKmh: 8, windDeg: 90, gustKmh: null, pop: 0.4, precipMm: 0 },
    ],
  }
  const html = renderHourly(model, 'metric')
  assert.ok(!html.includes('class="pop-bar"'), 'no bar when mm is zero')
  assert.ok(!html.includes('class="pop-foot"'), 'no footer when mm is zero')
  assert.ok(!html.includes('0.0 mm'), 'no zero-millimeter footer text')
})

test('pop bars and text grow from scrollbar; chart baseline at reserve', () => {
  const barBlock = css.match(/\.pop-bar\s*\{[^}]+\}/)[0]
  assert.match(barBlock, /bottom:\s*0;/, 'bar base sits on the scrollbar')
  assert.match(barBlock, /height:\s*calc\(\(var\(--pop-num, 0\)\s*\*\s*var\(--temp-area-h\)\s*\/\s*100\)\)/, 'bar height scales with temp-area-h (0-5mm scale)')
  assert.ok(!barBlock.includes('min-height'), 'no min-height; bar starts at zero')

  const footBlock = css.match(/\.pop-foot\s*\{[^}]+\}/)[0]
  assert.match(footBlock, /bottom:\s*0;/, 'text also starts at scrollbar, moves up with bar')

  const areaBlock = css.match(/\.temp-area\s*\{[^}]+\}/)[0]
  assert.match(areaBlock, /bottom:\s*var\(--pop-foot-reserve\);/, 'chart baseline at reserve zone')
})