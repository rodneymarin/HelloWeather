import { moonPhase } from '../public/js/lib/astro.js'

const toKmh = (ms) => ms * 3.6

function first(arr) {
  return Array.isArray(arr) && arr.length ? arr[0] : undefined
}

function weatherInfo(list) {
  const w0 = first(list)
  if (!w0) return { condition: 'Unknown', icon: null, description: '' }
  return { condition: w0.main, icon: w0.icon, description: w0.description || '' }
}

function normalizeOneCall(data, placeName) {
  const current = data.current
  const cw = weatherInfo(current.weather)
  const hourly = (data.hourly || []).slice(0, 48)
  const daily = (data.daily || []).slice(0, 5)
  const today = first(daily)

  return {
    source: 'onecall',
    updatedAt: Date.now(),
    location: { name: placeName, lat: data.lat, lon: data.lon, country: undefined },
    timezone: data.timezone,
    current: {
      tempC: current.temp,
      condition: cw.condition,
      icon: cw.icon,
      description: cw.description,
      feelsLikeC: current.feels_like,
      humidity: current.humidity,
      cloudiness: current.clouds,
      windKmh: toKmh(current.wind_speed ?? 0),
      windDeg: current.wind_deg ?? 0,
      windGustKmh: current.wind_gust != null ? toKmh(current.wind_gust) : null,
      uvIndex: current.uvi ?? null,
      precipMm: null,
    },
    today: today ? { minC: today.temp.min, maxC: today.temp.max } : null,
    sun: { sunriseSec: current.sunrise, sunsetSec: current.sunset },
    hourly: hourly.map((h) => ({
      dt: h.dt,
      tempC: h.temp,
      windKmh: toKmh(h.wind_speed ?? 0),
      windDeg: h.wind_deg ?? 0,
      gustKmh: h.wind_gust != null ? toKmh(h.wind_gust) : null,
      pop: h.pop ?? 0,
      ...weatherInfo(h.weather),
    })),
    daily: daily.map((d) => ({
      dt: d.dt,
      minC: d.temp.min,
      maxC: d.temp.max,
      windKmh: toKmh(d.wind_speed ?? 0),
      windDeg: d.wind_deg ?? 0,
      gustKmh: d.wind_gust != null ? toKmh(d.wind_gust) : null,
      precipMm: d.rain ?? 0,
      pop: d.pop ?? 0,
      uvIndex: d.uvi ?? null,
      moonPhase: moonPhase(d.dt),
      ...weatherInfo(d.weather),
    })),
  }
}

function groupByLocalDay(list, tzOffsetSec) {
  const groups = new Map()
  for (const item of list) {
    const key = new Date((item.dt + tzOffsetSec) * 1000).toISOString().slice(0, 10)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(item)
  }
  return [...groups.values()]
}

function nearestNoon(items, tzOffsetSec) {
  return items.slice().sort((a, b) => {
    const da = Math.abs(new Date((a.dt + tzOffsetSec) * 1000).getUTCHours() - 12)
    const db = Math.abs(new Date((b.dt + tzOffsetSec) * 1000).getUTCHours() - 12)
    return da - db
  })[0]
}

function normalizeBasic(data, placeName) {
  const { current, forecast } = data
  const tz = forecast.city.timezone
  const cw = weatherInfo(current.weather)
  const days = groupByLocalDay(forecast.list, tz).slice(0, 5)

  return {
    source: 'current-forecast',
    updatedAt: Date.now(),
    location: { name: placeName || current.name, lat: current.coord?.lat, lon: current.coord?.lon, country: current.sys?.country },
    timezone: tz,
    current: {
      tempC: current.main.temp,
      condition: cw.condition,
      icon: cw.icon,
      description: cw.description,
      feelsLikeC: current.main.feels_like,
      humidity: current.main.humidity,
      cloudiness: current.clouds?.all ?? null,
      windKmh: toKmh(current.wind.speed ?? 0),
      windDeg: current.wind.deg ?? 0,
      windGustKmh: current.wind.gust != null ? toKmh(current.wind.gust) : null,
      uvIndex: null,
      precipMm: current.rain?.['1h'] ?? null,
    },
    today: { minC: current.main.temp_min, maxC: current.main.temp_max },
    sun: { sunriseSec: current.sys.sunrise, sunsetSec: current.sys.sunset },
    hourly: forecast.list.slice(0, 16).map((h) => ({
      dt: h.dt,
      tempC: h.main.temp,
      windKmh: toKmh(h.wind.speed ?? 0),
      windDeg: h.wind.deg ?? 0,
      gustKmh: h.wind.gust != null ? toKmh(h.wind.gust) : null,
      pop: h.pop ?? 0,
      ...weatherInfo(h.weather),
    })),
    daily: days.map((items) => {
      const noon = nearestNoon(items, tz)
      const wn = weatherInfo(noon?.weather)
      return {
        dt: items[0].dt,
        minC: Math.min(...items.map((i) => i.main.temp_min ?? i.main.temp)),
        maxC: Math.max(...items.map((i) => i.main.temp_max ?? i.main.temp)),
        windKmh: toKmh(noon?.wind.speed ?? 0),
        windDeg: noon?.wind.deg ?? 0,
        gustKmh: noon?.wind.gust != null ? toKmh(noon.wind.gust) : null,
        precipMm: items.reduce((sum, i) => sum + (i.rain?.['3h'] ?? 0), 0),
        pop: Math.max(...items.map((i) => i.pop ?? 0)),
        uvIndex: null,
        moonPhase: moonPhase(items[0].dt),
        condition: wn.condition,
        icon: wn.icon,
      }
    }),
  }
}

export function normalizeWeather(providerResult, placeName = '') {
  if (providerResult.source === 'onecall') return normalizeOneCall(providerResult.data, placeName)
  return normalizeBasic(providerResult.data, placeName)
}