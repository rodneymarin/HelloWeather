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