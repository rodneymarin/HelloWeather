export function heatIndexC(tempC, rh) {
  if (!Number.isFinite(tempC) || !Number.isFinite(rh)) return tempC
  if (tempC < 26.7 || rh < 40) return tempC
  const t = (tempC * 9) / 5 + 32
  const hi =
    -42.379 +
    2.04901523 * t +
    10.14333127 * rh -
    0.22475541 * t * rh -
    6.83783e-3 * t * t -
    5.481717e-2 * rh * rh +
    1.22874e-3 * t * t * rh +
    8.5282e-4 * t * rh * rh -
    1.99e-6 * t * t * rh * rh
  return ((hi - 32) * 5) / 9
}

export function dewPointC(tempC, rh) {
  const a = 17.27
  const b = 237.7
  const gamma = Math.log(rh / 100) + (a * tempC) / (b + tempC)
  return (b * gamma) / (a - gamma)
}

export function humidexC(tempC, rh) {
  const td = dewPointC(tempC, rh)
  const vapor = 6.11 * Math.exp(5417.753 * (1 / 273.16 - 1 / (273.16 + td)))
  return tempC + 0.5555 * (vapor - 10)
}

export function customFeelsLikeC(tempC, rh) {
  return (heatIndexC(tempC, rh) + humidexC(tempC, rh)) / 2
}

function recompute(model) {
  const current = { ...model.current }
  if (current.humidity != null) current.feelsLikeC = customFeelsLikeC(current.tempC, current.humidity)
  const hourly = model.hourly.map((h) => ({
    ...h,
    feelsLikeC: h.humidity != null ? customFeelsLikeC(h.tempC, h.humidity) : h.feelsLikeC,
  }))
  const daily = model.daily.map((d) => ({
    ...d,
    feelsLikeMaxC: d.humidityMin != null ? customFeelsLikeC(d.maxC, d.humidityMin) : d.feelsLikeMaxC,
    feelsLikeMinC: d.humidityMax != null ? customFeelsLikeC(d.minC, d.humidityMax) : d.feelsLikeMinC,
  }))
  const today = model.today
    ? {
        ...model.today,
        feelsLikeMaxC: model.today.humidityMin != null ? customFeelsLikeC(model.today.maxC, model.today.humidityMin) : model.today.feelsLikeMaxC,
        feelsLikeMinC: model.today.humidityMax != null ? customFeelsLikeC(model.today.minC, model.today.humidityMax) : model.today.feelsLikeMinC,
      }
    : model.today
  return { ...model, current, hourly, daily, today }
}

export function applyFeelsLikeModel(model, mode) {
  if (mode === 'formula') return recompute(model)
  return model
}