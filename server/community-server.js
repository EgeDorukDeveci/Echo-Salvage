import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.LEVEL_DATA_DIR || join(__dirname, "..", "data");
const dataFile = join(dataDir, "community-levels.json");
const port = Number(process.env.PORT || 8787);

async function readLevels() {
  try {
    return JSON.parse(await readFile(dataFile, "utf8"));
  } catch {
    return [];
  }
}

async function writeLevels(levels) {
  await mkdir(dirname(dataFile), { recursive: true });
  await writeFile(dataFile, JSON.stringify(levels, null, 2));
}

function send(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    send(res, 204, {});
    return;
  }

  if (req.url === "/api/health") {
    send(res, 200, { ok: true });
    return;
  }

  if (req.url === "/api/levels" && req.method === "GET") {
    const levels = await readLevels();
    send(res, 200, levels);
    return;
  }

  if (req.url === "/api/levels" && req.method === "POST") {
    try {
      const body = await readBody(req);
      if (!body.title || !body.level || !body.author) {
        send(res, 400, { error: "Missing title, author, or level." });
        return;
      }
      const level = {
        id: crypto.randomUUID(),
        title: String(body.title).slice(0, 64),
        description: String(body.description || "").slice(0, 240),
        author: String(body.author).slice(0, 32),
        level: body.level,
        version: 1,
        plays: 0,
        likes: 0,
        createdAt: new Date().toISOString()
      };
      const levels = await readLevels();
      await writeLevels([level, ...levels].slice(0, 500));
      send(res, 201, level);
    } catch {
      send(res, 400, { error: "Invalid level payload." });
    }
    return;
  }

  send(res, 404, { error: "Not found." });
});

server.listen(port, () => {
  console.log(`Echo Salvage community server listening on http://localhost:${port}`);
});
