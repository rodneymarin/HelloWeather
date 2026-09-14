import { test } from 'node:test'
import assert from 'node:assert/strict'
import { connectionBannerHtml } from '../public/js/ui/banner.js'

test('connectionBannerHtml shows the connection banner when offline', () => {
  const html = connectionBannerHtml(true)
  assert.match(html, /class="conn-banner"/)
  assert.ok(html.includes('No connection'))
})

test('connectionBannerHtml renders nothing when online', () => {
  assert.equal(connectionBannerHtml(false), '')
})