import { getDb, safeJsonParse } from '../db/database.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { createSseStream } from '../services/stream.service.js'

export const getPublicEvents = asyncHandler(async (request, response) => {
  const rows = getDb().prepare(`
    SELECT * FROM events
    WHERE topic_id = ? AND status IN ('approved', 'auto_approved')
    ORDER BY created_at DESC
  `).all(request.params.topic_id)

  const events = rows.map((row) => ({
    ...row,
    citations: safeJsonParse(row.citations, []),
  }))

  return response.json({
    topic_id: request.params.topic_id,
    count: events.length,
    events,
  })
})

export const getStream = asyncHandler(async (request, response) => {
  createSseStream(request.params.topic_id, response)
})

export const getConnectPage = asyncHandler(async (request, response) => {
  const topic = getDb().prepare(
    'SELECT topic_id, name, discord_invite_url FROM topics WHERE topic_id = ?',
  ).get(request.params.topic_id)
  if (!topic) {
    return response.status(404).send('Topic not found')
  }

  const telegramUsername = process.env.TELEGRAM_BOT_USERNAME || ''
  const telegramButton = telegramUsername
    ? `<a class="button" href="https://t.me/${encodeURIComponent(telegramUsername)}?start=${encodeURIComponent(topic.topic_id)}">Connect Telegram</a>`
    : ''
  const discordButton = topic.discord_invite_url
    ? `<a class="button" href="${topic.discord_invite_url}">Join Discord</a>`
    : ''

  return response.type('html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PulseGate Connect</title>
  <style>
    :root { color-scheme: dark; --background:#09090B; --surface:#141416; --accent:#F38020; }
    body { margin:0; min-height:100vh; display:grid; place-items:center; background:var(--background); color:#f5f5f5; font-family:Arial,sans-serif; }
    main { width:min(420px, calc(100% - 32px)); background:var(--surface); border:1px solid #2a2a2e; border-radius:12px; padding:24px; box-sizing:border-box; }
    h1 { margin:0 0 20px; font-size:20px; }
    .button { display:block; text-align:center; margin-top:12px; padding:12px; border:1px solid var(--accent); border-radius:8px; color:#fff; text-decoration:none; }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(topic.name)}</h1>
    ${telegramButton}
    ${discordButton}
  </main>
</body>
</html>`)
})

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
