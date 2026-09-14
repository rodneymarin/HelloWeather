import { formatTemp, formatSpeed } from '../lib/units.js'
import { hourLabel, dayLabel } from '../lib/datetime.js'
import { iconSvg, arrowSvg } from './icons.js'

function marksNewDay(items, i, tz) {
  if (i === 0) return false
  const a = new Date((items[i - 1].dt + tz) * 1000).getUTCDay()
  const b = new Date((items[i].dt + tz) * 1000).getUTCDay()
  return a !== b
}

function buildChart(items) {
  if (items.length < 2) return ''
  const temps = items.map((h) => h.tempC)
  const min = Math.min(...temps)
  const max = Math.max(...temps)
  const spread = Math.max(max - min, 0.1)
  const points = items
    .map((h, i) => {
      const x = (i / (items.length - 1)) * 100
      const y = 6 + (1 - (h.tempC - min) / spread) * 34
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return `<svg class="temp-chart" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><polyline points="${points}" /></svg>`
}

export function renderHourly(model, units) {
  const tz = model.timezone
  const items = model.hourly
  if (!items.length) return '<div class="section-title">Hourly</div><p class="muted">No hourly data.</p>'

  const cols = items
    .map((h, i) => `
      <div class="hourly-col">
        <span class="hour">${hourLabel(h.dt, tz)}${marksNewDay(items, i, tz) ? `<small>${dayLabel(h.dt, tz)}</small>` : ''}</span>
        ${iconSvg(h.icon)}
        <span class="wind">${arrowSvg(h.windDeg)} ${formatSpeed(h.windKmh, units)}</span>
        ${h.gustKmh != null ? `<span class="gust">${formatSpeed(h.gustKmh, units)}</span>` : ''}
        <span class="hour-temp">${formatTemp(h.tempC, units)}</span>
      </div>`)
    .join('')

  return `
    <div class="section-title">Hourly</div>
    <div class="hourly-track">${cols}${buildChart(items)}</div>`
}