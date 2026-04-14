# SMS Dashboard

<p align="center">
  <img src="https://img.shields.io/badge/Stack-React%20%2B%20Express%20%2B%20SQLite-blue?style=for-the-badge" alt="Stack">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License">
</p>

A production-grade SMS management dashboard with an intelligent automation engine. Send, receive, and automate your SMS workflows with a beautiful dark-themed interface.

---

## Features

### Core Messaging
- **Send SMS** — Individual numbers or entire contact groups
- **Schedule sends** — Queue messages for future delivery with auto-retry
- **Two-way conversations** — Threaded inbox view with real-time updates
- **Message history** — Full audit trail with search, filters, and CSV export

### Automation Engine
- **Keyword triggers** — Match incoming messages by keyword (case-insensitive)
- **Regex patterns** — Full regex support for complex matching
- **Auto-reply** — Automatically respond to incoming messages
- **Data extraction** — Extract structured data (OTPs, order IDs, amounts) using named capture groups
- **Webhook forwarding** — Forward messages to external endpoints with HMAC signing
- **Tagging** — Apply custom tags to messages for organization

### Analytics
- **Volume over time** — Stacked bar chart (inbound vs outbound)
- **Delivery rate tracking** — Line chart showing delivery success
- **Status breakdown** — Donut chart (sent/delivered/failed/pending)
- **Top contacts** — Most messaged numbers

### Security & Access Control
- **JWT authentication** — Secure token-based auth
- **Role-based permissions** — Admin (full access) vs Viewer (read-only)
- **Server-side credentials** — SMSGate credentials never exposed to client

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Vite |
| Styling | Tailwind CSS |
| Routing | React Router v7 |
| Charts | Recharts |
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| Auth | JWT + bcryptjs |
| Scheduling | node-cron |

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your SMSGate and JWT settings

# 3. Start development servers
npm run dev:server   # Express API on http://localhost:5000
npm run dev:client   # Vite dev server on http://localhost:5173

# 4. Bootstrap first admin user
# (see README.md for PowerShell commands)
```

---

## Project Structure

```
SMS/
├── client/                 # React frontend
│   └── src/
│       ├── pages/          # Dashboard, Compose, Inbox, Automation, Analytics, Settings
│       ├── components/     # Layout, SmsForm, MessageTable, QueueMonitor
│       ├── context/       # AuthContext, AppDataContext
│       └── api/           # Axios client config
│
├── server/                 # Express backend
│   └── src/
│       ├── routes/        # auth, messages, contacts, automation, webhooks, analytics
│       ├── repositories/  # SQLite data access layer
│       ├── services/      # automationService, queueService, smsGateClient, ai
│       ├── middleware/    # auth, errors
│       └── db/            # SQLite schema initialization
│
├── package.json           # Workspace root
└── DESIGN.md             # Full technical specification
```

---

## API Overview

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Get JWT token |
| `/api/messages` | GET | List messages (paginated) |
| `/api/send` | POST | Send SMS |
| `/api/conversations/:phone` | GET | Get thread for a number |
| `/api/contacts` | CRUD | Manage contacts |
| `/api/automation/rules` | CRUD | Manage automation rules |
| `/api/webhooks` | CRUD | Manage webhooks |
| `/api/analytics/*` | GET | Analytics data |
| `/api/queue` | GET | Scheduled message queue |
| `/api/status` | GET | SMSGate connectivity status |

---

## Automation Rule Examples

**Auto-reply on keyword:**
```json
{
  "name": "Order Confirmation",
  "trigger_type": "keyword",
  "trigger_value": "ORDER PLACED",
  "action_type": "auto_reply",
  "action_config": { "body": "Thanks! Your order has been received." }
}
```

**Extract OTP from message:**
```json
{
  "name": "Extract OTP",
  "trigger_type": "regex",
  "trigger_value": "\\d{4,8}",
  "action_type": "extract",
  "action_config": { "template": "(?<otp>\\d{4,8})", "label": "OTP" }
}
```

**Forward to webhook:**
```json
{
  "name": "Forward All Inbound",
  "trigger_type": "any",
  "action_type": "webhook",
  "action_config": { "url": "https://your-server.com/hook", "secret": "your-secret" }
}
```

---

## Environment Variables

```env
PORT=5000
SMS_API_URL=http://10.165.0.51:8080
SMS_USERNAME=your_smsgate_username
SMS_PASSWORD=your_smsgate_password
JWT_SECRET=your_64_char_random_string
RATE_LIMIT_RPM=60
DB_PATH=./data/sms.db
```

---

## License

MIT
