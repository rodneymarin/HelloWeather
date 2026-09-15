# Open-Meteo Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace OpenWeather with Open-Meteo as the data provider, enrich the hourly section with precipitation probability bars/footers, and add precipitation info to the hero.

**Architecture:** A new `src/openmeteo.js` client (no API key) replaces `src/openweather.js`. `src/normalize.js` becomes a single normalizer mapping Open-Meteo's payload (WMO codes, hourly resolution, 0-100 probabilities, `utc_offset_seconds`) into the existing internal model. The frontend renders unchanged model shapes except two UI enrichments (hourly prob bars + footers, hero precipitation metric).

**Tech Stack:** Node >= 18, Express, node:test. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-14-open-meteo-migration-design.md`

## Global Constraints

- Node >= 18; `node --test test/` is the test runner (`npm test`).
- Internal model shape stays unchanged: `{ source, updatedAt, location, timezone, current, today, sun, hourly[], daily[] }`; `tempC` °C, `windKmh`, `pop` fraction 0-1, `dt` UTC epoch seconds, `timezone` UTC offset seconds.
- Wind comes from Open-Meteo already in km/h — no conversion.
- Precipitation probability is 0-100 from Open-Meteo; must be divided by 100 into a fraction.
- WMO weather codes map to condition text and icon names; the backend sends icon *names*, never OpenWeather codes.
- No new dependencies; no API key anywhere.

---

### Task 1: Open-Meteo client and fixture

**Files:**
- Create: `test/fixtures/openmeteo.js`
- Test: `test/openmeteo.test.js`
- Create: `src/openmeteo.js`

**Interfaces:**
- Produces: `createOpenMeteoClient({ fetchImpl, forecastBaseUrl, geocodeBaseUrl, reverseBaseUrl })` returning `{ getWeather({lat,lon}), geocode(q), reverseGeocode(lat,lon) }`, and `ApiError` class. `getWeather` returns the raw JSON body directly (NOT wrapped in `{source, data}`). `geocode` returns an array of `{name, country, state, lat, lon}` (empty when no results). `reverseGeocode` returns an array `[{name, country, state, lat, lon}]`.
- Produces: `openmeteoFixture` (exported from `test/fixtures/openmeteo.js`) with realistic Open-Meteo payload including WMO codes, 24-start hourly arrays, sunrise/sunset ISO local strings, `utc_offset_seconds`.

- [ ] **Step 1: Write the fixture**

Create `test/fixtures/openmeteo.js`:

```js
export const openmeteoFixture = {
  latitude: 10.66,
  longitude: -71.61,
  timezone: 'America/Caracas',
  utc_offset_seconds: -14400,
  current: {
    time: '2026-09-14T10:30',
    temperature_2m: 30.1,
    relative_humidity_2m: 62,
    apparent_temperature: 33.4,
    precipitation: 0.3,
    weather_code: 2,
    cloud_cover: 40,
    wind_speed_10m: 12.5,
    wind_direction_10m: 90,
    wind_gusts_10m: 28.3,
  },
  hourly: {
    time: ['2026-09-14T10:00', '2026-09-14T11:00', '2026-09-14T12:00'],
    temperature_2m: [30.1, 30.5, 29.8],
    precipitation: [0.3, 0, 1.2],
    precipitation_probability: [40, 10, 65],
    weather_code: [2, 1, 61],
    wind_speed_10m: [12.5, 11, 9],
    wind_direction_10m: [90, 95, 100],
    wind_gusts_10m: [28.3, 25, 20],
    uv_index: [7.2, 8.1, 6.5],
  },
  daily: {
    time: ['2026-09-14', '2026-09-15'],
    weather_code: [2, 61],
    temperature_2m_max: [31.2, 29.5],
    temperature_2m_min: [24.8, 23.9],
    sunrise: ['2026-09-14T06:20', '2026-09-15T06:20'],
    sunset: ['2026-09-14T18:40', '2026-09-15T18:40'],
    uv_index_max: [8.2, 7.9],
    precipitation_sum: [1.5, 12.2],
    precipitation_probability_max: [65, 90],
    wind_speed_10m_max: [18.4, 22],
    wind_direction_10m_dominant: [110, 85],
    wind_gusts_10m_max: [35.1, 44],
  },
}
```

- [ ] **Step 2: Write the failing client tests**

Create `test/openmeteo.test.js`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createOpenMeteoClient, ApiError } from '../src/openmeteo.js'

function jsonResponse(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

test('getWeather builds a forecast URL with open-meteo params', async () => {
  const calls = []
  const client = createOpenMeteoClient({
    fetchImpl: async (url) => {
      calls.push(url.toString())
      return jsonResponse({ current: {}, hourly: { time: [] }, daily: { time: [] } })
    },
  })
  const result = await client.getWeather({ lat: 10.66, lon: -71.61 })
  assert.equal(result.current, '')
  const url = new URL(calls[0])
  assert.equal(url.pathname, '/v1/forecast')
  assert.equal(url.searchParams.get('latitude'), '10.66')
  assert.equal(url.searchParams.get('longitude'), '-71.61')
  assert.equal(url.searchParams.get('timezone'), 'auto')
  assert.equal(url.searchParams.get('forecast_days'), '5')
  assert.equal(url.searchParams.get('forecast_hours'), '24')
  assert.match(url.searchParams.get('current'), /temperature_2m/)
  assert.match(url.searchParams.get('hourly'), /precipitation_probability/)
  assert.match(url.searchParams.get('daily'), /uv_index_max/)
})

test('getWeather propagates non-2xx errors', async () => {
  const client = createOpenMeteoClient({ fetchImpl: async () => jsonResponse({}, 500) })
  await assert.rejects(
    () => client.getWeather({ lat: 1, lon: 2 }),
    (err) => err instanceof ApiError && err.status === 500,
  )
})

test('geocode maps results into the place shape and returns [] when empty', async () => {
  const client = createOpenMeteoClient({
    fetchImpl: async (url) => {
      const u = url.toString()
      if (u.includes('count=5')) {
        return jsonResponse({
          results: [{ name: 'Maracaibo', country_code: 'VE', admin1: 'Estado Zulia', latitude: 10.66, longitude: -71.61 }],
        })
      }
      return jsonResponse({})
    },
  })
  const results = await client.geocode('Maracaibo')
  assert.equal(results[0].name, 'Maracaibo')
  assert.equal(results[0].country, 'VE')
  assert.equal(results[0].state, 'Estado Zulia')
  assert.equal(results[0].lat, 10.66)
  const empty = await client.geocode('Nowhere')
  assert.deepEqual(empty, [])
})

test('reverseGeocode calls Nominatim with a User-Agent and maps address', async () => {
  const calls = []
  const client = createOpenMeteoClient({
    fetchImpl: async (url, init) => {
      calls.push({ url: url.toString(), init })
      return jsonResponse({
        name: 'Maracaibo',
        address: { city: 'Maracaibo', country_code: 've', state: 'Estado Zulia' },
      })
    },
  })
  const results = await client.reverseGeocode(10.66, -71.61)
  assert.equal(results[0].name, 'Maracaibo')
  assert.equal(results[0].country, 've')
  assert.equal(results[0].state, 'Estado Zulia')
  const url = new URL(calls[0].url)
  assert.equal(url.pathname, '/reverse')
  assert.equal(url.searchParams.get('lat'), '10.66')
  assert.equal(url.searchParams.get('lon'), '-71.61')
  assert.equal(url.searchParams.get('format'), 'jsonv2')
  assert.match(calls[0].init.headers['User-Agent'], /HelloWeather/)
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- test/openmeteo.test.js`
Expected: FAIL — `Cannot find module '../src/openmeteo.js'`

