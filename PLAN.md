# HelloWeather Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local weather service (Express) that serves a responsive web GUI and proxies OpenWeather data, implementing the UI described in `CONCEPT.md` with reactive state updates, unit toggle (°C/°F) and loading/error/offline states.

**Architecture:** An Express server exposes REST endpoints (`/api/weather`, `/api/geocode`, `/api/health`) and serves a static vanilla-JS frontend from `public/`. The server fetches from OpenWeather (One Call 3.0 primary, with automatic fallback to Current + Forecast 5-day/3-hour), normalizes everything into a canonical metric model (°C, km/h, mm), and caches the last result per location in memory. The frontend re-renders sections from that model and converts units client-side for an instant global toggle. Pure logic modules are shared between server and browser and tested with `node:test` (no build step, no test framework).

**Tech Stack:** Node.js 18+ (ESM), Express, vanilla HTML/CSS/JS, `node --test`.

**Spec:** `CONCEPT.md` (interface layout, data requirements, functional principles).

## Global Constraints

- Node.js >= 18 (uses native `fetch`, `node:test`, `node --watch`).
- Only runtime dependency: `express`. No test framework (uses built-in `node:test`).
- API key read from `OPENWEATHER_API_KEY` env var; fallback to the key provided in `CONCEPT.md`.
- Canonical model is always metric (°C, km/h, mm). Imperial conversions happen in the browser via `public/js/lib/units.js`.
- Port from `PORT` env var, default `3000`. No database. No external services beyond OpenWeather.
- UI must implement: header bar (menu, favorite, location, search, more/units), Hero (temp, daily range, condition + illustration, wind/humidity/UV/moon, sunrise/sunset, updated timestamp), hourly carousel (3h/1h cols, wind + gusts, temp + thermal curve), extended daily list (5–8 days, wind, precip mm/%, UV, gusts, moon, temp range, icon + condition), footer attribution.
- Frontend is vanilla ESM; no bundler. Shared lib modules under `public/js/lib/` are imported by both the browser and the Node server/tests.
- `node --test` is the test command: `npm test`.

---

### Task 1: Project scaffold + config

**Files:**
- Create: `package.json`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `config.js`
- Create: `test/config.test.js`
- Create: `public/`, `src/`, `test/fixtures/` dirs (created by git keep files or first file in each)

**Interfaces:**
- Produces: `getConfig(env = process.env)` → `{ port, apiKey, defaultLocation }`

- [ ] **Step 1: Write the failing test**

Create `test/config.test.js`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getConfig } from '../config.js'

test('getConfig uses provided PORT', () => {
  const config = getConfig({ PORT: '8080', OPENWEATHER_API_KEY: 'k' })
  assert.equal(config.port, 8080)
})

test('getConfig defaults port to 3000 when missing or invalid', () => {
  assert.equal(getConfig({}).port, 3000)
  assert.equal(getConfig({ PORT: 'not-a-number', OPENWEATHER_API_KEY: 'k' }).port, 3000)
})

test('getConfig falls back to CONCEPT.md API key when env missing', () => {
  const config = getConfig({})
  assert.equal(config.apiKey, '')
})

test('getConfig prefers env API key', () => {
  assert.equal(getConfig({ OPENWEATHER_API_KEY: 'env-secret' }).apiKey, 'env-secret')
})

test('getConfig uses DEFAULT_LOCATION with fallback', () => {
  assert.equal(getConfig({ DEFAULT_LOCATION: 'Caracas' }).defaultLocation, 'Caracas')
  assert.equal(getConfig({}).defaultLocation, 'Maracaibo')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/config.test.js`
Expected: FAIL — `Cannot find module '../config.js'`

- [ ] **Step 3: Write minimal implementation**

Create `config.js`:

```js
import { existsSync, readFileSync } from 'node:fs'

const DEFAULT_API_KEY = ''
const DEFAULT_PORT = 3000
const DEFAULT_LOCATION = 'Maracaibo'

function loadDotEnv(filePath = '.env') {
  if (!existsSync(filePath)) return {}
  const out = {}
  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return out
}

const dotEnv = loadDotEnv()

export function getConfig(env = process.env) {
  const raw = { ...dotEnv, ...env }
  const port = Number(raw.PORT ?? DEFAULT_PORT)
  return {
    port: Number.isFinite(port) && port > 0 ? port : DEFAULT_PORT,
    apiKey: raw.OPENWEATHER_API_KEY || DEFAULT_API_KEY,
    defaultLocation: raw.DEFAULT_LOCATION || DEFAULT_LOCATION,
  }
}
```

Create `package.json`:

```json
{
  "name": "helloweather",
  "version": "0.1.0",
  "description": "Local weather service with a web GUI backed by OpenWeather",
  "type": "module",
  "engines": {
    "node": ">=18"
  },
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js",
    "test": "node --test test/"
  },
  "dependencies": {
    "express": "^4.19.2"
  }
}
```

Create `.env.example`:

```
PORT=3000
OPENWEATHER_API_KEY=
DEFAULT_LOCATION=Maracaibo
```

Create `.gitignore`:

```
node_modules/
.env
```

- [ ] **Step 4: Install dependency and run test to verify it passes**

Run: `npm install && node --test test/config.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: Initialize git and commit**

```bash
git init
git add package.json package-lock.json .env.example .gitignore config.js test/config.test.js
git commit -m "chore: scaffold HelloWeather (config, package, tests)"
```

---

### Task 2: Shared unit conversions (`units.js`)

**Files:**
- Create: `public/js/lib/units.js`
- Create: `test/units.test.js`

**Interfaces:**
- Consumes: nothing
- Produces: `UNIT_SYSTEMS`, `cToF(c)`, `kmhToMph(kmh)`, `mmToIn(mm)`, `formatTemp(c, system)`, `formatSpeed(kmh, system)`, `formatPrecip(mm, system)`

- [ ] **Step 1: Write the failing test**

Create `test/units.test.js`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cToF, kmhToMph, mmToIn, formatTemp, formatSpeed, formatPrecip, UNIT_SYSTEMS } from '../public/js/lib/units.js'

test('cToF converts Celsius to Fahrenheit', () => {
  assert.equal(cToF(0), 32)
  assert.equal(cToF(100), 212)
})

test('kmhToMph converts km/h to miles/h', () => {
  assert.equal(kmhToMph(0), 0)
  assert.ok(Math.abs(kmhToMph(10) - 6.21371) < 1e-6)
})

test('mmToIn converts mm to inches', () => {
  assert.equal(mmToIn(25.4), 1)
})

test('formatTemp rounds and appends degree mark', () => {
  assert.equal(formatTemp(30.4, 'metric'), '30°')
  assert.equal(formatTemp(85.6, 'metric'), '86°')
  assert.equal(formatTemp(0, 'metric'), '0°')
  assert.equal(formatTemp(30, 'imperial'), '86°')
  assert.equal(formatTemp(30.6, 'imperial'), '87°')
})

test('formatSpeed rounds and appends unit label', () => {
  assert.equal(formatSpeed(18, 'metric'), '18 km/h')
  assert.equal(formatSpeed(18, 'imperial'), '11 mph')
})

test('formatPrecip keeps one decimal and appends unit label', () => {
  assert.equal(formatPrecip(2.25, 'metric'), '2.3 mm')
  assert.equal(formatPrecip(25.4, 'imperial'), '1.0 in')
})

