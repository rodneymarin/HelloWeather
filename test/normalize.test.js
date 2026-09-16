import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeWeather } from '../src/normalize.js'
import { openmeteoFixture, airQualityFixture } from './fixtures/openmeteo.js'

test('maps current weather from Open-Meteo', () => {
  const m = normalizeWeather(openmeteoFixture, 'Maracaibo')
  assert.equal(m.source, 'open-meteo')
  assert.equal(m.location.name, 'Maracaibo')
  assert.equal(m.location.lat, 10.66)
  assert.equal(m.timezone, -14400)
  assert.equal(m.current.tempC, 30.1)
  assert.ok(Math.abs(m.current.feelsLikeC - 33.4) < 0.01)
  assert.equal(m.current.humidity, 62)
  assert.equal(m.current.cloudiness, 40)
  assert.equal(m.current.windKmh, 12.5)
  assert.equal(m.current.windDeg, 90)
  assert.equal(m.current.windGustKmh, 28.3)
  assert.equal(m.current.precipMm, 0.3)
  assert.equal(m.current.pop, 0.4)
  assert.equal(m.current.uvIndex, 7.2)
  assert.equal(m.current.condition, 'Partly cloudy')
  assert.equal(m.current.icon, 'partcloud')
})

test('hourly items use epoch dt, fraction pop and precipitation mm', () => {
  const m = normalizeWeather(openmeteoFixture, 'Maracaibo')
  assert.equal(m.hourly.length, 3)
  const h1 = m.hourly[2]
  assert.equal(h1.pop, 0.65)
  assert.equal(h1.precipMm, 1.2)
  assert.equal(h1.condition, 'Rain')
  assert.equal(h1.icon, 'rain')
  assert.ok(Math.abs(m.hourly[0].feelsLikeC - 33.4) < 0.01, 'hourly feels-like uses the API apparent temperature')
  const expectedDt = Date.parse('2026-09-14T12:00Z') / 1000 + 14400
  assert.equal(h1.dt, expectedDt)
})

test('converts local ISO sun times to epoch seconds', () => {
  const m = normalizeWeather(openmeteoFixture, 'Maracaibo')
  const expectedSunrise = Date.parse('2026-09-14T06:20Z') / 1000 + 14400
  assert.equal(m.sun.sunriseSec, expectedSunrise)
  const expectedSunset = Date.parse('2026-09-14T18:40Z') / 1000 + 14400
  assert.equal(m.sun.sunsetSec, expectedSunset)
})

test('maps daily forecast with fraction pop, uv max and moon phase', () => {
  const m = normalizeWeather(openmeteoFixture, 'Maracaibo')
  assert.equal(m.daily.length, 2)
  assert.deepEqual(m.today, { minC: 24.8, maxC: 31.2 })
  const d1 = m.daily[1]
  assert.equal(d1.minC, 23.9)
  assert.equal(d1.maxC, 29.5)
  assert.equal(d1.pop, 0.9)
  assert.equal(d1.precipMm, 12.2)
  assert.equal(d1.uvIndex, 7.9)
  assert.equal(d1.icon, 'rain')
  assert.ok(Math.abs(m.daily[0].feelsLikeMaxC - 34.1) < 0.01, 'daily max feels-like uses the API apparent temperature')
  assert.ok(Math.abs(m.daily[0].feelsLikeMinC - 26.3) < 0.01, 'daily min feels-like uses the API apparent temperature')
  assert.ok(Math.abs(m.daily[1].feelsLikeMinC - 24.5) < 0.01, 'second day min feels-like uses the API apparent temperature')
  assert.ok(Number.isFinite(d1.moonPhase))
})

test('current pop falls back to daily max when hourly probability is missing', () => {
  const data = JSON.parse(JSON.stringify(openmeteoFixture))
  delete data.hourly.precipitation_probability
  const m = normalizeWeather(data, 'Maracaibo')
  assert.equal(m.current.pop, 0.65)
})

test('maps air quality AQI into the model with a category label', () => {
  const m = normalizeWeather(openmeteoFixture, 'Maracaibo', airQualityFixture)
  assert.equal(m.airQuality.aqi, 42)
  assert.equal(m.airQuality.label, 'Good')
  assert.equal(m.airQuality.cls, 'good')
})

test('airQuality is null when no air quality data is present', () => {
  const m = normalizeWeather(openmeteoFixture, 'Maracaibo')
  assert.equal(m.airQuality, null)
})

test('airQuality is null when us_aqi is missing', () => {
  const m = normalizeWeather(openmeteoFixture, 'Maracaibo', { current: {} })
  assert.equal(m.airQuality, null)
})

test('caps hourly at 48 entries and daily at 5', () => {
  const data = JSON.parse(JSON.stringify(openmeteoFixture))
  data.hourly.time = Array.from({ length: 60 }, (_, i) => `2026-09-14T${String(i % 24).padStart(2, '0')}:00`)
  data.hourly.temperature_2m = Array.from({ length: 60 }, () => 25)
  data.hourly.weather_code = Array.from({ length: 60 }, () => 0)
  data.daily.time = Array.from({ length: 8 }, (_, i) => `2026-09-${String(14 + i).padStart(2, '0')}`)
  data.daily.temperature_2m_max = Array.from({ length: 8 }, () => 30)
  data.daily.temperature_2m_min = Array.from({ length: 8 }, () => 22)
  data.daily.weather_code = Array.from({ length: 8 }, () => 0)
  const m = normalizeWeather(data, 'Maracaibo')
  assert.equal(m.hourly.length, 48)
  assert.equal(m.daily.length, 5)
})