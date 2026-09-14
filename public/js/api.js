async function requestJson(url) {
  const res = await fetch(url)
  if (!res.ok) {
    if (res.status === 404) throw new Error('Location not found')
    throw new Error(`Request failed (${res.status})`)
  }
  return res.json()
}

export function fetchWeather(payload) {
  const params = new URLSearchParams()
  if (payload.lat != null) {
    params.set('lat', payload.lat)
    params.set('lon', payload.lon)
  } else {
    params.set('q', payload.q ?? payload.name)
  }
  return requestJson(`/api/weather?${params.toString()}`)
}

export function fetchGeocode(q) {
  return requestJson(`/api/geocode?q=${encodeURIComponent(q)}`)
}

export function fetchReverseGeocode({ lat, lon }) {
  return requestJson(`/api/geocode?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`)
}

export function fetchIpLocation() {
  return requestJson('/api/location')
}