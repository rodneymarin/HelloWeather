import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeWeather } from '../src/normalize.js'
import { onecallFixture } from './fixtures/onecall.js'
import { basicCurrentFixture } from './fixtures/basic-current.js'
import { basicForecastFixture } from './fixtures/basic-forecast.js'

test('normalizes One Call 3.0 payload', () => {
  const model = normalizeWeather({ source: 'onecall', data: onecallFixture }, 'Maracaibo')
  assert.equal(model.source, 'onecall')
  assert.equal(model.location.name, 'Maracaibo')
  assert.equal(model.timezone, -14400)

  assert.equal(model.current.tempC, 30)
  assert.equal(model.current.condition, 'Clouds')
  assert.equal(model.current.humidity, 70)
  assert.equal(model.current.uvIndex, 8)
  assert.equal(model.current.windKmh, 18)
  assert.equal(model.current.windDeg, 90)
  assert.equal(Math.round(model.current.windGustKmh), 30)

  assert.deepEqual(model.today, { minC: 28, maxC: 35 })
  assert.equal(model.sun.sunriseSec, 1757808000)

  assert.equal(model.hourly.length, 3)
  assert.equal(model.hourly[0].tempC, 30)
  assert.equal(Math.round(model.hourly[0].gustKmh), 30)
  assert.equal(model.hourly[1].gustKmh, null)

  assert.equal(model.daily.length, 1)
  const day = model.daily[0]
  assert.equal(day.minC, 28)
  assert.equal(day.maxC, 35)
  assert.equal(Math.round(day.windKmh), 22)
  assert.equal(day.precipMm, 2.2)
  assert.equal(day.pop, 0.48)
  assert.equal(day.uvIndex, 8)
  assert.ok(day.moonPhase >= 0 && day.moonPhase <= 1)
})

test('normalizes Current + Forecast fallback payload', () => {
  const data = { current: basicCurrentFixture, forecast: basicForecastFixture }
  const model = normalizeWeather({ source: 'current-forecast', data }, 'Maracaibo')
  assert.equal(model.source, 'current-forecast')
  assert.equal(model.current.tempC, 30)
  assert.equal(model.current.uvIndex, null)
  assert.equal(model.current.windKmh, 18)

  assert.deepEqual(model.today, { minC: 28, maxC: 35 })

  assert.equal(model.hourly.length, 2)
  assert.equal(model.hourly[0].pop, 0.2)
  assert.equal(model.hourly[1].gustKmh, null)

  assert.equal(model.daily.length, 1)
  assert.equal(model.daily[0].minC, 27)
  assert.equal(model.daily[0].maxC, 31)
  assert.equal(model.daily[0].precipMm, 2.2)
  assert.equal(model.daily[0].pop, 0.48)
  assert.equal(model.daily[0].uvIndex, null)
})