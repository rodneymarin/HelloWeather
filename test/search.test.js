import { test } from 'node:test'
import assert from 'node:assert/strict'
import { searchOverlayHtml } from '../public/js/ui/search.js'

test('search overlay offers a current-location button', () => {
  const html = searchOverlayHtml()
  assert.ok(html.includes('use-location'), 'use-location action present')
  assert.ok(html.includes('search-input'), 'input present')
  assert.ok(html.includes('search-results'), 'results list present')
})