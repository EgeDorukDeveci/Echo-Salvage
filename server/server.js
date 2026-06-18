import { createServer } from "node:http";
import { pbkdf2Sync, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db, DB_PATH, hashToken, parseJson, publicUserRow } from "./db.js";
import { checksumLevel, levelStats, sanitizeLevel } from "./level-validation.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT, "dist");
const PORT = Number(process.env.PORT || 8787);
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const HASH_ITERATIONS = 120000;
const BODY_LIMIT = 256 * 1024;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const rateWindows = new Map();

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": CORS_ORIGIN,
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Cache-Control": "no-store",
    ...headers
  });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (Buffer.byteLength(raw) > BODY_LIMIT) {
      const error = new Error("Request body is too large.");
      error.status = 413;
      throw error;
    }
  }
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.status = 400;
    throw error;
  }
}

function rateLimit(req, scope, limit, windowMs) {
  const ip = `${req.headers["x-forwarded-for"] || req.socket.remoteAddress || "local"}`.split(",")[0].trim();
  const key = `${scope}:${ip}`;
  const now = Date.now();
  const current = rateWindows.get(key);
  if (!current || current.resetAt <= now) {
    rateWindows.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  current.count += 1;
  if (current.count > limit) {
    const error = new Error("Too many requests. Try again shortly.");
    error.status = 429;
    throw error;
  }
}

function passwordRecord(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, HASH_ITERATIONS, 32, "sha256").toString("hex");
  return { salt, iterations: HASH_ITERATIONS, hash };
}

function passwordMatches(user, password) {
  const candidate = Buffer.from(pbkdf2Sync(password, user.password_salt, user.password_iterations, 32, "sha256").toString("hex"));
  const expected = Buffer.from(user.password_hash);
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function issueSession(userId) {
  const token = randomBytes(32).toString("base64url");
  const now = new Date().toISOString();
  const expiresAt = Date.now() + SESSION_TTL_MS;
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now());
  db.prepare("INSERT INTO sessions(token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
    .run(hashToken(token), userId, expiresAt, now);
  return { token, expiresAt };
}

function authUser(req, { required = true } = {}) {
  const header = `${req.headers.authorization || ""}`;
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    if (!required) return null;
    const error = new Error("Sign in with a server-backed account to continue.");
    error.status = 401;
    throw error;
  }
  const row = db.prepare(`
    SELECT users.*, sessions.expires_at
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ?
  `).get(hashToken(token));
  if (!row || row.expires_at <= Date.now()) {
    if (row) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
    if (!required) return null;
    const error = new Error("Your server session expired. Log in again.");
    error.status = 401;
    throw error;
  }
  return row;
}

function safeProfile(input, existing = {}) {
  const source = input && typeof input === "object" ? input : {};
  const allowed = [
    "avatar", "coins", "progress", "contracts", "secrets", "owned", "cosmetic",
    "devMode", "sessionNonce", "sessionExpiresAt"
  ];
  const profile = { ...existing };
  for (const key of allowed) {
    if (source[key] !== undefined) profile[key] = source[key];
  }
  return profile;
}

function mapSummary(row, viewerId = null) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    author: row.author,
    authorId: row.owner_id,
    plays: Number(row.plays) || 0,
    likes: Number(row.likes) || 0,
    liked: Boolean(row.viewer_liked),
    stats: parseJson(row.stats_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ownedByViewer: Boolean(viewerId && row.owner_id === viewerId)
  };
}

