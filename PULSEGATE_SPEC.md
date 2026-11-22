# PulseGate Specification

## 1. Problem
PulseGate turns public web and news activity into verified, structured event streams. It prevents duplicate noise, attaches evidence, supports human or automatic approval, and delivers approved events to REST, SSE, webhooks, Discord, and Telegram consumers.

## 2. Sponsor roles
- **Topic sponsor:** creates and controls a monitored topic, including query, source, diff mode, approval policy, status, webhooks, and poll interval.
- **Reviewer:** uses the dashboard Reviewer Switcher and sends `X-Reviewer-Id` to approve or reject pending events.
- **Consumer:** calls public REST or SSE using the topic-specific `sk_live_*` key.
- **Integration operator:** owns backend service credentials for SerpApi, You.com, Nexconn, Discord, and Telegram.

## 3. Primary pipeline
Create Topic -> Poll Now or auto ticker -> Ingest -> Smart Diff -> You.com Verify -> Normalize -> Nexconn Triage or Auto Approval -> Persist -> Dual Fan-out -> Replay failures.

## 4. Smart diff gate
The diff gate runs after an item is ingested and before verification. It uses one of three topic modes.

### 4.1 `new_item_only`
- Prefer the normalized item link.
- If no link exists, use lowercase title plus source.
- Normalize whitespace and common URL presentation.
- Hash the canonical identity with SHA-256.
- Drop an item whose hash already exists for the topic.
- Store the hash only after the item passes acceptance.

### 4.2 `price_drop`
- Parse and normalize the displayed price.
- Compare it with the topic/item's previously stored numeric value.
- Trigger only when the new price is strictly lower.
- Drop equal prices and increases.
- Store the new lower value after acceptance.

### 4.3 `content_change`
- Strip volatile timestamps and whitespace-only differences.
- Normalize remaining content.
- Hash the normalized content with SHA-256.
- Trigger only when the hash differs from the previously stored hash.
- Drop a repeated item even if incidental formatting changed.

## 5. Ingestion
SerpApi HTTP supplies Google News, shopping, or extract results.
Ingest uses native fetch with a 15000 ms timeout.
MOCK_MODE returns deterministic rotating fixtures with duplicate repeats and no external credits.
Live SerpApi Extract calls require exact verified snippets from API_SNIPPETS.md. If snippets are absent, stop before live integration.

## 6. You.com verification
You.com output has an evidence contract:
- First line is `VERDICT VERIFIED`, `VERDICT DISPUTED`, or `VERDICT UNVERIFIED`.
- Remaining text is the verification summary.
- Citations are an array of source URLs.
- Parsed `VERIFIED` is accepted as verified.
- If parsing fails, fallback is verified only when `citations.length > 0`.
- DISPUTED and UNVERIFIED are retained and never silently upgraded.

Live verification uses native fetch, AbortSignal timeout, and 15000 ms. Live API usage requires exact verified snippets.

## 7. Nexconn triage
When human_approval is enabled, normalized events are pending in Nexconn triage.
Approval records the reviewer from `X-Reviewer-Id`; rejection also records the reviewer.
Approved events persist and fan out.
Rejected events do not enter public REST, public SSE, or approved messaging.
When human_approval is disabled, events become `auto_approved`.
Nexconn requests use the official SDK and a 15000 ms timeout only after API snippets are verified.

## 8. Normalizer
The normalizer produces a Unified Event with strict snake_case keys:
- `event_id`
- `topic_id`
- `title`
- `summary`
- `content`
- `source`
- `link`
- `price`
- `currency`
- `verification_status`
- `approval_status`
- `citations`
- `created_at`
- `updated_at`

Optional values remain snake_case. No private key or service credential enters the normalized event.

## 9. SQLite schemas
Use one better-sqlite3 instance. Node 22.5+ node:sqlite is a fallback only if better-sqlite3 cannot load.
Enable WAL and `PRAGMA foreign_keys = ON`. Every variable is parameterized.
Use safe JSON parse/stringify helpers.

### topics
- `topic_id TEXT PRIMARY KEY`
- `name TEXT NOT NULL`
- `query TEXT NOT NULL`
- `source_mode TEXT NOT NULL`
- `diff_mode TEXT NOT NULL`
- `human_approval INTEGER NOT NULL DEFAULT 1`
- `status TEXT NOT NULL DEFAULT 'active'`
- `webhooks TEXT NOT NULL DEFAULT '[]'`
- `api_key TEXT NOT NULL`
- `poll_interval_sec INTEGER NOT NULL DEFAULT 0`
- `last_polled_at TEXT`
- `discord_channel_id TEXT`
- `discord_invite_url TEXT`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`

### events
- `event_id TEXT PRIMARY KEY`
- `topic_id TEXT NOT NULL`
- `unified_event_json TEXT NOT NULL`
- `verification_status TEXT NOT NULL`
- `approval_status TEXT NOT NULL`
- `reviewed_by TEXT`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`

### seen_items
- `topic_id TEXT NOT NULL`
- `canonical_hash TEXT NOT NULL`
- `last_value TEXT`
- `seen_at TEXT NOT NULL`
- primary key `(topic_id, canonical_hash)`

### telegram_subscribers
- `topic_id TEXT NOT NULL`
- `chat_id TEXT NOT NULL`
- `username TEXT`
- `subscribed_at TEXT NOT NULL`
- primary key `(topic_id, chat_id)`

