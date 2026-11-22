import express from 'express'
import { env } from './config/env.js'
import routes from './routes/index.js'
import { db } from './db/database.js'
import { closeSseClients } from './services/stream.service.js'
import { errorHandler } from './middleware/errorHandler.js'

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

app.use(routes)
app.use(errorHandler)

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

  closeSseClients()
  server.close((error) => {
    if (error) {
      console.error(error)
    }
    try {
      db.close()
    } catch (error) {
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