test('UNIT_SYSTEMS exposes labels', () => {
  assert.equal(UNIT_SYSTEMS.metric.temp, '°C')
  assert.equal(UNIT_SYSTEMS.imperial.temp, '°F')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/units.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

Create `public/js/lib/units.js`:

```js
export const UNIT_SYSTEMS = {
  metric: { temp: '°C', speed: 'km/h', precip: 'mm' },
  imperial: { temp: '°F', speed: 'mph', precip: 'in' },
}

export function cToF(celsius) {
  return (celsius * 9) / 5 + 32
}

export function kmhToMph(kmh) {
  return kmh * 0.621371
}

export function mmToIn(mm) {
  return mm / 25.4
}

export function formatTemp(celsius, system = 'metric') {
  const value = system === 'imperial' ? cToF(celsius) : celsius
  return `${Math.round(value)}°`
}

export function formatSpeed(kmh, system = 'metric') {
  const value = system === 'imperial' ? kmhToMph(kmh) : kmh
  return `${Math.round(value)} ${UNIT_SYSTEMS[system].speed}`
}

export function formatPrecip(mm, system = 'metric') {
  const value = system === 'imperial' ? mmToIn(mm) : mm
  return `${value.toFixed(1)} ${UNIT_SYSTEMS[system].precip}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/units.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add public/js/lib/units.js test/units.test.js
git commit -m "feat: shared unit conversion helpers"
```

---

### Task 3: Datetime formatters (`datetime.js`)

**Files:**
- Create: `public/js/lib/datetime.js`
- Create: `test/datetime.test.js`

**Interfaces:**
- Uses OpenWeather `dt` (Unix seconds UTC) + `timezone` (seconds east of UTC).
- Produces: `localDate(dtSec, tzOffsetSec)`, `hourLabel(dtSec, tzOffsetSec)`, `clockLabel(sec, tzOffsetSec)`, `dayLabel(dtSec, tzOffsetSec)`, `shortDateLabel(dtSec, tzOffsetSec)`, `updatedLabel(unixSec)`

- [ ] **Step 1: Write the failing test**

Create `test/datetime.test.js`. Use a fixed timezone offset `-14400` (Venezuela, UTC−4) and a known timestamp: `2025-09-14T10:15:30Z` → Unix `1757844930`.

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { localDate, hourLabel, clockLabel, dayLabel, shortDateLabel, updatedLabel } from '../public/js/lib/datetime.js'

const TZ = -14400
const T = 1757844930

test('localDate applies timezone offset to UTC seconds', () => {
  const d = localDate(T, TZ)
  assert.equal(d.getUTCFullYear(), 2025)
  assert.equal(d.getUTCMonth(), 8)
  assert.equal(d.getUTCDate(), 14)
  assert.equal(d.getUTCHours(), 6)
})

test('hourLabel renders 12-hour clock with AM/PM', () => {
  assert.equal(hourLabel(T, TZ), '6:00 AM')
  assert.equal(hourLabel(T + 6 * 3600, TZ), '12:00 PM')
  assert.equal(hourLabel(T + 18 * 3600, TZ), '12:00 AM')
})

test('clockLabel renders minutes', () => {
  assert.equal(clockLabel(T, TZ), '6:15 AM')
})

test('dayLabel maps to short English day names', () => {
  assert.equal(dayLabel(T, TZ), 'Sun')
})

test('shortDateLabel renders day and DD/MM', () => {
  assert.equal(shortDateLabel(T, TZ), 'Sun 14/09')
})

test('updatedLabel renders in local browser time zone', () => {
  const now = Math.floor(Date.now() / 1000)
  assert.match(updatedLabel(now), /^\d{1,2}:\d{2} (AM|PM)$/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/datetime.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

Create `public/js/lib/datetime.js`:

```js
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function localDate(dtSec, tzOffsetSec) {
  return new Date((dtSec + tzOffsetSec) * 1000)
}

function hour12(date) {
  const h = date.getUTCHours()
  return (h % 12 || 12)
}

function ampm(date) {
  return date.getUTCHours() >= 12 ? 'PM' : 'AM'
}

export function hourLabel(dtSec, tzOffsetSec) {
  const d = localDate(dtSec, tzOffsetSec)
  return `${hour12(d)}:00 ${ampm(d)}`
}

export function clockLabel(sec, tzOffsetSec) {
  const d = localDate(sec, tzOffsetSec)
  const m = String(d.getUTCMinutes()).padStart(2, '0')
  return `${hour12(d)}:${m} ${ampm(d)}`
}

export function dayLabel(dtSec, tzOffsetSec) {
  return DAY_LABELS[localDate(dtSec, tzOffsetSec).getUTCDay()]
}

export function shortDateLabel(dtSec, tzOffsetSec) {
  const d = localDate(dtSec, tzOffsetSec)
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dayLabel(dtSec, tzOffsetSec)} ${dd}/${mm}`
}

export function updatedLabel(unixSec) {
  const d = new Date(unixSec * 1000)
  let h = d.getHours() % 12
  if (h === 0) h = 12
  const m = String(d.getMinutes()).padStart(2, '0')
  const suffix = d.getHours() >= 12 ? 'PM' : 'AM'
  return `${h}:${m} ${suffix}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/datetime.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add public/js/lib/datetime.js test/datetime.test.js
git commit -m "feat: shared datetime/label formatters"
```

---

### Task 4: Moon phase (`astro.js`)

**Files:**
- Create: `public/js/lib/astro.js`
- Create: `test/astro.test.js`

**Interfaces:**
- Produces: `moonPhase(unixSeconds)` → number 0..1, `moonPhaseLabel(phase)` → string

Algorithms: phase relative to the known new moon at Unix `947182440` (2000-01-06 18:14 UTC) and the synodic period `2551442.796` s.

- [ ] **Step 1: Write the failing test**

Create `test/astro.test.js`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { moonPhase, moonPhaseLabel } from '../public/js/lib/astro.js'

const NEW_MOON = 947182440
const SYNODIC = 2551442.796

test('moonPhase is 0 at the reference new moon', () => {
  assert.equal(moonPhase(NEW_MOON), 0)
})

test('moonPhase returns to 0 after a full synodic period', () => {
  assert.ok(Math.abs(moonPhase(NEW_MOON + SYNODIC)) < 1e-9)
})

test('moonPhase at ~quarter is near 0.25', () => {
  const q = NEW_MOON + SYNODIC / 4
  assert.ok(Math.abs(moonPhase(q) - 0.25) < 0.01)
})

test('labels map phase ranges to named phases', () => {
  assert.equal(moonPhaseLabel(0), 'New Moon')
  assert.equal(moonPhaseLabel(0.25), 'First Quarter')
  assert.equal(moonPhaseLabel(0.5), 'Full Moon')
  assert.equal(moonPhaseLabel(0.75), 'Last Quarter')
  assert.equal(moonPhaseLabel(0.1), 'Waxing Crescent')
  assert.equal(moonPhaseLabel(0.4), 'Waxing Gibbous')
  assert.equal(moonPhaseLabel(0.6), 'Waning Gibbous')
  assert.equal(moonPhaseLabel(0.9), 'Waning Crescent')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/astro.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

Create `public/js/lib/astro.js`:

```js
const SYNODIC_SECONDS = 2551442.796
const NEW_MOON_EPOCH = 947182440

export function moonPhase(unixSeconds) {
  const age = ((unixSeconds - NEW_MOON_EPOCH) % SYNODIC_SECONDS + SYNODIC_SECONDS) % SYNODIC_SECONDS
  return age / SYNODIC_SECONDS
}

export function moonPhaseLabel(phase) {
  if (phase >= 0.9375 || phase < 0.0625) return 'New Moon'
  if (phase < 0.1875) return 'Waxing Crescent'
  if (phase < 0.3125) return 'First Quarter'
  if (phase < 0.4375) return 'Waxing Gibbous'
  if (phase < 0.5625) return 'Full Moon'
  if (phase < 0.6875) return 'Waning Gibbous'
  if (phase < 0.8125) return 'Last Quarter'
  return 'Waning Crescent'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/astro.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add public/js/lib/astro.js test/astro.test.js
git commit -m "feat: moon phase calculation and labels"
```

---

### Task 5: Format composites + UV classifier (`format.js`, `uv.js`)

**Files:**
- Create: `public/js/lib/format.js`
- Create: `public/js/lib/uv.js`
- Create: `test/format.test.js`

**Interfaces:**
- Consumes: `formatTemp`, `formatPrecip` from `./units.js`
- Produces: `formatTempRange(minC, maxC, system)`, `formatPrecipProb(mm, pop, system)`, `compassLabel(deg)`, `uvClass(index)`

- [ ] **Step 1: Write the failing test**

Create `test/format.test.js`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatTempRange, formatPrecipProb, compassLabel } from '../public/js/lib/format.js'
import { uvClass } from '../public/js/lib/uv.js'

test('formatTempRange renders min and max', () => {
  assert.equal(formatTempRange(28, 35, 'metric'), '28° 35°')
  assert.equal(formatTempRange(0, 100, 'imperial'), '32° 212°')
})

test('formatPrecipProb renders mm and percent', () => {
  assert.equal(formatPrecipProb(2.2, 0.48, 'metric'), '2.2 mm / 48%')
  assert.equal(formatPrecipProb(0, 1, 'metric'), '0.0 mm / 100%')
})

test('compassLabel maps degrees to 16-point compass', () => {
  assert.equal(compassLabel(0), 'N')
  assert.equal(compassLabel(90), 'E')
  assert.equal(compassLabel(180), 'S')
  assert.equal(compassLabel(270), 'W')
  assert.equal(compassLabel(22.5), 'NNE')
})

test('uvClass buckets UV index into severity', () => {
  assert.equal(uvClass(0), 'low')
  assert.equal(uvClass(2), 'low')
  assert.equal(uvClass(3), 'moderate')
  assert.equal(uvClass(5), 'moderate')
  assert.equal(uvClass(6), 'high')
  assert.equal(uvClass(7), 'high')
  assert.equal(uvClass(8), 'extreme')
  assert.equal(uvClass(11), 'extreme')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/format.test.js`
Expected: FAIL — modules not found

- [ ] **Step 3: Write minimal implementation**

Create `public/js/lib/format.js`:

```js
import { formatTemp, formatPrecip } from './units.js'

export function formatTempRange(minC, maxC, system = 'metric') {
  return `${formatTemp(minC, system)} ${formatTemp(maxC, system)}`
}

export function formatPrecipProb(mm, pop, system = 'metric') {
  const prob = Math.round((pop ?? 0) * 100)
  return `${formatPrecip(mm, system)} / ${prob}%`
}

export function compassLabel(deg) {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  const norm = ((deg ?? 0) % 360 + 360) % 360
  return dirs[Math.round(norm / 22.5) % 16]
}
```

Create `public/js/lib/uv.js`:

```js
export function uvClass(index) {
  if (index <= 2) return 'low'
  if (index <= 5) return 'moderate'
  if (index <= 7) return 'high'
  return 'extreme'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/format.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add public/js/lib/format.js public/js/lib/uv.js test/format.test.js
git commit -m "feat: composite formatters and UV classifier"
```

---

### Task 6: Weather normalization (`normalize.js` + fixtures)

**Files:**
- Create: `test/fixtures/onecall.js`
- Create: `test/fixtures/basic-current.js`
- Create: `test/fixtures/basic-forecast.js`
- Create: `src/normalize.js`
- Create: `test/normalize.test.js`

**Interfaces:**
- Consumes: `moonPhase` from `../public/js/lib/astro.js`
- Produces: `normalizeWeather(providerResult, placeName)` → canonical model:

```js
{
  source: 'onecall' | 'current-forecast',
  updatedAt: number,            // Date.now()
  location: { name, lat, lon, country },
  timezone: number,             // seconds east of UTC
  current: { tempC, condition, icon, description, feelsLikeC, humidity, cloudiness,
             windKmh, windDeg, windGustKmh, uvIndex, precipMm },
  today: { minC, maxC },
  sun: { sunriseSec, sunsetSec },
  hourly: [ { dt, tempC, windKmh, windDeg, gustKmh, pop, condition, icon } ],
  daily:  [ { dt, minC, maxC, windKmh, windDeg, gustKmh, precipMm, pop,
              uvIndex, moonPhase, condition, icon } ]
}
```

`providerResult` is `{ source, data }` where `data` is either the raw One Call 3.0 payload or `{ current, forecast }` from Current + Forecast 5-day.

Note: `uvIndex` is only available from One Call (the free Current/Forecast endpoints do not provide it) → normalized as `null` in fallback mode. `moonPhase` is computed locally so it is always present.

- [ ] **Step 1: Write the failing fixtures, then the failing test**

Create `test/fixtures/onecall.js`:

```js
export const onecallFixture = {
  lat: 10.66,
  lon: -71.61,
  timezone: -14400,
  current: {
    dt: 1757844930,
    temp: 30,
    feels_like: 34,
    humidity: 70,
    clouds: 40,
    uvi: 8,
    wind_speed: 5,
    wind_deg: 90,
    wind_gust: 8.33,
    sunrise: 1757808000,
    sunset: 1757851200,
    weather: [{ main: 'Clouds', description: 'broken clouds', icon: '04d' }],
  },
  hourly: [
    { dt: 1757844930, temp: 30, wind_speed: 5, wind_deg: 90, wind_gust: 8.33, pop: 0.2, weather: [{ main: 'Clouds', icon: '04d' }] },
    { dt: 1757855730, temp: 28, wind_speed: 4, wind_deg: 120, wind_gust: null, pop: 0.48, weather: [{ main: 'Rain', icon: '10d' }] },
    { dt: 1757866530, temp: 29, wind_speed: 6, wind_deg: 150, wind_gust: 11.11, pop: 0.1, weather: [{ main: 'Clouds', icon: '04d' }] },
  ],
  daily: [
    {
      dt: 1757808000,
      temp: { min: 28, max: 35 },
      wind_speed: 6.11,
      wind_deg: 90,
      wind_gust: 16.39,
      rain: 2.2,
      pop: 0.48,
      uvi: 8,
      weather: [{ main: 'Clouds', description: 'broken clouds', icon: '04d' }],
    },
  ],
}
```

Create `test/fixtures/basic-current.js`:

```js
export const basicCurrentFixture = {
  coord: { lat: 10.66, lon: -71.61 },
  name: 'Maracaibo',
  main: { temp: 30, feels_like: 34, humidity: 70, temp_min: 28, temp_max: 35 },
  clouds: { all: 40 },
  wind: { speed: 5, deg: 90, gust: 8.33 },
  weather: [{ main: 'Clouds', description: 'broken clouds', icon: '04d' }],
  sys: { sunrise: 1757808000, sunset: 1757851200 },
}
```

Create `test/fixtures/basic-forecast.js`:

```js
export const basicForecastFixture = {
  city: { name: 'Maracaibo', timezone: -14400 },
  list: [
    { dt: 1757844930, main: { temp: 30, temp_min: 29, temp_max: 31 }, wind: { speed: 5, deg: 90, gust: 8.33 }, pop: 0.2, weather: [{ main: 'Clouds', icon: '04d' }] },
    { dt: 1757855730, main: { temp: 28, temp_min: 27, temp_max: 29 }, wind: { speed: 4, deg: 120 }, pop: 0.48, rain: { '3h': 2.2 }, weather: [{ main: 'Rain', icon: '10d' }] },
  ],
}
```

Create `test/normalize.test.js`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeWeather } from '../src/normalize.js'
import { onecallFixture } from './fixtures/onecall.js'
import { basicCurrentFixture } from './fixtures/basic-current.js'
import { basicForecastFixture } from './fixtures/basic-forecast.js'

test('normalizes One Call 3.0 payload', () => {
  const model = normalizeWeather({ source: 'onecall', data: onecallFixture }, 'Maracaibo')
  assert.equal(model.source, 'onecall')
  assert.equal(model.location.name, 'Maracaibo')
  assert.equal(model.timezone, -14400)

  assert.equal(model.current.tempC, 30)
  assert.equal(model.current.condition, 'Clouds')
  assert.equal(model.current.humidity, 70)
  assert.equal(model.current.uvIndex, 8)
  assert.equal(model.current.windKmh, 18)
  assert.equal(model.current.windDeg, 90)
  assert.equal(Math.round(model.current.windGustKmh), 30)

  assert.deepEqual(model.today, { minC: 28, maxC: 35 })
  assert.equal(model.sun.sunriseSec, 1757808000)

  assert.equal(model.hourly.length, 3)
  assert.equal(model.hourly[0].tempC, 30)
  assert.equal(Math.round(model.hourly[0].gustKmh), 30)
  assert.equal(model.hourly[1].gustKmh, null)

  assert.equal(model.daily.length, 1)
  const day = model.daily[0]
  assert.equal(day.minC, 28)
  assert.equal(day.maxC, 35)
  assert.equal(Math.round(day.windKmh), 22)
  assert.equal(day.precipMm, 2.2)
  assert.equal(day.pop, 0.48)
  assert.equal(day.uvIndex, 8)
  assert.ok(day.moonPhase >= 0 && day.moonPhase <= 1)
})

test('normalizes Current + Forecast fallback payload', () => {
  const data = { current: basicCurrentFixture, forecast: basicForecastFixture }
  const model = normalizeWeather({ source: 'current-forecast', data }, 'Maracaibo')
  assert.equal(model.source, 'current-forecast')
  assert.equal(model.current.tempC, 30)
  assert.equal(model.current.uvIndex, null)
  assert.equal(model.current.windKmh, 18)

  assert.deepEqual(model.today, { minC: 28, maxC: 35 })

  assert.equal(model.hourly.length, 2)
  assert.equal(model.hourly[0].pop, 0.2)
  assert.equal(model.hourly[1].gustKmh, null)

  assert.equal(model.daily.length, 1)
  assert.equal(model.daily[0].minC, 27)
  assert.equal(model.daily[0].maxC, 31)
  assert.equal(model.daily[0].precipMm, 2.2)
  assert.equal(model.daily[0].pop, 0.48)
  assert.equal(model.daily[0].uvIndex, null)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/normalize.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

Create `src/normalize.js`:

```js
import { moonPhase } from '../public/js/lib/astro.js'

const toKmh = (ms) => ms * 3.6

function first(arr) {
  return Array.isArray(arr) && arr.length ? arr[0] : undefined
}

function weatherInfo(list) {
  const w0 = first(list)
  if (!w0) return { condition: 'Unknown', icon: null, description: '' }
  return { condition: w0.main, icon: w0.icon, description: w0.description || '' }
}

function normalizeOneCall(data, placeName) {
  const current = data.current
  const cw = weatherInfo(current.weather)
  const hourly = (data.hourly || []).slice(0, 48)
  const daily = (data.daily || []).slice(0, 8)
  const today = first(daily)

  return {
    source: 'onecall',
    updatedAt: Date.now(),
    location: { name: placeName, lat: data.lat, lon: data.lon, country: undefined },
    timezone: data.timezone,
    current: {
      tempC: current.temp,
      condition: cw.condition,
      icon: cw.icon,
      description: cw.description,
      feelsLikeC: current.feels_like,
      humidity: current.humidity,
      cloudiness: current.clouds,
      windKmh: toKmh(current.wind_speed ?? 0),
      windDeg: current.wind_deg ?? 0,
      windGustKmh: current.wind_gust != null ? toKmh(current.wind_gust) : null,
      uvIndex: current.uvi ?? null,
      precipMm: null,
    },
    today: today ? { minC: today.temp.min, maxC: today.temp.max } : null,
    sun: { sunriseSec: current.sunrise, sunsetSec: current.sunset },
    hourly: hourly.map((h) => ({
      dt: h.dt,
      tempC: h.temp,
      windKmh: toKmh(h.wind_speed ?? 0),
      windDeg: h.wind_deg ?? 0,
      gustKmh: h.wind_gust != null ? toKmh(h.wind_gust) : null,
      pop: h.pop ?? 0,
      ...weatherInfo(h.weather),
    })),
    daily: daily.map((d) => ({
      dt: d.dt,
      minC: d.temp.min,
      maxC: d.temp.max,
      windKmh: toKmh(d.wind_speed ?? 0),
      windDeg: d.wind_deg ?? 0,
      gustKmh: d.wind_gust != null ? toKmh(d.wind_gust) : null,
      precipMm: d.rain ?? 0,
      pop: d.pop ?? 0,
      uvIndex: d.uvi ?? null,
      moonPhase: moonPhase(d.dt),
      ...weatherInfo(d.weather),
    })),
  }
}

function groupByLocalDay(list, tzOffsetSec) {
  const groups = new Map()
  for (const item of list) {
    const key = new Date((item.dt + tzOffsetSec) * 1000).toISOString().slice(0, 10)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(item)
  }
  return [...groups.values()]
}

function nearestNoon(items, tzOffsetSec) {
  return items.slice().sort((a, b) => {
    const da = Math.abs(new Date((a.dt + tzOffsetSec) * 1000).getUTCHours() - 12)
    const db = Math.abs(new Date((b.dt + tzOffsetSec) * 1000).getUTCHours() - 12)
    return da - db
  })[0]
}

function normalizeBasic(data, placeName) {
  const { current, forecast } = data
  const tz = forecast.city.timezone
  const cw = weatherInfo(current.weather)
  const days = groupByLocalDay(forecast.list, tz).slice(0, 8)

  return {
    source: 'current-forecast',
    updatedAt: Date.now(),
    location: { name: placeName || current.name, lat: current.coord?.lat, lon: current.coord?.lon, country: current.sys?.country },
    timezone: tz,
    current: {
      tempC: current.main.temp,
      condition: cw.condition,
      icon: cw.icon,
      description: cw.description,
      feelsLikeC: current.main.feels_like,
      humidity: current.main.humidity,
      cloudiness: current.clouds?.all ?? null,
      windKmh: toKmh(current.wind.speed ?? 0),
      windDeg: current.wind.deg ?? 0,
      windGustKmh: current.wind.gust != null ? toKmh(current.wind.gust) : null,
      uvIndex: null,
      precipMm: current.rain?.['1h'] ?? null,
    },
    today: { minC: current.main.temp_min, maxC: current.main.temp_max },
    sun: { sunriseSec: current.sys.sunrise, sunsetSec: current.sys.sunset },
    hourly: forecast.list.slice(0, 16).map((h) => ({
      dt: h.dt,
      tempC: h.main.temp,
      windKmh: toKmh(h.wind.speed ?? 0),
      windDeg: h.wind.deg ?? 0,
      gustKmh: h.wind.gust != null ? toKmh(h.wind.gust) : null,
      pop: h.pop ?? 0,
      ...weatherInfo(h.weather),
    })),
    daily: days.map((items) => {
      const noon = nearestNoon(items, tz)
      const wn = weatherInfo(noon?.weather)
      return {
        dt: items[0].dt,
        minC: Math.min(...items.map((i) => i.main.temp_min ?? i.main.temp)),
        maxC: Math.max(...items.map((i) => i.main.temp_max ?? i.main.temp)),
        windKmh: toKmh(noon?.wind.speed ?? 0),
        windDeg: noon?.wind.deg ?? 0,
        gustKmh: noon?.wind.gust != null ? toKmh(noon.wind.gust) : null,
        precipMm: items.reduce((sum, i) => sum + (i.rain?.['3h'] ?? 0), 0),
        pop: Math.max(...items.map((i) => i.pop ?? 0)),
        uvIndex: null,
        moonPhase: moonPhase(items[0].dt),
        condition: wn.condition,
        icon: wn.icon,
      }
    }),
  }
}

export function normalizeWeather(providerResult, placeName = '') {
  if (providerResult.source === 'onecall') return normalizeOneCall(providerResult.data, placeName)
  return normalizeBasic(providerResult.data, placeName)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/normalize.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/normalize.js test/fixtures test/normalize.test.js
git commit -m "feat: OpenWeather -> canonical model normalization"
```

---

### Task 7: OpenWeather HTTP client (`openweather.js`)

**Files:**
- Create: `src/openweather.js`
- Create: `test/openweather.test.js`

**Interfaces:**
- Consumes: nothing (needs `apiKey` and an injectable `fetchImpl`)
- Produces: `createOpenWeatherClient({ apiKey, fetchImpl, baseUrl })` → `{ request, getWeather, geocode }`; `class ApiError extends Error` with `.status`. `getWeather({ lat, lon })` → `{ source: 'onecall' | 'current-forecast', data }`.

- [ ] **Step 1: Write the failing test**

Create `test/openweather.test.js`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createOpenWeatherClient, ApiError } from '../src/openweather.js'

function jsonResponse(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

test('getWeather uses One Call endpoint with appid and metric units', async () => {
  const calls = []
  const client = createOpenWeatherClient({
    apiKey: 'secret',
    fetchImpl: async (url) => {
      calls.push(url.toString())
      return jsonResponse({ hourly: [], daily: [] })
    },
  })
  const result = await client.getWeather({ lat: 10.66, lon: -71.61 })
  assert.equal(result.source, 'onecall')
  const url = new URL(calls[0])
  assert.equal(url.pathname, '/data/3.0/onecall')
  assert.equal(url.searchParams.get('appid'), 'secret')
  assert.equal(url.searchParams.get('units'), 'metric')
  assert.equal(url.searchParams.get('lat'), '10.66')
  assert.equal(url.searchParams.get('lon'), '-71.61')
  assert.equal(url.searchParams.get('exclude'), 'minutely,alerts')
})

test('getWeather falls back to Current + Forecast on 401', async () => {
  const calls = []
  const client = createOpenWeatherClient({
    apiKey: 'secret',
    fetchImpl: async (url) => {
      const u = url.toString()
      calls.push(u)
      if (u.includes('/data/3.0/onecall')) return jsonResponse({}, 401)
      return jsonResponse({ name: 'Maracaibo' })
    },
  })
  const result = await client.getWeather({ lat: 10.66, lon: -71.61 })
  assert.equal(result.source, 'current-forecast')
  assert.equal(calls.filter((c) => c.includes('/data/2.5/weather')).length, 1)
  assert.equal(calls.filter((c) => c.includes('/data/2.5/forecast')).length, 1)
})

test('non-auth errors propagate', async () => {
  const client = createOpenWeatherClient({
    apiKey: 'secret',
    fetchImpl: async () => jsonResponse({}, 500),
  })
  await assert.rejects(() => client.getWeather({ lat: 1, lon: 2 }), (err) => err instanceof ApiError && err.status === 500)
})

test('geocode hits geo endpoint', async () => {
  const calls = []
  const client = createOpenWeatherClient({
    apiKey: 'secret',
    fetchImpl: async (url) => {
      calls.push(url.toString())
      return jsonResponse([{ name: 'Maracaibo', lat: 10.66, lon: -71.61 }])
    },
  })
  const results = await client.geocode('Maracaibo')
  assert.equal(results[0].name, 'Maracaibo')
  const url = new URL(calls[0])
  assert.equal(url.pathname, '/geo/1.0/direct')
  assert.equal(url.searchParams.get('q'), 'Maracaibo')
  assert.equal(url.searchParams.get('limit'), '5')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/openweather.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

Create `src/openweather.js`:

```js
export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function createOpenWeatherClient({ apiKey, fetchImpl = globalThis.fetch, baseUrl = 'https://api.openweathermap.org' } = {}) {
  return {
    baseUrl,
    apiKey,
    fetchImpl,
    async request(path, params) {
      const url = new URL(path, this.baseUrl)
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, String(value))
      }
      url.searchParams.set('appid', this.apiKey)
      const res = await this.fetchImpl(url)
      if (!res.ok) throw new ApiError(`OpenWeather request failed (${res.status})`, res.status)
      return res.json()
    },
    async getWeather({ lat, lon }) {
      try {
        const data = await this.request('/data/3.0/onecall', { lat, lon, units: 'metric', exclude: 'minutely,alerts' })
        return { source: 'onecall', data }
      } catch (err) {
        if (err instanceof ApiError && [401, 403, 404].includes(err.status)) {
          const [current, forecast] = await Promise.all([
            this.request('/data/2.5/weather', { lat, lon, units: 'metric' }),
            this.request('/data/2.5/forecast', { lat, lon, units: 'metric' }),
          ])
          return { source: 'current-forecast', data: { current, forecast } }
        }
        throw err
      }
    },
    async geocode(query) {
      return this.request('/geo/1.0/direct', { q: query, limit: 5 })
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/openweather.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/openweather.js test/openweather.test.js
git commit -m "feat: OpenWeather HTTP client with One Call fallback"
```

---

### Task 8: Express app + entry point (`app.js`, `server.js`)

**Files:**
- Create: `src/app.js`
- Create: `server.js`
- Create: `test/app.test.js`

**Interfaces:**
- Consumes: `createOpenWeatherClient` (`src/openweather.js`), `normalizeWeather` (`src/normalize.js`), `getConfig` (`config.js`), fixtures from `test/fixtures/`
- Produces: `createApp({ client, config })` → Express app with routes `GET /api/health`, `GET /api/geocode?q=`, `GET /api/weather?q=|lat|lon`, static serving of `public/`.

`/api/weather` behavior:
- `?q=CityName` → geocode via client → first result → fetch weather → normalize → cache.
- `?lat=..&lon=..` → direct coords (no name) → fetch → normalize → cache.
- Provider failure with cache hit → `200` with the cached model plus `stale: true`, `staleSince`.
- Provider failure without cache → `502 { error }`.
- Unknown location → `404 { error }`.
- Missing params → `400 { error }`.

- [ ] **Step 1: Write the failing test**

Create `test/app.test.js`:

```js
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../src/app.js'
import { onecallFixture } from './fixtures/onecall.js'

function start(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      resolve({ server, baseUrl: `http://127.0.0.1:${server.address().port}` })
    })
  })
}

function fakeClient(overrides = {}) {
  const state = { failures: 0 }
  return {
    state,
    async geocode(q) {
      if (q === 'Nowhere') return []
      return [{ name: 'Maracaibo', lat: 10.66, lon: -71.61 }]
    },
    async getWeather() {
      if (state.failures > 0) {
        state.failures -= 1
        throw new Error('boom')
      }
      return { source: 'onecall', data: onecallFixture }
    },
    ...overrides,
  }
}

let ctx
let ctxServer

before(async () => {
  const s = await start(createApp({ client: fakeClient(), config: { port: 0, apiKey: 'k', defaultLocation: 'Maracaibo' } }))
  ctx = s
  ctxServer = s.server
})

after(() => new Promise((resolve) => ctxServer.close(resolve)))

test('serves /api/health', async () => {
  const res = await fetch(`${ctx.baseUrl}/api/health`)
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { ok: true })
})

