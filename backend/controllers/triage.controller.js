import { getDb, safeJsonParse } from '../db/database.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { approveEvent, rejectEvent } from '../services/triage.service.js'
import { sendWebhook } from '../services/webhook.service.js'

export const listPending = asyncHandler(async (_request, response) => {
  const rows = getDb().prepare(`
    SELECT * FROM events
    WHERE status = 'pending'
    ORDER BY created_at DESC
  `).all()
  const events = rows.map((row) => ({
    ...row,
    citations: safeJsonParse(row.citations, []),
  }))
  return response.json({
    ok: true,
    data: events,
  })
})

export const approvePending = asyncHandler(async (request, response) => {
  const result = await approveEvent(request.params.event_id, request.reviewer)
  return response.json({
    ok: true,
    data: result,
  })
})

export const rejectPending = asyncHandler(async (request, response) => {
  const event = await rejectEvent(request.params.event_id, request.reviewer)
  return response.json({
    ok: true,
    data: {
      event,
    },
  })
})

export const listFailedDeliveries = asyncHandler(async (_request, response) => {
  const deliveries = getDb().prepare(`
    SELECT * FROM webhook_deliveries
    WHERE status = 'failed'
    ORDER BY created_at DESC
  `).all()
  return response.json({
    ok: true,
    data: deliveries,
  })
})

export const retryDelivery = asyncHandler(async (request, response) => {
  const delivery = getDb().prepare(
    'SELECT * FROM webhook_deliveries WHERE delivery_id = ?',
  ).get(request.params.delivery_id)
  if (!delivery) {
    return response.status(404).json({
      ok: false,
      error: 'Delivery not found',
    })
  }

  const eventRow = getDb().prepare(
    'SELECT * FROM events WHERE event_id = ?',
  ).get(delivery.event_id)
  if (!eventRow) {
    return response.status(404).json({
      ok: false,
      error: 'Event not found',
    })
  }

  const event = {
    ...eventRow,
    citations: safeJsonParse(eventRow.citations, []),
  }
  const attempts = Number(delivery.attempts || 0) + 1

  try {
    await sendWebhook(delivery.webhook_url, event)
    getDb().prepare(`
      UPDATE webhook_deliveries
      SET status = 'delivered', attempts = ?, last_error = NULL
      WHERE delivery_id = ?
    `).run(attempts, delivery.delivery_id)
  } catch (error) {
    const lastError = error instanceof Error ? error.message : 'Webhook delivery failed'
    getDb().prepare(`
      UPDATE webhook_deliveries
      SET status = 'failed', attempts = ?, last_error = ?
      WHERE delivery_id = ?
    `).run(attempts, lastError, delivery.delivery_id)
  }

  const updated = getDb().prepare(
    'SELECT * FROM webhook_deliveries WHERE delivery_id = ?',
  ).get(delivery.delivery_id)
  return response.json({
    ok: true,
    data: updated,
  })
})
