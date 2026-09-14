import { updatedLabel } from '../lib/datetime.js'

export function offlineBanner(model) {
  return `<div class="offline-banner" role="status">Cached data — last updated at ${updatedLabel(model.updatedAt / 1000)}</div>`
}

export function connectionBannerHtml(offline) {
  if (!offline) return ''
  return `<div class="conn-banner" role="status">No connection — retrying…</div>`
}