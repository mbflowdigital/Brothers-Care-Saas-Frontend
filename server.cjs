const { createReadStream, stat } = require('node:fs')
const { access } = require('node:fs/promises')
const { createServer } = require('node:http')
const { extname, join, normalize, resolve, sep } = require('node:path')
const { URL } = require('node:url')

const root = resolve(__dirname, 'dist')
const indexFile = join(root, 'index.html')
const configuredPort = process.env.PORT || '3000'

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function sendFile(request, response, file) {
  stat(file, (error, details) => {
    if (error || !details.isFile()) {
      response.writeHead(404).end('Not found')
      return
    }

    const extension = extname(file).toLowerCase()
    const immutableAsset = file.startsWith(join(root, 'assets'))
    response.writeHead(200, {
      'Cache-Control': immutableAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
      'Content-Length': details.size,
      'Content-Type': contentTypes[extension] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
    })

    if (request.method === 'HEAD') {
      response.end()
      return
    }

    createReadStream(file).pipe(response)
  })
}

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end('Method not allowed')
    return
  }

  let pathname
  try {
    pathname = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname)
  } catch {
    response.writeHead(400).end('Bad request')
    return
  }

  const requestedFile = resolve(root, `.${normalize(pathname)}`)
  if (!requestedFile.startsWith(`${root}${sep}`) && requestedFile !== root) {
    response.writeHead(400).end('Bad request')
    return
  }

  try {
    await access(requestedFile)
    sendFile(request, response, requestedFile === root ? indexFile : requestedFile)
  } catch {
    sendFile(request, response, indexFile)
  }
})

server.on('error', (error) => {
  console.error('Frontend server failed to start.', error)
  process.exitCode = 1
})

if (/^\d+$/.test(configuredPort)) {
  server.listen(Number(configuredPort), '0.0.0.0')
} else {
  server.listen(configuredPort)
}
