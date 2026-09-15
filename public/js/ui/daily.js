import { formatSpeed } from '../lib/units.js'
import { formatTempRange, formatPrecipProb } from '../lib/format.js'
import { shortDateLabel } from '../lib/datetime.js'
import { moonPhaseLabel } from '../lib/astro.js'
import { uvClass } from '../lib/uv.js'
import { iconSvg, arrowSvg, moonPhaseSvg } from './icons.js'

export function renderDaily(model, units) {
  const tz = model.timezone
  if (!model.daily.length) return '<p class="muted">No forecast data.</p>'

  const rows = model.daily
    .map((d) => {
      const uv = d.uvIndex != null
        ? `<span class="metric uv uv-${uvClass(d.uvIndex)}">${iconSvg('uv')} UV ${d.uvIndex}</span>`
        : ''
      const gust = d.gustKmh != null
        ? `<span class="metric gust">${iconSvg('wind')} ${formatSpeed(d.gustKmh, units)}</span>`
        : ''
      return `
      <div class="daily-row">
        <div class="daily-date">${shortDateLabel(d.dt, tz)}</div>
        <div class="daily-metrics">
          <div class="metrics-row">
            <span class="metric">${arrowSvg(d.windDeg)} ${formatSpeed(d.windKmh, units)}</span>
            <span class="metric rain">${iconSvg('drop')} ${formatPrecipProb(d.precipMm, d.pop, units)}</span>
          </div>
          <div class="metrics-row">
            ${uv}
            ${gust}
          </div>
          <div class="metrics-row">
            <span class="metric">${moonPhaseSvg(d.moonPhase)} ${moonPhaseLabel(d.moonPhase)}</span>
          </div>
        </div>
        <div class="daily-summary">
          ${iconSvg(d.icon)}
          <span>${d.condition}</span>
          <span class="daily-range">${formatTempRange(d.minC, d.maxC, units)}</span>
        </div>
      </div>`
    })
    .join('')

  return `
    <div class="daily-list">${rows}</div>`
}