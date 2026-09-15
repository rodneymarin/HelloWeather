const MIN_HEAT_INDEX_TEMP_C = 27

export function heatIndexC(tempC, rh) {
  if (tempC == null || rh == null) return null
  const T = (tempC * 9) / 5 + 32
  const RH = rh

  let HI =
    -42.379 +
    2.04901523 * T +
    10.14333127 * RH -
    0.22475541 * T * RH -
    0.00683783 * T * T -
    0.05481717 * RH * RH +
    0.00122874 * T * T * RH +
    0.00085282 * T * RH * RH -
    0.00000199 * T * T * RH * RH

  if (RH < 13 && T >= 80 && T <= 112) {
    const adj = ((13 - RH) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17)
    HI -= adj
  } else if (RH > 85 && T >= 80 && T <= 87) {
    const adj = ((RH - 85) / 10) * ((87 - T) / 5)
    HI += adj
  }

  return ((HI - 32) * 5) / 9
}

export function solarBoostC(shortwave) {
  if (shortwave == null || !Number.isFinite(shortwave)) return 0
  if (shortwave <= 0) return 0
  return Math.min(8, Math.max(0, (shortwave / 1600) * 8))
}

export function feelsLikeC(tempC, rh, shortwave) {
  if (tempC == null) return null
  if (rh == null || tempC <= MIN_HEAT_INDEX_TEMP_C) return tempC
  const hi = heatIndexC(tempC, rh)
  return hi != null ? hi + solarBoostC(shortwave) : tempC
}