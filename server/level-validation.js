import { createHash } from "node:crypto";
import { W, H } from "../src/game/config.js";
import { countLevelHostiles, ensureLevelArrays, finalizeCustomLevel } from "../src/game/geometry.js";

const ARRAY_LIMITS = {
  walls: 160,
  movingWalls: 24,
  echoCorruptionZones: 18,
  crates: 30,
  coinCrates: 30,
  plates: 20,
  switches: 20,
  doors: 24,
  turrets: 40,
  drones: 36,
  missileSentries: 20,
  gravityNodes: 16,
  echoJammers: 16,
  laserSweepers: 16,
  blinkHunters: 16,
  shieldDrones: 16,
  repairBots: 16,
  lasers: 24,
  scrap: 40
};

const POINT_KEYS = new Set([
  "plates", "switches", "turrets", "drones", "missileSentries",
  "gravityNodes", "echoJammers", "laserSweepers", "blinkHunters",
  "shieldDrones", "repairBots", "scrap"
]);
const RECT_KEYS = new Set(["walls", "movingWalls", "crates", "coinCrates", "doors"]);
const VALID_BOSS_KINDS = new Set(["warden", "furnace", "overseer", "crown"]);
const VALID_MINI_KINDS = new Set(["mirror", "ram", "thorn", "harrier", "reclaimer", "lancer", "bastion", "spore", "archivist"]);
const MAX_LEVEL_BYTES = 180000;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const number = (value, fallback, min, max) => clamp(Number.isFinite(Number(value)) ? Number(value) : fallback, min, max);
const text = (value, fallback = "", max = 80) => `${value ?? fallback}`.trim().slice(0, max);

function pointEntity(entity = {}, key) {
  const normalized = {
    x: number(entity.x, W / 2, 40, W - 40),
    y: number(entity.y, H / 2, 40, H - 40)
  };
  if (key === "plates") return { ...normalized, r: number(entity.r, 26, 12, 60), id: text(entity.id, "P", 24) };
  if (key === "switches") return { ...normalized, r: number(entity.r, 22, 12, 60), id: text(entity.id, "S", 24), on: false };
  if (key === "scrap") return { ...normalized, taken: false };

  const hostile = {
    ...normalized,
    hp: number(entity.hp, key === "drones" ? 2 : 3, 1, 80),
    cooldown: number(entity.cooldown, 900, 0, 20000),
    angle: number(entity.angle, 0, -Math.PI * 8, Math.PI * 8),
    pulse: 0
  };
  if (key === "missileSentries") hostile.lockMs = 0;
  if (key === "laserSweepers") hostile.speed = number(entity.speed, 0.0012, 0.0002, 0.004);
  if (key === "blinkHunters") hostile.blink = number(entity.blink, 900, 0, 10000);
  if (key === "drones" && VALID_MINI_KINDS.has(entity.miniKind)) {
    Object.assign(hostile, {
      pursuer: true,
      miniKind: entity.miniKind,
      miniName: text(entity.miniName, "Elite Drone", 48),
      miniColor: text(entity.miniColor, "#ff4e41", 16),
      attackCooldown: number(entity.attackCooldown, hostile.cooldown, 200, 20000),
      chaseSpeed: number(entity.chaseSpeed, 100, 20, 260),
      desiredRange: number(entity.desiredRange, 220, 30, 500),
      contactDamage: number(entity.contactDamage, 0.035, 0, 0.2),
      projectileDamage: number(entity.projectileDamage, 10, 1, 40),
      blinkDistance: number(entity.blinkDistance, 220, 60, 420)
    });
  }
  return hostile;
}

function rectEntity(entity = {}, key) {
  const normalized = {
    x: number(entity.x, 80, 0, W - 10),
    y: number(entity.y, 80, 0, H - 10),
    w: number(entity.w, 40, 12, 480),
    h: number(entity.h, 40, 12, 480)
  };
  normalized.x = clamp(normalized.x, 0, W - normalized.w);
  normalized.y = clamp(normalized.y, 0, H - normalized.h);
  if (key === "movingWalls") return {
    ...normalized,
    axis: entity.axis === "x" ? "x" : "y",
    range: number(entity.range, 80, 20, 360),
    speed: number(entity.speed, 0.0007, 0.0001, 0.004),
    phase: number(entity.phase, 0, -100, 100)
  };
  if (key === "coinCrates") return { ...normalized, value: number(entity.value, 12, 1, 100), taken: false };
  if (key === "doors") return {
    ...normalized,
    requires: Array.isArray(entity.requires) ? [...new Set(entity.requires.map((id) => text(id, "", 24)).filter(Boolean))].slice(0, 20) : [],
    open: false
  };
  return normalized;
}

