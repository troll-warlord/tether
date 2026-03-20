#!/usr/bin/env node
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, extname, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { exec } from 'node:child_process'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const distDir = join(__dirname, '..', 'dist')

// Verify the package was published with a built dist/
try {
  await stat(join(distDir, 'index.html'))
} catch {
  console.error('\n  Error: dist/ not found.')
  console.error('  Run `npm run build` before `npm publish`.\n')
  process.exit(1)
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

const port = Number(process.env.PORT) || 7777

const server = createServer(async (req, res) => {
  let urlPath = req.url.split('?')[0].split('#')[0]
  if (urlPath === '/') urlPath = '/index.html'

  const filePath = normalize(join(distDir, urlPath))

  // Prevent path traversal outside distDir
  if (!filePath.startsWith(distDir + sep)) {
    res.writeHead(403)
    res.end()
    return
  }

  try {
    const data = await readFile(filePath)
    const ext = extname(filePath)
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
    res.end(data)
  } catch {
    // SPA fallback — hash router means any unmatched path serves index.html
    try {
      const index = await readFile(join(distDir, 'index.html'))
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(index)
    } catch {
      res.writeHead(500)
      res.end()
    }
  }
})

server.listen(port, '127.0.0.1', () => {
  const url = `http://localhost:${port}`
  console.log()
  console.log('  ⚓  tether  —  Kubernetes Dashboard')
  console.log()
  console.log(`  Local:  \x1b[36m${url}\x1b[0m`)
  console.log()
  console.log('  Make sure kubectl proxy is running:')
  console.log('  \x1b[2m$ kubectl proxy --port=8001\x1b[0m')
  console.log()
  console.log('  Press \x1b[1mCtrl+C\x1b[0m to stop.')
  console.log()

  const { platform } = process
  const cmd =
    platform === 'darwin'
      ? `open "${url}"`
      : platform === 'win32'
        ? `start "" "${url}"`
        : `xdg-open "${url}"`
  exec(cmd)
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  Port ${port} is in use. Set PORT=<number> to use a different port.\n`)
  } else {
    console.error(err)
  }
  process.exit(1)
})
