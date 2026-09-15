const ICON_SVG = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" fill="currentColor"/>',
  cloud: '<path d="M7 18h9a4 4 0 0 0 0-8 5 5 0 0 0-9.6-1A4.5 4.5 0 0 0 7 18z" fill="currentColor"/>',
  rain: '<path d="M7 18h9a4 4 0 0 0 0-8 5 5 0 0 0-9.6-1A4.5 4.5 0 0 0 7 18z" fill="currentColor"/><path d="M8 19l-1 3M12 19l-1 3M16 19l-1 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  storm: '<path d="M7 18h9a4 4 0 0 0 0-8 5 5 0 0 0-9.6-1A4.5 4.5 0 0 0 7 18z" fill="currentColor"/><path d="M13 13l-2 4h3l-2 4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  snow: '<path d="M7 18h9a4 4 0 0 0 0-8 5 5 0 0 0-9.6-1A4.5 4.5 0 0 0 7 18z" fill="currentColor"/><circle cx="8" cy="20" r="1.2" fill="currentColor"/><circle cx="12" cy="21" r="1.2" fill="currentColor"/><circle cx="16" cy="20" r="1.2" fill="currentColor"/>',
  fog: '<path d="M7 16h9a4 4 0 0 0 0-8 5 5 0 0 0-9.6-1A4.5 4.5 0 0 0 7 16z" fill="currentColor" opacity=".5"/><path d="M4 19h16M4 21h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  partcloud: '<circle cx="8" cy="9" r="4" fill="currentColor"/><path d="M8 3v2M8 13v2M2 8h2M12 4.5l1.4-1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 18h7a3 3 0 0 0 0-6 4 4 0 0 0-7 .8A3.5 3.5 0 0 0 12 18z" fill="currentColor"/>',
  arrow: '<path d="M12 3l-5 5h3v9h4V8h3z" fill="currentColor"/>',
  pin: '<path d="M12 21s-7-5.2-7-11a7 7 0 0 1 14 0c0 5.8-7 11-7 11z" fill="currentColor"/><circle cx="12" cy="10" r="2.5" fill="var(--panel)"/>',
  uv: '<circle cx="12" cy="12" r="4" fill="currentColor"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  sunrise: '<path d="M7 16a5 5 0 0 1 10 0z" fill="currentColor"/><path d="M3 16h18M12 4l-2.5 2.5M12 4l2.5 2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  sunset: '<path d="M7 16a5 5 0 0 1 10 0z" fill="currentColor"/><path d="M3 16h18M12 22l-2.5-2.5M12 22l2.5-2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  drop: '<path d="M12 3s6 6 6 10a6 6 0 0 1-12 0c0-4 6-10 6-10z" fill="currentColor"/>',
  star: '<path d="M12 3l2.6 5.3 5.9.9-4.2 4.1 1 5.9L12 16.9 6.7 19.2l1-5.9L3.5 9.2l5.9-.9z" fill="currentColor"/>',
  search: '<circle cx="11" cy="11" r="6" stroke="currentColor" stroke-width="2" fill="none"/><path d="M20 20l-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  close: '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  dots: '<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',
  wind: '<path d="M3 8h9a3 3 0 1 0-3-3M3 12h14a3 3 0 1 1-3 3M3 16h7a2 2 0 1 1-2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
}

export function iconSvg(name) {
  const key = String(name ?? '')
  const icon = ICON_SVG[key] ? key : 'cloud'
  return `<svg class="wicon" viewBox="0 0 24 24" aria-hidden="true">${ICON_SVG[icon]}</svg>`
}

export function arrowSvg(deg) {
  return `<svg class="wicon arrow" viewBox="0 0 24 24" style="transform: rotate(${deg ?? 0}deg)" aria-hidden="true">${ICON_SVG.arrow}</svg>`
}

export function moonPhaseSvg(phase) {
  const p = (Number.isFinite(phase) ? Math.max(0, Math.min(phase, 1)) : 0) % 1
  const a = 2 * Math.PI * p
  const R = 10
  const waxing = Math.sin(a) >= 0
  const e = Math.cos(a)
  const rx = (Math.abs(e) * R).toFixed(2)
  const limb = waxing ? 1 : 0
  const tSweep = waxing ? (e > 0 ? 0 : 1) : (e > 0 ? 1 : 0)
  const d = `M12 ${12 - R} A${R} ${R} 0 0 ${limb} 12 ${12 + R} A${rx} ${R} 0 0 ${tSweep} 12 ${12 - R} Z`
  return `<svg class="wicon moon" viewBox="0 0 24 24" aria-hidden="true"><circle class="moon-dark" cx="12" cy="12" r="10"/><path class="moon-lit" d="${d}"/></svg>`
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}