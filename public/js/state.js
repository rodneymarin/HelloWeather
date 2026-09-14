const KEYS = { theme: 'helloweather:theme', location: 'helloweather:location', cache: 'helloweather:cache', favorites: 'helloweather:favorites' }

export const DEFAULT_STATE = { theme: 'system', q: 'Maracaibo', favorites: [], data: null, status: 'idle' }

export const THEMES = ['light', 'dark', 'system']

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
    localStorage.setItem(KEYS.theme, s.theme)
    localStorage.setItem(KEYS.location, s.q)
    if (s.data) localStorage.setItem(KEYS.cache, JSON.stringify({ data: s.data }))
    localStorage.setItem(KEYS.favorites, JSON.stringify(s.favorites))
  } catch {
    /* storage unavailable: keep in-memory only */
  }
}