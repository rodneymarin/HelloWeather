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
  uv: '<circle cx="12" cy="12" r="4" fill="currentColor"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  sunrise: '<path d="M4 18h16M6 14a6 6 0 0 1 12 0M12 4v6m0 0l-2-2m2 2l2-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M4 21h16" stroke="currentColor" stroke-width="2"/>',
  sunset: '<path d="M4 18h16M6 14a6 6 0 0 1 12 0M12 10V4m0 0l-2 2m2-2l2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M4 21h16" stroke="currentColor" stroke-width="2"/>',
  drop: '<path d="M12 3s6 6 6 10a6 6 0 0 1-12 0c0-4 6-10 6-10z" fill="currentColor"/>',
  star: '<path d="M12 3l2.6 5.3 5.9.9-4.2 4.1 1 5.9L12 16.9 6.7 19.2l1-5.9L3.5 9.2l5.9-.9z" fill="currentColor"/>',
  search: '<circle cx="11" cy="11" r="6" stroke="currentColor" stroke-width="2" fill="none"/><path d="M20 20l-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  close: '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  dots: '<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',
  wind: '<path d="M3 8h9a3 3 0 1 0-3-3M3 12h14a3 3 0 1 1-3 3M3 16h7a2 2 0 1 1-2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
}

const BY_CODE = {
  '01': 'sun',
  '02': 'partcloud',
  '03': 'cloud',
  '04': 'cloud',
  '09': 'rain',
  '10': 'rain',
  '11': 'storm',
  '13': 'snow',
  '50': 'fog',
}

export function iconSvg(codeOrName) {
  const key = String(codeOrName ?? '')
  const name = BY_CODE[key.slice(0, 2)] ?? (ICON_SVG[key] ? key : 'cloud')
  return `<svg class="wicon" viewBox="0 0 24 24" aria-hidden="true">${ICON_SVG[name]}</svg>`
}

export function arrowSvg(deg) {
  return `<svg class="wicon arrow" viewBox="0 0 24 24" style="transform: rotate(${deg ?? 0}deg)" aria-hidden="true">${ICON_SVG.arrow}</svg>`
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}