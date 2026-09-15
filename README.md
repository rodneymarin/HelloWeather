# HelloWeather

A local weather dashboard with a vanilla JS frontend served by Express,
backed by Open-Meteo data (no API key required) normalized into a small metric model.

Repository: <https://github.com/rodneymarin/HelloWeather>

## Features

- Current conditions, feels-like, humidity, wind, UV and more in the hero
- Hourly outlook with wind and gust speeds
- Daily forecast (5 days) with temperature range, rain, UV severity and
  moon phase
- Search by city name or coordinates
- "Use my current location" via browser geolocation, with an IP-based
  fallback
- Light / dark / system themes
- Favorites for quick switching between places
- Works offline with cached data (shown in the top updated bar)
- Configurable auto-refresh: 5 / 15 / 30 / 60 minutes

## Requirements

- Node.js >= 18 (Linux install below)

## Weather data

Weather comes from [Open-Meteo](https://open-meteo.com/), whose public API
requires no key for non-commercial use. Geocoding uses the Open-Meteo
Geocoding API; the "use my location" reverse lookup falls back to
OpenStreetMap Nominatim. No account or `.env` setup is needed.

## Install on Linux

Install Node.js if you don't have it yet (Debian/Ubuntu):

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Then clone and set up the app:

```bash
git clone https://github.com/rodneymarin/HelloWeather helloweather
cd helloweather
npm install
cp .env.example .env    # optional: override PORT / DEFAULT_LOCATION
```

## Run

```bash
npm start          # http://localhost:2829
npm run dev        # auto-restart on change
```

The default port is **2829**. To use a different port, set the `PORT`
environment variable, for example:

```bash
PORT=8080 npm start
```

## Test

```bash
npm test           # node --test
```

## Project structure

```
public/            Static frontend (vanilla JS, no build step)
  js/              app logic, state, API client, UI modules
  index.html       single page host
src/               Server-side modules
  app.js           Express app and API routes
  openmeteo.js   Open-Meteo client (forecast, geocoding, reverse geocoding)
  normalize.js     normalizes provider responses
  iploc.js         IP-based location lookup
config.js          reads config from the environment / .env file
server.js          entry point
test/              node --test suite (fixtures under test/fixtures)
```

## Data source

Weather comes from Open-Meteo. The forecast endpoint returns current,
hourly (hourly resolution) and daily (5-day) data in metric units with
WMO weather codes, normalized into the internal metric model.