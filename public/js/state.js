const KEYS = { theme: 'helloweather:theme', location: 'helloweather:location', coords: 'helloweather:coords', cache: 'helloweather:cache', favorites: 'helloweather:favorites', refresh: 'helloweather:refresh', feelsLike: 'helloweather:feelslike' }

export const DEFAULT_STATE = { theme: 'system', q: 'Maracaibo', favorites: [], data: null, status: 'idle', coords: null, refreshMin: 15, feelsLike: 'formula' }

export const THEMES = ['light', 'dark', 'system']

export const REFRESH_OPTIONS = [5, 15, 30, 60]

export const FEELS_LIKE_OPTIONS = ['formula', 'api']

export function resolveTheme(saved, systemIsDark) {
  if (saved === 'light' || saved === 'dark') return saved
  return systemIsDark ? 'dark' : 'light'
}

export function loadState() {
  const s = { ...DEFAULT_STATE }
  try {
    const theme = localStorage.getItem(KEYS.theme)
    if (THEMES.includes(theme)) s.theme = theme
    const q = localStorage.getItem(KEYS.location)
    if (q) s.q = q
    const coords = localStorage.getItem(KEYS.coords)
    if (coords) {
      const c = JSON.parse(coords)
      if (typeof c?.lat === 'number' && typeof c?.lon === 'number') s.coords = { lat: c.lat, lon: c.lon }
    }
    const cache = localStorage.getItem(KEYS.cache)
    if (cache) {
      const c = JSON.parse(cache)
      if (c?.data) s.data = c.data
    }
    s.favorites = JSON.parse(localStorage.getItem(KEYS.favorites) || '[]')
    const refreshMin = Number(localStorage.getItem(KEYS.refresh))
    if (REFRESH_OPTIONS.includes(refreshMin)) s.refreshMin = refreshMin
    const feelsLike = localStorage.getItem(KEYS.feelsLike)
    if (FEELS_LIKE_OPTIONS.includes(feelsLike)) s.feelsLike = feelsLike
  } catch {
    /* corrupted storage: fall back to defaults */
  }
  return s
}

export function saveState(s) {
  try {
    localStorage.setItem(KEYS.theme, s.theme)
    localStorage.setItem(KEYS.location, s.q)
    if (s.coords) localStorage.setItem(KEYS.coords, JSON.stringify(s.coords))
    if (s.data) localStorage.setItem(KEYS.cache, JSON.stringify({ data: s.data }))
    localStorage.setItem(KEYS.favorites, JSON.stringify(s.favorites))
    localStorage.setItem(KEYS.refresh, String(s.refreshMin))
    localStorage.setItem(KEYS.feelsLike, s.feelsLike)
  } catch {
    /* storage unavailable: keep in-memory only */
  }
}