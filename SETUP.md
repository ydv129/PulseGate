# PulseGate GitHub Workspace Setup

## Root check
Run commands from `/workspaces/PulseGate`. Do not create a `pulsegate/` directory.

## Node check
```bash
node --version
npm --version
```

PulseGate targets Node 20 or 22 LTS. The current workspace may run Node 24.22.2; test better-sqlite3 and use the approved fallback only if it fails.

## Backend
```bash
cd /workspaces/PulseGate/backend
npm install
cp .env.example .env
npm run dev
```

## Frontend
```bash
cd /workspaces/PulseGate/frontend
npm install
npm run dev -- --host 0.0.0.0
```

## Health verification
Direct backend:
```bash
curl --fail http://localhost:8000/api/health
```

Through Vite proxy:
```bash
curl --fail http://localhost:5173/api/health
```

Expected envelope:
```json
{"ok":true,"data":{"status":"ok"}}
```

## Environment
Copy `backend/.env.example` to `backend/.env`.
Never commit `.env` or secrets.
Set `PUBLIC_BASE_URL` dynamically in `app_settings`; environment is only the startup fallback.
When port forwarding in GitHub Workspaces, use the forwarded Vite or backend URL and keep API calls relative inside the dashboard.
