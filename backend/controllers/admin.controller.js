import crypto from 'node:crypto'
import { getDb, safeJsonParse, safeJsonStringify } from '../db/database.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { pollTopic as pollTopicPipeline } from '../services/pipeline.service.js'

function publicTopic(topic) {
  const { api_key: _apiKey, ...safeTopic } = topic
  return safeTopic
}

export const createTopic = asyncHandler(async (request, response) => {
  const { name, query, diff_mode = 'new_item_only', status = 'active', webhooks = [] } = request.body
  if (!name || !query) {
    return response.status(400).json({
      ok: false,
      error: 'name and query are required',
    })
  }

  const topicId = `top_${crypto.randomBytes(16).toString('hex')}`
  const apiKey = `sk_live_${crypto.randomBytes(24).toString('hex')}`
  const createdAt = new Date().toISOString()
  const normalizedStatus = status === 'paused' ? 'paused' : 'active'
  const normalizedWebhooks = Array.isArray(webhooks) ? webhooks : []

  getDb().prepare(`
    INSERT INTO topics (
      topic_id, name, query, diff_mode, poll_interval_sec, last_polled_at,
      status, webhooks, api_key, discord_channel_id, discord_invite_url, created_at
    ) VALUES (?, ?, ?, ?, 0, NULL, ?, ?, ?, NULL, NULL, ?)
  `).run(
    topicId,
    name,
    query,
    diff_mode,
    normalizedStatus,
    safeJsonStringify(normalizedWebhooks),
    apiKey,
    createdAt,
  )

  const topic = getDb().prepare('SELECT * FROM topics WHERE topic_id = ?').get(topicId)
  return response.status(201).json({
    ok: true,
    data: {
      ...topic,
      webhooks: safeJsonParse(topic.webhooks, []),
    },
  })
})

export const listTopics = asyncHandler(async (_request, response) => {
  const topics = getDb().prepare('SELECT * FROM topics ORDER BY created_at DESC').all()
  return response.json({
    ok: true,
    data: topics.map((topic) => ({
      ...publicTopic(topic),
      webhooks: safeJsonParse(topic.webhooks, []),
    })),
  })
})

export const getTopic = asyncHandler(async (request, response) => {
  const topic = getDb().prepare(
    'SELECT * FROM topics WHERE topic_id = ?',
  ).get(request.params.topic_id)
  if (!topic) {
    return response.status(404).json({
      ok: false,
      error: 'Topic not found',
    })
  }
  return response.json({
    ok: true,
    data: {
      ...publicTopic(topic),
      webhooks: safeJsonParse(topic.webhooks, []),
    },
  })
})

export const updateTopic = asyncHandler(async (request, response) => {
  const topic = getDb().prepare(
    'SELECT * FROM topics WHERE topic_id = ?',
  ).get(request.params.topic_id)
  if (!topic) {
    return response.status(404).json({
      ok: false,
      error: 'Topic not found',
    })
  }

  const status = request.body.status === undefined ? topic.status : request.body.status
  const webhooks = request.body.webhooks === undefined
    ? safeJsonParse(topic.webhooks, [])
    : request.body.webhooks
  const pollIntervalSec = request.body.poll_interval_sec === undefined
    ? topic.poll_interval_sec
    : request.body.poll_interval_sec

  if (!['active', 'paused'].includes(status)) {
    return response.status(400).json({
      ok: false,
      error: 'status must be active or paused',
    })
  }
  if (!Array.isArray(webhooks)) {
    return response.status(400).json({
      ok: false,
      error: 'webhooks must be an array',
    })
  }
  if (![0, 60, 300, 900].includes(Number(pollIntervalSec))) {
    return response.status(400).json({
      ok: false,
      error: 'poll_interval_sec must be 0, 60, 300, or 900',
    })
  }

  getDb().prepare(`
    UPDATE topics
    SET status = ?, webhooks = ?, poll_interval_sec = ?
    WHERE topic_id = ?
  `).run(status, safeJsonStringify(webhooks), Number(pollIntervalSec), topic.topic_id)

  const updated = getDb().prepare(
    'SELECT * FROM topics WHERE topic_id = ?',
  ).get(topic.topic_id)
  return response.json({
    ok: true,
    data: {
      ...publicTopic(updated),
      webhooks: safeJsonParse(updated.webhooks, []),
    },
  })
})

export const deleteTopic = asyncHandler(async (request, response) => {
  const topicId = request.params.topic_id
  const topic = getDb().prepare(
    'SELECT topic_id FROM topics WHERE topic_id = ?',
  ).get(topicId)
  if (!topic) {
    return response.status(404).json({
      ok: false,
      error: 'Topic not found',
    })
  }

  getDb().prepare('DELETE FROM telegram_subscribers WHERE topic_id = ?').run(topicId)
  getDb().prepare('DELETE FROM seen_items WHERE topic_id = ?').run(topicId)
  getDb().prepare('DELETE FROM events WHERE topic_id = ?').run(topicId)
  getDb().prepare('DELETE FROM topics WHERE topic_id = ?').run(topicId)

  return response.json({
    ok: true,
    data: {
      topic_id: topicId,
    },
  })
})

export const pollTopic = asyncHandler(async (request, response) => {
  const result = await pollTopicPipeline(request.params.topic_id)
  return response.json({
    ok: true,
    data: result,
  })
})
