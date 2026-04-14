# SMS Dashboard

SMS dashboard template with React frontend + Express backend + SQLite storage.

## Before You Push To GitHub

1. Make sure `.env` is not committed (`.gitignore` already excludes it).
2. Rotate any credentials that were ever pasted in chat/terminal history.
3. Keep only placeholders in `.env.example`.

## Setup

1. Copy `.env.example` to `.env` and fill in SMSGate and JWT settings.
2. Optionally set `BOOTSTRAP_ADMIN_USERNAME` and `BOOTSTRAP_ADMIN_PASSWORD` for first-run admin creation.
3. Install dependencies in `server` and `client` once the package managers are available.
4. Start the backend and frontend development servers.

### Install

```bash
npm install
```

### Run

```bash
npm run dev:server
npm run dev:client
```

### Build

```bash
npm run build
```

## Auth Foundation

- `POST /api/auth/login` returns a JWT token (8h expiry).
- `GET /api/auth/me` returns the authenticated user from bearer token.
- SQLite schema is initialized automatically at server startup using `DB_PATH`.

## First Admin Bootstrap

Bootstrap only works when the users table is empty.

```powershell
$bootstrap = @{ username = "admin"; password = "Admin123!" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:5000/api/auth/bootstrap" -ContentType "application/json" -Body $bootstrap
```

Then log in to get a JWT token:

```powershell
$login = @{ username = "admin"; password = "Admin123!" } | ConvertTo-Json
$response = Invoke-RestMethod -Method Post -Uri "http://localhost:5000/api/auth/login" -ContentType "application/json" -Body $login
$response.token
```

## Scripts

- `npm run dev:server`
- `npm run dev:client`
- `npm run build`
- `npm run start`
