export function isPrivateIp(ip) {
  const clean = String(ip ?? '').trim().replace(/^::ffff:/, '')
  if (clean === '::1' || clean === '127.0.0.1' || /^127\./.test(clean)) return true
  if (/^10\./.test(clean)) return true
  if (/^192\.168\./.test(clean)) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(clean)) return true
  if (/^169\.254\./.test(clean)) return true
  return false
}

export function buildIpLookupUrl(clientIp, baseUrl = 'https://ipwho.is') {
  return isPrivateIp(clientIp) ? `${baseUrl}/` : `${baseUrl}/?q=${encodeURIComponent(clientIp)}`
}

export function normalizeIpPlace(data) {
  if (!data || data.success === false) return null
  const name = (data.city || '').trim()
  if (!name) return null
  return {
    name,
    state: data.region,
    country: data.country_code,
    lat: data.latitude,
    lon: data.longitude,
  }
}

export function createIpLocator({ fetchImpl = globalThis.fetch, baseUrl = 'https://ipwho.is' } = {}) {
  return {
    async resolve(clientIp) {
      const res = await fetchImpl(buildIpLookupUrl(clientIp, baseUrl))
      if (!res.ok) throw new Error(`IP lookup failed (${res.status})`)
      return normalizeIpPlace(await res.json())
    },
  }
}