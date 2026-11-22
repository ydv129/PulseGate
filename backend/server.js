import express from 'express'
import { env } from './config/env.js'

const app = express()

app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_request, response) => {
  response.status(200).json({
    ok: true,
    data: {
      status: 'ok',
    },
  })
})

app.use((error, _request, response, _next) => {
  console.error(error)
  response.status(error.status || 500).json({
    ok: false,
    error: error.message || 'Internal server error',
  })
})

const server = app.listen(env.port, () => {
  console.log(`PulseGate backend listening on port ${env.port}`)
})

let shuttingDown = false

async function gracefulShutdown(signal) {
  if (shuttingDown) {
    return
  }
  shuttingDown = true
  console.log(`Received ${signal}; shutting down`)

  server.close((error) => {
    if (error) {
      console.error(error)
    }
    process.exit(0)
  })
}

process.once('SIGINT', () => {
  void gracefulShutdown('SIGINT')
})

process.once('SIGTERM', () => {
  void gracefulShutdown('SIGTERM')
})
