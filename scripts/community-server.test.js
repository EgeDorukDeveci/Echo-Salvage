import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { makeLevel } from "../src/game/levels.js";

const PORT = 18879;
const BASE = `http://127.0.0.1:${PORT}/api`;

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${BASE}/health`);
      if (response.ok) return;
    } catch {
      // The child process is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Community server did not start.");
}

async function request(pathname, options = {}) {
  const response = await fetch(`${BASE}${pathname}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const body = await response.json();
  return { response, body };
}

test("community server persists, validates, lists, plays, likes, and deletes maps", async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "echo-salvage-server-"));
  const child = spawn(process.execPath, ["server/server.js"], {
    cwd: path.resolve("."),
    env: { ...process.env, PORT: `${PORT}`, ECHO_DATA_DIR: dataDir },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += chunk; });

  try {
    await waitForServer();

    const signup = await request("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ nickname: "community-tester", email: "", password: "testing123" })
    });
    assert.equal(signup.response.status, 201, JSON.stringify(signup.body));
    const token = signup.body.user.serverToken;
    assert.ok(token);

    const auth = { Authorization: `Bearer ${token}` };
    const level = makeLevel(18);
    const publish = await request("/community-levels", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ title: "Shield Relay Test", description: "A validated test room.", level })
    });
    assert.equal(publish.response.status, 201, JSON.stringify(publish.body));
    assert.equal(publish.body.level.stats.hostiles > 0, true);
    const levelId = publish.body.level.id;

    const duplicate = await request("/community-levels", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ title: "Shield Relay Test Copy", description: "", level })
    });
    assert.equal(duplicate.response.status, 409);

    const listing = await request("/community-levels?sort=new&query=Shield&page=1&limit=10", { headers: auth });
    assert.equal(listing.response.status, 200);
    assert.equal(listing.body.levels.length, 1);
    assert.equal(listing.body.levels[0].level, undefined);

    const detail = await request(`/community-levels/${levelId}`, { headers: auth });
    assert.equal(detail.response.status, 200);
    assert.equal(detail.body.level.level.name, "Shield Relay Test");
    assert.equal(detail.body.level.plays, 1);

    const like = await request(`/community-levels/${levelId}/like`, { method: "POST", headers: auth });
    assert.deepEqual(like.body, { liked: true, likes: 1 });

    const deletion = await request(`/community-levels/${levelId}`, { method: "DELETE", headers: auth });
    assert.equal(deletion.response.status, 200);
    const missing = await request(`/community-levels/${levelId}`, { headers: auth });
    assert.equal(missing.response.status, 404);
  } finally {
    child.kill();
    await new Promise((resolve) => child.once("exit", resolve));
    await rm(dataDir, { recursive: true, force: true });
    assert.equal(stderr, "");
  }
});
