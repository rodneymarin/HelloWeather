import { test } from 'node:test'
import assert from 'node:assert/strict'
import { connectionBannerHtml, cachedLabel } from '../public/js/ui/banner.js'

test('connectionBannerHtml shows the connection banner when offline', () => {
  const html = connectionBannerHtml(true)
  assert.match(html, /class="conn-banner"/)
  assert.ok(!html.includes('hidden'))
  assert.ok(html.includes('No connection'))
})

test('connectionBannerHtml hides the banner when online', () => {
  const html = connectionBannerHtml(false)
  assert.match(html, /class="conn-banner hidden"/)
  assert.ok(!html.includes('No connection'))
})

test('cachedLabel is a plain text message for the top updated bar', () => {
  const label = cachedLabel({ updatedAt: 1760000000000 })
  assert.match(label, /^Cached data — last updated at \d{1,2}:\d{2} (AM|PM)$/)
  assert.ok(!label.startsWith('<div'), 'no banner wrapper markup')
})