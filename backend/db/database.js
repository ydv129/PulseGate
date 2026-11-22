import { fileURLToPath } from 'node:url'

let db

const database_path = fileURLToPath(new URL('../../pulsegate.db', import.meta.url))

function wrapPrepare(prepare) {
  return (statement) => {
    const prepared = prepare(statement)
    return {
      run(...parameters) {
        return prepared.run(...parameters)
      },
      get(...parameters) {
        return prepared.get(...parameters)
      },
      all(...parameters) {
        return typeof prepared.all === 'function'
          ? prepared.all(...parameters)
          : prepared.all(...parameters)
      },
    }
  }
}

try {
  const { default: BetterSqlite3 } = await import('better-sqlite3')
  const betterDb = new BetterSqlite3(database_path)
  betterDb.pragma('journal_mode = WAL')
  betterDb.pragma('foreign_keys = ON')
  db = {
    exec(sql) {
      return betterDb.exec(sql)
    },
    prepare: wrapPrepare((statement) => betterDb.prepare(statement)),
    close() {
      return betterDb.close()
    },
  }
} catch (error) {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') {
    console.warn('better-sqlite3 unavailable; falling back to node:sqlite:', error.message)
  }
  const { DatabaseSync } = await import('node:sqlite')
  const sqliteDb = new DatabaseSync(database_path)
  sqliteDb.exec('PRAGMA journal_mode = WAL')
  sqliteDb.exec('PRAGMA foreign_keys = ON')
  db = {
    exec(sql) {
      return sqliteDb.exec(sql)
    },
    prepare(statement) {
      const prepared = sqliteDb.prepare(statement)
      return {
        run(...parameters) {
          return prepared.run(...parameters)
        },
        get(...parameters) {
          return prepared.get(...parameters)
        },
        all(...parameters) {
          return prepared.all(...parameters)
        },
      }
    },
    close() {
      return sqliteDb.close()
    },
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS topics (
    topic_id TEXT PRIMARY KEY,
    name TEXT,
    query TEXT,
    diff_mode TEXT,
    poll_interval_sec INTEGER DEFAULT 0,
    last_polled_at TEXT,
    status TEXT DEFAULT 'active',
    webhooks TEXT DEFAULT '[]',
    api_key TEXT,
    discord_channel_id TEXT,
    discord_invite_url TEXT,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS events (
    event_id TEXT PRIMARY KEY,
    topic_id TEXT REFERENCES topics(topic_id) ON DELETE CASCADE,
    title TEXT,
    link TEXT,
    summary TEXT,
    verified_status TEXT,
    citations TEXT,
    status TEXT DEFAULT 'pending',
    reviewed_by TEXT,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS seen_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id TEXT REFERENCES topics(topic_id) ON DELETE CASCADE,
    item_hash TEXT,
    last_price REAL,
    content_hash TEXT,
    created_at TEXT,
    UNIQUE(topic_id, item_hash)
  );

  CREATE TABLE IF NOT EXISTS telegram_subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id TEXT REFERENCES topics(topic_id) ON DELETE CASCADE,
    chat_id TEXT,
    username TEXT,
    UNIQUE(topic_id, chat_id)
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS webhook_deliveries (
    delivery_id TEXT PRIMARY KEY,
    event_id TEXT,
    topic_id TEXT,
    webhook_url TEXT,
    status TEXT DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TEXT
  );
`)

export function getDb() {
  return db
}

export function safeJsonParse(value, fallback = null) {
  if (value === null || value === undefined) {
    return fallback
  }
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

export function safeJsonStringify(value, fallback = '[]') {
  try {
    return JSON.stringify(value)
  } catch {
    return fallback
  }
}

export { db }
