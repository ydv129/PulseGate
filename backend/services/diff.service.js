import crypto from 'node:crypto'
import { getDb } from '../db/database.js'

function normalizedLink(link) {
  if (!link) {
    return ''
  }
  return String(link).trim().replace(/\/+$/, '').toLowerCase()
}

function normalizedText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\b\d{4}-\d{2}-\d{2}(?:[t ]\d{2}:\d{2}(?::\d{2})?)?\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function itemIdentity(item) {
  const link = normalizedLink(item.link)
  if (link) {
    return link
  }
  return `${String(item.title || '').toLowerCase().trim()}|${String(item.source || '').trim().toLowerCase()}`
}

export function isDuplicate(topicId, item, diffMode = 'new_item_only') {
  const database = getDb()
  const identity = itemIdentity(item)
  const itemHash = sha256(identity)

  if (diffMode === 'price_drop') {
    const row = database.prepare(
      'SELECT last_price FROM seen_items WHERE topic_id = ? AND item_hash = ?',
    ).get(topicId, itemHash)
    const price = Number(item.price)
    if (!Number.isFinite(price)) {
      return true
    }
    if (!row) {
      return false
    }
    return !(price < Number(row.last_price))
  }

  if (diffMode === 'content_change') {
    const contentHash = sha256(normalizedText(item.content))
    const row = database.prepare(
      'SELECT content_hash FROM seen_items WHERE topic_id = ? AND item_hash = ?',
    ).get(topicId, itemHash)
    if (!row) {
      return false
    }
    return row.content_hash === contentHash
  }

  const row = database.prepare(
    'SELECT id FROM seen_items WHERE topic_id = ? AND item_hash = ?',
  ).get(topicId, itemHash)
  return Boolean(row)
}

export function recordSeen(topicId, item, diffMode = 'new_item_only') {
  const database = getDb()
  const identity = itemIdentity(item)
  const itemHash = sha256(identity)
  const contentHash = sha256(normalizedText(item.content))
  const price = Number(item.price)
  const lastPrice = Number.isFinite(price) ? price : null
  const createdAt = new Date().toISOString()

  database.prepare(`
    INSERT INTO seen_items (topic_id, item_hash, last_price, content_hash, created_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(topic_id, item_hash) DO UPDATE SET
      last_price = excluded.last_price,
      content_hash = excluded.content_hash
  `).run(topicId, itemHash, lastPrice, contentHash, createdAt)
}
