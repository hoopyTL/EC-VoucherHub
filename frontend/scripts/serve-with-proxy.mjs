import { createServer } from 'node:http'
import * as http from 'node:http'
import * as https from 'node:https'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const clientRoot = resolve(__dirname, '..')
const distRoot = resolve(clientRoot, 'dist')
const backendTarget = new URL(process.env.BACKEND_URL ?? 'http://localhost:4000')
const port = Number.parseInt(process.env.PORT ?? '4173', 10)

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.ico', 'image/x-icon'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2']
])

function sendFile(res, filePath) {
  const type = contentTypes.get(extname(filePath)) ?? 'application/octet-stream'
  res.writeHead(200, { 'Content-Type': type })
  createReadStream(filePath).pipe(res)
}

function shouldServeSpaFallback(req) {
  const accept = req.headers.accept ?? ''
  return req.method === 'GET' && accept.includes('text/html')
}

function proxyRequest(req, res) {
  const targetUrl = new URL(req.url ?? '/', backendTarget)
  const headers = { ...req.headers, host: backendTarget.host }
  const client = targetUrl.protocol === 'https:' ? https : http

  const request = client.request(
    targetUrl,
    {
      method: req.method,
      headers
    },
    (backendRes) => {
      res.writeHead(backendRes.statusCode ?? 502, backendRes.headers)
      backendRes.pipe(res)
    }
  )

  request.on('error', (error) => {
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ error: 'Bad gateway', message: error.message }))
  })

  req.pipe(request)
}

const server = createServer((req, res) => {
  const requestPath = decodeURIComponent((req.url ?? '/').split('?')[0])

  if (requestPath.startsWith('/api/') || requestPath === '/api') {
    proxyRequest(req, res)
    return
  }

  if (requestPath.startsWith('/uploads/')) {
    proxyRequest(req, res)
    return
  }

  const filePath = join(distRoot, requestPath === '/' ? '/index.html' : requestPath)
  if (existsSync(filePath) && statSync(filePath).isFile()) {
    sendFile(res, filePath)
    return
  }

  if (shouldServeSpaFallback(req) && existsSync(join(distRoot, 'index.html'))) {
    sendFile(res, join(distRoot, 'index.html'))
    return
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end('Not found')
})

server.listen(port, '0.0.0.0', () => {
  console.log(`Serving ${distRoot} at http://localhost:${port}`)
  console.log(`Proxying /api and /uploads to ${backendTarget.origin}`)
})