- [ ] **Step 4: Implement the client**

Create `src/openmeteo.js`:

```js
export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const DEFAULT_FORECAST_URL = 'https://api.open-meteo.com'
const DEFAULT_GEOCODE_URL = 'https://geocoding-api.open-meteo.com'
const DEFAULT_REVERSE_URL = 'https://nominatim.openstreetmap.org'

export function createOpenMeteoClient({
  fetchImpl = globalThis.fetch,
  forecastBaseUrl = DEFAULT_FORECAST_URL,
  geocodeBaseUrl = DEFAULT_GEOCODE_URL,
  reverseBaseUrl = DEFAULT_REVERSE_URL,
} = {}) {
  async function request(url, init) {
    const res = await fetchImpl(url, init)
    if (!res.ok) throw new ApiError(`Open-Meteo request failed (${res.status})`, res.status)
    return res.json()
  }

  function forecastUrl({ lat, lon }) {
    const url = new URL('/v1/forecast', forecastBaseUrl)
    const params = {
      latitude: lat,
      longitude: lon,
      timezone: 'auto',
      forecast_days: 5,
      forecast_hours: 24,
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
      hourly: 'temperature_2m,precipitation,precipitation_probability,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant,wind_gusts_10m_max',
    }
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))
    return url
  }

  return {
    async getWeather({ lat, lon }) {
      return request(forecastUrl({ lat, lon }))
    },
    async geocode(query) {
      const url = new URL('/v1/search', geocodeBaseUrl)
      url.searchParams.set('name', query)
      url.searchParams.set('count', '5')
      url.searchParams.set('language', 'en')
      url.searchParams.set('format', 'json')
      const data = await request(url)
      return (data.results ?? []).map((p) => ({
        name: p.name,
        country: p.country_code,
        state: p.admin1,
        lat: p.latitude,
        lon: p.longitude,
      }))
    },
    async reverseGeocode(lat, lon) {
      const url = new URL('/reverse', reverseBaseUrl)
      url.searchParams.set('lat', String(lat))
      url.searchParams.set('lon', String(lon))
      url.searchParams.set('format', 'jsonv2')
      url.searchParams.set('zoom', '10')
      const data = await request(url, { headers: { 'User-Agent': 'HelloWeather/0.1 (weather demo app)' } })
      const a = data.address ?? {}
      const name = a.city || a.town || a.village || data.name
      return [{ name, country: a.country_code, state: a.state, lat: Number(lat), lon: Number(lon) }]
    },
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- test/openmeteo.test.js`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add src/openmeteo.js test/openmeteo.test.js test/fixtures/openmeteo.js
git commit -m "feat: add Open-Meteo client with geocoding and reverse geocoding"
```

---

### Task 2: Swap the data pipeline to Open-Meteo

**Files:**
- Rewrite: `src/normalize.js`
- Modify: `src/app.js:3,11`
- Delete: `src/openweather.js`, `test/openweather.test.js`, `test/fixtures/onecall.js`, `test/fixtures/basic-current.js`, `test/fixtures/basic-forecast.js`
- Rewrite: `test/normalize.test.js`
- Modify: `test/app.test.js`

**Interfaces:**
- Consumes: `openmeteoFixture` (Task 1), `createOpenMeteoClient` (Task 1)
- Produces: `normalizeWeather(data, placeName)` — single normalizer accepting the raw Open-Meteo JSON and returning the internal model. `app.js` calls it with the raw data directly (no `{source, data}` wrapper).

- [ ] **Step 1: Write the failing normalization tests**

Rewrite `test/normalize.test.js`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeWeather } from '../src/normalize.js'
import { openmeteoFixture } from './fixtures/openmeteo.js'

test('maps current weather from Open-Meteo', () => {
  const m = normalizeWeather(openmeteoFixture, 'Maracaibo')
  assert.equal(m.source, 'open-meteo')
  assert.equal(m.location.name, 'Maracaibo')
  assert.equal(m.location.lat, 10.66)
  assert.equal(m.timezone, -14400)
  assert.equal(m.current.tempC, 30.1)
  assert.equal(m.current.feelsLikeC, 33.4)
  assert.equal(m.current.humidity, 62)
  assert.equal(m.current.cloudiness, 40)
  assert.equal(m.current.windKmh, 12.5)
  assert.equal(m.current.windDeg, 90)
  assert.equal(m.current.windGustKmh, 28.3)
  assert.equal(m.current.precipMm, 0.3)
  assert.equal(m.current.pop, 0.4)
  assert.equal(m.current.uvIndex, 7.2)
  assert.equal(m.current.condition, 'Partly cloudy')
  assert.equal(m.current.icon, 'partcloud')
})

test('hourly items use epoch dt, fraction pop and precipitation mm', () => {
  const m = normalizeWeather(openmeteoFixture, 'Maracaibo')
  assert.equal(m.hourly.length, 3)
  const h1 = m.hourly[2]
  assert.equal(h1.pop, 0.65)
  assert.equal(h1.precipMm, 1.2)
  assert.equal(h1.condition, 'Rain')
  assert.equal(h1.icon, 'rain')
  const expectedDt = Date.parse('2026-09-14T12:00Z') / 1000 + 14400
  assert.equal(h1.dt, expectedDt)
})

test('converts local ISO sun times to epoch seconds', () => {
  const m = normalizeWeather(openmeteoFixture, 'Maracaibo')
  const expectedSunrise = Date.parse('2026-09-14T06:20Z') / 1000 + 14400
  assert.equal(m.sun.sunriseSec, expectedSunrise)
  const expectedSunset = Date.parse('2026-09-14T18:40Z') / 1000 + 14400
  assert.equal(m.sun.sunsetSec, expectedSunset)
})

test('maps daily forecast with fraction pop, uv max and moon phase', () => {
  const m = normalizeWeather(openmeteoFixture, 'Maracaibo')
  assert.equal(m.daily.length, 2)
  assert.deepEqual(m.today, { minC: 24.8, maxC: 31.2 })
  const d1 = m.daily[1]
  assert.equal(d1.minC, 23.9)
  assert.equal(d1.maxC, 29.5)
  assert.equal(d1.pop, 0.9)
  assert.equal(d1.precipMm, 12.2)
  assert.equal(d1.uvIndex, 7.9)
  assert.equal(d1.icon, 'rain')
  assert.ok(Number.isFinite(d1.moonPhase))
})

test('current pop falls back to daily max when hourly probability is missing', () => {
  const data = JSON.parse(JSON.stringify(openmeteoFixture))
  delete data.hourly.precipitation_probability
  const m = normalizeWeather(data, 'Maracaibo')
  assert.equal(m.current.pop, 0.65)
})

test('caps hourly at 24 entries and daily at 5', () => {
  const data = JSON.parse(JSON.stringify(openmeteoFixture))
  data.hourly.time = Array.from({ length: 40 }, (_, i) => `2026-09-14T${String(i % 24).padStart(2, '0')}:00`)
  data.hourly.temperature_2m = Array.from({ length: 40 }, () => 25)
  data.hourly.weather_code = Array.from({ length: 40 }, () => 0)
  data.daily.time = Array.from({ length: 8 }, (_, i) => `2026-09-${String(14 + i).padStart(2, '0')}`)
  data.daily.temperature_2m_max = Array.from({ length: 8 }, () => 30)
  data.daily.temperature_2m_min = Array.from({ length: 8 }, () => 22)
  data.daily.weather_code = Array.from({ length: 8 }, () => 0)
  const m = normalizeWeather(data, 'Maracaibo')
  assert.equal(m.hourly.length, 24)
  assert.equal(m.daily.length, 5)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- test/normalize.test.js`