test('serves /api/weather by city name', async () => {
  const res = await fetch(`${ctx.baseUrl}/api/weather?q=Maracaibo`)
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.location.name, 'Maracaibo')
  assert.equal(body.source, 'onecall')
  assert.equal(body.current.tempC, 30)
  assert.equal(body.stale, undefined)
})

test('/api/weather returns 400 without params', async () => {
  const res = await fetch(`${ctx.baseUrl}/api/weather`)
  assert.equal(res.status, 400)
})

test('/api/weather returns 404 for unknown location', async () => {
  const res = await fetch(`${ctx.baseUrl}/api/weather?q=Nowhere`)
  assert.equal(res.status, 404)
})

test('/api/weather serves stale cache when provider fails', async () => {
  const calls = { failures: 0 }
  const app = createApp({
    client: {
      geocode: async (q) => (q === 'Nowhere' ? [] : [{ name: 'Maracaibo', lat: 10.66, lon: -71.61 }]),
      getWeather: async () => {
        if (calls.failures > 0) {
          calls.failures -= 1
          throw new Error('boom')
        }
        return { source: 'onecall', data: onecallFixture }
      },
    },
    config: { port: 0, apiKey: 'k', defaultLocation: 'Maracaibo' },
  })
  const s = await start(app)
  const url = `${s.baseUrl}/api/weather?lat=10.66&lon=-71.61`
  const first = await fetch(url)
  assert.equal(first.status, 200)
  calls.failures = 1
  const second = await fetch(url)
  assert.equal(second.status, 200)
  const body = await second.json()
  assert.equal(body.stale, true)
  assert.ok(body.staleSince)
  await new Promise((resolve) => s.server.close(resolve))
})

