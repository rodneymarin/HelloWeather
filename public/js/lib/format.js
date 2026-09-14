import { formatTemp, formatPrecip } from './units.js'

export function formatTempRange(minC, maxC, system = 'metric') {
  return `${formatTemp(minC, system)} ${formatTemp(maxC, system)}`
}

export function formatPrecipProb(mm, pop, system = 'metric') {
  const prob = Math.round((pop ?? 0) * 100)
  return `${formatPrecip(mm, system)} / ${prob}%`
}

export function compassLabel(deg) {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  const norm = ((deg ?? 0) % 360 + 360) % 360
  return dirs[Math.round(norm / 22.5) % 16]
}