Expected: FAIL — the old normalizer relies on a `{source, data}` wrapper; passing the raw fixture crashes.

- [ ] **Step 3: Rewrite normalize.js**

Rewrite `src/normalize.js` entirely:

```js
import { moonPhase } from '../public/js/lib/astro.js'

function first(arr) {
  return Array.isArray(arr) && arr.length ? arr[0] : undefined
}

function toFraction(pct) {
  return pct == null ? 0 : pct / 100
}

const WMO_CONDITIONS = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Fog',
  51: 'Drizzle', 53: 'Drizzle', 55: 'Drizzle',
  56: 'Freezing drizzle', 57: 'Freezing drizzle',
  61: 'Rain', 63: 'Rain', 65: 'Rain',
  66: 'Freezing rain', 67: 'Freezing rain',
  71: 'Snowfall', 73: 'Snowfall', 75: 'Snowfall', 77: 'Snow grains',
  80: 'Rain showers', 81: 'Rain showers', 82: 'Rain showers',
  85: 'Snow showers', 86: 'Snow showers',
  95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with hail',
}

const WMO_ICONS = {
  0: 'sun', 1: 'sun', 2: 'partcloud', 3: 'cloud',
  45: 'fog', 48: 'fog',
  51: 'rain', 53: 'rain', 55: 'rain', 56: 'rain', 57: 'rain',
  61: 'rain', 63: 'rain', 65: 'rain', 66: 'rain', 67: 'rain',
  71: 'snow', 73: 'snow', 75: 'snow', 77: 'snow',
  80: 'rain', 81: 'rain', 82: 'rain',
  85: 'snow', 86: 'snow',
  95: 'storm', 96: 'storm', 99: 'storm',
}

function wmoInfo(code) {
  if (!Number.isFinite(code)) return { condition: 'Unknown', icon: null, description: '' }
  return { condition: WMO_CONDITIONS[code] ?? 'Unknown', icon: WMO_ICONS[code] ?? 'cloud', description: '' }
}

function epochFromLocalIso(iso, tzOffsetSec) {
  return Date.parse(`${iso}Z`) / 1000 - tzOffsetSec
}

export function normalizeWeather(data, placeName = '') {
  const tz = data.utc_offset_seconds
  const cur = data.current ?? {}
  const cw = wmoInfo(cur.weather_code)
  const times = data.hourly?.time ?? []
  const dailyTimes = data.daily?.time ?? []
  const n = Math.min(times.length, 24)
  const d = Math.min(dailyTimes.length, 5)

  const pop0 = data.hourly?.precipitation_probability?.[0]
  const uv0 = data.hourly?.uv_index?.[0]
  const dailyPopMax = first(data.daily?.precipitation_probability_max)
  const dailyUvMax = first(data.daily?.uv_index_max)

  return {
    source: 'open-meteo',
    updatedAt: Date.now(),
    location: { name: placeName, lat: data.latitude, lon: data.longitude, country: undefined },
    timezone: tz,
    current: {
      tempC: cur.temperature_2m,
      condition: cw.condition,
      icon: cw.icon,
      description: cw.description,
      feelsLikeC: cur.apparent_temperature,
      humidity: cur.relative_humidity_2m,
      cloudiness: cur.cloud_cover,
      windKmh: cur.wind_speed_10m ?? 0,
      windDeg: cur.wind_direction_10m ?? 0,
      windGustKmh: cur.wind_gusts_10m ?? null,
      uvIndex: uv0 ?? dailyUvMax ?? null,
      precipMm: cur.precipitation ?? null,
      pop: pop0 != null ? toFraction(pop0) : toFraction(dailyPopMax),
    },
    today: d ? { minC: data.daily.temperature_2m_min[0], maxC: data.daily.temperature_2m_max[0] } : null,
    sun: {
      sunriseSec: data.daily?.sunrise?.[0] != null ? epochFromLocalIso(data.daily.sunrise[0], tz) : null,
      sunsetSec: data.daily?.sunset?.[0] != null ? epochFromLocalIso(data.daily.sunset[0], tz) : null,
    },
    hourly: Array.from({ length: n }, (_, i) => ({
      dt: epochFromLocalIso(times[i], tz),
      tempC: data.hourly.temperature_2m[i],
      windKmh: data.hourly.wind_speed_10m?.[i] ?? 0,
      windDeg: data.hourly.wind_direction_10m?.[i] ?? 0,
      gustKmh: data.hourly.wind_gusts_10m?.[i] ?? null,
      precipMm: data.hourly.precipitation?.[i] ?? null,
      pop: toFraction(data.hourly.precipitation_probability?.[i]),
      ...wmoInfo(data.hourly.weather_code?.[i]),
    })),
    daily: Array.from({ length: d }, (_, i) => ({
      dt: epochFromLocalIso(dailyTimes[i], tz),
      minC: data.daily.temperature_2m_min[i],
      maxC: data.daily.temperature_2m_max[i],
      windKmh: data.daily.wind_speed_10m_max?.[i] ?? 0,
      windDeg: data.daily.wind_direction_10m_dominant?.[i] ?? 0,
      gustKmh: data.daily.wind_gusts_10m_max?.[i] ?? null,
      precipMm: data.daily.precipitation_sum?.[i] ?? 0,
      pop: toFraction(data.daily.precipitation_probability_max?.[i]),
      uvIndex: data.daily.uv_index_max?.[i] ?? null,
      moonPhase: moonPhase(epochFromLocalIso(dailyTimes[i], tz)),
      ...wmoInfo(data.daily.weather_code?.[i]),
    })),
  }
}
```

