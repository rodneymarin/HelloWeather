import { test } from 'node:test'
import assert from 'node:assert/strict'
import { moonPhase, moonPhaseLabel } from '../public/js/lib/astro.js'

const NEW_MOON = 947182440
const SYNODIC = 2551442.796

test('moonPhase is 0 at the reference new moon', () => {
  assert.equal(moonPhase(NEW_MOON), 0)
})

test('moonPhase returns to 0 after a full synodic period', () => {
  assert.ok(Math.abs(moonPhase(NEW_MOON + SYNODIC)) < 1e-9)
})

test('moonPhase at ~quarter is near 0.25', () => {
  const q = NEW_MOON + SYNODIC / 4
  assert.ok(Math.abs(moonPhase(q) - 0.25) < 0.01)
})

test('labels map phase ranges to named phases', () => {
  assert.equal(moonPhaseLabel(0), 'New Moon')
  assert.equal(moonPhaseLabel(0.25), 'First Quarter')
  assert.equal(moonPhaseLabel(0.5), 'Full Moon')
  assert.equal(moonPhaseLabel(0.75), 'Last Quarter')
  assert.equal(moonPhaseLabel(0.1), 'Waxing Crescent')
  assert.equal(moonPhaseLabel(0.4), 'Waxing Gibbous')
  assert.equal(moonPhaseLabel(0.6), 'Waning Gibbous')
  assert.equal(moonPhaseLabel(0.9), 'Waning Crescent')
})