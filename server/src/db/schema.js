module.exports = [
  `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'viewer')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    group_name TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    direction TEXT,
    phone TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT,
    tags TEXT,
    extracted TEXT,
    scheduled_at DATETIME,
    sent_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS automation_rules (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    trigger_type TEXT,
    trigger_value TEXT,
    action_type TEXT,
    action_config TEXT,
    priority INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS automation_logs (
    id INTEGER PRIMARY KEY,
    rule_id INTEGER REFERENCES automation_rules(id),
    message_id TEXT,
    matched INTEGER,
    action_taken TEXT,
    result TEXT,
    error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS webhooks (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    secret TEXT,
    enabled INTEGER DEFAULT 1,
    events TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_messages_phone ON messages(phone)
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status)
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_contacts_group_name ON contacts(group_name)
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_automation_rules_priority ON automation_rules(priority DESC)
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_automation_logs_rule_id ON automation_logs(rule_id)
  `,
];
