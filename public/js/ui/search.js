import { iconSvg, escapeHtml } from './icons.js'

export function emptySearchResultsHtml() {
  return `<li><button class="search-result use-location" data-action="use-location">${iconSvg('pin')} Use my current location</button></li>`
}

export function searchOverlayHtml() {
  return `
    <div class="search-box">
      <div class="search-head">
        <input id="search-input" type="text" placeholder="City name or coordinates" autocomplete="off" />
        <button class="icon-btn" data-action="close-search">${iconSvg('close')}</button>
      </div>
      <ul id="search-results">${emptySearchResultsHtml()}</ul>
    </div>`
}

export function renderSearchResults(results) {
  if (!results.length) return '<li class="muted">No locations found.</li>'
  return results
    .map((r) => {
      const label = [r.name, r.state, r.country].filter(Boolean).join(', ') || r.name
      return `<li><button class="search-result" data-action="pick-location" data-name="${escapeHtml(label)}">${escapeHtml(label)}</button></li>`
    })
    .join('')
}