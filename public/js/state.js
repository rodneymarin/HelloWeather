const KEYS = { units: 'helloweather:units', location: 'helloweather:location', cache: 'helloweather:cache', favorites: 'helloweather:favorites' }

export const DEFAULT_STATE = { units: 'metric', q: 'Maracaibo', favorites: [], data: null, status: 'idle' }

export function loadState() {
  const s = { ...DEFAULT_STATE }
  try {
    s.units = localStorage.getItem(KEYS.units) === 'imperial' ? 'imperial' : 'metric'
    const q = localStorage.getItem(KEYS.location)
    if (q) s.q = q
    const cache = localStorage.getItem(KEYS.cache)
    if (cache) {
      const c = JSON.parse(cache)
      if (c?.data) s.data = c.data
    }
    s.favorites = JSON.parse(localStorage.getItem(KEYS.favorites) || '[]')
  } catch {
    /* corrupted storage: fall back to defaults */
  }
  return s
}

export function saveState(s) {
  try {
    localStorage.setItem(KEYS.units, s.units)
    localStorage.setItem(KEYS.location, s.q)
    if (s.data) localStorage.setItem(KEYS.cache, JSON.stringify({ data: s.data }))
    localStorage.setItem(KEYS.favorites, JSON.stringify(s.favorites))
  } catch {
    /* storage unavailable: keep in-memory only */
  }
}