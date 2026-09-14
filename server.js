import { createApp } from './src/app.js'
import { getConfig } from './config.js'
import { createOpenWeatherClient } from './src/openweather.js'

const config = getConfig()
const app = createApp({ client: createOpenWeatherClient({ apiKey: config.apiKey }), config })

app.listen(config.port, () => {
  console.log(`HelloWeather running at http://localhost:${config.port}`)
})