function listLevels(url, viewerId) {
  const page = Math.max(1, Math.floor(Number(url.searchParams.get("page")) || 1));
  const limit = Math.min(30, Math.max(1, Math.floor(Number(url.searchParams.get("limit")) || 12)));
  const query = `${url.searchParams.get("query") || ""}`.trim().slice(0, 80);
  const sort = ["new", "popular", "liked"].includes(url.searchParams.get("sort")) ? url.searchParams.get("sort") : "new";
  const offset = (page - 1) * limit;
  const where = query ? "AND (community_levels.title LIKE ? OR community_levels.description LIKE ? OR users.nickname LIKE ?)" : "";
  const order = sort === "popular"
    ? "community_levels.plays DESC, likes DESC, community_levels.created_at DESC"
    : sort === "liked"
      ? "likes DESC, community_levels.plays DESC, community_levels.created_at DESC"
      : "community_levels.created_at DESC";
  const queryArgs = query ? [`%${query}%`, `%${query}%`, `%${query}%`] : [];
  const rows = db.prepare(`
    SELECT community_levels.*, users.nickname AS author,
      (SELECT COUNT(*) FROM community_likes WHERE community_likes.level_id = community_levels.id) AS likes,
      EXISTS(SELECT 1 FROM community_likes WHERE community_likes.level_id = community_levels.id AND community_likes.user_id = ?) AS viewer_liked
    FROM community_levels
    JOIN users ON users.id = community_levels.owner_id
    WHERE community_levels.status = 'published' ${where}
    ORDER BY ${order}
    LIMIT ? OFFSET ?
  `).all(viewerId || "", ...queryArgs, limit, offset);
  const count = db.prepare(`
    SELECT COUNT(*) AS total
    FROM community_levels JOIN users ON users.id = community_levels.owner_id
    WHERE community_levels.status = 'published' ${where}
  `).get(...queryArgs).total;
  return {
    levels: rows.map((row) => mapSummary(row, viewerId)),
    pagination: { page, limit, total: Number(count), pages: Math.max(1, Math.ceil(Number(count) / limit)) }
  };
}

function getLevelRow(id, viewerId = null) {
  return db.prepare(`
    SELECT community_levels.*, users.nickname AS author,
      (SELECT COUNT(*) FROM community_likes WHERE community_likes.level_id = community_levels.id) AS likes,
      EXISTS(SELECT 1 FROM community_likes WHERE community_likes.level_id = community_levels.id AND community_likes.user_id = ?) AS viewer_liked
    FROM community_levels
    JOIN users ON users.id = community_levels.owner_id
    WHERE community_levels.id = ? AND community_levels.status = 'published'
  `).get(viewerId || "", id);
}