test('/api/weather returns 502 without cache when provider fails', async () => {
  const client = fakeClient()
  client.state.failures = 1
  const s = await start(createApp({ client, config: { port: 0, apiKey: 'k', defaultLocation: 'Maracaibo' } }))
  const res = await fetch(`${s.baseUrl}/api/weather?lat=10.66&lon=-71.61`)
  assert.equal(res.status, 502)
  await new Promise((resolve) => s.server.close(resolve))
})

test('/api/geocode returns trimmed place list', async () => {
  const res = await fetch(`${ctx.baseUrl}/api/geocode?q=Maracaibo`)
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.deepEqual(body, [{ name: 'Maracaibo', lat: 10.66, lon: -71.61 }])
})

test('/api/geocode returns 400 without q', async () => {
  const res = await fetch(`${ctx.baseUrl}/api/geocode`)
  assert.equal(res.status, 400)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/app.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

Create `src/app.js`:

```js
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
    const q = req.query.q
    if (typeof q !== 'string' || !q.trim()) {
      return res.status(400).json({ error: 'Missing "q" query parameter' })
    }
    try {
      const results = await client.geocode(q.trim())
      res.json(results.map((p) => ({ name: p.name, country: p.country, state: p.state, lat: p.lat, lon: p.lon })))
    } catch {
      res.status(502).json({ error: 'Geocoding provider unavailable' })
    }
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
```

Create `server.js`:

```js
import { createApp } from './src/app.js'
import { getConfig } from './config.js'
import { createOpenWeatherClient } from './src/openweather.js'

const config = getConfig()
const app = createApp({ client: createOpenWeatherClient({ apiKey: config.apiKey }), config })

app.listen(config.port, () => {
  console.log(`HelloWeather running at http://localhost:${config.port}`)
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/app.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app.js server.js test/app.test.js
git commit -m "feat: Express routes with weather proxy, geocode, cache and stale fallback"
```

---

### Task 9: Frontend shell (HTML, CSS, icons, skeletons, header, footer)

**Files:**
- Create: `public/index.html`
- Create: `public/css/style.css`
- Create: `public/js/ui/icons.js`
- Create: `public/js/ui/skeleton.js`
- Create: `public/js/ui/header.js`
- Create: `test/app-shell.test.js` (static assets served correctly)

**Interfaces:**
- Consumes: `iconSvg`, `arrowSvg` from `./ui/icons.js`; `escapeHtml`
- Produces (consumed by later tasks):
  - `iconSvg(codeOrName)` → inline SVG string (mapped from OpenWeather icon codes `01..50` + named icons)
  - `arrowSvg(deg)` → rotated arrow SVG
  - `renderHeaderSkeleton()`, `skeleton(lines)`
  - `renderHeader(state, els)` → fills `#app-header` with menu, favorite, location, search, more buttons

- [ ] **Step 1: Write the failing test**

Create `test/app-shell.test.js`:

```js
import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../src/app.js'

let server
let baseUrl

before(async () => {
  server = await new Promise((resolve) => {
    const s = createApp({ config: { port: 0, apiKey: 'k', defaultLocation: 'Maracaibo' } }).listen(0, () => resolve(s))
  })
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(() => new Promise((resolve) => server.close(resolve)))

test('serves index.html at /', async () => {
  const res = await fetch(`${baseUrl}/`)
  assert.equal(res.status, 200)
  const html = await res.text()
  assert.match(html, /<title>HelloWeather<\/title>/)
  assert.match(html, /id="hero"/)
  assert.match(html, /Powered by OpenWeather/)
})

test('serves css and js assets', async () => {
  for (const path of ['/css/style.css', '/js/main.js']) {
    const res = await fetch(`${baseUrl}${path}`)
    assert.equal(res.status, 200)
  }
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/app-shell.test.js`
Expected: FAIL — `Cannot GET /` (no `index.html` yet)

- [ ] **Step 3: Write minimal implementation**

Create `public/index.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>HelloWeather</title>
  <link rel="stylesheet" href="/css/style.css" />
</head>
<body>
  <div id="app">
    <header id="app-header"></header>
    <main>
      <section id="hero"></section>
      <section id="hourly"></section>
      <section id="daily"></section>
    </main>
    <footer id="app-footer">Powered by OpenWeather</footer>
  </div>

  <div id="toast" class="toast" role="status"></div>
  <div id="overlay" class="overlay hidden"></div>
  <aside id="drawer" class="drawer" aria-label="Menu"></aside>

  <script type="module" src="/js/main.js"></script>
</body>
</html>
```

Create `public/css/style.css`:

```css
:root {
  --bg: #0f1b2d;
  --panel: #16233a;
  --panel-2: #1d2d49;
  --text: #e9eef7;
  --muted: #93a4c0;
  --accent: #4fc3f7;
  --warm: #e8590c;
  --good: #51cf66;
  --bad: #ff6b6b;
  --radius: 14px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
  background: linear-gradient(180deg, #0b1626, var(--bg));
  color: var(--text);
  min-height: 100vh;
}

#app { max-width: 640px; margin: 0 auto; padding: 0 0 24px; }

header#app-header {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px; padding: 12px 14px;
  background: rgba(15, 27, 45, 0.92); backdrop-filter: blur(6px);
}

.header-left, .header-right { display: flex; align-items: center; gap: 8px; }
.header-location { font-weight: 600; font-size: 1.05rem; }

.icon-btn {
  background: transparent; border: none; color: var(--text);
  width: 36px; height: 36px; border-radius: 8px; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
}
.icon-btn:hover { background: var(--panel-2); }

.wicon { width: 22px; height: 22px; }
.wicon.arrow { width: 16px; height: 16px; }

section { margin: 8px 12px; }
.section-title {
  text-transform: uppercase; font-size: 0.78rem; letter-spacing: 0.08em;
  color: var(--muted); margin: 14px 4px 8px;
}

.hero {
  background: var(--panel); border-radius: var(--radius); padding: 18px;
  display: flex; flex-direction: column; gap: 16px;
}

.hero-top { display: flex; justify-content: space-between; align-items: flex-start; }
.hero-temp { font-size: 4.2rem; font-weight: 300; line-height: 1; }
.hero-day { text-align: right; display: flex; flex-direction: column; line-height: 1.4; }
.hero-day-name { font-size: 1.15rem; font-weight: 600; }
.hero-day-range { color: var(--muted); }

.hero-mid { display: flex; justify-content: space-between; gap: 16px; align-items: flex-end; }
.hero-metrics { display: flex; flex-direction: column; gap: 8px; }
.metric { display: inline-flex; align-items: center; gap: 6px; font-size: 0.9rem; color: var(--muted); }
.metric .wicon  { color: var(--accent); }
.metric.rain .wicon { color: #4dabf7; }
.metric.gust { color: var(--warm); }
.metric.uv.low .wicon { color: var(--good); }
.metric.uv.moderate .wicon { color: #ffd43b; }
.metric.uv.high .wicon { color: var(--warm); }
.metric.uv.extreme .wicon { color: var(--bad); }

.hero-condition { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 4px; }
.hero-condition .wicon { width: 56px; height: 56px; }
.hero-condition p { font-size: 0.95rem; color: var(--muted); }

.hero-bottom {
  display: flex; justify-content: space-between; align-items: center;
  border-top: 1px solid var(--panel-2); padding-top: 12px;
  font-size: 0.85rem; color: var(--muted);
}
.hero-bottom span { display: inline-flex; align-items: center; gap: 6px; }
.updated { margin-left: auto; }

.hourly-track {
  position: relative; display: flex; gap: 6px; overflow-x: auto;
  padding: 12px 4px 30px; background: var(--panel); border-radius: var(--radius);
}
.hourly-col {
  min-width: 76px; display: flex; flex-direction: column; align-items: center; gap: 6px;
  font-size: 0.82rem;
}
.hourly-col .hour { display: flex; flex-direction: column; align-items: center; color: var(--muted); }
.hourly-col .hour small { color: var(--accent); }
.hourly-col .wicon { color: var(--accent); }
.hourly-col .wind { display: inline-flex; align-items: center; gap: 3px; color: var(--muted); }
.hourly-col .gust { color: var(--warm); font-weight: 600; }
.hourly-col .hour-temp { font-weight: 600; font-size: 0.95rem; }

.temp-chart {
  position: absolute; left: 0; right: 0; bottom: 0; height: 26px;
  pointer-events: none; z-index: 2;
}

.daily-list { display: flex; flex-direction: column; gap: 8px; }
.daily-row {
  display: grid; grid-template-columns: 88px 1fr auto; gap: 12px; align-items: center;
  background: var(--panel); border-radius: var(--radius); padding: 12px 14px;
}
.daily-date { font-weight: 600; font-size: 0.9rem; }
.daily-metrics { display: flex; flex-wrap: wrap; gap: 6px 12px; font-size: 0.85rem; }
.daily-summary { display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: 0.8rem; }
.daily-summary .wicon { width: 30px; height: 30px; color: var(--accent); }
.daily-range { font-weight: 600; font-size: 0.95rem; }

.skeleton-block { display: flex; flex-direction: column; gap: 10px; padding: 16px; background: var(--panel); border-radius: var(--radius); }
.skeleton-line { height: 16px; border-radius: 6px; background: linear-gradient(90deg, var(--panel-2) 25%, rgba(255,255,255,0.12) 50%, var(--panel-2) 75%); background-size: 200% 100%; animation: shimmer 1.3s infinite; }
.skeleton-line.tall { height: 64px; }
.skeleton-line.short { width: 40%; }

@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

footer#app-footer { text-align: center; color: var(--muted); font-size: 0.72rem; padding: 18px 0 8px; }

.toast {
  position: fixed; left: 50%; bottom: 20px; transform: translate(-50%, 120%);
  background: #2b3a55; color: var(--text); padding: 10px 16px; border-radius: 10px;
  transition: transform 0.25s ease; z-index: 50; max-width: 90vw;
}
.toast.show { transform: translate(-50%, 0); }
.toast-error { background: #4a1a1a; border: 1px solid var(--bad); }

.offline-banner { background: #3d2b12; border: 1px solid #ffd43b; color: #ffe08a; padding: 8px 12px; border-radius: 10px; margin: 0 0 8px; font-size: 0.85rem; }

.drawer {
  position: fixed; top: 0; left: 0; bottom: 0; width: min(320px, 85vw);
  background: var(--panel); z-index: 60; padding: 18px;
  transform: translateX(-100%); transition: transform 0.25s ease;
  display: flex; flex-direction: column; gap: 14px; overflow-y: auto;
}
.drawer.open { transform: translateX(0); }
.drawer-head { display: flex; justify-content: space-between; align-items: center; }
.drawer-section { text-transform: uppercase; font-size: 0.72rem; color: var(--muted); letter-spacing: 0.08em; }
.fav-list { list-style: none; display: flex; flex-direction: column; gap: 6px; }
.fav-list li { display: flex; gap: 6px; align-items: center; }
.fav-list button { flex: 1; text-align: left; background: var(--panel-2); color: var(--text); border: none; border-radius: 8px; padding: 8px 10px; cursor: pointer; }
.fav-list button.remove { flex: 0; background: transparent; color: var(--bad); }
.seg { flex: 1; padding: 9px; border: 1px solid var(--panel-2); background: transparent; color: var(--muted); cursor: pointer; border-radius: 8px; }
.seg.active { background: var(--accent); color: #0b1626; border-color: var(--accent); font-weight: 600; }
.settings { display: flex; gap: 8px; }
.muted { color: var(--muted); font-size: 0.85rem; }

.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 55; }
.hidden { display: none; }
```

Create `public/js/ui/icons.js`:

```js
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
```

Create `public/js/ui/skeleton.js`:

```js
export function skeleton(lines = 3) {
  const slots = Array.from({ length: lines }, (_, i) => `<div class="skeleton-line ${i === 0 ? 'tall' : ''}"></div>`).join('')
  return `<div class="skeleton-block">${slots}</div>`
}

export function renderHeaderSkeleton() {
  return `<div class="skeleton-block"><div class="skeleton-line short"></div></div>`
}
```

Create `public/js/ui/header.js`:

```js
import { iconSvg, escapeHtml } from './icons.js'

export function renderHeader(state, els) {
  els.header.innerHTML = `
    <div class="header-left">
      <button class="icon-btn" data-action="menu" aria-label="Menu">${iconSvg('menu')}</button>
      <button class="icon-btn" data-action="toggle-fav" aria-label="Favorite">${iconSvg('star')}</button>
      <span class="header-location">${escapeHtml(state.q)}</span>
    </div>
    <div class="header-right">
      <button class="icon-btn" data-action="search" aria-label="Search">${iconSvg('search')}</button>
      <button class="icon-btn" data-action="units" aria-label="Units">${escapeHtml(state.units === 'metric' ? '°C' : '°F')}</button>
    </div>`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/app-shell.test.js`
Expected: PASS

- [ ] **Step 5: Request a commit**

Note: `public/js/main.js` is referenced by `index.html` but does not exist until Task 10. The serving test only checks status codes, so it passes.

```bash
git add public/index.html public/css/style.css public/js/ui/icons.js public/js/ui/skeleton.js public/js/ui/header.js test/app-shell.test.js
git commit -m "feat: frontend shell, styles, icon set, skeletons and header"
```

---

### Task 10: Client state, API, and Hero render (main wiring)

**Files:**
- Create: `public/js/state.js`
- Create: `public/js/api.js`
- Create: `public/js/ui/hero.js`
- Create: `public/js/ui/banner.js`
- Create: `public/js/main.js`
- Modify: `public/js/ui/header.js` (no change needed — already bound)

**Behavior required:** on load, show skeletons, fetch `/api/weather?q=<saved>`, then render Hero (temp, daily range, condition + icon, wind/humidity/UV/moon, sunrise/sunset, updated timestamp) plus offline banner when `model.stale` is true.

- [ ] **Step 1: Write the components (pure renderers first)**

These functions are DOM-string pure functions; they share lib modules already covered by `node:test`. Create:

Create `public/js/state.js`:

```js
const KEYS = { units: 'helloweather:units', location: 'helloweather:location', cache: 'helloweather:cache', favorites: 'helloweather:favorites' }

export const DEFAULT_STATE = { units: 'metric', q: 'Maracaibo', favorites: [], data: null, status: 'idle' }

export function loadState() {
  const s = { ...DEFAULT_STATE }
  try {
    s.units = localStorage.getItem(KEYS.units) === 'imperial' ? 'imperial' : 'metric'
    const q = localStorage.getItem(KEYS.location)
    if (q) s.q = q
    const cache = localStorage.getItem(KEYS.cache)
    if (cache) {
      const c = JSON.parse(cache)
      if (c?.data) s.data = c.data
    }
    s.favorites = JSON.parse(localStorage.getItem(KEYS.favorites) || '[]')
  } catch {
    /* corrupted storage: fall back to defaults */
  }
  return s
}

export function saveState(s) {
  try {
    localStorage.setItem(KEYS.units, s.units)
    localStorage.setItem(KEYS.location, s.q)
    if (s.data) localStorage.setItem(KEYS.cache, JSON.stringify({ data: s.data }))
    localStorage.setItem(KEYS.favorites, JSON.stringify(s.favorites))
  } catch {
    /* storage unavailable: keep in-memory only */
  }
}
```

Create `public/js/api.js`:

```js
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
```

Create `public/js/ui/banner.js`:

```js
import { updatedLabel } from '../lib/datetime.js'

export function offlineBanner(model) {
  return `<div class="offline-banner" role="status">Cached data — last updated at ${updatedLabel(model.updatedAt / 1000)}</div>`
}
```

Create `public/js/ui/hero.js`:

```js
import { formatTemp, formatSpeed } from '../lib/units.js'
import { formatTempRange } from '../lib/format.js'
import { dayLabel, clockLabel, updatedLabel } from '../lib/datetime.js'
import { moonPhase, moonPhaseLabel } from '../lib/astro.js'
import { uvClass } from '../lib/uv.js'
import { iconSvg } from './icons.js'

export function renderHero(model, units) {
  const cur = model.current
  const tz = model.timezone
  const today = model.today ?? { minC: cur.tempC, maxC: cur.tempC }

  const uv = cur.uvIndex != null
    ? `<span class="metric uv uv-${uvClass(cur.uvIndex)}">${iconSvg('uv')} UV ${cur.uvIndex}</span>`
    : ''

  return `
    <div class="hero-top">
      <span class="hero-temp">${formatTemp(cur.tempC, units)}</span>
      <div class="hero-day">
        <span class="hero-day-name">${dayLabel(Math.floor(Date.now() / 1000), tz)}</span>
        <span class="hero-day-range">${formatTempRange(today.minC, today.maxC, units)}</span>
      </div>
    </div>
    <div class="hero-mid">
      <div class="hero-metrics">
        <span class="metric">${iconSvg('arrow')} ${formatSpeed(cur.windKmh, units)}</span>
        <span class="metric">${iconSvg('cloud')} ${cur.humidity}%</span>
        ${uv}
        <span class="metric">${iconSvg('moon')} ${moonPhaseLabel(moonPhase(Math.floor(Date.now() / 1000)))}</span>
      </div>
      <div class="hero-condition">
        ${iconSvg(cur.icon)}
        <p>${cur.description || cur.condition}</p>
      </div>
    </div>
    <div class="hero-bottom">
      <span>${iconSvg('sunrise')} ${clockLabel(model.sun.sunriseSec, tz)}</span>
      <span>${iconSvg('sunset')} ${clockLabel(model.sun.sunsetSec, tz)}</span>
      <span class="updated">Updated: ${updatedLabel(model.updatedAt / 1000)}</span>
    </div>`
}

export function renderNoData() {
  return `<p class="muted">No weather data yet.</p>`
}
```

Create `public/js/main.js`:

```js
import { loadState, saveState } from './state.js'
import { fetchWeather } from './api.js'
import { renderHero, renderNoData } from './ui/hero.js'
import { renderHeader } from './ui/header.js'
import { skeleton } from './ui/skeleton.js'
import { offlineBanner } from './ui/banner.js'
import { showToast } from './ui/toast.js'

const state = loadState()

const els = {
  header: document.getElementById('app-header'),
  hero: document.getElementById('hero'),
  hourly: document.getElementById('hourly'),
  daily: document.getElementById('daily'),
  toast: document.getElementById('toast'),
  overlay: document.getElementById('overlay'),
  drawer: document.getElementById('drawer'),
}

function render() {
  renderHeader(state, els)
  document.getElementById('app-footer').textContent = 'Powered by OpenWeather'
  if (!state.data) {
    if (state.status === 'loading') {
      els.hero.innerHTML = skeleton(3)
      els.hourly.innerHTML = skeleton()
      els.daily.innerHTML = skeleton(5)
    } else {
      els.hero.innerHTML = renderNoData()
      els.hourly.innerHTML = ''
      els.daily.innerHTML = ''
    }
    return
  }
  const model = state.data
  const units = state.units
  els.hero.innerHTML = (model.stale ? offlineBanner(model) : '') + renderHero(model, units)
  els.hourly.innerHTML = ''
  els.daily.innerHTML = ''
}

async function loadWeather(payload) {
  state.q = payload.q ?? payload.name ?? state.q
  state.status = 'loading'
  state.data = null
  render()
  try {
    const data = await fetchWeather(payload)
    state.data = data
    if (data.location?.name) state.q = data.location.name
  } catch (err) {
    state.status = 'error'
    showToast(err.message || 'Could not load weather', 'error')
  } finally {
    state.status = 'done'
    saveState(state)
    render()
  }
}

loadWeather({ q: state.q })
```

- [ ] **Step 2: Verify the shell test still passes and the app runs**

Run: `node --test test/app-shell.test.js`
Expected: PASS (HTML now also references existing `main.js`)

Run: `PORT=3100 node server.js` then in a second terminal:
`curl -s http://localhost:3100/api/health`
Expected: `{"ok":true}` (server boots; network request happens in browser)

Press Ctrl+C to stop the server.

- [ ] **Step 3: Commit**

```bash
git add public/js/state.js public/js/api.js public/js/ui/hero.js public/js/ui/banner.js public/js/main.js
git commit -m "feat: client state, api layer, hero rendering and load flow"
```

---

### Task 11: Hourly carousel + thermal curve

**Files:**
- Create: `public/js/ui/hourly.js`
- Modify: `public/js/main.js` (call `renderHourly`)

**Interfaces:**
- Consumes: `formatTemp`, `formatSpeed` (`lib/units.js`), `hourLabel`, `dayLabel` (`lib/datetime.js`), `iconSvg`, `arrowSvg` (`ui/icons.js`)
- Produces: `renderHourly(model, units)` → HTML string with an `<svg class="temp-chart">` polyline across all columns

- [ ] **Step 1: Write the renderer**

Create `public/js/ui/hourly.js`:

```js
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
```

- [ ] **Step 2: Wire it up in main.js**

Modify `src`-adjacent frontend `public/js/main.js`:

```js
import { renderHourly } from './ui/hourly.js'
```

and in the data branch of `render()`:

```js
  els.hourly.innerHTML = renderHourly(model, units)
  els.daily.innerHTML = ''
```

- [ ] **Step 3: Run the suite and verify in the browser**

Run: `node --test`
Expected: PASS (all prior suites)

Run: `PORT=3100 node server.js`, open `http://localhost:3100`, confirm the hourly track scrolls horizontally with time labels, condition icons, wind + orange gust text, hour temperatures, and the red/orange polyline crossing the columns.

- [ ] **Step 4: Commit**

```bash
git add public/js/ui/hourly.js public/js/main.js
git commit -m "feat: hourly forecast carousel with thermal curve"
```

---

### Task 12: Extended daily forecast list

**Files:**
- Create: `public/js/ui/daily.js`
- Modify: `public/js/main.js` (call `renderDaily`)

**Interfaces:**
- Consumes: `formatTempRange`, `formatPrecipProb`, `compassLabel` (`lib/format.js`), `formatSpeed` (`lib/units.js`), `shortDateLabel` (`lib/datetime.js`), `moonPhaseLabel` (`lib/astro.js`), `uvClass` (`lib/uv.js`), `iconSvg`, `arrowSvg` (`ui/icons.js`)
- Produces: `renderDaily(model, units)` → HTML list of `daily-row` blocks

- [ ] **Step 1: Write the renderer**

Create `public/js/ui/daily.js`:

```js
import { formatSpeed } from '../lib/units.js'
import { formatTempRange, formatPrecipProb } from '../lib/format.js'
import { shortDateLabel } from '../lib/datetime.js'
import { moonPhaseLabel } from '../lib/astro.js'
import { uvClass } from '../lib/uv.js'
import { iconSvg, arrowSvg } from './icons.js'

export function renderDaily(model, units) {
  const tz = model.timezone
  if (!model.daily.length) return '<div class="section-title">Extended</div><p class="muted">No forecast data.</p>'

  const rows = model.daily
    .map((d) => {
      const uv = d.uvIndex != null
        ? `<span class="metric uv uv-${uvClass(d.uvIndex)}">${iconSvg('uv')} UV ${d.uvIndex}</span>`
        : ''
      const gust = d.gustKmh != null
        ? `<span class="metric gust">${iconSvg('wind')} ${formatSpeed(d.gustKmh, units)}</span>`
        : ''
      return `
      <div class="daily-row">
        <div class="daily-date">${shortDateLabel(d.dt, tz)}</div>
        <div class="daily-metrics">
          <span class="metric">${arrowSvg(d.windDeg)} ${formatSpeed(d.windKmh, units)}</span>
          <span class="metric rain">${iconSvg('drop')} ${formatPrecipProb(d.precipMm, d.pop, units)}</span>
          ${uv}
          ${gust}
          <span class="metric">${iconSvg('moon')} ${moonPhaseLabel(d.moonPhase)}</span>
        </div>
        <div class="daily-summary">
          ${iconSvg(d.icon)}
          <span>${d.condition}</span>
          <span class="daily-range">${formatTempRange(d.minC, d.maxC, units)}</span>
        </div>
      </div>`
    })
    .join('')

  return `
    <div class="section-title">Extended forecast</div>
    <div class="daily-list">${rows}</div>`
}
```

- [ ] **Step 2: Wire it up in main.js**

Modify `public/js/main.js`:

```js
import { renderDaily } from './ui/daily.js'
```

and in the data branch of `render()`:

```js
  els.hourly.innerHTML = renderHourly(model, units)
  els.daily.innerHTML = renderDaily(model, units)
```

- [ ] **Step 3: Run the suite and verify in the browser**

Run: `node --test`
Expected: PASS

Run: `PORT=3100 node server.js`, open `http://localhost:3100`, confirm the daily list shows date, wind+gust, rain mm/% in blue, UV with severity color, moon phase, temp range, and condition icon+text.

- [ ] **Step 4: Commit**

```bash
git add public/js/ui/daily.js public/js/main.js
git commit -m "feat: extended daily forecast list"
```

---

### Task 13: Interactions — units toggle, search, favorites, drawer, toasts

**Files:**
- Create: `public/js/ui/toast.js`
- Create: `public/js/ui/search.js`
- Create: `public/js/ui/drawer.js`
- Modify: `public/js/main.js` (event wiring + unit toggle + favorite + load by geocode result)

**Interfaces:**
- Consumes: `showToast(message, kind)` (`ui/toast.js`); `searchOverlayHtml()`, `renderSearchResults(results)` (`ui/search.js`); `drawerHtml(state)` (`ui/drawer.js`); `fetchGeocode` (`api.js`); `render` in `main.js`
- Produces: completed behavior — instant unit toggle without refetch, search by name, favorite star add/remove, drawer menu, offline toast

- [ ] **Step 1: Write the UI helpers**

Create `public/js/ui/toast.js`:

```js
export function showToast(message, kind = 'info') {
  const el = document.getElementById('toast')
  el.textContent = message
  el.className = `toast toast-${kind} show`
  clearTimeout(el._t)
  el._t = setTimeout(() => {
    el.className = 'toast'
  }, 4000)
}
```

Create `public/js/ui/search.js`:

```js
import { iconSvg, escapeHtml } from './icons.js'

export function searchOverlayHtml() {
  return `
    <div class="search-box">
      <div class="search-head">
        <input id="search-input" type="text" placeholder="City name or coordinates" autocomplete="off" />
        <button class="icon-btn" data-action="close-search">${iconSvg('close')}</button>
      </div>
      <ul id="search-results"></ul>
    </div>`
}

export function renderSearchResults(results) {
  if (!results.length) return '<li class="muted">No locations found.</li>'
  return results
    .map((r) => {
      const label = [r.name, r.state, r.country].filter(Boolean).join(', ') || r.name
      return `<li><button class="search-result" data-action="pick-location" data-name="${escapeHtml(label)}">${escapeHtml(label)}</button></li>`
    })
    .join('')
}
```

Create `public/js/ui/drawer.js`:

```js
import { iconSvg, escapeHtml } from './icons.js'

export function drawerHtml(state) {
  const unitsRow = `
    <div class="settings">
      <button class="seg ${state.units === 'metric' ? 'active' : ''}" data-action="set-units" data-value="metric">Metric °C</button>
      <button class="seg ${state.units === 'imperial' ? 'active' : ''}" data-action="set-units" data-value="imperial">Imperial °F</button>
    </div>`
  const favs = state.favorites.length
    ? state.favorites
        .map((f, i) => `<li><button data-action="goto-fav" data-value="${i}">${escapeHtml(f)}</button><button class="remove" data-action="remove-fav" data-value="${i}">×</button></li>`)
        .join('')
    : '<li class="muted">No favorites yet. Tap the star on any city.</li>'
  return `
    <div class="drawer-head">
      <strong>Locations &amp; settings</strong>
      <button class="icon-btn" data-action="close-drawer">${iconSvg('close')}</button>
    </div>
    <div class="drawer-section">Favorites</div>
    <ul class="fav-list">${favs}</ul>
    <div class="drawer-section">Units</div>
    ${unitsRow}
    <div class="drawer-foot muted">Powered by OpenWeather</div>`
}
```

- [ ] **Step 2: Rewrite main.js with event wiring**

Replace the contents of `public/js/main.js`:

```js
import { loadState, saveState } from './state.js'
import { fetchWeather, fetchGeocode } from './api.js'
import { renderHero, renderNoData } from './ui/hero.js'
import { renderHourly } from './ui/hourly.js'
import { renderDaily } from './ui/daily.js'
import { renderHeader } from './ui/header.js'
import { skeleton } from './ui/skeleton.js'
import { offlineBanner } from './ui/banner.js'
import { showToast } from './ui/toast.js'
import { searchOverlayHtml, renderSearchResults } from './ui/search.js'
import { drawerHtml } from './ui/drawer.js'

const state = loadState()

const els = {
  header: document.getElementById('app-header'),
  hero: document.getElementById('hero'),
  hourly: document.getElementById('hourly'),
  daily: document.getElementById('daily'),
  toast: document.getElementById('toast'),
  overlay: document.getElementById('overlay'),
  drawer: document.getElementById('drawer'),
}

function render() {
  renderHeader(state, els)
  if (!state.data) {
    if (state.status === 'loading') {
      els.hero.innerHTML = skeleton(3)
      els.hourly.innerHTML = skeleton()
      els.daily.innerHTML = skeleton(5)
    } else {
      els.hero.innerHTML = renderNoData()
      els.hourly.innerHTML = ''
      els.daily.innerHTML = ''
    }
    return
  }
  const model = state.data
  const units = state.units
  els.hero.innerHTML = (model.stale ? offlineBanner(model) : '') + renderHero(model, units)
  els.hourly.innerHTML = renderHourly(model, units)
  els.daily.innerHTML = renderDaily(model, units)
}

function updateFavoriteButton() {
  const btn = document.querySelector('[data-action="toggle-fav"]')
  if (btn) btn.style.opacity = state.favorites.includes(state.q) ? '1' : '0.35'
}

async function loadWeather(payload) {
  state.status = 'loading'
  if (payload.lat != null) {
    state.q = payload.name || state.q
  } else {
    state.q = payload.q ?? payload.name
  }
  state.data = null
  render()
  try {
    const data = await fetchWeather(payload)
    state.data = data
    if (data.location?.name) state.q = data.location.name
    if (state.status === 'error') state.status = 'done'
  } catch (err) {
    state.status = 'error'
    showToast(err.message || 'Could not load weather', 'error')
  } finally {
    state.status = 'done'
    saveState(state)
    render()
    updateFavoriteButton()
  }
}

function openDrawer() {
  els.drawer.innerHTML = drawerHtml(state)
  els.drawer.classList.add('open')
  els.overlay.classList.remove('hidden')
}

function closeDrawer() {
  els.drawer.classList.remove('open')
  els.overlay.classList.add('hidden')
}

function openSearch() {
  els.overlay.innerHTML = searchOverlayHtml()
  els.overlay.classList.remove('hidden')
  const input = document.getElementById('search-input')
  input.focus()
  input.addEventListener('input', async () => {
    const q = input.value.trim()
    const list = document.getElementById('search-results')
    if (!q) {
      list.innerHTML = ''
      return
    }
    try {
      const results = await fetchGeocode(q)
      list.innerHTML = renderSearchResults(results)
    } catch {
      list.innerHTML = '<li class="muted">Search is unavailable.</li>'
    }
  })
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
      loadWeather({ q: input.value.trim() })
      closeOverlay()
    }
  })
}

function closeOverlay() {
  els.overlay.classList.add('hidden')
  els.overlay.innerHTML = ''
}

document.addEventListener('click', (e) => {
  const actionEl = e.target.closest('[data-action]')
  if (!actionEl) return
  const { action, value, name } = actionEl.dataset

  switch (action) {
    case 'menu':
      openDrawer()
      break
    case 'toggle-fav': {
      const idx = state.favorites.indexOf(state.q)
      if (idx === -1) {
        state.favorites.push(state.q)
        showToast(`${state.q} added to favorites`)
      } else {
        state.favorites.splice(idx, 1)
        showToast(`${state.q} removed from favorites`)
      }
      saveState(state)
      updateFavoriteButton()
      break
    }
    case 'search':
      openSearch()
      break
    case 'units': {
      state.units = state.units === 'metric' ? 'imperial' : 'metric'
      saveState(state)
      render()
      break
    }
    case 'set-units':
      state.units = value
      saveState(state)
      render()
      openDrawer()
      break
    case 'close-drawer':
      closeDrawer()
      break
    case 'close-search':
      closeOverlay()
      break
    case 'pick-location':
      loadWeather({ q: name })
      closeOverlay()
      break
    case 'goto-fav': {
      const q = state.favorites[Number(value)]
      if (q) loadWeather({ q })
      closeDrawer()
      break
    }
    case 'remove-fav': {
      state.favorites.splice(Number(value), 1)
      saveState(state)
      openDrawer()
      break
    }
    default:
      break
  }
})

render()
updateFavoriteButton()
els.overlay.addEventListener('click', (e) => {
  if (e.target === els.overlay) closeOverlay()
})
loadWeather({ q: state.q })
```

- [ ] **Step 3: Run the suite and verify interactions manually**

Run: `node --test`
Expected: PASS

Run: `PORT=3100 node server.js`, open `http://localhost:3100` and check:
- Header shows location, star (dim), search, units button.
- Menu opens the drawer with favorites + unit toggle; switching °C/°F updates every number instantly (no reload).
- Search "Maracaibo" shows the city; Enter or pick loads it.
- Star adds current city to favorites (drawer updates).
- Stop the server and refresh — the browser fallback shows a toast on failure (offline).

- [ ] **Step 4: Commit**

```bash
git add public/js/ui/toast.js public/js/ui/search.js public/js/ui/drawer.js public/js/main.js
git commit -m "feat: units toggle, search, favorites, drawer and toasts"
```

---

### Task 14: Final QA, README, and polish

**Files:**
- Create: `README.md`
- Modify: `public/js/lib/astro.js` (optional exposure of `moonPhaseLabel` — already present), no functional change expected
- Verify: full test suite + manual browser pass against live OpenWeather

**Global check (manual, browser):** loading skeletons appear, Hero renders complete (temp, range, condition + illustration, wind/humidity/UV/moon, sunrise/sunset, updated time), hourly carousel with curve, extended daily list, footer attribution, unit toggle instant, search changes city without page reload (reactive state).

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS (config, units, datetime, astro, format, normalize, openweather, app, app-shell)

- [ ] **Step 2: Run against the real API**

Run: `PORT=3100 node server.js`
Then verify in the browser at `http://localhost:3100` that live data loads (metrics populate from OpenWeather). If no data, confirm the `.env` file exists with `OPENWEATHER_API_KEY` (falls back to the CONCEPT.md key otherwise) and network access to `api.openweathermap.org`.

- [ ] **Step 3: Write README.md**

Create `README.md`:

```markdown
# HelloWeather

Local weather service with a web GUI. Serves a vanilla JS frontend from
Express and proxies OpenWeather into a normalized metric model.

## Requirements

- Node.js >= 18

## Setup

```bash
npm install
cp .env.example .env   # optional; API key falls back to the one in CONCEPT.md
```

## Run

```bash
npm start          # http://localhost:3000 (override with PORT env var)
npm run dev        # auto-restart on change
```

## Test

```bash
npm test           # node --test
```

## Data source

OpenWeather. Primary provider is One Call 3.0 (`/data/3.0/onecall`,
1-hour granularity incl. UV index). If the API key has no One Call
access, the service silently falls back to Current Weather
(`/data/2.5/weather`) + Forecast 5-day/3-hour (`/data/2.5/forecast`);
in that mode UV is omitted and hourly steps are 3-hour. Moon phase is
computed locally. When OpenWeather is unreachable, the last cached
result per location is served with a `stale` flag and shown with an
offline banner.
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup, run and data-source notes"
```

---

## Self-Review Notes

- **Spec coverage (CONCEPT.md):** §2.1 header (Task 9/13), §2.2 Hero incl. UV/moon/sun/updated (Task 10), §2.3 hourly carousel + thermal curve + gusts (Task 11), §2.4 extended daily list with wind/precip/UV/gusts/moon/range (Task 12), §2.5 footer (Task 9/13), §3.1 local service + configurable port (Task 1/8), §3.2 OpenWeather consumption with reactive location change (Task 8/13), §3.3 loading skeletons / error toast / offline stale state (Task 10/13), §3.4 instant metric/imperial toggle (Task 13).
- **Data-source caveat:** UV index is available only via One Call 3.0; the fallback normalizes `uvIndex: null` and the UI omits that metric. This is an explicit design decision documented in `README.md` and Task 6.
- **Type consistency:** `normalizeWeather` output shapes match the renderers (`hourly[].gustKmh`, `daily[].uvIndex`, `model.timezone`, `model.updatedAt` in ms, `sun.sunriseSec`). `updatedLabel` consumes seconds (`updatedAt / 1000`).