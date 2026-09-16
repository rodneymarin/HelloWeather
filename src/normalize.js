import { moonPhase } from '../public/js/lib/astro.js'

function first(arr) {
  return Array.isArray(arr) && arr.length ? arr[0] : undefined
}

function toFraction(pct) {
  return pct == null ? 0 : pct / 100
}

const WMO_CONDITIONS = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Fog',
  51: 'Drizzle', 53: 'Drizzle', 55: 'Drizzle',
  56: 'Freezing drizzle', 57: 'Freezing drizzle',
  61: 'Rain', 63: 'Rain', 65: 'Rain',
  66: 'Freezing rain', 67: 'Freezing rain',
  71: 'Snowfall', 73: 'Snowfall', 75: 'Snowfall', 77: 'Snow grains',
  80: 'Rain showers', 81: 'Rain showers', 82: 'Rain showers',
  85: 'Snow showers', 86: 'Snow showers',
  95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with hail',
}

const WMO_ICONS = {
  0: 'sun', 1: 'sun', 2: 'partcloud', 3: 'cloud',
  45: 'fog', 48: 'fog',
  51: 'rain', 53: 'rain', 55: 'rain', 56: 'rain', 57: 'rain',
  61: 'rain', 63: 'rain', 65: 'rain', 66: 'rain', 67: 'rain',
  71: 'snow', 73: 'snow', 75: 'snow', 77: 'snow',
  80: 'rain', 81: 'rain', 82: 'rain',
  85: 'snow', 86: 'snow',
  95: 'storm', 96: 'storm', 99: 'storm',
}

function wmoInfo(code) {
  if (!Number.isFinite(code)) return { condition: 'Unknown', icon: null, description: '' }
  return { condition: WMO_CONDITIONS[code] ?? 'Unknown', icon: WMO_ICONS[code] ?? 'cloud', description: '' }
}

function epochFromLocalIso(iso, tzOffsetSec) {
  return Date.parse(`${iso}Z`) / 1000 - tzOffsetSec
}

const AQI_BANDS = [
  { max: 50, label: 'Good', cls: 'good' },
  { max: 100, label: 'Moderate', cls: 'moderate' },
  { max: 150, label: 'Unhealthy for sensitive groups', cls: 'sensitive' },
  { max: 200, label: 'Unhealthy', cls: 'unhealthy' },
  { max: 300, label: 'Very unhealthy', cls: 'very-unhealthy' },
  { max: Infinity, label: 'Hazardous', cls: 'hazardous' },
]

function aqiInfo(aqi) {
  if (aqi == null || !Number.isFinite(aqi)) return null
  const band = AQI_BANDS.find((b) => aqi <= b.max) ?? AQI_BANDS[AQI_BANDS.length - 1]
  return { aqi: Math.round(aqi), label: band.label, cls: band.cls }
}

export function normalizeWeather(data, placeName = '', airData = null) {
  const tz = data.utc_offset_seconds
  const cur = data.current ?? {}
  const cw = wmoInfo(cur.weather_code)
  const times = data.hourly?.time ?? []
  const dailyTimes = data.daily?.time ?? []
  const n = Math.min(times.length, 48)
  const d = Math.min(dailyTimes.length, 5)

  const pop0 = data.hourly?.precipitation_probability?.[0]
  const uv0 = data.hourly?.uv_index?.[0]
  const dailyPopMax = first(data.daily?.precipitation_probability_max)
  const dailyUvMax = first(data.daily?.uv_index_max)
  const airInfo = aqiInfo(airData?.current?.us_aqi)

  return {
    source: 'open-meteo',
    updatedAt: Date.now(),
    location: { name: placeName, lat: data.latitude, lon: data.longitude, country: undefined },
    timezone: tz,
    current: {
      tempC: cur.temperature_2m,
      condition: cw.condition,
      icon: cw.icon,
      description: cw.description,
      feelsLikeC: cur.apparent_temperature ?? cur.temperature_2m,
      humidity: cur.relative_humidity_2m,
      cloudiness: cur.cloud_cover,
      windKmh: cur.wind_speed_10m ?? 0,
      windDeg: cur.wind_direction_10m ?? 0,
      windGustKmh: cur.wind_gusts_10m ?? null,
      uvIndex: uv0 ?? dailyUvMax ?? null,
      precipMm: cur.precipitation ?? null,
      pop: pop0 != null ? toFraction(pop0) : toFraction(dailyPopMax),
    },
    airQuality: airInfo,
    today: d ? { minC: data.daily.temperature_2m_min[0], maxC: data.daily.temperature_2m_max[0] } : null,
    sun: {
      sunriseSec: data.daily?.sunrise?.[0] != null ? epochFromLocalIso(data.daily.sunrise[0], tz) : null,
      sunsetSec: data.daily?.sunset?.[0] != null ? epochFromLocalIso(data.daily.sunset[0], tz) : null,
    },
    hourly: Array.from({ length: n }, (_, i) => ({
      dt: epochFromLocalIso(times[i], tz),
      tempC: data.hourly.temperature_2m[i],
      windKmh: data.hourly.wind_speed_10m?.[i] ?? 0,
      windDeg: data.hourly.wind_direction_10m?.[i] ?? 0,
      gustKmh: data.hourly.wind_gusts_10m?.[i] ?? null,
      precipMm: data.hourly.precipitation?.[i] ?? null,
      pop: toFraction(data.hourly.precipitation_probability?.[i]),
      feelsLikeC: data.hourly.apparent_temperature?.[i] ?? data.hourly.temperature_2m[i],
      ...wmoInfo(data.hourly.weather_code?.[i]),
    })),
    daily: Array.from({ length: d }, (_, i) => {
      return {
        dt: epochFromLocalIso(dailyTimes[i], tz),
        minC: data.daily.temperature_2m_min[i],
        maxC: data.daily.temperature_2m_max[i],
        windKmh: data.daily.wind_speed_10m_max?.[i] ?? 0,
        windDeg: data.daily.wind_direction_10m_dominant?.[i] ?? 0,
        gustKmh: data.daily.wind_gusts_10m_max?.[i] ?? null,
        precipMm: data.daily.precipitation_sum?.[i] ?? 0,
        pop: toFraction(data.daily.precipitation_probability_max?.[i]),
        uvIndex: data.daily.uv_index_max?.[i] ?? null,
        feelsLikeMaxC: data.daily.apparent_temperature_max?.[i] ?? data.daily.temperature_2m_max[i],
        feelsLikeMinC: data.daily.apparent_temperature_min?.[i] ?? data.daily.temperature_2m_min[i],
        moonPhase: moonPhase(epochFromLocalIso(dailyTimes[i], tz)),
        ...wmoInfo(data.daily.weather_code?.[i]),
      }
    }),
  }
}