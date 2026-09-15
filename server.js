import { createApp } from './src/app.js'
import { getConfig } from './config.js'
import { createOpenMeteoClient } from './src/openmeteo.js'
import { createDevReload } from './src/devreload.js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const config = getConfig()

const middleware = []
let lr = null
if (process.env.NODE_ENV === 'development') {
  lr = createDevReload({ publicDir: path.join(__dirname, 'public') })
  middleware.push(lr.router)
}

const app = createApp({ client: createOpenMeteoClient(), config, middleware })

app.listen(config.port, () => {
  console.log(`HelloWeather running at http://localhost:${config.port}${lr ? ' (watch mode)' : ''}`)
})