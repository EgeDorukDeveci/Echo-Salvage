import { createServer } from "node:http";
import { createHash, pbkdf2Sync, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const DB_PATH = path.join(DATA_DIR, "server-db.json");
const DIST_DIR = path.join(ROOT, "dist");
const PORT = Number(process.env.PORT || 8787);
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const HASH_ITERATIONS = 120000;

const defaultDb = () => ({ users: [], levels: [] });

async function readDb() {
  try {
    return { ...defaultDb(), ...JSON.parse(await readFile(DB_PATH, "utf8")) };
  } catch {
    return defaultDb();
  }
}

async function writeDb(db) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DB_PATH, JSON.stringify(db, null, 2));
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    ...headers
  });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

function passwordRecord(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, HASH_ITERATIONS, 32, "sha256").toString("hex");
  return { passwordSalt: salt, passwordIterations: HASH_ITERATIONS, passwordHash: hash };
}

function passwordMatches(user, password) {
  if (!user?.passwordHash || !user?.passwordSalt) return false;
  const hash = pbkdf2Sync(password, user.passwordSalt, user.passwordIterations || HASH_ITERATIONS, 32, "sha256").toString("hex");
  return hash === user.passwordHash;
}

function publicUser(user) {
  const { passwordHash, passwordSalt, passwordIterations, password, ...safe } = user;
  return safe;
}

function makeSession(user) {
  return {
    ...publicUser(user),
    serverBacked: true
  };
}

function levelId(payload) {
  return createHash("sha1").update(`${payload.title}|${payload.author}|${payload.code}|${Date.now()}`).digest("hex").slice(0, 16);
}

async function handleApi(req, res, url) {
  if (req.method === "OPTIONS") return send(res, 204, {});
  if (url.pathname === "/api/health") return send(res, 200, { ok: true });

  const db = await readDb();

  if (url.pathname === "/api/auth/signup" && req.method === "POST") {
    const body = await readBody(req);
    const nickname = `${body.nickname || ""}`.trim();
    const email = `${body.email || ""}`.trim().toLowerCase();
    const password = `${body.password || ""}`;
    if (nickname.length < 2) return send(res, 400, { error: "Nickname needs at least 2 characters." });
    if (password.length < 4) return send(res, 400, { error: "Password needs at least 4 characters." });
    if (db.users.some((user) => user.nickname.toLowerCase() === nickname.toLowerCase())) {
      return send(res, 409, { error: "That nickname is already registered." });
    }
    const now = new Date().toISOString();
    const user = {
      id: randomUUID(),
      nickname,
      email,
      avatar: "yellow",
      coins: 25,
      progress: {},
      contracts: {},
      secrets: {},
      createdAt: now,
      updatedAt: now,
      sessionNonce: randomBytes(16).toString("hex"),
      sessionExpiresAt: Date.now() + SESSION_TTL_MS,
      ...passwordRecord(password)
    };
    db.users.push(user);
    await writeDb(db);
    return send(res, 201, { user: makeSession(user) });
  }

  if (url.pathname === "/api/auth/login" && req.method === "POST") {
    const body = await readBody(req);
    const nickname = `${body.nickname || ""}`.trim();
    const password = `${body.password || ""}`;
    const index = db.users.findIndex((user) => user.nickname.toLowerCase() === nickname.toLowerCase());
    if (index < 0 || !passwordMatches(db.users[index], password)) return send(res, 401, { error: "Nickname or password is incorrect." });
    db.users[index] = {
      ...db.users[index],
      sessionNonce: randomBytes(16).toString("hex"),
      sessionExpiresAt: Date.now() + SESSION_TTL_MS,
      updatedAt: new Date().toISOString()
    };
    await writeDb(db);
    return send(res, 200, { user: makeSession(db.users[index]) });
  }

  const userMatch = url.pathname.match(/^\/api\/users\/([^/]+)$/);
  if (userMatch && req.method === "PUT") {
    const body = await readBody(req);
    const id = decodeURIComponent(userMatch[1]);
    const index = db.users.findIndex((user) => user.id === id);
    if (index < 0) return send(res, 404, { error: "User not found." });
    const safeUpdate = publicUser(body.user || body);
    db.users[index] = {
      ...db.users[index],
      ...safeUpdate,
      id,
      nickname: db.users[index].nickname,
      email: safeUpdate.email ?? db.users[index].email,
      updatedAt: new Date().toISOString()
    };
    await writeDb(db);
    return send(res, 200, { user: makeSession(db.users[index]) });
  }

  if (url.pathname === "/api/community-levels" && req.method === "GET") {
    return send(res, 200, { levels: [...db.levels].sort((a, b) => `${b.createdAt}`.localeCompare(`${a.createdAt}`)) });
  }

  if (url.pathname === "/api/community-levels" && req.method === "POST") {
    const body = await readBody(req);
    const title = `${body.title || ""}`.trim();
    const author = `${body.author || "Anonymous"}`.trim() || "Anonymous";
    if (title.length < 3) return send(res, 400, { error: "Give the map a title first." });
    if (!body.level || !body.code) return send(res, 400, { error: "Level payload is missing." });
    const now = new Date().toISOString();
    const entry = {
      id: levelId({ ...body, title, author }),
      title,
      description: `${body.description || ""}`.trim(),
      author,
      level: body.level,
      code: body.code,
      createdAt: now,
      updatedAt: now,
      plays: 0
    };
    db.levels.unshift(entry);
    await writeDb(db);
    return send(res, 201, { level: entry });
  }

  return send(res, 404, { error: "API route not found." });
}

async function serveStatic(req, res, url) {
  const requested = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
  const filePath = path.normalize(path.join(DIST_DIR, requested));
  const safePath = filePath.startsWith(DIST_DIR) ? filePath : path.join(DIST_DIR, "index.html");
  const target = await stat(safePath).then((info) => info.isFile() ? safePath : path.join(DIST_DIR, "index.html")).catch(() => path.join(DIST_DIR, "index.html"));
  const ext = path.extname(target);
  const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".json": "application/json" };
  try {
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    res.end(await readFile(target));
  } catch {
    send(res, 404, { error: "Build output not found. Run npm run build first." });
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
    return await serveStatic(req, res, url);
  } catch (error) {
    console.error(error);
    return send(res, 500, { error: "Server error." });
  }
}).listen(PORT, "0.0.0.0", () => {
  console.log(`Echo Salvage server running on http://localhost:${PORT}`);
});
