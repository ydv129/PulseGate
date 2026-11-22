# PulseGate Master Playbook
Root rule: never create a `pulsegate/` directory inside the workspace. Backend and frontend stay at root.

## 1. System mental model
PulseGate is a verified web-to-event broker, "Kafka for the Public Web." Public sources supply raw items. The broker canonicalizes each item, removes duplicates, verifies claims, normalizes the result into a Unified Event, applies approval policy, persists the event, and fans it out to approved consumers.

The broker is source-agnostic at the event boundary. Internal dashboard APIs are private application interfaces. Public `v1` APIs are read surfaces for external consumers. Secrets and reviewer identity never cross the public boundary.

## 2. End-to-end data flow
1. A topic is created with a query, source mode, diff mode, approval setting, status, webhook list, and poll interval.
2. Poll Now or the 10-second global ticker starts one locked poll for the topic.
3. SerpApi ingests news, shopping, or extract items, or mock mode produces deterministic rotating fixtures.
4. The smart diff canonicalizes and compares the item.
5. You.com verifies the item and returns a line-one verdict, summary, and citations.
6. The normalizer creates a strict snake_case Unified Event.
7. Human approval creates a pending Nexconn record when enabled; otherwise it creates an auto-approved event.
8. Approved events are persisted and delivered to webhooks and active SSE consumers.
9. Fan-out failures enter a 1-Click Replay Queue without blocking successful destinations.
10. Public REST and SSE expose only approved or auto-approved events.

## 3. Authentication layers
### Dashboard
The dashboard uses a localStorage Reviewer Switcher and sends `X-Reviewer-Id`. It does not use JWT, cookies for identity, or password services.

### External v1
External consumers authenticate with the topic's `sk_live_*` key through `Authorization: Bearer <key>` or `api_key=<key>` as a query parameter. Authentication is topic scoped.

### Integrations
SerpApi, You.com, Nexconn, Telegram, Discord, and webhook credentials stay in backend environment variables or encrypted application settings. They must never be bundled into React or emitted in public payloads.

## 4. Zero-CORS strategy
Internal dashboard code uses relative `/api` URLs. Vite proxies `/api` to `http://localhost:8000`; no dashboard CORS headers are needed.
CORS is not enabled globally. Only public `v1` routes may use `cors({ origin: "*" })`.
Do not add CORS middleware to `/api` routes. Never echo a dashboard origin or embed API secrets in frontend code.

## 5. Folder structure
Backend:
- `package.json`, `.env.example`, `server.js`
- `config/env.js`, `db/database.js`
- `middleware/topicAuth.js`
- `routes/index.js`
- controllers for admin, consumer, and Nexconn
- leaf services for ingest, diff, verify, triage, stream, webhook, and pipeline

Frontend:
- `package.json`, `vite.config.js`, `index.html`
- `src/main.jsx`, `src/index.css`, `src/App.jsx`
- `src/api/client.js`
- PascalCase pages and components

No other top-level project folder may wrap these directories.

## 6. Naming conventions
- Backend files use `job.role.js`, for example `ingest.service.js`.
- Frontend components use PascalCase `.jsx`.
- Database columns and JSON keys use strict snake_case.
- JavaScript variables use camelCase.
- Constants use UPPER_SNAKE_CASE.
- Topic IDs use `top_*`, event IDs use `evt_*`, and topic keys use `sk_live_*`.
- Route parameters and database names preserve `topic_id`, `event_id`, `chat_id`, and `canonical_hash`.

Do not rename existing routes, columns, keys, or files during a fix. Preserve exact existing behavior unless the user explicitly approves a spec change.

## 7. Response envelopes
Internal APIs always return one of:
- Success: `{ "ok": true, "data": ... }`
- Failure: `{ "ok": false, "error": ... }`

Public `v1` REST returns `topic_id`, `count`, and `events`.
Public SSE emits `event: pulse_event` and `data: <Unified Event JSON>`, with the JSON on one data line or a valid SSE JSON block.

No endpoint should leak `api_key`, bot tokens, app secrets, environment values, or internal database filenames.

## 8. SSE leak prevention
Maintain `Map<topic_id, Set<Response>>`.
Set:
- `Content-Type: text/event-stream`
- `Cache-Control: no-cache, no-transform`
- `Connection: keep-alive`
- `X-Accel-Buffering: no`
- `flushHeaders()`

Send a comment heartbeat every 15000 ms. On client close:
- Clear the heartbeat interval.
- Remove the response from the topic set.
- Delete the topic key when the set is empty.

Wrap every `res.write` in try/catch. Never write the topic key or private credentials. External streams include only approved or auto-approved event content.

## 9. Polling, locks, and timeouts
Maintain an in-memory `Set` of topic IDs for poll locks. The poll function checks the set and deletes the topic ID in `finally`, including failure and duplicate paths.
No poll may run concurrently for the same topic.

Use native `fetch` and `AbortSignal.timeout`:
- SerpApi: 15000 ms.
- You.com: 15000 ms.
- Nexconn: 15000 ms.
- Webhook: 5000 ms.

