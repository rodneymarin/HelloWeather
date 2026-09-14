import { loadState, saveState, resolveTheme } from './state.js'
import { fetchWeather, fetchGeocode, fetchReverseGeocode, fetchIpLocation } from './api.js'
import { renderHero, renderNoData } from './ui/hero.js'
import { renderHourly } from './ui/hourly.js'
import { renderDaily } from './ui/daily.js'
import { renderHeader } from './ui/header.js'
import { skeleton } from './ui/skeleton.js'
import { offlineBanner, connectionBannerHtml } from './ui/banner.js'
import { showToast } from './ui/toast.js'
import { searchOverlayHtml, renderSearchResults, emptySearchResultsHtml } from './ui/search.js'
import { drawerHtml } from './ui/drawer.js'

const state = loadState()
const systemDark = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
const REFRESH_MS = 10 * 60 * 1000
let refreshing = false

function applyTheme() {
  document.documentElement.dataset.theme = resolveTheme(state.theme, systemDark)
}

applyTheme()

const els = {
  header: document.getElementById('app-header'),
  hero: document.getElementById('hero'),
  hourly: document.getElementById('hourly'),
  daily: document.getElementById('daily'),
  toast: document.getElementById('toast'),
  overlay: document.getElementById('overlay'),
  drawer: document.getElementById('drawer'),
  connBanner: document.getElementById('conn-banner'),
}

function render() {
  renderHeader(state, els)
  if (!state.data) {
    if (state.status === 'loading') {
      els.hero.innerHTML = skeleton(3)
      els.hourly.innerHTML = skeleton()
      els.daily.innerHTML = skeleton(5)
    } else {
      els.hero.innerHTML = renderNoData()
      els.hourly.innerHTML = ''
      els.daily.innerHTML = ''
    }
    return
  }
  const model = state.data
  els.hero.innerHTML = (model.stale ? offlineBanner(model) : '') + renderHero(model)
  els.hourly.innerHTML = renderHourly(model)
  els.daily.innerHTML = renderDaily(model)
}

function updateFavoriteButton() {
  const btn = document.querySelector('[data-action="toggle-fav"]')
  if (btn) btn.style.opacity = state.favorites.includes(state.q) ? '1' : '0.35'
}

function showConnectionBanner(offline) {
  els.connBanner.innerHTML = connectionBannerHtml(offline)
}

async function refreshWeather() {
  if (refreshing) return
  refreshing = true
  const q = state.q
  try {
    const data = await fetchWeather({ q })
    if (state.q !== q) return
    state.data = data
    if (data.location?.name) state.q = data.location.name
    if (state.status === 'error') state.status = 'done'
    saveState(state)
    showConnectionBanner(false)
    render()
    updateFavoriteButton()
  } catch {
    showConnectionBanner(true)
  } finally {
    refreshing = false
  }
}

async function loadWeather(payload) {
  state.status = 'loading'
  if (payload.lat != null) {
    state.q = payload.name || state.q
  } else {
    state.q = payload.q ?? payload.name
  }
  state.data = null
  render()
  try {
    const data = await fetchWeather(payload)
    state.data = data
    if (data.location?.name) state.q = data.location.name
    if (state.status === 'error') state.status = 'done'
    showConnectionBanner(false)
  } catch (err) {
    state.status = 'error'
    showConnectionBanner(true)
    showToast(err.message || 'Could not load weather', 'error')
  } finally {
    state.status = 'done'
    saveState(state)
    render()
    updateFavoriteButton()
  }
}

function openDrawer() {
  els.drawer.innerHTML = drawerHtml(state)
  els.drawer.classList.add('open')
  els.overlay.classList.remove('hidden')
}

function closeDrawer() {
  els.drawer.classList.remove('open')
  els.overlay.classList.add('hidden')
}

function openSearch() {
  els.overlay.innerHTML = searchOverlayHtml()
  els.overlay.classList.remove('hidden')
  const input = document.getElementById('search-input')
  input.focus()
  input.addEventListener('input', async () => {
    const q = input.value.trim()
    const list = document.getElementById('search-results')
    if (!q) {
      list.innerHTML = emptySearchResultsHtml()
      return
    }
    try {
      const results = await fetchGeocode(q)
      list.innerHTML = renderSearchResults(results)
    } catch {
      list.innerHTML = '<li class="muted">Search is unavailable.</li>'
    }
  })
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
      loadWeather({ q: input.value.trim() })
      closeOverlay()
    }
  })
}

function closeOverlay() {
  els.overlay.classList.add('hidden')
  els.overlay.innerHTML = ''
}

function messageTo(list, text) {
  list.innerHTML = `<li class="muted">${text}</li>`
}

function placeLabel(place) {
  return [place.name, place.state, place.country].filter(Boolean).join(', ') || place.name
}

function loadPlaceWeather(place, coords) {
  const payload = coords
    ? { lat: coords.lat, lon: coords.lon, name: placeLabel(place) }
    : { lat: place.lat, lon: place.lon, name: placeLabel(place) }
  loadWeather(payload)
  closeOverlay()
}

async function useMyLocation() {
  const list = document.getElementById('search-results')
  if (!list) return

  if ('geolocation' in navigator) {
    messageTo(list, 'Detecting your location…')
    try {
      const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject))
      const { latitude, longitude } = pos.coords
      const place = (await fetchReverseGeocode({ lat: latitude, lon: longitude }))[0]
      if (place) return loadPlaceWeather(place, { lat: latitude, lon: longitude })
    } catch {
      /* geolocation blocked or failed → fall back to IP location */
    }
  }

  messageTo(list, 'Locating you by IP…')
  try {
    const place = await fetchIpLocation()
    if (!place) throw new Error('no place')
    loadPlaceWeather(place)
  } catch {
    messageTo(list, 'Could not determine your location.')
  }
}

document.addEventListener('click', (e) => {
  const actionEl = e.target.closest('[data-action]')
  if (!actionEl) return
  const { action, value, name } = actionEl.dataset

  switch (action) {
    case 'menu':
      openDrawer()
      break
    case 'toggle-fav': {
      const idx = state.favorites.indexOf(state.q)
      if (idx === -1) {
        state.favorites.push(state.q)
        showToast(`${state.q} added to favorites`)
      } else {
        state.favorites.splice(idx, 1)
        showToast(`${state.q} removed from favorites`)
      }
      saveState(state)
      updateFavoriteButton()
      break
    }
    case 'search':
      openSearch()
      break
    case 'set-theme':
      state.theme = value
      saveState(state)
      applyTheme()
      render()
      openDrawer()
      break
    case 'close-drawer':
      closeDrawer()
      break
    case 'close-search':
      closeOverlay()
      break
    case 'use-location':
      useMyLocation()
      break
    case 'pick-location':
      loadWeather({ q: name })
      closeOverlay()
      break
    case 'goto-fav': {
      const q = state.favorites[Number(value)]
      if (q) loadWeather({ q })
      closeDrawer()
      break
    }
    case 'remove-fav': {
      state.favorites.splice(Number(value), 1)
      saveState(state)
      openDrawer()
      break
    }
    default:
      break
  }
})

render()
updateFavoriteButton()
els.overlay.addEventListener('click', (e) => {
  if (e.target === els.overlay) {
    closeDrawer()
    closeOverlay()
  }
})
loadWeather({ q: state.q })
setInterval(refreshWeather, REFRESH_MS)