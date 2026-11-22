# PulseGate

PulseGate is a verified web-to-event broker: "Kafka for the Public Web."

It ingests public web results, applies smart deduplication, verifies information, normalizes events, supports human approval, and fans out approved Unified Events to REST, SSE, webhooks, Discord, and Telegram.

## Setup

From the PulseGate workspace root:

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

In a second terminal:

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0
```

## Verify

```bash
curl --fail http://localhost:8000/api/health
curl --fail http://localhost:5173/api/health
```

## Demo

Create a topic, poll it in mock mode, verify the resulting event, approve it when required, and consume it through REST or SSE. Repeated fixtures demonstrate duplicate removal and no-credit mock operation.

## Stack

- Node.js ESM
- Express
- better-sqlite3
- React 19 and Vite
- Tailwind CSS
- Lucide React
- Native fetch