The ingest, verify, and triage paths must accept an abort or timeout outcome and return a clean pipeline failure. No TODO stub may stand in for live behavior.

## 10. SQLite hygiene
Use one SQLite instance in the process.
Enable WAL mode and `foreign_keys = ON`.
Use parameterized statements for every variable.
Use explicit JSON parse/stringify helpers and never interpolate JSON or SQL values.
Create only the documented tables and columns.
Topic deletion cascades topic-owned events and seen items; preserve expected referential behavior.
Close SQLite during graceful shutdown.

Database keys remain snake_case, even when JavaScript properties use camelCase at environment boundaries.

## 11. Express and shutdown
Use `express.json({ limit: "1mb" })`.
Use a global `asyncHandler` wrapper and a final Express error middleware.
The error middleware returns `{ ok: false, error: ... }`.
Do not expose stack traces or secrets.

On `SIGINT` or `SIGTERM`:
- Stop accepting new work.
- Close active SSE clients.
- Clear Telegram getUpdates and auto-poll intervals.
- Close HTTP server.
- Close SQLite.
- Exit 0 after cleanup.

## 12. React behavior
Every `useEffect` that opens a stream or listener must return cleanup.
On stream close or component unmount, close the event source and clear timers.
Cap stream state at the latest 100 events.
Keep UI state in React or localStorage only. Do not add Redux, Zustand, or TanStack Query.

## 13. UI and design rules
Use the Cloudflare Dark Ops Theme:
- background `#09090B`
- surface `#141416`
- accent `#F38020`

Figtree is used for UI. JetBrains Mono is used for IDs, keys, URLs, timestamps, badges, and JSON.
Only weights 400, 500, and 600 are allowed.
Lucide React is the only icon library.
Buttons and badges use 16 px icons with `strokeWidth={1.75}`.
Navigation uses 18 px icons with `strokeWidth={1.75}`.

No raw emoji in UI. No extra accent families, purple, indigo, blue, slate, gradients, or neon glow shadows.
CSS colors belong in `frontend/src/index.css` variables.

## 14. Pre-coding and change protocol
Before editing:
1. Read the relevant spec and existing implementation.
2. State the root cause.
3. State the exact file and exact function to change.
4. Make a surgical edit only.
5. Verify the smallest relevant command.

Do not add dependencies silently. Do not alter existing route contracts. Do not add "helpful" features outside the stage. Do not add TODO stubs or circular imports.
Routes contain zero business logic. Leaf services never import sibling leaf services. Only `pipeline.service.js` orchestrates ingest, diff, verify, normalize, triage, persistence, and fan-out.

## 15. Anti-hallucination
No live implementation may assume an API endpoint or SDK shape.
Before live SerpApi Extract, You.com Answer API, or Nexconn Web SDK work, verify exact snippets in `API_SNIPPETS.md`.
If no verified 10-line quickstart exists, stop and ask the user for it. Never invent credentials, endpoints, response schemas, SDK methods, or package names.

## 16. Route registry map
- `GET /api/health`: health.
- `GET/POST /api/topics`: list/create topics.
- `PATCH /api/topics/:topic_id`: update topic.
- `DELETE /api/topics/:topic_id`: delete topic.
- `POST /api/topics/:topic_id/poll`: run locked poll.
- `GET /api/events`: list dashboard events.
- `POST /api/events/:event_id/approve`: approve event.
- `POST /api/events/:event_id/reject`: reject event.
- `POST /api/nexconn/...`: triage integration.
- `GET /v1/topics/:topic_id/events`: approved REST events.
- `GET /v1/topics/:topic_id/stream`: approved SSE stream.
- `GET /connect/:topic_id`: mobile connect page.

The exact Stage implementation may add only routes approved by PULSEGATE_SPEC.md.

## 17. Stage scratchpad
- Stage 0: backend health and Vite proxy only.
- Stage 1: SQLite, app settings, topic CRUD, auth, and mock-ready topic records.
- Stage 2: ingest, smart diff, You.com verify, and normalizer.
- Stage 3: Nexconn triage, approval/rejection, reviewer identity.
- Stage 4: persisted approved events and webhook/SSE fan-out.
- Stage 5: public REST, public SSE, replay queue, and polling lock.
- Stage 6: Discord, Telegram, auto ticker, and connect QR page.

Do not begin a later stage after completing only Stage 0.

## 18. Self-audit checklist
- Root contains no `pulsegate/` directory.
- Health works on port 8000 and through Vite port 5173.
- `.env` and database files are ignored and uncommitted.
- No TODO or FIXME stub exists.
- Internal responses use `{ ok, data }` or `{ ok, false, error }`.
- Public data contains no private credentials.
- CORS is absent from internal routes and enabled only on public v1.
- SQL uses foreign keys, WAL, and parameters.
- Locks clear in `finally`.
- SSE cleans streams and heartbeats.
- React stream cleanup and 100-item cap are present.
- Discord and Telegram retries follow 401/403/429 rules.
- The exact route and schema registries remain unchanged.

