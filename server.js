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