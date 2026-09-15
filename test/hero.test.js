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

test('renderHero shows the normal temperature in small below the big one', () => {
  const html = renderHero(MODEL, 'metric')
  assert.match(html, /class="hero-temp-side">30°C<\/span>/, 'normal temp shown small below the big temp')
  assert.ok(html.indexOf('class="hero-temp-main"') < html.indexOf('class="hero-temp-side"'), 'side temp renders after the main block')
})

test('renderHero falls back to the normal temperature without feels-like data', () => {
  const html = renderHero({ ...MODEL, current: { ...MODEL.current, feelsLikeC: null } }, 'metric')
  assert.ok(!html.includes('Feels'), 'no Feels caption without data')
  assert.match(html, /class="hero-temp">30°C<\/span>/, 'big temperature falls back to the normal value')
  assert.ok(!html.includes('hero-temp-side'), 'no side temperature without feels-like data')
})

test('renderHero wires the metrics block into the top row next to the temperature', () => {
  const html = renderHero(MODEL, 'metric')
  const top = html.indexOf('class="hero-top"')
  const temp = html.indexOf('class="hero-temp-group"')
  const metrics = html.indexOf('class="hero-metrics"')
  const right = html.indexOf('class="hero-right"')
  assert.ok(temp > top, 'temperature group opens the top block')
  assert.ok(metrics > temp && right > metrics, 'metrics sit inside the top row next to the temperature')
  assert.ok(html.indexOf('class="hero-day"') > right, 'day block stays in the hero-right group')
})

test('renderHero nests the sun times inside hero-right below the condition/day group', () => {
  const html = renderHero(MODEL, 'metric')
  const right = html.indexOf('class="hero-right"')
  const group = html.indexOf('class="hero-condition-day"')
  const condition = html.indexOf('class="hero-condition"')
  const day = html.indexOf('class="hero-day"')
  const sun = html.indexOf('class="hero-sun-times"')
  assert.ok(group > right && condition > group, 'condition/day group lives inside hero-right')
  assert.ok(day > condition, 'day follows the condition inside the group')
  assert.ok(sun > day, 'sun times sit below the condition/day group')
  assert.ok(html.slice(day, sun).includes('</div>'), 'the group closes before the sun times open')
  assert.ok(html.indexOf('hero-sunrise') < html.indexOf('hero-sunset'), 'sunrise precedes sunset')
})

test('renderHero no longer shows the moon phase metric', () => {
  const html = renderHero(MODEL, 'metric')
  assert.ok(!/moon/i.test(html))
})

test('hero-temp-group stacks the side temperature below the main temperature, left-aligned', () => {
  const block = css.match(/\.hero-temp-group\s*\{[^}]+\}/)[0]
  assert.match(block, /flex-direction:\s*column/)
  assert.match(block, /align-items:\s*flex-start/)
  assert.ok(!block.includes('flex-direction: row'), 'no longer side by side')
  assert.ok(!block.includes('align-items: flex-end'), 'no longer right-aligned')
})

test('hero-sun-times stay side by side in a horizontal row', () => {
  const block = css.match(/\.hero-sun-times\s*\{[^}]+\}/)[0]
  assert.match(block, /flex-direction:\s*row/)
  assert.ok(!block.includes('flex-direction: column'), 'no longer stacked vertically')
})

test('hero-right stacks its groups vertically and right-aligns them', () => {
  const block = css.match(/\.hero-right\s*\{[^}]+\}/)[0]
  assert.match(block, /flex-direction:\s*column/)
  assert.match(block, /align-items:\s*flex-end/)
})

test('hero-condition-day keeps the condition and day side by side with their original gap', () => {
  const block = css.match(/\.hero-condition-day\s*\{[^}]+\}/)[0]
  assert.match(block, /flex-direction:\s*row/)
  assert.match(block, /align-items:\s*flex-end/)
  assert.match(block, /gap:\s*28px/)
})

test('hero-metrics stacks its metrics vertically inside the top row', () => {
  const metrics = css.match(/\.hero-metrics\s*\{[^}]+\}/)[0]
  assert.match(metrics, /flex-direction:\s*column/, 'metrics stack vertically')
  assert.ok(!metrics.includes('margin-top: 12px'), 'no extra top margin now that metrics live in the top row')
})

test('hero-condition centers the icon horizontally over its text', () => {
  const block = css.match(/\.hero-condition\s*\{[^}]+\}/)[0]
  const icon = css.match(/\.hero-condition\s+\.wicon\s*\{[^}]+\}/)[0]
  assert.match(icon, /align-self:\s*center/, 'icon stays centered over the text')
})

test('hero-right stretches to the full top height so the sun times pin to the bottom', () => {
  const right = css.match(/\.hero-right\s*\{[^}]+\}/)[0]
  const sun = css.match(/\.hero-sun-times\s*\{[^}]+\}/)[0]
  assert.match(right, /align-self:\s*stretch/, 'hero-right fills the height of the top block')
  assert.match(sun, /margin-top:\s*auto/, 'sun times pushed down to the bottom of hero-right')
})

test('hero-right is a vertical stack that right-aligns its groups and keeps sun times aligned to it', () => {
  const block = css.match(/\.hero-right\s*\{[^}]+\}/)[0]
  assert.match(block, /flex-direction:\s*column/)
  assert.match(block, /align-items:\s*flex-end/)
  assert.ok(!block.includes('align-items: flex-start'))
})