import crypto from 'node:crypto'
import { getDb, safeJsonStringify } from '../db/database.js'
import { fetchItems } from './ingest.service.js'
import { isDuplicate, recordSeen } from './diff.service.js'
import { verifyItem } from './verify.service.js'

const pollingLocks = new Set()

export async function pollTopic(topicId) {
  if (pollingLocks.has(topicId)) {
    return {
      already_polling: true,
      new: 0,
      duplicate: 0,
      events: [],
    }
  }

  pollingLocks.add(topicId)
  try {
    const topic = getDb().prepare(
      'SELECT * FROM topics WHERE topic_id = ?',
    ).get(topicId)
    if (!topic) {
      const error = new Error('Topic not found')
      error.status = 404
      throw error
    }

    const items = await fetchItems(topic)
    let duplicateCount = 0
    const createdEvents = []

    for (const item of items) {
      if (isDuplicate(topicId, item, topic.diff_mode || 'new_item_only')) {
        duplicateCount += 1
        continue
      }

      const verification = await verifyItem(item)
      const createdAt = new Date().toISOString()
      const event = {
        event_id: `evt_${crypto.randomBytes(16).toString('hex')}`,
        topic_id: topicId,
        title: item.title || '',
        link: item.link || '',
        summary: verification.summary,
        verified_status: verification.verified_status,
        citations: verification.citations,
        status: 'pending',
        reviewed_by: null,
        created_at: createdAt,
      }

      getDb().prepare(`
        INSERT INTO events (
          event_id, topic_id, title, link, summary, verified_status,
          citations, status, reviewed_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        event.event_id,
        event.topic_id,
        event.title,
        event.link,
        event.summary,
        event.verified_status,
        safeJsonStringify(event.citations),
        event.status,
        event.reviewed_by,
        event.created_at,
      )

      recordSeen(topicId, item, topic.diff_mode || 'new_item_only')
      createdEvents.push({
        ...event,
        citations: verification.citations,
      })
    }

    getDb().prepare(
      'UPDATE topics SET last_polled_at = ? WHERE topic_id = ?',
    ).run(new Date().toISOString(), topicId)

    return {
      already_polling: false,
      new: createdEvents.length,
      duplicate: duplicateCount,
      events: createdEvents,
    }
  } finally {
    pollingLocks.delete(topicId)
  }
}