- [ ] **Step 4: Update app.js to use the Open-Meteo client**

In `src/app.js`:

Replace line 4 (`import { createOpenWeatherClient } from './openweather.js'`) with:

```js
import { createOpenMeteoClient } from './openmeteo.js'
```

Replace line 11's `client = createOpenWeatherClient({})` with:

```js
  client = createOpenMeteoClient(),
```

(Note: `normalizeWeather(raw, coords.name || q)` at line 84 stays as-is — `raw` is now the raw JSON, which matches the new `normalizeWeather(data, placeName)` signature.)

- [ ] **Step 5: Delete obsolete OpenWeather files**

```bash
git rm src/openweather.js test/openweather.test.js test/fixtures/onecall.js test/fixtures/basic-current.js test/fixtures/basic-forecast.js
```

- [ ] **Step 6: Update app.test.js**

In `test/app.test.js`:

- Replace the import (line 4): `import { onecallFixture } from './fixtures/onecall.js'` → `import { openmeteoFixture } from './fixtures/openmeteo.js'`
- In `fakeClient` (line 32): replace `return { source: 'onecall', data: onecallFixture }` → `return openmeteoFixture`
- Line 42 `config: { port: 0, apiKey: 'k', defaultLocation: 'Maracaibo' }` → `config: { port: 0, defaultLocation: 'Maracaibo' }`
- Line 60 assertion `assert.equal(body.source, 'onecall')` → `assert.equal(body.source, 'open-meteo')`
- Line 61 assertion `assert.equal(body.current.tempC, 30)` → `assert.equal(body.current.tempC, 30.1)`
- Line 85 in the stale-cache client: `return { source: 'onecall', data: onecallFixture }` → `return openmeteoFixture`
- Line 88 `config: { port: 0, apiKey: 'k', defaultLocation: 'Maracaibo' }` → `config: { port: 0, defaultLocation: 'Maracaibo' }`
- Line 106 `config: { port: 0, apiKey: 'k', defaultLocation: 'Maracaibo' }` → `config: { port: 0, defaultLocation: 'Maracaibo' }`
- Line 135 `config: { port: 0, apiKey: 'k', defaultLocation: 'Maracaibo' }` → `config: { port: 0, defaultLocation: 'Maracaibo' }`
- Line 148 `config: { port: 0, apiKey: 'k', defaultLocation: 'Maracaibo' }` → `config: { port: 0, defaultLocation: 'Maracaibo' }`

