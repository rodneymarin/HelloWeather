import { iconSvg, escapeHtml } from './icons.js'

export function drawerHtml(state) {
  const themeRow = `
    <div class="settings">
      <button class="seg ${state.theme === 'light' ? 'active' : ''}" data-action="set-theme" data-value="light">Light</button>
      <button class="seg ${state.theme === 'dark' ? 'active' : ''}" data-action="set-theme" data-value="dark">Dark</button>
      <button class="seg ${state.theme === 'system' ? 'active' : ''}" data-action="set-theme" data-value="system">System</button>
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
    <div class="drawer-section">Theme</div>
    ${themeRow}
    <div class="drawer-foot muted">Powered by OpenWeather</div>`
}