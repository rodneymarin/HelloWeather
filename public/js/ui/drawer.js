import { iconSvg, escapeHtml } from './icons.js'

export function drawerHtml(state) {
  const unitsRow = `
    <div class="settings">
      <button class="seg ${state.units === 'metric' ? 'active' : ''}" data-action="set-units" data-value="metric">Metric °C</button>
      <button class="seg ${state.units === 'imperial' ? 'active' : ''}" data-action="set-units" data-value="imperial">Imperial °F</button>
    </div>`
  const favs = state.favorites.length
    ? state.favorites
        .map((f, i) => `<li><button data-action="goto-fav" data-value="${i}">${escapeHtml(f)}</button><button class="remove" data-action="remove-fav" data-value="${i}">×</button></li>`)
        .join('')
    : '<li class="muted">No favorites yet. Tap the star on any city.</li>'
  return `
    <div class="drawer-head">
      <strong>Locations &amp; settings</strong>
      <button class="icon-btn" data-action="close-drawer">${iconSvg('close')}</button>
    </div>
    <div class="drawer-section">Favorites</div>
    <ul class="fav-list">${favs}</ul>
    <div class="drawer-section">Units</div>
    ${unitsRow}
    <div class="drawer-foot muted">Powered by OpenWeather</div>`
}