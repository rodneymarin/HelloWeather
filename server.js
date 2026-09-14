import { createApp } from './src/app.js'
import { getConfig } from './config.js'
import { createOpenWeatherClient } from './src/openweather.js'
import livereload from 'livereload'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const config = getConfig()

if (!config.apiKey) {
  console.error('OPENWEATHER_API_KEY is not set. Create a free account at https://openweathermap.org/api, copy your key into .env, then start the app again.')
  process.exit(1)
}

const lrServer = livereload.createServer()
lrServer.watch(path.join(__dirname, 'public'))

const app = createApp({ client: createOpenWeatherClient({ apiKey: config.apiKey }), config })

app.listen(config.port, () => {
  console.log(`HelloWeather running at http://localhost:${config.port}`)
})