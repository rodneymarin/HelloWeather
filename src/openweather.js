export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function createOpenWeatherClient({ apiKey, fetchImpl = globalThis.fetch, baseUrl = 'https://api.openweathermap.org' } = {}) {
  return {
    baseUrl,
    apiKey,
    fetchImpl,
    async request(path, params) {
      const url = new URL(path, this.baseUrl)
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, String(value))
      }
      url.searchParams.set('appid', this.apiKey)
      const res = await this.fetchImpl(url)
      if (!res.ok) throw new ApiError(`OpenWeather request failed (${res.status})`, res.status)
      return res.json()
    },
    async getWeather({ lat, lon }) {
      try {
        const data = await this.request('/data/3.0/onecall', { lat, lon, units: 'metric', exclude: 'minutely,alerts' })
        return { source: 'onecall', data }
      } catch (err) {
        if (err instanceof ApiError && [401, 403, 404].includes(err.status)) {
          const [current, forecast] = await Promise.all([
            this.request('/data/2.5/weather', { lat, lon, units: 'metric' }),
            this.request('/data/2.5/forecast', { lat, lon, units: 'metric' }),
          ])
          return { source: 'current-forecast', data: { current, forecast } }
        }
        throw err
      }
    },
    async geocode(query) {
      return this.request('/geo/1.0/direct', { q: query, limit: 5 })
    },
  }
}