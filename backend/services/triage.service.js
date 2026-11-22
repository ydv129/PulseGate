import { getDb, safeJsonParse } from '../db/database.js'
import { broadcast } from './stream.service.js'
import { fanOut } from './webhook.service.js'

function hydrateEvent(row) {
  if (!row) {
    return null
  }
  return {
    ...row,
    citations: safeJsonParse(row.citations, []),
  }
}

export async function approveEvent(eventId, reviewer) {
  const row = getDb().prepare(
    'SELECT * FROM events WHERE event_id = ?',
  ).get(eventId)
  if (!row) {
    const error = new Error('Event not found')
    error.status = 404
    throw error
  }
  if (row.status !== 'pending') {
    const error = new Error('Event is not pending')
    error.status = 409
    throw error
  }

  getDb().prepare(`
    UPDATE events
    SET status = 'approved', reviewed_by = ?
    WHERE event_id = ?
  `).run(reviewer, eventId)

  const approved = getDb().prepare(
    'SELECT * FROM events WHERE event_id = ?',
  ).get(eventId)
  const event = hydrateEvent(approved)
  const topicRow = getDb().prepare(
    'SELECT * FROM topics WHERE topic_id = ?',
  ).get(event.topic_id)
  if (!topicRow) {
    const error = new Error('Topic not found')
    error.status = 404
    throw error
  }

  const topic = {
    ...topicRow,
    webhooks: safeJsonParse(topicRow.webhooks, []),
  }
  const deliveries = await fanOut(event, topic)
  broadcast(event.topic_id, event)

  return { event, deliveries }
}

export async function rejectEvent(eventId, reviewer) {
  const row = getDb().prepare(
    'SELECT * FROM events WHERE event_id = ?',
  ).get(eventId)
  if (!row) {
    const error = new Error('Event not found')
    error.status = 404
    throw error
  }
  if (row.status !== 'pending') {
    const error = new Error('Event is not pending')
    error.status = 409
    throw error
  }

  getDb().prepare(`
    UPDATE events
    SET status = 'rejected', reviewed_by = ?
    WHERE event_id = ?
  `).run(reviewer, eventId)

  return hydrateEvent(getDb().prepare(
    'SELECT * FROM events WHERE event_id = ?',
  ).get(eventId))
}
