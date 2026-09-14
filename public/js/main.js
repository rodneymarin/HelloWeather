import { loadState, saveState } from './state.js'
import { fetchWeather } from './api.js'
import { renderHero, renderNoData } from './ui/hero.js'
import { renderHourly } from './ui/hourly.js'
import { renderDaily } from './ui/daily.js'
import { renderHeader } from './ui/header.js'
import { skeleton } from './ui/skeleton.js'
import { offlineBanner } from './ui/banner.js'
import { showToast } from './ui/toast.js'

const state = loadState()

const els = {
  header: document.getElementById('app-header'),
  hero: document.getElementById('hero'),
  hourly: document.getElementById('hourly'),
  daily: document.getElementById('daily'),
  toast: document.getElementById('toast'),
  overlay: document.getElementById('overlay'),
  drawer: document.getElementById('drawer'),
}

function render() {
  renderHeader(state, els)
  document.getElementById('app-footer').textContent = 'Powered by OpenWeather'
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
  const units = state.units
  els.hero.innerHTML = (model.stale ? offlineBanner(model) : '') + renderHero(model, units)
  els.hourly.innerHTML = renderHourly(model, units)
  els.daily.innerHTML = renderDaily(model, units)
}

async function loadWeather(payload) {
  state.q = payload.q ?? payload.name ?? state.q
  state.status = 'loading'
  state.data = null
  render()
  try {
    const data = await fetchWeather(payload)
    state.data = data
    if (data.location?.name) state.q = data.location.name
  } catch (err) {
    state.status = 'error'
    showToast(err.message || 'Could not load weather', 'error')
  } finally {
    state.status = 'done'
    saveState(state)
    render()
  }
}

loadWeather({ q: state.q })