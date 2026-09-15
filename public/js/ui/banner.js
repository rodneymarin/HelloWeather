import { updatedLabel } from '../lib/datetime.js'

export function cachedLabel(model) {
  return `Cached data — last updated at ${updatedLabel(model.updatedAt / 1000)}`
}

export function connectionBannerHtml(offline) {
  if (!offline) return '<div class="conn-banner hidden" role="status"></div>'
  return '<div class="conn-banner" role="status">No connection — retrying…</div>'
}