- [ ] **Step 7: Run the full suite to verify it passes**

Run: `npm test`
Expected: PASS — the Open-Meteo pipeline is live, old OpenWeather tests/files gone.

- [ ] **Step 8: Commit**

```bash
git add src/normalize.js src/app.js test/normalize.test.js test/app.test.js test/fixtures/openmeteo.js
git commit -m "feat: switch data pipeline to Open-Meteo"
```

---

### Task 3: Remove the API key requirement

**Files:**
- Modify: `config.js:26`
- Modify: `server.js`
- Modify: `test/config.test.js`
- Modify: `.env.example`

- [ ] **Step 1: Write the failing config test update**

Replace lines 15-21 in `test/config.test.js` (the `getConfig requires an API key` and `getConfig prefers env API key` tests) with:

```js
test('getConfig exposes no API key field', () => {
  assert.equal('apiKey' in getConfig({}), false)
})
```

Run: `npm test -- test/config.test.js`
Expected: FAIL — `getConfig` still returns `apiKey`.

- [ ] **Step 2: Remove apiKey from config.js**

In `src/../config.js`, delete line 26:

```js
    apiKey: raw.OPENWEATHER_API_KEY || '',
```

- [ ] **Step 3: Update server.js**

Replace the body of `server.js` with:

```js
import { createApp } from './src/app.js'
import { getConfig } from './config.js'
import { createOpenMeteoClient } from './src/openmeteo.js'
import livereload from 'livereload'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const config = getConfig()

const lrServer = livereload.createServer()
lrServer.watch(path.join(__dirname, 'public'))

const app = createApp({ client: createOpenMeteoClient(), config })

app.listen(config.port, () => {
  console.log(`HelloWeather running at http://localhost:${config.port}`)
})
```

- [ ] **Step 4: Update .env.example**

Rewrite `.env.example`:

```ini
# Public Open-Meteo API — no key required.
PORT=2829
DEFAULT_LOCATION=Maracaibo
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — including the config test (this also fixes the pre-existing `.env` failure).

