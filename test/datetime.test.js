import { test } from 'node:test'
import assert from 'node:assert/strict'
import { localDate, hourLabel, clockLabel, dayLabel, shortDateLabel, updatedLabel } from '../public/js/lib/datetime.js'

const TZ = -14400
const T = 1757844930

test('localDate applies timezone offset to UTC seconds', () => {
  const d = localDate(T, TZ)
  assert.equal(d.getUTCFullYear(), 2025)
  assert.equal(d.getUTCMonth(), 8)
  assert.equal(d.getUTCDate(), 14)
  assert.equal(d.getUTCHours(), 6)
})

test('hourLabel renders 12-hour clock with AM/PM', () => {
  assert.equal(hourLabel(T, TZ), '6:00 AM')
  assert.equal(hourLabel(T + 6 * 3600, TZ), '12:00 PM')
  assert.equal(hourLabel(T + 18 * 3600, TZ), '12:00 AM')
})

test('clockLabel renders minutes', () => {
  assert.equal(clockLabel(T, TZ), '6:15 AM')
})

test('dayLabel maps to short English day names', () => {
  assert.equal(dayLabel(T, TZ), 'Sun')
})

test('shortDateLabel renders day and DD/MM', () => {
  assert.equal(shortDateLabel(T, TZ), 'Sun 14/09')
})

test('updatedLabel renders in local browser time zone', () => {
  const now = Math.floor(Date.now() / 1000)
  assert.match(updatedLabel(now), /^\d{1,2}:\d{2} (AM|PM)$/)
})