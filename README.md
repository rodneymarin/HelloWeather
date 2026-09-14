# HelloWeather

A local weather dashboard with a vanilla JS frontend served by Express,
backed by OpenWeather data normalized into a small metric model.

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
- Works offline with cached data (shown with an offline banner)

## Requirements

- Node.js >= 18

## Install

```bash
git clone <repo-url> helloweather
cd helloweather
npm install
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
  openweather.js   OpenWeather client
  normalize.js     normalizes provider responses
  iploc.js         IP-based location lookup
config.js          reads config from the environment / .env file
server.js          entry point
test/              node --test suite (fixtures under test/fixtures)
```

## Data source

Weather comes from OpenWeather. The primary provider is One Call 3.0
(1-hour granularity, includes UV index). If that API access is not
available for the account, the service silently falls back to Current
Weather + Forecast 5-day/3-hour (3-hour steps, no UV). Moon phase is
computed locally. When the provider is unreachable, the last cached
result for the location is served with an offline banner.