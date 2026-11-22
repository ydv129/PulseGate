# PulseGate Technology Whitelist and Blacklist

## Whitelist

### Runtime
- Node.js v20 or v22 LTS.
- Plain JavaScript ESM.
- package.json `type: module`.

### Backend
- Express.
- cors only on public v1 routes.
- dotenv.
- native fetch.
- crypto.
- AbortSignal.timeout.
- better-sqlite3.
- node:sqlite fallback for Node 22.5+ only when better-sqlite3 fails.
- SerpApi HTTP.
- You.com Answer API HTTP.
- Nexconn official npm Web SDK.
- cloudflared CLI.

### Frontend
- React 18 or 19.
- Vite.
- plain JSX.
- Tailwind CSS.
- lucide-react.
- frontend-only QR generation package.

No package may be added silently.

## Blacklist
- TypeScript
- axios
- got
- node-fetch
- prisma
- drizzle
- sequelize
- mongoose
- postgres
- redis
- mongodb
- redux
- zustand
- tanstack-query
- react-router-dom
- socket.io
- ws
- jsonwebtoken
- bcrypt
- passport
- bullmq
- docker
- zod
- mui
- antd
- chakra-ui
- shadcn

## Additional forbidden replacements
- No Discord SDK such as discord.js.
- No Telegram SDK; use Telegram Bot API HTTP.
- No ORM for SQLite.
- No NoSQL or external database.
- No JWT dashboard auth.
- No WebSocket or socket service for SSE.
- No direct frontend access to SQLite or backend secrets.

## Persistence policy
SQLite is the sole persistence database.
Raw better-sqlite3 is preferred.
Node node:sqlite is allowed only as fallback for Node 22.5+.
Do not add another ORM or database without explicit specification approval.

## Network policy
Use native fetch with AbortSignal.timeout.
Use 15000 ms for SerpApi, You.com, and Nexconn.
Use 5000 ms for webhooks.
No axios, got, or node-fetch replacement.
Discord REST v10 and Telegram Bot API use direct HTTP.

## Package policy
Never remove an existing working dependency for a stage.
Never add an unapproved dependency while fixing a bug.
Keep package.json changes surgical and lock the chosen approved package versions through npm.
