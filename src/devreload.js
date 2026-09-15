import { readFile, watch } from 'node:fs'
import path from 'node:path'
import express from 'express'

const PING_MS = 15000

const CLIENT_SCRIPT = `<script>
(function () {
  if (window.__hwReload) return
  window.__hwReload = true
  var es = new EventSource('/__dev/events')
  es.addEventListener('reload', function () { window.location.reload() })
})()
</script>`

function makeBootKey() {
  return `boot:${Date.now()}:${Math.random().toString(36).slice(2)}`
}

export function createDevReload({ publicDir, bootKey = makeBootKey() }) {
  const clients = new Set()
  const timers = new Set()

  const router = express.Router()

  function broadcast(message = 'live') {
    for (const res of clients) {
      res.write(`id: ${bootKey}\nevent: reload\ndata: ${message}\n\n`)
    }
  }

  router.get('/__dev/events', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    const last = req.get('last-event-id')
    res.write(`retry: 500\nid: ${bootKey}\ndata: connected\n\n`)
    if (last && last !== bootKey) {
      res.write(`id: ${bootKey}\nevent: reload\ndata: restart\n\n`)
    }
    const ping = setInterval(() => res.write(': ping\n\n'), PING_MS)
    timers.add(ping)
    clients.add(res)
    req.on('close', () => {
      clients.delete(res)
      clearInterval(ping)
      timers.delete(ping)
    })
  })

  router.use((req, res, next) => {
    if (req.method !== 'GET') return next()
    const urlPath = req.path
    if (urlPath !== '/' && !urlPath.endsWith('.html')) return next()
    const file = path.resolve(publicDir, urlPath === '/' ? 'index.html' : urlPath)
    if (!file.startsWith(publicDir)) return next()
    readFile(file, 'utf8', (err, html) => {
      if (err) return next()
      if (html.includes('__dev/events')) return res.type('html').send(html)
      return res.type('html').send(html.replace('</body>', `${CLIENT_SCRIPT}\n</body>`))
    })
  })

  let watcher = null
  if (publicDir) {
    watcher = watch(publicDir, { recursive: true }, (eventType, filename) => {
      if (!filename) return broadcast('fs')
      const base = path.basename(filename.toString())
      if (base.startsWith('.') || base.endsWith('~') || base.endsWith('.swp')) return
      broadcast('fs')
    })
    watcher.on('error', () => {})
  }

  function close() {
    for (const timer of timers) clearInterval(timer)
    timers.clear()
    for (const res of clients) {
      try {
        res.end()
      } catch {
        // ignore
      }
    }
    clients.clear()
    if (watcher) {
      watcher.close()
      watcher = null
    }
  }

  return { router, broadcast, close }
}