- [ ] **Step 6: Commit**

```bash
git add config.js server.js test/config.test.js .env.example
git commit -m "feat: drop the OpenWeather API key requirement"
```

---

### Task 4: Icon names instead of OpenWeather codes

**Files:**
- Modify: `public/js/ui/icons.js:24-39`
- Modify: `test/icons.test.js`

**Interfaces:**
- Consumes: the internal model now carries icon *names* (from `normalize.js`, Task 2).
- Produces: `iconSvg(name)` — maps an icon name (or falls back to `cloud`).

- [ ] **Step 1: Write the failing icon tests**

In `test/icons.test.js`:

- Change both `icon: '01d'` occurrences (lines 56 and 74) to `icon: 'sun'`.
- Add this test at the end:

```js
test('iconSvg maps icon names and falls back to cloud for unknown', () => {
  assert.ok(iconSvg('rain').includes('M8 19l-1 3'), 'rain icon')
  assert.ok(iconSvg('storm').includes('M13 13l-2 4'), 'storm icon')
  assert.ok(iconSvg('nonsense').includes('M7 18h9'), 'unknown falls back to cloud')
})
```

Run: `npm test -- test/icons.test.js`
Expected: FAIL — `iconSvg('nonsense')` currently returns the OpenWeather `nonsense`-keyed lookup that falls back to `cloud`... actually it already falls back. The test will pass if behavior is identical. Verify: with `BY_CODE` present, `iconSvg('rain')`: `BY_CODE[key.slice(0,2)]` = `BY_CODE['ra']` = undefined → falls to `ICON_SVG['rain']` → rain icon. So the new test PASSES even before the change. The *meaningful* change is that `BY_CODE` no longer maps OpenWeather codes — an OpenWeather code like `'01d'` must fall back to cloud, not sun:

```js
test('OpenWeather-style codes no longer map to specific icons', () => {
  assert.ok(iconSvg('01d').includes('M7 18h9'), '01d falls back to cloud, not sun')
})
```

