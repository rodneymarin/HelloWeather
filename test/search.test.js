import { test } from 'node:test'
import assert from 'node:assert/strict'
import { searchOverlayHtml, renderSearchResults } from '../public/js/ui/search.js'

test('search overlay offers a current-location button', () => {
  const html = searchOverlayHtml()
  assert.ok(html.includes('use-location'), 'use-location action present')
  assert.ok(html.includes('search-input'), 'input present')
  assert.ok(html.includes('search-results'), 'results list present')
})

test('search results carry coordinates for a stable location', () => {
  const html = renderSearchResults([{ name: 'Maracaibo', state: 'Zulia', country: 'VE', lat: 10.64, lon: -71.61 }])
  assert.ok(html.includes('data-lat="10.64"'), 'lat attribute present')
  assert.ok(html.includes('data-lon="-71.61"'), 'lon attribute present')
  assert.ok(html.includes('data-name="Maracaibo, Zulia, VE"'), 'name label present')
})