export const UNIT_SYSTEMS = {
  metric: { temp: '°C', speed: 'km/h', precip: 'mm' },
  imperial: { temp: '°F', speed: 'mph', precip: 'in' },
}

export function cToF(celsius) {
  return (celsius * 9) / 5 + 32
}

export function kmhToMph(kmh) {
  return kmh * 0.621371
}

export function mmToIn(mm) {
  return mm / 25.4
}

export function formatTemp(celsius, system = 'metric') {
  const value = system === 'imperial' ? cToF(celsius) : celsius
  return `${Math.round(value)}°`
}

export function formatSpeed(kmh, system = 'metric') {
  const value = system === 'imperial' ? kmhToMph(kmh) : kmh
  return `${Math.round(value)} ${UNIT_SYSTEMS[system].speed}`
}

export function formatPrecip(mm, system = 'metric') {
  const value = system === 'imperial' ? mmToIn(mm) : mm
  return `${value.toFixed(1)} ${UNIT_SYSTEMS[system].precip}`
}