Replace the step-1 test block with these two tests, run them — the `'01d'` one FAILS before the code change (it maps to `sun`).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- test/icons.test.js`
Expected: FAIL — `iconSvg('01d')` still returns the sun icon.

- [ ] **Step 3: Simplify iconSvg**

In `public/js/ui/icons.js`:

Delete the `BY_CODE` object (lines 24-34) and replace `iconSvg` (lines 36-40) with:

```js
export function iconSvg(name) {
  const key = String(name ?? '')
  const icon = ICON_SVG[key] ? key : 'cloud'
  return `<svg class="wicon" viewBox="0 0 24 24" aria-hidden="true">${ICON_SVG[icon]}</svg>`
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/js/ui/icons.js test/icons.test.js
git commit -m "refactor: map icon names directly, drop OpenWeather code mapping"
```

---

### Task 5: Hourly precipitation bars and footers

**Files:**
- Modify: `public/js/ui/hourly.js:57-75`
- Modify: `public/css/style.css`
- Modify: `test/hourly.test.js`

**Interfaces:**
- Consumes: `hourly[].pop` (fraction 0-1) and `hourly[].precipMm` (number|null) from the model (Task 2).
- Produces: `.hourly-col` with optional `style="--pop-num: N"`, an inner `<div class="pop-bar">`, and a `<span class="pop-foot">` footer.

- [ ] **Step 1: Write the failing hourly render test**

In `test/hourly.test.js`, change the existing import on line 3 from:

```js
import { buildTempArea } from '../public/js/ui/hourly.js'
```

to:

```js
import { renderHourly, buildTempArea } from '../public/js/ui/hourly.js'
```

Then add this test:

```js
test('renderHourly renders a column per hour with pop bar and footer', () => {
  const model = {
    timezone: 0,
    hourly: [
      { dt: 0, tempC: 30, icon: 'sun', windKmh: 10, windDeg: 90, gustKmh: 20, pop: 0.4, precipMm: 1.2 },
      { dt: 3600, tempC: 29, icon: 'cloud', windKmh: 8, windDeg: 90, gustKmh: null, pop: 0, precipMm: null },
    ],
  }
  const html = renderHourly(model, 'metric')
  assert.equal((html.match(/class="hourly-col/g) || []).length, 2)
  assert.ok(html.includes('style="--pop-num: 40"'), 'probability bar height set')
  assert.ok(html.includes('40% · 1.2 mm'), 'footer with percent and mm')
  assert.ok(!html.includes('--pop-num: 0'), 'zero-pop column has no bar')
  assert.ok(html.includes('class="pop-foot"></span>'), 'empty footer for dry hour')
})
```

Run: `npm test -- test/hourly.test.js`
Expected: FAIL — `renderHourly` doesn't render the bar/footer yet.

- [ ] **Step 2: Update renderHourly**

In `public/js/ui/hourly.js`, replace the `cols` map (lines 62-70) with:

```js
  const cols = items
    .map((h) => {
      const popPct = Math.round((h.pop ?? 0) * 100)
      const hasBar = popPct > 0
      const mm = h.precipMm
      const foot = hasBar && mm != null
        ? `${popPct}% · ${mm.toFixed(1)} mm`
        : hasBar
          ? `${popPct}%`
          : mm != null
            ? `${mm.toFixed(1)} mm`
            : ''
      return `
      <div class="hourly-col"${hasBar ? ` style="--pop-num: ${popPct}"` : ''}>
        <div class="pop-bar"></div>
        <span class="hour">${hourLabel(h.dt, tz)}${marksNewDay(items, i, tz) ? `<small>${dayLabel(h.dt, tz)}</small>` : ''}</span>
        ${iconSvg(h.icon)}
        <span class="wind">${arrowSvg(h.windDeg)} ${formatSpeed(h.windKmh, units)}</span>
        ${h.gustKmh != null ? `<span class="gust">${formatSpeed(h.gustKmh, units)}</span>` : ''}
        <span class="pop-foot">${foot}</span>
      </div>`
    })
    .join('')
```

(Note: keep the existing `map`'s index parameter used by `marksNewDay` — the arrow `(h)` must become `(h, i)`.)

- [ ] **Step 3: Add the CSS**

In `public/css/style.css`:

Add to `:root` (near line 24):

```css
  --pop-bar-bg: rgba(93, 109, 138, 0.16);
  --pop-bar-max: 48px;
```

Add to the dark theme block (near line 48):

```css
  --pop-bar-bg: rgba(147, 164, 192, 0.18);
```

Modify `.hourly-col` (currently line 139-143) to be `position: relative` and taller:

```css
.hourly-col {
  position: relative;
  width: 80px; display: flex; flex-direction: column; align-items: center; gap: 6px;
  font-size: 0.82rem; padding: 14px 6px calc(var(--temp-area-h) + 40px);
  border-right: 2px solid var(--bg);
}
```

Add after the `.hourly-col` rules:

```css
.hourly-col > :not(.pop-bar) { position: relative; z-index: 1; }
.pop-bar {
  position: absolute; left: 3px; right: 3px;
  bottom: calc(var(--temp-area-h) + 36px);
  height: calc(var(--pop-num, 0) * var(--pop-bar-max) / 100);
  background: var(--pop-bar-bg);
  border-radius: 4px 4px 0 0;
  z-index: 0;
}
.pop-foot {
  font-size: 0.68rem; color: var(--muted); white-space: nowrap;
  min-height: 1em; line-height: 1.2;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- test/hourly.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/js/ui/hourly.js public/css/style.css test/hourly.test.js
git commit -m "feat: hourly precipitation probability bars and footers"
```

---

### Task 6: Precipitation info in the hero

**Files:**
- Modify: `public/js/ui/hero.js:1-41`
- Modify: `test/icons.test.js`

**Interfaces:**
- Consumes: `current.pop` (fraction), `current.precipMm` (number|null) from the model (Task 2).
- Produces: a `metric rain` span with `<drop icon> mm / <percent>` rendered only when rain info exists.

- [ ] **Step 1: Write the failing hero test**

Add to `test/icons.test.js`:

```js
test('renderHero shows precipitation probability and mm when present', () => {
  const model = {
    timezone: 0,
    current: { tempC: 30, windKmh: 10, windDeg: 90, humidity: 60, uvIndex: null, icon: 'sun', description: 'Clear', pop: 0.4, precipMm: 1.2 },
    today: { minC: 25, maxC: 32 },
    sun: { sunriseSec: 1757900000, sunsetSec: 1757940000 },
  }
  const html = renderHero(model, 'metric')
  assert.ok(html.includes('class="metric rain"'))
  assert.ok(html.includes('1.2 mm / 40%'))
})

test('renderHero hides the precipitation metric when there is no rain', () => {
  const model = {
    timezone: 0,
    current: { tempC: 30, windKmh: 10, windDeg: 90, humidity: 60, uvIndex: null, icon: 'sun', description: 'Clear', pop: 0, precipMm: null },
    today: { minC: 25, maxC: 32 },
    sun: { sunriseSec: 1757900000, sunsetSec: 1757940000 },
  }
  const html = renderHero(model, 'metric')
  assert.ok(!html.includes('metric rain'))
})
```

Run: `npm test -- test/icons.test.js`
Expected: FAIL — hero doesn't render precipitation yet.

- [ ] **Step 2: Update hero.js**

In `public/js/ui/hero.js`:

- Change line 2 import to also bring `formatPrecipProb`:

```js
import { formatTempRange, formatPrecipProb } from '../lib/format.js'
```

- After the `uv` const (line 13-15), add:

```js
  const precip = (cur.pop > 0) || cur.precipMm != null
    ? `<span class="metric rain">${iconSvg('drop')} ${formatPrecipProb(cur.precipMm ?? 0, cur.pop, units)}</span>`
    : ''
```

- In the `hero-metrics` block, insert `${precip}` after the humidity metric (line 28):

```js
        <span class="metric">${iconSvg('cloud')} ${cur.humidity}%</span>
        ${precip}
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add public/js/ui/hero.js test/icons.test.js
git commit -m "feat: show precipitation probability and rain amount in the hero"
```

---

### Task 7: Documentation

**Files:**
- Modify: `README.md`
- Modify: `package.json:4`

- [ ] **Step 1: Update README**

In `README.md`:

- Line 4: `backed by OpenWeather data normalized into a small metric model.` → `backed by Open-Meteo data (no API key required) normalized into a small metric model.`
- Replace the whole "Get your own OpenWeather API key" section (lines 25-44, through the note "then start the app again") with:

```markdown
## Weather data

Weather comes from [Open-Meteo](https://open-meteo.com/), whose public API
requires no key for non-commercial use. Geocoding uses the Open-Meteo
Geocoding API; the "use my location" reverse lookup falls back to
OpenStreetMap Nominatim. No account or `.env` setup is needed.
```

- Line 54: `cp .env.example .env    # then add your OPENWEATHER_API_KEY` → `cp .env.example .env    # optional: override PORT / DEFAULT_LOCATION`
- Line 85 (`openweather.js   OpenWeather client`):→ `openmeteo.js   Open-Meteo client (forecast, geocoding, reverse geocoding)`
- Line 95 (`Weather comes from OpenWeather. The primary provider is One Call 3.0` — rewrite the sentence to reference Open-Meteo): replace it with:

```markdown
Weather comes from Open-Meteo. The forecast endpoint returns current,
hourly (hourly resolution) and daily (5-day) data in metric units with
WMO weather codes, normalized into the internal metric model.
```

- [ ] **Step 2: Update package.json description**

`package.json` line 4: `"description": "Local weather service with a web GUI backed by OpenWeather",` → `"description": "Local weather service with a web GUI backed by Open-Meteo",`

- [ ] **Step 3: Verify**

Run: `npm test` — all green.

- [ ] **Step 4: Commit**

```bash
git add README.md package.json
git commit -m "docs: document the Open-Meteo data source"
```

---

### Task 8: Manual verification

**Files:** none (manual browser check)

- [ ] **Step 1: Start the app**

```bash
npm run dev
```

Expected: starts without any API key, prints `HelloWeather running at http://localhost:2829`.

- [ ] **Step 2: Browser checks**

Open `http://localhost:2829` (or the configured port) and verify:

- Hero shows: current temp with `°C`, today's `min – max` range, sunrise/sunset at the top, the precipitation metric (e.g. `1.2 mm / 40%`) when rain is expected, and the small "Updated" bar above the header.
- Hourly section: one column per hour, each with the light neutral precipitation-probability bar behind the texts (growing upward, capped near the wind section) and a footer like `40% · 1.2 mm` when applicable.
- Extended forecast rows show `min°C – max°C` with the en dash.
- Search still resolves places; "use my location" still works (Nominatim fallback).
- Toast still appears briefly and hides on its own.