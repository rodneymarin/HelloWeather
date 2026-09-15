import { test } from 'node:test'
import assert from 'node:assert/strict'
import { iconSvg, moonPhaseSvg } from '../public/js/ui/icons.js'
import { renderDaily } from '../public/js/ui/daily.js'
import { renderHero } from '../public/js/ui/hero.js'

function litPath(phase) {
  const svg = moonPhaseSvg(phase)
  assert.ok(svg.includes('class="wicon moon"'), 'wicon moon wrapper')
  assert.ok(svg.includes('<circle class="moon-dark" cx="12" cy="12" r="10"/>'), 'moon-dark disc')
  assert.ok(svg.includes('<path class="moon-lit"'), 'moon-lit path')
  const m = svg.match(/d="([^"]+)"/)
  return m[1]
}

test('full moon renders a fully lit disc', () => {
  assert.equal(litPath(0.5), 'M12 2 A10 10 0 0 1 12 22 A10.00 10 0 0 1 12 2 Z')
})

test('new moon renders a degenerate (dark) disc', () => {
  assert.equal(litPath(0), 'M12 2 A10 10 0 0 1 12 22 A10.00 10 0 0 0 12 2 Z')
})

test('waxing crescent keeps the lit sliver on the right', () => {
  assert.equal(litPath(0.1), 'M12 2 A10 10 0 0 1 12 22 A8.09 10 0 0 0 12 2 Z')
})

test('waning crescent keeps the lit sliver on the left', () => {
  assert.equal(litPath(0.9), 'M12 2 A10 10 0 0 0 12 22 A8.09 10 0 0 1 12 2 Z')
})

test('gibbous phases bulge the terminator toward the dark side', () => {
  assert.equal(litPath(0.4), 'M12 2 A10 10 0 0 1 12 22 A8.09 10 0 0 1 12 2 Z')
  assert.equal(litPath(0.6), 'M12 2 A10 10 0 0 0 12 22 A8.09 10 0 0 0 12 2 Z')
})

test('quarter phases use a straight (rx 0) terminator', () => {
  assert.ok(litPath(0.25).includes('A0.00 10 0 0 '))
  assert.ok(litPath(0.75).includes('A0.00 10 0 0 '))
})

test('missing or out-of-range phase falls back to a new moon', () => {
  assert.ok(litPath(undefined).includes('A10.00 10 0 0 0 12 2'))
  assert.ok(litPath(-1).includes('A10.00 10 0 0 0 12 2'))
  assert.ok(litPath(2).includes('A10.00 10 0 0 0 12 2'))
})

test('renderDaily uses the phase-shaped moon icon', () => {
  const model = {
    timezone: 'UTC',
    daily: [{
      dt: 0,
      minC: 5,
      maxC: 20,
      condition: 'Clear',
      icon: 'sun',
      windDeg: 90,
      windKmh: 10,
      precipMm: 0,
      pop: 0,
      gustKmh: null,
      uvIndex: null,
      moonPhase: 0.25,
    }],
  }
  const html = renderDaily(model, 'metric')
  assert.ok(html.includes('class="wicon moon"'), 'extended row uses shaped moon')
  assert.ok(html.includes('First Quarter'), 'phase label kept')
})

test('renderHero uses the phase-shaped moon icon', () => {
  const model = {
    timezone: 'UTC',
    current: { tempC: 30, windKmh: 10, windDeg: 90, humidity: 60, uvIndex: null, icon: 'sun', description: 'Clear' },
    today: { minC: 25, maxC: 32 },
    sun: { sunriseSec: 1757900000, sunsetSec: 1757940000 },
    updatedAt: 1757900000,
  }
  const html = renderHero(model, 'metric')
  assert.ok(html.includes('class="wicon moon"'), 'hero uses shaped moon icon')
  assert.match(html, /<path class="moon-lit"/, 'hero icon has lit path')
})

test('sunrise and sunset icons show a half sun on the horizon with a direction arrow', () => {
  const rise = iconSvg('sunrise')
  const set = iconSvg('sunset')
  assert.ok(rise.includes('<path d="M7 16a5 5 0 0 1 10 0z'), 'rise half sun above horizon')
  assert.ok(set.includes('<path d="M7 16a5 5 0 0 1 10 0z'), 'set half sun above horizon')
  assert.ok(rise.includes('M3 16h18'), 'horizon line')
  assert.ok(rise.includes('M12 4'), 'rise points up')
  assert.ok(set.includes('M12 22'), 'set points down')
})

test('iconSvg maps icon names and falls back to cloud for unknown', () => {
  assert.ok(iconSvg('rain').includes('M8 19l-1 3'), 'rain icon')
  assert.ok(iconSvg('storm').includes('M13 13l-2 4'), 'storm icon')
  assert.ok(iconSvg('nonsense').includes('M7 18h9'), 'unknown falls back to cloud')
})

test('OpenWeather-style codes no longer map to specific icons', () => {
  assert.ok(iconSvg('01d').includes('M7 18h9'), '01d falls back to cloud, not sun')
})

test('renderHero shows precipitation probability and mm when present', () => {
  const model = {
    timezone: 0,
    current: { tempC: 30, windKmh: 10, windDeg: 90, humidity: 60, uvIndex: null, icon: 'sun', description: 'Clear', pop: 0.4, precipMm: 1.2 },
    today: { minC: 25, maxC: 32 },
    sun: { sunriseSec: 1757900000, sunsetSec: 1757940000 },
  }
  const html = renderHero(model, 'metric')
  assert.ok(html.includes('class="metric rain"'))
  assert.ok(html.includes('1.2 mm / 40%'))
})

test('renderHero hides the precipitation metric when there is no rain', () => {
  const model = {
    timezone: 0,
    current: { tempC: 30, windKmh: 10, windDeg: 90, humidity: 60, uvIndex: null, icon: 'sun', description: 'Clear', pop: 0, precipMm: null },
    today: { minC: 25, maxC: 32 },
    sun: { sunriseSec: 1757900000, sunsetSec: 1757940000 },
  }
  const html = renderHero(model, 'metric')
  assert.ok(!html.includes('metric rain'))
})

test('renderHero hides the precipitation metric when pop and precipMm are both zero', () => {
  const model = {
    timezone: 0,
    current: { tempC: 30, windKmh: 10, windDeg: 90, humidity: 60, uvIndex: null, icon: 'sun', description: 'Clear', pop: 0, precipMm: 0 },
    today: { minC: 25, maxC: 32 },
    sun: { sunriseSec: 1757900000, sunsetSec: 1757940000 },
  }
  const html = renderHero(model, 'metric')
  assert.ok(!html.includes('metric rain'))
})

test('renderHero keeps the precipitation metric when pop drives it and mm is zero', () => {
  const model = {
    timezone: 0,
    current: { tempC: 30, windKmh: 10, windDeg: 90, humidity: 60, uvIndex: null, icon: 'sun', description: 'Clear', pop: 0.4, precipMm: 0 },
    today: { minC: 25, maxC: 32 },
    sun: { sunriseSec: 1757900000, sunsetSec: 1757940000 },
  }
  const html = renderHero(model, 'metric')
  assert.ok(html.includes('class="metric rain"'))
  assert.ok(html.includes('40%'))
})