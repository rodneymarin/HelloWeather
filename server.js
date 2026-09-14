import { createApp } from './src/app.js'
import { getConfig } from './config.js'
import { createOpenWeatherClient } from './src/openweather.js'

const config = getConfig()

if (!config.apiKey) {
  console.error('OPENWEATHER_API_KEY is not set. Create a free account at https://openweathermap.org/api, copy your key into .env, then start the app again.')
  process.exit(1)
}

const app = createApp({ client: createOpenWeatherClient({ apiKey: config.apiKey }), config })

app.listen(config.port, () => {
  console.log(`HelloWeather running at http://localhost:${config.port}`)
})