import crypto from 'node:crypto'
import { getDb, safeJsonParse, safeJsonStringify } from '../db/database.js'

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function normalizedEvent(event) {
  return {
    event_id: event.event_id,
    topic_id: event.topic_id,
    title: event.title || '',
    link: event.link || '',
    summary: event.summary || '',
    verified_status: event.verified_status || '',
    citations: safeJsonParse(event.citations, []),
    status: event.status || '',
    reviewed_by: event.reviewed_by || null,
    created_at: event.created_at || '',
  }
}

export async function sendWebhook(webhookUrl, event) {
  const normalized = normalizedEvent(event)
  let body
  let headers = { 'Content-Type': 'application/json' }

  if (webhookUrl.includes('discord.com/api/webhooks')) {
    const citations = normalized.citations
      .map((citation) => {
        const link = typeof citation === 'string' ? citation : citation.url
        return link ? `[${escapeHtml(link)}](${link})` : null
      })
      .filter(Boolean)

    body = {
      embeds: [{
        title: normalized.title,
        description: normalized.summary,
        fields: [
          { name: 'Status', value: normalized.verified_status, inline: true },
          { name: 'Event ID', value: normalized.event_id, inline: true },
          { name: 'Citations', value: citations.length > 0 ? citations.join('\n') : 'None' },
        ],
        url: normalized.link || undefined,
      }],
    }
  } else if (webhookUrl.includes('api.telegram.org')) {
    const url = new URL(webhookUrl)
    const chatId = url.searchParams.get('chat_id')
    if (!chatId) {
      throw new Error('Telegram webhook URL requires chat_id in the query')
    }
    const citations = normalized.citations
      .map((citation) => typeof citation === 'string' ? citation : citation.url)
      .filter(Boolean)
    const text = [
      `<b>PulseGate ${escapeHtml(normalized.verified_status)}</b>`,
      escapeHtml(normalized.title),
      escapeHtml(normalized.summary),
      `Event: <code>${escapeHtml(normalized.event_id)}</code>`,
      citations.length > 0
        ? citations.map((citation) => `<a href="${escapeHtml(citation)}">${escapeHtml(citation)}</a>`).join('\n')
        : 'No citations',
    ].join('\n\n')
    body = {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }
  } else {
    body = normalized
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  })

  if (!response.ok) {
    throw new Error(`Webhook returned HTTP ${response.status}`)
  }

  return { ok: true }
}

export async function fanOut(event, topic) {
  const webhooks = Array.isArray(topic.webhooks)
    ? topic.webhooks
    : safeJsonParse(topic.webhooks, [])
  const deliveries = []

  for (const webhookUrl of webhooks) {
    if (typeof webhookUrl !== 'string' || webhookUrl.length === 0) {
      continue
    }

    const deliveryId = `dlv_${crypto.randomBytes(16).toString('hex')}`
    const createdAt = new Date().toISOString()
    let delivery

    try {
      await sendWebhook(webhookUrl, event)
      delivery = {
        delivery_id: deliveryId,
        event_id: event.event_id,
        topic_id: topic.topic_id,
        webhook_url: webhookUrl,
        status: 'delivered',
        attempts: 1,
        last_error: null,
        created_at: createdAt,
      }
    } catch (error) {
      delivery = {
        delivery_id: deliveryId,
        event_id: event.event_id,
        topic_id: topic.topic_id,
        webhook_url: webhookUrl,
        status: 'failed',
        attempts: 1,
        last_error: error instanceof Error ? error.message : 'Webhook delivery failed',
        created_at: createdAt,
      }
    }

    getDb().prepare(`
      INSERT INTO webhook_deliveries (
        delivery_id, event_id, topic_id, webhook_url, status,
        attempts, last_error, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      delivery.delivery_id,
      delivery.event_id,
      delivery.topic_id,
      delivery.webhook_url,
      delivery.status,
      delivery.attempts,
      delivery.last_error,
      delivery.created_at,
    )
    deliveries.push(delivery)
  }

  return deliveries
}
