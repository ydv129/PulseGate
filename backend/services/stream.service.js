export const clients = new Map()

export function addClient(topicId, response) {
  if (!clients.has(topicId)) {
    clients.set(topicId, new Set())
  }
  const topicClients = clients.get(topicId)
  topicClients.add(response)
  return topicClients
}

export function removeClient(topicId, response) {
  const topicClients = clients.get(topicId)
  if (!topicClients) {
    return
  }
  topicClients.delete(response)
  if (topicClients.size === 0) {
    clients.delete(topicId)
  }
}

export function broadcast(topicId, event) {
  const topicClients = clients.get(topicId)
  if (!topicClients) {
    return
  }
  const payload = typeof event === 'string' ? event : JSON.stringify(event)
  for (const response of topicClients) {
    try {
      response.write(`event: pulse_event\ndata: ${payload}\n\n`)
    } catch {
      removeClient(topicId, response)
    }
  }
}

export function createSseStream(topicId, response) {
  response.status(200)
  response.setHeader('Content-Type', 'text/event-stream')
  response.setHeader('Cache-Control', 'no-cache, no-transform')
  response.setHeader('Connection', 'keep-alive')
  response.setHeader('X-Accel-Buffering', 'no')
  response.flushHeaders()

  addClient(topicId, response)
  const heartbeat = setInterval(() => {
    try {
      response.write(': keep-alive\n\n')
    } catch {
      clearInterval(heartbeat)
      removeClient(topicId, response)
    }
  }, 15000)

  response.on('close', () => {
    clearInterval(heartbeat)
    removeClient(topicId, response)
  })
}

export function closeSseClients() {
  for (const [topicId, topicClients] of clients) {
    for (const response of topicClients) {
      clearInterval(response._pulsegateHeartbeat)
      response.end()
    }
    clients.delete(topicId)
  }
}
