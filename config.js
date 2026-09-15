import { existsSync, readFileSync } from 'node:fs'

const DEFAULT_PORT = 2829
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
    defaultLocation: raw.DEFAULT_LOCATION || DEFAULT_LOCATION,
  }
}