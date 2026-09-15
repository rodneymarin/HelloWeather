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

test('renderHero groups temperature and metrics together in the top row left-aligned', () => {
  const html = renderHero(MODEL, 'metric')
  const top = html.indexOf('class="hero-top"')
  const group = html.indexOf('class="hero-top-group"')
  const temp = html.indexOf('class="hero-temp-group"')
  const metrics = html.indexOf('class="hero-metrics"')
  const right = html.indexOf('class="hero-right"')
  assert.ok(group > top, 'top group opens the top block')
  assert.ok(temp > group && metrics > temp, 'temperature and metrics are inside the group in order')
  assert.ok(right > metrics, 'hero-right sits after the group')
  assert.ok(html.indexOf('class="hero-day"') > right, 'day block stays in the hero-right group')
})

test('renderHero nests the sun times inside hero-right below the condition/day group', () => {
  const html = renderHero(MODEL, 'metric')
  const right = html.indexOf('class="hero-right"')
  const group = html.indexOf('class="hero-condition-day"')
  const condition = html.indexOf('class="hero-condition"')
  const day = html.indexOf('class="hero-day"')
  const sun = html.indexOf('class="hero-sun-times"')
  assert.ok(group > right && day > group, 'condition/day group lives inside hero-right')
  assert.ok(condition > day, 'condition follows the day inside the group')
  assert.ok(sun > condition, 'sun times sit below the condition/day group')
  assert.ok(html.slice(day, condition).includes('</div>'), 'the day block closes before the condition opens')
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

test('hero-condition-day stacks day above condition with a vertical gap', () => {
  const block = css.match(/\.hero-condition-day\s*\{[^}]+\}/)[0]
  assert.match(block, /flex-direction:\s*column/)
  assert.match(block, /gap:\s*28px/)
})

test('hero-top-group keeps temperature and metrics side by side with a 20px gap', () => {
  const block = css.match(/\.hero-top-group\s*\{[^}]+\}/)[0]
  assert.match(block, /display:\s*flex/)
  assert.match(block, /flex-direction:\s*row/)
  assert.match(block, /gap:\s*20px/)
  assert.match(block, /align-items:\s*flex-start/)
})

test('hero-condition lays out icon and text horizontally', () => {
  const block = css.match(/\.hero-condition\s*\{[^}]+\}/)[0]
  assert.match(block, /flex-direction:\s*row/)
  assert.match(block, /align-items:\s*center/)
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