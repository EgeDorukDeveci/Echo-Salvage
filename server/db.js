import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = path.resolve(process.env.ECHO_DATA_DIR || path.join(ROOT, "data"));
const DB_PATH = path.resolve(process.env.ECHO_DB_PATH || path.join(DATA_DIR, "echo-salvage.sqlite"));
const LEGACY_DB_PATH = path.join(DATA_DIR, "server-db.json");

mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    nickname TEXT NOT NULL UNIQUE COLLATE NOCASE,
    email TEXT NOT NULL DEFAULT '',
    password_salt TEXT NOT NULL,
    password_iterations INTEGER NOT NULL,
    password_hash TEXT NOT NULL,
    profile_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);

  CREATE TABLE IF NOT EXISTS community_levels (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    level_json TEXT NOT NULL,
    code TEXT NOT NULL,
    checksum TEXT NOT NULL,
    stats_json TEXT NOT NULL DEFAULT '{}',
    schema_version INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'published',
    plays INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS levels_status_created_idx ON community_levels(status, created_at DESC);
  CREATE INDEX IF NOT EXISTS levels_owner_idx ON community_levels(owner_id, updated_at DESC);
  CREATE INDEX IF NOT EXISTS levels_plays_idx ON community_levels(status, plays DESC);

  CREATE TABLE IF NOT EXISTS community_likes (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    level_id TEXT NOT NULL REFERENCES community_levels(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, level_id)
  );

  CREATE INDEX IF NOT EXISTS likes_level_idx ON community_likes(level_id);

  CREATE TABLE IF NOT EXISTS server_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

const levelColumns = new Set(db.prepare("PRAGMA table_info(community_levels)").all().map((column) => column.name));
if (!levelColumns.has("stats_json")) db.exec("ALTER TABLE community_levels ADD COLUMN stats_json TEXT NOT NULL DEFAULT '{}'");

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function parseJson(value, fallback = {}) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function publicUserRow(row) {
  if (!row) return null;
  const profile = parseJson(row.profile_json, {});
  return {
    ...profile,
    id: row.id,
    nickname: row.nickname,
    email: row.email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    serverBacked: true
  };
}

function migrateLegacyJson() {
  if (!existsSync(LEGACY_DB_PATH)) return;
  const migrated = db.prepare("SELECT value FROM server_meta WHERE key = ?").get("legacy-json-migrated");
  if (migrated) return;

  const legacy = parseJson(readFileSync(LEGACY_DB_PATH, "utf8"), { users: [], levels: [] });
  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (
      id, nickname, email, password_salt, password_iterations, password_hash, profile_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertLevel = db.prepare(`
    INSERT OR IGNORE INTO community_levels (
      id, owner_id, title, description, level_json, code, checksum, stats_json, created_at, updated_at, plays
    ) VALUES (?, ?, ?, ?, ?, ?, ?, '{}', ?, ?, ?)
  `);

  db.exec("BEGIN");
  try {
    for (const user of legacy.users || []) {
      if (!user?.id || !user?.nickname || !user?.passwordHash || !user?.passwordSalt) continue;
      const {
        passwordHash,
        passwordSalt,
        passwordIterations,
        password,
        email,
        nickname,
        id,
        ...profile
      } = user;
      const now = user.updatedAt || user.createdAt || new Date().toISOString();
      insertUser.run(
        id,
        `${nickname}`.slice(0, 32),
        `${email || ""}`.slice(0, 160),
        passwordSalt,
        passwordIterations || 120000,
        passwordHash,
        JSON.stringify(profile),
        user.createdAt || now,
        now
      );
    }

    const fallbackOwner = db.prepare("SELECT id FROM users ORDER BY created_at LIMIT 1").get();
    for (const level of legacy.levels || []) {
      const owner = db.prepare("SELECT id FROM users WHERE nickname = ? COLLATE NOCASE").get(level.author || "");
      const ownerId = owner?.id || fallbackOwner?.id;
      if (!ownerId || !level?.level) continue;
      const now = level.updatedAt || level.createdAt || new Date().toISOString();
      const levelJson = JSON.stringify(level.level);
      insertLevel.run(
        level.id,
        ownerId,
        `${level.title || "Legacy Community Map"}`.slice(0, 64),
        `${level.description || ""}`.slice(0, 280),
        levelJson,
        level.code || "",
        createHash("sha256").update(levelJson).digest("hex"),
        level.createdAt || now,
        now,
        Math.max(0, Number(level.plays) || 0)
      );
    }
    db.prepare("INSERT OR REPLACE INTO server_meta(key, value) VALUES (?, ?)").run("legacy-json-migrated", new Date().toISOString());
    db.exec("COMMIT");
    renameSync(LEGACY_DB_PATH, `${LEGACY_DB_PATH}.migrated`);
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

migrateLegacyJson();

export { db, DB_PATH, hashToken, parseJson, publicUserRow };
