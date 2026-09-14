import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveTheme, DEFAULT_STATE } from '../public/js/state.js'

test('resolveTheme falls back to system when no saved preference', () => {
  assert.equal(resolveTheme(null, true), 'dark')
  assert.equal(resolveTheme(undefined, false), 'light')
})

test('resolveTheme prefers an explicit saved theme', () => {
  assert.equal(resolveTheme('light', true), 'light')
  assert.equal(resolveTheme('dark', false), 'dark')
})

test('resolveTheme treats "system" or invalid values as system preference', () => {
  assert.equal(resolveTheme('system', true), 'dark')
  assert.equal(resolveTheme('banana', false), 'light')
})

test('DEFAULT_STATE uses system theme', () => {
  assert.equal(DEFAULT_STATE.theme, 'system')
})