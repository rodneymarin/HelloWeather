# Open-Meteo Migration Design

Date: 2026-09-14
Status: Approved

## Goal

Replace OpenWeather as the sole weather data provider with Open-Meteo
(https://open-meteo.com/), which requires no API key. Adapt every layer of the
app to the new payload shapes. Additionally: enrich the hourly section with
hourly-resolution forecast, a per-block precipitation-probability bar and
footer value, and add precipitation probability + rain amount to the hero.

## Background

Current architecture:

- `src/openweather.js` — client with One Call 3.0 + fallback to 2.5
  weather/forecast, geocode (direct) and reverse geocode. Requires `appid`.
- `src/normalize.js` — two normalizers (`normalizeOneCall`, `normalizeBasic`)
  mapping OpenWeather payloads into one internal model.
- `config.js` + `server.js` — require `OPENWEATHER_API_KEY` at boot.
- `public/js/ui/icons.js` — `BY_CODE` maps OpenWeather icon codes (`'01d'`)
  to icon names; the model's `icon` field carries those codes.
- Frontend consumes only our backend (`/api/*`); the internal model is:
  `{ source, updatedAt, location, timezone, current, today, sun, hourly[], daily[] }`
  with `tempC` (°C), `windKmh`, `pop` (fraction 0–1), `dt` (UTC epoch sec),
  `timezone` (UTC offset seconds).

Open-Meteo facts that drive the design:

- No API key needed for non-commercial use.
- Single forecast endpoint: `GET /v1/forecast` (no provider fallback needed).
- Native **hourly** resolution (every hour) — replaces the 3-hourly forecast.
- Wind speed unit is km/h by default (no conversion), precipitation in mm.
- Precipitation probability is 0–100 (int) — the internal model uses a
  fraction, so divide by 100.
- WMO weather codes (integers) instead of condition/icon strings.
- `timezone=auto` returns local ISO times plus `utc_offset_seconds`, which
  matches the frontend time convention (`dt + tz` in seconds).
- Geocoding API (`https://geocoding-api.open-meteo.com/v1/search`) only
  supports search by name — **no reverse geocoding**.

## Design

### 1. New client: `src/openmeteo.js` (replaces `src/openweather.js`)

- `createOpenMeteoClient({ fetchImpl, forecastBaseUrl, geocodeBaseUrl, reverseBaseUrl })`.
- `getWeather({ lat, lon })`: GET `{forecastBaseUrl}/v1/forecast` with:
  - `latitude`, `longitude`, `timezone=auto`, `forecast_days=5`, `forecast_hours=24`
  (`forecast_hours=24` makes the hourly array start at the current hour)
  - `current`: `temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m`
  - `hourly`: `temperature_2m,precipitation,precipitation_probability,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index`
  - `daily`: `weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant,wind_gusts_10m_max`
- `geocode(query)`: GET `{geocodeBaseUrl}/v1/search?name=...&count=5&language=en&format=json`
  → maps `results[]` to `{ name, country: country_code, state: admin1, lat, lon }`.
  Returns `[]` when there are no results.
- `reverseGeocode(lat, lon)`: Nominatim
  `{reverseBaseUrl}/reverse?lat=...&lon=...&format=jsonv2&zoom=10` with header
  `User-Agent: HelloWeather/0.1 (weather demo app)` → maps to
  `{ name: address.city || address.town || address.village || name, country: address.country_code, state: address.state, lat, lon }`.
- Errors: throw `ApiError('Open-Meteo request failed (status)', status)`.

### 2. Normalization: `src/normalize.js`

One single normalizer `normalizeOpenMeteo(data, placeName)` (removes
`normalizeOneCall`/`normalizeBasic` and the `providerResult.source` switch).
Open-Meteo's `current` has no probability, so "current" pop/UV come from
`hourly[0]` (the array starts at the current hour), with daily fallbacks.

Model mapping (internal model is unchanged in shape):

- `source: 'open-meteo'`; `updatedAt: Date.now()`
- `location`: `{ name: placeName, lat, lon }` (country from geocode when known)
- `timezone`: `utc_offset_seconds` (frontend convention)
- `current`:
  - `tempC` ← `current.temperature_2m`; `feelsLikeC` ← `apparent_temperature`
  - `humidity` ← `relative_humidity_2m`; `cloudiness` ← `cloud_cover`
  - `windKmh` ← `wind_speed_10m` (already km/h); `windDeg` ← `wind_direction_10m`
  - `windGustKmh` ← `wind_gusts_10m`
  - `precipMm` ← `precipitation`
  - `pop` ← hourly `precipitation_probability[0]` ÷ 100 (hourly starts at the
    current hour; fallback: `daily.precipitation_probability_max[0]` ÷ 100)
  - `uvIndex` ← hourly `uv_index[0]` (fallback: `daily.uv_index_max[0]`)
  - `condition`/`icon` ← WMO code → text + icon name (tables below)
- `today`: `{ minC: daily.temperature_2m_min[0], maxC: daily.temperature_2m_max[0] }`
- `sun`: `{ sunriseSec, sunsetSec }` — ISO local strings → epoch seconds via
  `Date.parse(iso + 'Z') / 1000 - utc_offset_seconds`
- `hourly` (24 entries, native hourly resolution, starts at the current hour
  thanks to `forecast_hours=24`):
  - `dt` ← `Date.parse(hourly.time[i] + 'Z') / 1000 - utc_offset_seconds`
  - `tempC`, `windKmh`, `windDeg`, `gustKmh` (km/h, no conversion)
  - `pop` ← `precipitation_probability[i]` ÷ 100 (missing → 0)
  - `precipMm` ← `precipitation[i]` (missing → null)
  - `condition`/`icon` from WMO code
- `daily` (5 entries):
  - `minC`/`maxC` ← `temperature_2m_min/max`
  - `windKmh` ← `wind_speed_10m_max`; `windDeg` ← `wind_direction_10m_dominant`
  - `gustKmh` ← `wind_gusts_10m_max`
  - `precipMm` ← `precipitation_sum`; `pop` ← `precipitation_probability_max` ÷ 100
  - `uvIndex` ← `uv_index_max`; `moonPhase` ← `moonPhase(dt)`
  - `condition`/`icon` from WMO code

WMO code → condition text (standard interpretation):

| Code(s) | Condition |
|---|---|
| 0 | Clear sky |
| 1 | Mainly clear |
| 2 | Partly cloudy |
| 3 | Overcast |
| 45, 48 | Fog |
| 51, 53, 55 | Drizzle |
| 56, 57 | Freezing drizzle |
| 61, 63, 65 | Rain |
| 66, 67 | Freezing rain |
| 71, 73, 75 | Snowfall |
| 77 | Snow grains |
| 80, 81, 82 | Rain showers |
| 85, 86 | Snow showers |
| 95 | Thunderstorm |
| 96, 99 | Thunderstorm with hail |
| other | Unknown |

WMO code → icon name: `0,1 → sun`; `2 → partcloud`; `3 → cloud`;
`45,48 → fog`; `51–67 → rain`; `71–77 → snow`; `80–82 → rain`;
`85,86 → snow`; `95–99 → storm`; other → `cloud`.

### 3. Frontend changes

- `public/js/ui/icons.js`: remove `BY_CODE`; the backend now sends icon names
  directly. `iconSvg(name)` simplified (unknown → `cloud`).
- `public/js/api.js`, `main.js`, UI renders: unchanged except hourly and hero
  additions below.
- Internal model shape is unchanged, so the rest of the frontend keeps working.

#### 3a. Hourly section — hourly resolution, prob bar and footer

`public/js/ui/hourly.js`:

- Renders every hour of the (now hourly) data — 24 items, one column per hour.
- Each `.hourly-col` gains:
  - a `<div class="pop-bar">` as first child with inline
    `style="height: {pop*100}%"` — absolutely positioned behind the texts,
    growing upward from the bottom of the column content area, capped by a
    max height (CSS var) that ends where the wind/gust section ends. `pop`
    0 → height 0 (invisible).
  - a `<span class="pop-foot">` at the foot of the block with the probability
    percentage and the rain mm when available, e.g. `40% · 1.2 mm`;
    percentage only when mm is missing/zero; nothing when both are absent.

`public/css/style.css`:

- `.hourly-col`: `position: relative;` and a larger bottom padding (taller
  blocks) to fit the footer value.
- `.pop-bar`: absolute, `left: 4px; right: 4px;`, anchored above the footer
  text, `background: var(--pop-bar-bg)`, top-rounded, `z-index: 0`.
- Column texts (`.hour`, icon, `.wind`, `.gust`, `.pop-foot`) get
  `position: relative; z-index: 1` so the bar sits behind them.
- New vars: `--pop-bar-bg` (light: `rgba(93,109,138,.16)`, dark:
  `rgba(147,164,192,.18)`) — light neutral but visible.

#### 3b. Hero — precipitation info

`public/js/ui/hero.js`: add a metric next to humidity:

- `<span class="metric rain">{drop icon} {formatPrecipProb(cur.precipMm, cur.pop, units)}</span>`
  rendered only when `cur.pop > 0 || cur.precipMm` is truthy.

### 4. Config and server

- `config.js`: drop `apiKey` entirely; keep `port` and `defaultLocation`.
- `server.js`: drop the API-key boot check and its error message; the app no
  longer needs `.env` to run.

### 5. Error handling

- Provider failures: `ApiError('Open-Meteo request failed (status)')` — same
  flow as today (`/api/weather` 502, cached-stale response when available,
  connection banner + error toast in the UI).
- Nominatim failures: `reverseGeocode` may throw; `useMyLocation` already
  degrades (`sectorPlace = null` → falls back to IP-based or default label).
- Geocode returning `[]` → 404 `Location not found` (existing behavior via
  `place == null` check in `app.js`).

### 6. Tests (TDD — written before implementation)

- New fixture `test/fixtures/openmeteo.js` with a realistic forecast payload
  (2+ hours, 2+ days, probabilities, sunrise/sunset ISO strings, WMO codes).
- New `test/openmeteo.test.js`: request URL/params building, weather mapping,
  geocode mapping (including `[]` on no results), reverse geocode via
  Nominatim (asserts `User-Agent` header and field mapping).
- `test/normalize.test.js`: rewritten — temps, km/h passthrough, pop ÷ 100,
  epoch conversion of sun times, WMO → condition/icon, `timezone` =
  `utc_offset_seconds`, hourly `precipMm`, current pop/UV from `hourly[0]`.
- `test/api.test.js`, `test/app.test.js`: use the new client/fixture.
- `test/config.test.js`: drop apiKey tests (also fixes the pre-existing
  failure caused by a real key in `.env`).
- `test/icons.test.js`: update/remove code-mapping cases for OpenWeather codes.
- Delete: `src/openweather.js`, `test/openweather.test.js`,
  `test/fixtures/{onecall,basic-current,basic-forecast}.js`.

### 7. Docs

- README: replace the OpenWeather key section with a no-key note; update the
  architecture description and file listing.
- `package.json` description → "backed by Open-Meteo".

## Out of scope

- Day/night icon switching (`is_day`).
- More than 24 forecast hours or 5 forecast days.
- Any backend caching changes.