function sanitizeLevel(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Level payload must be an object.");
  const rawSize = Buffer.byteLength(JSON.stringify(input));
  if (rawSize > MAX_LEVEL_BYTES) throw new Error("Level payload is too large.");

  const level = {
    name: text(input.name, "Community Map", 64),
    sectionId: text(input.sectionId, "training-deck", 32),
    player: {
      x: number(input.player?.x, 160, 50, W - 50),
      y: number(input.player?.y, 360, 50, H - 50)
    },
    exit: rectEntity(input.exit || { x: 1160, y: 303, w: 58, h: 114 }, "doors"),
    objective: { type: input.objective?.type === "boss" ? "boss" : input.objective?.type === "terminals" ? "terminals" : "secure" },
    boss: null,
    core: null
  };

  for (const [key, limit] of Object.entries(ARRAY_LIMITS)) {
    const list = Array.isArray(input[key]) ? input[key].slice(0, limit) : [];
    if (RECT_KEYS.has(key)) level[key] = list.map((entity) => rectEntity(entity, key));
    else if (POINT_KEYS.has(key)) level[key] = list.map((entity) => pointEntity(entity, key));
    else if (key === "echoCorruptionZones") level[key] = list.map((zone) => ({
      x: number(zone.x, W / 2, 40, W - 40),
      y: number(zone.y, H / 2, 40, H - 40),
      r: number(zone.r, 100, 30, 260)
    }));
    else if (key === "lasers") level[key] = list.map((laser, index) => ({
      x1: number(laser.x1, W / 2, 20, W - 20),
      y1: number(laser.y1, 80, 20, H - 20),
      x2: number(laser.x2, W / 2, 20, W - 20),
      y2: number(laser.y2, H - 80, 20, H - 20),
      id: text(laser.id, `L${index + 1}`, 24),
      disabledBy: text(laser.disabledBy, "", 24)
    }));
  }

  if (input.boss && VALID_BOSS_KINDS.has(input.boss.kind)) {
    level.boss = {
      x: number(input.boss.x, W - 220, 70, W - 70),
      y: number(input.boss.y, H / 2, 70, H - 70),
      name: text(input.boss.name, "Community Guardian", 48),
      kind: input.boss.kind,
      hp: number(input.boss.hp, 18, 4, 80),
      cooldown: number(input.boss.cooldown, 800, 200, 5000),
      meleeCooldown: number(input.boss.meleeCooldown, 900, 200, 5000),
      pulse: 0
    };
    level.objective = { type: "boss" };
  }

  if (input.core) {
    level.core = {
      x: number(input.core.x, W - 220, 70, W - 70),
      y: number(input.core.y, H / 2, 70, H - 70),
      hp: number(input.core.hp, 12, 2, 60),
      alive: true,
      pulse: 0
    };
  }

  ensureLevelArrays(level);
  const normalized = finalizeCustomLevel(level);
  const hostileCount = countLevelHostiles(normalized) + (normalized.boss ? 1 : 0);
  if (hostileCount > 80) throw new Error("Community maps may contain at most 80 hostiles.");
  if (!normalized.exit) throw new Error("The map needs an exit gate.");
  return normalized;
}

function levelStats(level) {
  return {
    hostiles: countLevelHostiles(level) + (level.boss ? 1 : 0),
    structures: (level.walls?.length || 0) + (level.movingWalls?.length || 0) + (level.doors?.length || 0),
    puzzles: (level.plates?.length || 0) + (level.switches?.length || 0) + (level.crates?.length || 0),
    hazards: (level.lasers?.length || 0) + (level.echoCorruptionZones?.length || 0) + (level.laserSweepers?.length || 0),
    hasBoss: Boolean(level.boss)
  };
}

function checksumLevel(level) {
  const structural = { ...level, name: "" };
  return createHash("sha256").update(JSON.stringify(structural)).digest("hex");
}

export { ARRAY_LIMITS, MAX_LEVEL_BYTES, sanitizeLevel, levelStats, checksumLevel };
