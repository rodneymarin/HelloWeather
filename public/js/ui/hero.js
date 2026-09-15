import { formatTemp, formatSpeed } from '../lib/units.js'
import { formatTempRange, formatPrecipProb } from '../lib/format.js'
import { dayLabel, clockLabel } from '../lib/datetime.js'
import { uvClass } from '../lib/uv.js'
import { iconSvg } from './icons.js'

export function renderHero(model, units) {
  const cur = model.current
  const tz = model.timezone
  const today = model.today ?? { minC: cur.tempC, maxC: cur.tempC }

  const uv = cur.uvIndex != null
    ? `<span class="metric uv uv-${uvClass(cur.uvIndex)}">${iconSvg('uv')} UV ${cur.uvIndex}</span>`
    : ''

  const precip = (cur.pop > 0) || cur.precipMm
    ? `<span class="metric rain">${iconSvg('drop')} ${formatPrecipProb(cur.precipMm ?? 0, cur.pop, units)}</span>`
    : ''

  const hasFeels = cur.feelsLikeC != null
  const tempGroup = `
    <div class="hero-temp-group">
      <div class="hero-temp-main">
        ${hasFeels ? '<span class="hero-temp-caption">Feels</span>' : ''}
        <span class="hero-temp">${formatTemp(hasFeels ? cur.feelsLikeC : cur.tempC, units)}</span>
      </div>
      ${hasFeels ? `<span class="hero-temp-side">${formatTemp(cur.tempC, units)}</span>` : ''}
    </div>`

  return `
    <div class="hero-top">
      <div class="hero-top-group">
        ${tempGroup}
        <div class="hero-metrics">
          <span class="metric">${iconSvg('arrow')} ${formatSpeed(cur.windKmh, units)}</span>
          <span class="metric">${iconSvg('cloud')} ${cur.humidity}%</span>
          ${precip}
          ${uv}
        </div>
      </div>
      <div class="hero-right">
        <div class="hero-condition-day">
          <div class="hero-condition">
            ${iconSvg(cur.icon)}
            <p>${cur.description || cur.condition}</p>
          </div>
          <div class="hero-day">
            <span class="hero-day-name">${dayLabel(Math.floor(Date.now() / 1000), tz)}</span>
            <span class="hero-day-range">${formatTempRange(today.minC, today.maxC, units)}</span>
          </div>
        </div>
        <div class="hero-sun-times">
          <span class="hero-sunrise">${iconSvg('sunrise')} ${clockLabel(model.sun.sunriseSec, tz)}</span>
          <span class="hero-sunset">${iconSvg('sunset')} ${clockLabel(model.sun.sunsetSec, tz)}</span>
        </div>
      </div>
    </div>`
}

export function renderNoData() {
  return `<p class="muted">No weather data yet.</p>`
}