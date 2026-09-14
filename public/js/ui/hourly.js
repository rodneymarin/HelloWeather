import { formatTemp, formatSpeed } from '../lib/units.js'
import { hourLabel, dayLabel } from '../lib/datetime.js'
import { iconSvg, arrowSvg } from './icons.js'

function marksNewDay(items, i, tz) {
  if (i === 0) return false
  const a = new Date((items[i - 1].dt + tz) * 1000).getUTCDay()
  const b = new Date((items[i].dt + tz) * 1000).getUTCDay()
  return a !== b
}

function pointAt(items, i) {
  const n = items.length
  const x = ((i + 0.5) / n) * 100
  const temps = items.map((h) => h.tempC)
  const min = Math.min(...temps)
  const max = Math.max(...temps)
  const spread = Math.max(max - min, 0.1)
  const y = 12 + (1 - (items[i].tempC - min) / spread) * 20
  return { x, y }
}

function smoothPath(points) {
  if (points.length < 2) return ''
  const p = points
  let d = `M ${p[0].x.toFixed(2)} ${p[0].y.toFixed(2)}`
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[Math.max(i - 1, 0)]
    const p1 = p[i]
    const p2 = p[i + 1]
    const p3 = p[Math.min(i + 2, p.length - 1)]
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
  }
  return d
}

export function buildTempArea(items, units = 'metric') {
  if (!items.length) return ''
  const points = items.map((_, i) => pointAt(items, i))
  const path = smoothPath(points)
  const svg = path
    ? `<svg class="temp-chart" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><path d="${path}" /></svg>`
    : ''
  const temps = points
    .map((pt, i) => `<span class="chart-temp" style="left:${pt.x.toFixed(2)}%;top:${pt.y.toFixed(2)}%">${formatTemp(items[i].tempC, units)}</span>`)
    .join('')
  return `${svg}${temps}`
}

export function renderHourly(model, units = 'metric') {
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
      </div>`)
    .join('')

  return `
    <div class="section-title">Hourly</div>
    <div class="hourly-track"><div class="hourly-track-inner">${cols}<div class="temp-area">${buildTempArea(items, units)}</div></div></div>`
}