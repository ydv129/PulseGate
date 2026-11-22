import { getDb } from '../db/database.js'

export function requireTopicKey(request, response, next) {
  const authorization = request.get('authorization') || ''
  const bearerKey = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : ''
  const apiKey = bearerKey || request.query.api_key
  const topicId = request.params.topic_id

  if (!apiKey) {
    return response.status(401).json({
      ok: false,
      error: 'Missing topic API key',
    })
  }

  const topic = getDb().prepare(
    'SELECT * FROM topics WHERE topic_id = ? AND api_key = ?',
  ).get(topicId, apiKey)

  if (!topic) {
    return response.status(401).json({
      ok: false,
      error: 'Invalid topic API key',
    })
  }

  request.topic = topic
  return next()
}

export function requireReviewer(request, response, next) {
  const reviewer = request.get('X-Reviewer-Id')
  if (!reviewer) {
    return response.status(401).json({
      ok: false,
      error: 'Missing X-Reviewer-Id',
    })
  }
  request.reviewer = reviewer
  return next()
}
