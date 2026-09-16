import { test } from 'node:test'
import assert from 'node:assert/strict'
import { heatIndexC, dewPointC, humidexC, customFeelsLikeC, applyFeelsLikeModel } from '../public/js/lib/feelslike.js'

const near = (got, want, tol = 0.2) => assert.ok(Math.abs(got - want) < tol, `expected ${got} to be within ${tol} of ${want}`)

test('heatIndexC computes the NOAA heat index for Maracaibo afternoon conditions', () => {
  near(heatIndexC(29.6, 71), 34.3)
})

test('heatIndexC falls back to air temperature below the NOAA validity range', () => {
  assert.equal(heatIndexC(20, 60), 20)
  assert.equal(heatIndexC(30, 30), 30)
})

test('dewPointC derives a plausible dew point', () => {
  near(dewPointC(29.6, 71), 23.8)
})

test('humidexC computes the Canadian Humidex', () => {
  near(humidexC(29.6, 71), 40.65)
})

test('customFeelsLikeC averages heat index and humidex', () => {
  near(customFeelsLikeC(29.6, 71), 37.5)
})

test('applyFeelsLikeModel returns the model untouched in api mode', () => {
  const model = makeModel()
  assert.equal(applyFeelsLikeModel(model, 'api'), model)
})

test('applyFeelsLikeModel recomputes every feels-like field in formula mode', () => {
  const model = makeModel()
  const out = applyFeelsLikeModel(model, 'formula')
  assert.notEqual(out, model)
  near(out.current.feelsLikeC, customFeelsLikeC(30.1, 62))
  near(out.hourly[0].feelsLikeC, customFeelsLikeC(30.1, 62))
  near(out.hourly[1].feelsLikeC, customFeelsLikeC(30.5, 60))
  near(out.daily[0].feelsLikeMaxC, customFeelsLikeC(31.2, 88), 0.3)
  near(out.daily[0].feelsLikeMinC, customFeelsLikeC(24.8, 70), 0.3)
})

test('applyFeelsLikeModel does not mutate the source model', () => {
  const model = makeModel()
  const snapshot = JSON.stringify(model)
  applyFeelsLikeModel(model, 'formula')
  assert.equal(JSON.stringify(model), snapshot)
})

test('applyFeelsLikeModel keeps the stored feels-like when humidity is missing', () => {
  const model = makeModel()
  model.current.humidity = null
  const out = applyFeelsLikeModel(model, 'formula')
  assert.equal(out.current.feelsLikeC, model.current.feelsLikeC)
})

function makeModel() {
  return {
    timezone: -14400,
    current: {
      tempC: 30.1,
      humidity: 62,
      feelsLikeC: 33.4,
    },
    hourly: [
      { tempC: 30.1, humidity: 62, feelsLikeC: 33.4 },
      { tempC: 30.5, humidity: 60, feelsLikeC: 34.0 },
      { tempC: 29.8, humidity: 65, feelsLikeC: 32.9 },
    ],
    daily: [
      {
        minC: 24.8,
        maxC: 31.2,
        humidityMax: 70,
        humidityMin: 88,
        feelsLikeMaxC: 34.1,
        feelsLikeMinC: 26.3,
      },
      {
        minC: 23.9,
        maxC: 29.5,
        humidityMax: 75,
        humidityMin: 91,
        feelsLikeMaxC: 31.4,
        feelsLikeMinC: 24.5,
      },
    ],
  }
}