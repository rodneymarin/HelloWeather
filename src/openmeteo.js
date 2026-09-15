export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const DEFAULT_FORECAST_URL = 'https://api.open-meteo.com'
const DEFAULT_GEOCODE_URL = 'https://geocoding-api.open-meteo.com'
const DEFAULT_REVERSE_URL = 'https://nominatim.openstreetmap.org'

export function createOpenMeteoClient({
  fetchImpl = globalThis.fetch,
  forecastBaseUrl = DEFAULT_FORECAST_URL,
  geocodeBaseUrl = DEFAULT_GEOCODE_URL,
  reverseBaseUrl = DEFAULT_REVERSE_URL,
} = {}) {
  async function request(url, init) {
    const res = await fetchImpl(url, init)
    if (!res.ok) throw new ApiError(`Open-Meteo request failed (${res.status})`, res.status)
    return res.json()
  }

  function forecastUrl({ lat, lon }) {
    const url = new URL('/v1/forecast', forecastBaseUrl)
    const params = {
      latitude: lat,
      longitude: lon,
      timezone: 'auto',
      forecast_days: 5,
      forecast_hours: 48,
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
      hourly: 'temperature_2m,precipitation,precipitation_probability,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant,wind_gusts_10m_max',
    }
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))
    return url
  }

  return {
    async getWeather({ lat, lon }) {
      return request(forecastUrl({ lat, lon }))
    },
    async geocode(query) {
      const url = new URL('/v1/search', geocodeBaseUrl)
      url.searchParams.set('name', query)
      url.searchParams.set('count', '5')
      url.searchParams.set('language', 'en')
      url.searchParams.set('format', 'json')
      const data = await request(url)
      return (data.results ?? []).map((p) => ({
        name: p.name,
        country: p.country_code,
        state: p.admin1,
        lat: p.latitude,
        lon: p.longitude,
      }))
    },
    async reverseGeocode(lat, lon) {
      const url = new URL('/reverse', reverseBaseUrl)
      url.searchParams.set('lat', String(lat))
      url.searchParams.set('lon', String(lon))
      url.searchParams.set('format', 'jsonv2')
      url.searchParams.set('zoom', '10')
      const data = await request(url, { headers: { 'User-Agent': 'HelloWeather/0.1 (weather demo app)' } })
      const a = data.address ?? {}
      const name = a.city || a.town || a.village || data.name
      return [{ name, country: a.country_code, state: a.state, lat: Number(lat), lon: Number(lon) }]
    },
  }
}