async function handleApi(req, res, url) {
  if (req.method === "OPTIONS") return send(res, 204, {});
  if (url.pathname === "/api/health") {
    return send(res, 200, { ok: true, storage: "sqlite", database: path.basename(DB_PATH), time: new Date().toISOString() });
  }

  if (url.pathname === "/api/auth/signup" && req.method === "POST") {
    rateLimit(req, "signup", 8, 60_000);
    const body = await readBody(req);
    const nickname = `${body.nickname || ""}`.trim();
    const email = `${body.email || ""}`.trim().toLowerCase();
    const password = `${body.password || ""}`;
    if (nickname.length < 2 || nickname.length > 32) return send(res, 400, { error: "Nickname must be 2–32 characters." });
    if (email.length > 160) return send(res, 400, { error: "Email is too long." });
    if (password.length < 6 || password.length > 128) return send(res, 400, { error: "Password must be 6–128 characters." });
    if (db.prepare("SELECT 1 FROM users WHERE nickname = ? COLLATE NOCASE").get(nickname)) {
      return send(res, 409, { error: "That nickname is already registered." });
    }
    const id = randomUUID();
    const now = new Date().toISOString();
    const passwordData = passwordRecord(password);
    db.prepare(`
      INSERT INTO users(id, nickname, email, password_salt, password_iterations, password_hash, profile_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, nickname, email, passwordData.salt, passwordData.iterations, passwordData.hash, "{}", now, now);
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    const session = issueSession(id);
    return send(res, 201, { user: { ...publicUserRow(user), serverToken: session.token, serverTokenExpiresAt: session.expiresAt } });
  }

  if (url.pathname === "/api/auth/login" && req.method === "POST") {
    rateLimit(req, "login", 20, 60_000);
    const body = await readBody(req);
    const nickname = `${body.nickname || ""}`.trim();
    const password = `${body.password || ""}`;
    const user = db.prepare("SELECT * FROM users WHERE nickname = ? COLLATE NOCASE").get(nickname);
    if (!user || !passwordMatches(user, password)) return send(res, 401, { error: "Nickname or password is incorrect." });
    const session = issueSession(user.id);
    return send(res, 200, { user: { ...publicUserRow(user), serverToken: session.token, serverTokenExpiresAt: session.expiresAt } });
  }

  if (url.pathname === "/api/auth/logout" && req.method === "POST") {
    const user = authUser(req);
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);
    return send(res, 200, { ok: true });
  }

  const userMatch = url.pathname.match(/^\/api\/users\/([^/]+)$/);
  if (userMatch && req.method === "PUT") {
    const auth = authUser(req);
    const id = decodeURIComponent(userMatch[1]);
    if (auth.id !== id) return send(res, 403, { error: "You cannot update another profile." });
    const body = await readBody(req);
    const existing = parseJson(auth.profile_json, {});
    const profile = safeProfile(body.user || body, existing);
    const email = `${body.user?.email ?? body.email ?? auth.email ?? ""}`.trim().slice(0, 160);
    const now = new Date().toISOString();
    db.prepare("UPDATE users SET email = ?, profile_json = ?, updated_at = ? WHERE id = ?")
      .run(email, JSON.stringify(profile), now, id);
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    return send(res, 200, { user: publicUserRow(user) });
  }

  if (url.pathname === "/api/community-levels" && req.method === "GET") {
    const viewer = authUser(req, { required: false });
    return send(res, 200, listLevels(url, viewer?.id));
  }

  if (url.pathname === "/api/community-levels" && req.method === "POST") {
    rateLimit(req, "publish", 12, 60_000);
    const auth = authUser(req);
    const body = await readBody(req);
    const title = `${body.title || ""}`.trim();
    const description = `${body.description || ""}`.trim();
    if (title.length < 3 || title.length > 64) return send(res, 400, { error: "Map title must be 3–64 characters." });
    if (description.length > 280) return send(res, 400, { error: "Description must be 280 characters or fewer." });
    const level = sanitizeLevel({ ...body.level, name: title });
    const levelJson = JSON.stringify(level);
    const checksum = checksumLevel(level);
    const duplicate = db.prepare(`
      SELECT id FROM community_levels WHERE owner_id = ? AND checksum = ? AND status = 'published'
    `).get(auth.id, checksum);
    if (duplicate) return send(res, 409, { error: "You already published this exact map.", levelId: duplicate.id });
    const id = randomUUID();
    const now = new Date().toISOString();
    const code = Buffer.from(levelJson, "utf8").toString("base64");
    db.prepare(`
      INSERT INTO community_levels(
        id, owner_id, title, description, level_json, code, checksum, stats_json, schema_version, status, plays, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'published', 0, ?, ?)
    `).run(id, auth.id, title, description, levelJson, code, checksum, JSON.stringify(levelStats(level)), now, now);
    const row = getLevelRow(id, auth.id);
    return send(res, 201, { level: { ...mapSummary(row, auth.id), code } });
  }

  const levelMatch = url.pathname.match(/^\/api\/community-levels\/([^/]+)$/);
  if (levelMatch && req.method === "GET") {
    const viewer = authUser(req, { required: false });
    const id = decodeURIComponent(levelMatch[1]);
    const row = getLevelRow(id, viewer?.id);
    if (!row) return send(res, 404, { error: "Community map not found." });
    db.prepare("UPDATE community_levels SET plays = plays + 1 WHERE id = ?").run(id);
    const level = parseJson(row.level_json, null);
    return send(res, 200, {
      level: {
        ...mapSummary({ ...row, plays: Number(row.plays) + 1 }, viewer?.id),
        level,
        code: row.code
      }
    });
  }

  if (levelMatch && req.method === "PUT") {
    const auth = authUser(req);
    const id = decodeURIComponent(levelMatch[1]);
    const existing = db.prepare("SELECT * FROM community_levels WHERE id = ? AND status = 'published'").get(id);
    if (!existing) return send(res, 404, { error: "Community map not found." });
    if (existing.owner_id !== auth.id) return send(res, 403, { error: "Only the map author can update it." });
    const body = await readBody(req);
    const title = `${body.title || existing.title}`.trim();
    const description = `${body.description ?? existing.description}`.trim();
    if (title.length < 3 || title.length > 64 || description.length > 280) return send(res, 400, { error: "Map metadata is invalid." });
    const level = sanitizeLevel({ ...(body.level || parseJson(existing.level_json)), name: title });
    const levelJson = JSON.stringify(level);
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE community_levels SET title = ?, description = ?, level_json = ?, code = ?, checksum = ?, stats_json = ?, updated_at = ?
      WHERE id = ?
    `).run(title, description, levelJson, Buffer.from(levelJson, "utf8").toString("base64"), checksumLevel(level), JSON.stringify(levelStats(level)), now, id);
    const row = getLevelRow(id, auth.id);
    return send(res, 200, { level: mapSummary(row, auth.id) });
  }

  if (levelMatch && req.method === "DELETE") {
    const auth = authUser(req);
    const id = decodeURIComponent(levelMatch[1]);
    const result = db.prepare("UPDATE community_levels SET status = 'deleted', updated_at = ? WHERE id = ? AND owner_id = ?")
      .run(new Date().toISOString(), id, auth.id);
    if (!result.changes) return send(res, 404, { error: "Map not found or not owned by you." });
    return send(res, 200, { ok: true });
  }

  const likeMatch = url.pathname.match(/^\/api\/community-levels\/([^/]+)\/like$/);
  if (likeMatch && req.method === "POST") {
    const auth = authUser(req);
    const id = decodeURIComponent(likeMatch[1]);
    if (!db.prepare("SELECT 1 FROM community_levels WHERE id = ? AND status = 'published'").get(id)) {
      return send(res, 404, { error: "Community map not found." });
    }
    const existing = db.prepare("SELECT 1 FROM community_likes WHERE user_id = ? AND level_id = ?").get(auth.id, id);
    if (existing) db.prepare("DELETE FROM community_likes WHERE user_id = ? AND level_id = ?").run(auth.id, id);
    else db.prepare("INSERT INTO community_likes(user_id, level_id, created_at) VALUES (?, ?, ?)").run(auth.id, id, new Date().toISOString());
    const likes = db.prepare("SELECT COUNT(*) AS total FROM community_likes WHERE level_id = ?").get(id).total;
    return send(res, 200, { liked: !existing, likes: Number(likes) });
  }

  return send(res, 404, { error: "API route not found." });
}

async function serveStatic(res, url) {
  const requested = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
  const filePath = path.resolve(DIST_DIR, requested);
  const relative = path.relative(DIST_DIR, filePath);
  const safePath = relative.startsWith("..") || path.isAbsolute(relative) ? path.join(DIST_DIR, "index.html") : filePath;
  const target = await stat(safePath)
    .then((info) => info.isFile() ? safePath : path.join(DIST_DIR, "index.html"))
    .catch(() => path.join(DIST_DIR, "index.html"));
  const ext = path.extname(target);
  const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml", ".json": "application/json" };
  try {
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    res.end(await readFile(target));
  } catch {
    send(res, 404, { error: "Build output not found. Run npm run build first." });
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
    return await serveStatic(res, url);
  } catch (error) {
    console.error(error);
    return send(res, error.status || 500, { error: error.status ? error.message : "Server error." });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Echo Salvage server running on http://localhost:${PORT}`);
  console.log(`SQLite database: ${DB_PATH}`);
});

export { server };
