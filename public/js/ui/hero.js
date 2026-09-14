import { formatTemp, formatSpeed } from '../lib/units.js'
import { formatTempRange } from '../lib/format.js'
import { dayLabel, clockLabel, updatedLabel } from '../lib/datetime.js'
import { moonPhase, moonPhaseLabel } from '../lib/astro.js'
import { uvClass } from '../lib/uv.js'
import { iconSvg } from './icons.js'

export function renderHero(model, units) {
  const cur = model.current
  const tz = model.timezone
  const today = model.today ?? { minC: cur.tempC, maxC: cur.tempC }

  const uv = cur.uvIndex != null
    ? `<span class="metric uv uv-${uvClass(cur.uvIndex)}">${iconSvg('uv')} UV ${cur.uvIndex}</span>`
    : ''

  return `
    <div class="hero-top">
      <span class="hero-temp">${formatTemp(cur.tempC, units)}</span>
      <div class="hero-day">
        <span class="hero-day-name">${dayLabel(Math.floor(Date.now() / 1000), tz)}</span>
        <span class="hero-day-range">${formatTempRange(today.minC, today.maxC, units)}</span>
      </div>
    </div>
    <div class="hero-mid">
      <div class="hero-metrics">
        <span class="metric">${iconSvg('arrow')} ${formatSpeed(cur.windKmh, units)}</span>
        <span class="metric">${iconSvg('cloud')} ${cur.humidity}%</span>
        ${uv}
        <span class="metric">${iconSvg('moon')} ${moonPhaseLabel(moonPhase(Math.floor(Date.now() / 1000)))}</span>
      </div>
      <div class="hero-condition">
        ${iconSvg(cur.icon)}
        <p>${cur.description || cur.condition}</p>
      </div>
    </div>
    <div class="hero-bottom">
      <span>${iconSvg('sunrise')} ${clockLabel(model.sun.sunriseSec, tz)}</span>
      <span>${iconSvg('sunset')} ${clockLabel(model.sun.sunsetSec, tz)}</span>
      <span class="updated">Updated: ${updatedLabel(model.updatedAt / 1000)}</span>
    </div>`
}

export function renderNoData() {
  return `<p class="muted">No weather data yet.</p>`
}