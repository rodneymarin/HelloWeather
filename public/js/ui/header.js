import { iconSvg, escapeHtml } from './icons.js'

export function renderHeader(state, els) {
  els.header.innerHTML = `
    <div class="header-left">
      <button class="icon-btn" data-action="menu" aria-label="Menu">${iconSvg('menu')}</button>
      <button class="icon-btn" data-action="toggle-fav" aria-label="Favorite">${iconSvg('star')}</button>
      <span class="header-location">${escapeHtml(state.q)}</span>
    </div>
    <div class="header-right">
      <button class="icon-btn" data-action="search" aria-label="Search">${iconSvg('search')}</button>
    </div>`
}