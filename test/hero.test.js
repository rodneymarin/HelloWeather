import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { renderHero } from '../public/js/ui/hero.js'

const css = readFileSync(new URL('../public/css/style.css', import.meta.url), 'utf8')

const MODEL = {
  timezone: 0,
  current: {
    tempC: 30,
    uvIndex: 2,
    pop: 0.1,
    precipMm: null,
    windKmh: 10,
    humidity: 60,
    icon: 'sun',
    condition: 'Clear',
    description: 'Clear sky',
    feelsLikeC: 33.4,
  },
  today: { minC: 25, maxC: 34 },
  sun: { sunriseSec: 36000, sunsetSec: 79200 },
}

test('renderHero shows the feels-like as the big temperature with a small Feels caption', () => {
  const html = renderHero(MODEL, 'metric')
  assert.ok(html.includes('class="hero-temp-caption">Feels<'), 'small Feels caption sits above the big temp')
  assert.match(html, /class="hero-temp">33°C<\/span>/, 'big temperature is the feels-like value')
})

test('renderHero shows the normal temperature in small next to the big one', () => {
  const html = renderHero(MODEL, 'metric')
  assert.match(html, /class="hero-temp-side">30°C<\/span>/, 'normal temp shown small beside the big temp')
})

test('renderHero falls back to the normal temperature without feels-like data', () => {
  const html = renderHero({ ...MODEL, current: { ...MODEL.current, feelsLikeC: null } }, 'metric')
  assert.ok(!html.includes('Feels'), 'no Feels caption without data')
  assert.match(html, /class="hero-temp">30°C<\/span>/, 'big temperature falls back to the normal value')
  assert.ok(!html.includes('hero-temp-side'), 'no side temperature without feels-like data')
})

test('renderHero places the condition and day together in the top row', () => {
  const html = renderHero(MODEL, 'metric')
  const top = html.indexOf('class="hero-top"')
  const metrics = html.indexOf('class="hero-metrics"')
  assert.ok(html.indexOf('class="hero-condition"') > top && html.indexOf('class="hero-condition"') < metrics, 'condition lives in the top row')
  assert.ok(html.indexOf('class="hero-day"') > top && html.indexOf('class="hero-day"') < metrics, 'day block lives in the top row')
})

test('renderHero keeps the sun times inside the metrics block', () => {
  const html = renderHero(MODEL, 'metric')
  const start = html.indexOf('class="hero-metrics"')
  const sun = html.indexOf('class="hero-sun-times"')
  const between = html.slice(start, sun)
  assert.ok(sun > start, 'sun times come after the metrics block opener')
  assert.ok(!between.includes('</div>'), 'sun times are nested inside the metrics block')
  assert.ok(html.indexOf('hero-sunrise') < html.indexOf('hero-sunset'), 'sunrise precedes sunset')
})

test('renderHero no longer shows the moon phase metric', () => {
  const html = renderHero(MODEL, 'metric')
  assert.ok(!/moon/i.test(html))
})

test('hero-temp-group anchors the side temperature to the base of the big temperature', () => {
  const block = css.match(/\.hero-temp-group\s*\{[^}]+\}/)[0]
  assert.match(block, /align-items:\s*flex-end/)
  assert.ok(!block.includes('align-items: center'))
})

test('hero-sun-times sit side by side, right-aligned on the metrics line', () => {
  const block = css.match(/\.hero-sun-times\s*\{[^}]+\}/)[0]
  assert.match(block, /flex-direction:\s*row/)
  assert.match(block, /justify-content:\s*flex-end/)
  assert.ok(!block.includes('flex-direction: column'), 'no longer stacked vertically')
})

test('hero-sun-times right-align within the traveling metrics row', () => {
  const block = css.match(/\.hero-sun-times\s*\{[^}]+\}/)[0]
  assert.match(block, /margin-left:\s*auto/)
})

test('hero separates the metrics group from the top with extra margin', () => {
  const hero = css.match(/\.hero\s*\{[^}]+\}/)[0]
  const metrics = css.match(/\.hero-metrics\s*\{[^}]+\}/)[0]
  assert.match(hero, /gap:\s*16px/, 'container keeps its base gap')
  assert.match(metrics, /margin-top:\s*12px/, 'explicit margin lifts the metrics block off the top row')
})

test('hero-condition centers the icon horizontally over its text', () => {
  const block = css.match(/\.hero-condition\s*\{[^}]+\}/)[0]
  const icon = css.match(/\.hero-condition\s+\.wicon\s*\{[^}]+\}/)[0]
  assert.match(icon, /align-self:\s*center/, 'icon stays centered over the text')
})

test('hero-right bottom-aligns its group', () => {
  const block = css.match(/\.hero-right\s*\{[^}]+\}/)[0]
  assert.match(block, /align-items:\s*flex-end/)
  assert.match(block, /gap:\s*28px/)
  assert.ok(!block.includes('align-items: flex-start'))
})