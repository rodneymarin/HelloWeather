import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { createOpenWeatherClient } from './openweather.js'
import { normalizeWeather } from './normalize.js'
import { getConfig } from '../config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export function createApp({ client = createOpenWeatherClient({}), config = getConfig() } = {}) {
  const app = express()
  const cache = new Map()

  app.disable('x-powered-by')
  app.use(express.static(path.join(__dirname, '..', 'public')))

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true })
  })

  app.get('/api/geocode', async (req, res) => {
    const { q, lat, lon } = req.query
    if (typeof q === 'string' && q.trim()) {
      try {
        const results = await client.geocode(q.trim())
        res.json(results.map((p) => ({ name: p.name, country: p.country, state: p.state, lat: p.lat, lon: p.lon })))
      } catch {
        res.status(502).json({ error: 'Geocoding provider unavailable' })
      }
      return
    }
    if (lat != null && lon != null && !Array.isArray(lat) && !Array.isArray(lon)) {
      try {
        const results = await client.reverseGeocode(parseFloat(lat), parseFloat(lon))
        res.json(results.map((p) => ({ name: p.name, country: p.country, state: p.state, lat: p.lat, lon: p.lon })))
      } catch {
        res.status(502).json({ error: 'Geocoding provider unavailable' })
      }
      return
    }
    res.status(400).json({ error: 'Provide "q" or "lat"+"lon"' })
  })

  app.get('/api/weather', async (req, res) => {
    const { q, lat, lon } = req.query

    let coords = null
    let cacheKey = null

    if (lat != null && lon != null && !Array.isArray(lat) && !Array.isArray(lon)) {
      coords = { lat: parseFloat(lat), lon: parseFloat(lon) }
      cacheKey = `${coords.lat},${coords.lon}`
    } else if (typeof q === 'string' && q.trim()) {
      let geo = null
      try {
        geo = await client.geocode(q.trim())
      } catch {
        geo = null
      }
      const place = Array.isArray(geo) ? geo[0] : null
      if (!place) return res.status(404).json({ error: 'Location not found' })
      coords = { lat: place.lat, lon: place.lon }
      cacheKey = q.trim().toLowerCase()
      coords.name = place.name
    } else {
      return res.status(400).json({ error: 'Provide "q" or "lat"+"lon"' })
    }

    const cached = cache.get(cacheKey)
    try {
      const raw = await client.getWeather(coords)
      const model = normalizeWeather(raw, coords.name || q)
      cache.set(cacheKey, { model, savedAt: Date.now() })
      res.json(model)
    } catch {
      if (cached) {
        return res.json({ ...cached.model, stale: true, staleSince: cached.savedAt })
      }
      res.status(502).json({ error: 'Weather provider unavailable' })
    }
  })

  return app
}