### app_settings
- `key TEXT PRIMARY KEY`
- `value TEXT NOT NULL`
- `updated_at TEXT NOT NULL`

Dynamic PUBLIC_BASE_URL is stored in app_settings. The environment is only a startup fallback.

## 10. Polling and locks
Poll Now and the ticker use a topic lock Set.
If a lock exists, reject overlapping work for that topic.
Delete the lock in `finally`, including duplicate, timeout, and failure paths.

One global setInterval runs every 10000 ms.
It finds active topics whose poll_interval_sec is greater than zero and whose last_polled_at is due.
Supported values are 0 manual, 60, 300, and 900 seconds.

## 11. Persistence and fan-out
Only approved or auto_approved events persist.
Dual fan-out sends to webhooks and active topic SSE streams.
If one destination fails, isolate the failure in the 1-Click Replay Queue and continue other targets.

## 12. Public REST and SSE
Public REST exposes only approved or auto-approved events.
SSE uses topic-scoped authentication and returns:
- `Content-Type: text/event-stream`
- `Cache-Control: no-cache, no-transform`
- `Connection: keep-alive`
- `X-Accel-Buffering: no`

Send heartbeat comments every 15000 ms.
On close, clear the interval, remove the response, and delete an empty topic set.
React stream state is capped at the latest 100 events and cleans up on unmount.

## 13. Section 13 patches
- `PATCH /api/topics/:topic_id` updates supported fields only.
- Supported updates include name, query, source mode, diff mode, human approval, status, webhooks, poll interval, and Discord fields.
- `DELETE /api/topics/:topic_id` deletes the topic and cascades owned seen_items and events.
- Event approval/rejection stores `reviewed_by` from `X-Reviewer-Id`.
- app_settings owns dynamic PUBLIC_BASE_URL rather than environment-only configuration.
- API keys and credentials never appear in patch or delete responses.

## 14. Discord REST v10 provisioning
Use Discord REST v10 with the bot token and native fetch. Do not use discord.js.

On topic creation with Discord configuration:
1. Sanitize name to lowercase.
2. Replace non-alphanumeric runs with hyphens.
3. Truncate to 90 characters.
4. POST guilds/{guild_id}/channels with name, type 0, and topic containing PulseGate and topic_id.
5. Save discord_channel_id.
6. POST channels/{channel_id}/invites with max_age 0 and max_uses 0.
7. Save discord_invite_url as `https://discord.gg/<code>`.

On approval, POST channels/{channel_id}/messages with embeds containing verification status, summary, event_id, and citations.
On topic delete, best-effort DELETE channels/{channel_id}.
Never retry 401 or 403 in a loop.
For 429, respect retry_after before one retry.

## 15. Telegram getUpdates provisioning
When TELEGRAM_BOT_TOKEN is set, run exactly one getUpdates poller.
The poller runs every 4000 ms.
An overlap lock prevents concurrent polls.
The getUpdates request has an 8000 ms timeout.
Clear the poller and lock during graceful shutdown.

### Subscribe
On `/start <topic_id>`:
- Verify that the topic exists.
- Upsert topic_id, chat_id, and username into telegram_subscribers.
- Reply with `Subscribed`.

### Unsubscribe
On `/stop <topic_id>`:
- Delete the matching subscriber row.
- Reply with an unsubscribe confirmation.

### Approval alert
On event approval, query chat_id values for the topic.
Send one HTML alert per subscriber.
Use Telegram Bot API text with `parse_mode=HTML`.
Never send API keys or raw internal payload secrets.

## 16. Webhook formats
All webhook calls use a 5000 ms timeout.

### Discord webhook
For URL text containing `discord.com/api/webhooks`, send one embed containing:
- verification status
- summary
- event_id
- citations

### Telegram webhook
For URL text containing `api.telegram.org`, send text with `parse_mode=HTML`.
Read chat_id from the URL query parameter.

### Generic webhook
POST raw Unified Event JSON in strict snake_case.
Do not append credentials or internal state.

## 17. Connect page
GET /connect/:topic_id returns mobile HTML.
It uses Cloudflare Dark Ops tokens and shows the topic name.
Telegram button targets `https://t.me/<bot_username>?start=<topic_id>`.
Discord button targets discord_invite_url.
The page and QR never expose api_key.
Frontend QR encodes PUBLIC_BASE_URL plus `/connect/<topic_id>`.

## 18. MOCK_MODE
MOCK_MODE true makes ingest and verification work end to end with rotating fixtures.
Repeated fixture identity proves that smart diff drops duplicates.
Mock mode never calls paid SerpApi or You.com APIs.
Mock fixtures may rotate VERIFIED, DISPUTED, and UNVERIFIED outcomes.

## 19. 1-Click Replay
A failed webhook or message delivery is queued with destination, payload, attempt count, error, and timestamps.
Replay retries only the selected failed delivery.
A replay success removes or marks the queue item delivered.
Timeout remains 5000 ms for webhooks and 15000 ms for external approval integrations.

## 20. Demo plan
1. Create a topic.
2. Poll in mock mode.
3. Show duplicate repeat dropped by the diff gate.
4. Show citation-backed verified output.
5. Approve or auto-approve.
6. Observe SSE and webhook fan-out.
7. Simulate one failure and replay it.
