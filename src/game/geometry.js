import { W, H, MAX_ECHOES, CELL, PLAYER_MARGIN, CARGO_MARGIN } from "./config.js";

const rectsTouch = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const playerRect = (p) => ({ x: p.x - 15, y: p.y - 15, w: 30, h: 30 });
const getSolidBlocks = (level) => [...level.walls, ...(level.movingWalls || []), ...level.doors.filter((d) => !d.open), ...level.crates];
const SPECIAL_HOSTILE_KEYS = ["gravityNodes", "echoJammers", "laserSweepers", "blinkHunters", "shieldDrones", "repairBots"];
const HOSTILE_KEYS = ["turrets", "drones", "missileSentries", ...SPECIAL_HOSTILE_KEYS];
const LEVEL_ARRAY_KEYS = ["walls", "movingWalls", "echoCorruptionZones", "crates", "coinCrates", "plates", "switches", "doors", "turrets", "drones", "missileSentries", ...SPECIAL_HOSTILE_KEYS, "lasers", "scrap"];

function ensureLevelArrays(level) {
  LEVEL_ARRAY_KEYS.forEach((key) => {
    level[key] = level[key] || [];
  });
  return level;
}

function getLevelHostiles(level) {
  return HOSTILE_KEYS.flatMap((key) => level[key] || []);
}

function countLevelHostiles(level) {
  return HOSTILE_KEYS.reduce((total, key) => total + (level[key] || []).length, 0);
}

function areLevelHostilesDefeated(level) {
  return HOSTILE_KEYS.every((key) => (level[key] || []).every((hostile) => hostile.hp <= 0));
}

function overlapsAny(rect, blocks) {
  return blocks.some((block) => rectsTouch(rect, block));
}

function nudgeOutOfBlocks(entity, blocks, direction = { x: 0, y: 0 }, maxDistance = 180) {
  const base = playerRect(entity);
  if (!overlapsAny(base, blocks)) return;
  const dirLength = Math.hypot(direction.x || 0, direction.y || 0) || 1;
  const vectors = [
    { x: (direction.x || 0) / dirLength, y: (direction.y || 0) / dirLength },
    { x: -(direction.x || 0) / dirLength, y: -(direction.y || 0) / dirLength },
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 }
  ];
  for (const vector of vectors) {
    if (!vector.x && !vector.y) continue;
    for (let distance = 8; distance <= maxDistance; distance += 8) {
      const probe = {
        x: clamp(entity.x + vector.x * distance, PLAYER_MARGIN, W - PLAYER_MARGIN),
        y: clamp(entity.y + vector.y * distance, PLAYER_MARGIN, H - PLAYER_MARGIN)
      };
      if (!overlapsAny(playerRect(probe), blocks)) {
        entity.x = probe.x;
        entity.y = probe.y;
        return;
      }
    }
  }
}

function ensurePlayableSpawn(level) {
  ensureLevelArrays(level);
  level.exit = level.exit || { x: 1160, y: 360, w: 58, h: 114 };
  const preferred = {
    x: Number.isFinite(level.player?.x) ? level.player.x : 160,
    y: Number.isFinite(level.player?.y) ? level.player.y : 360
  };
  const solidBlocks = () => getSolidBlocks(level);
  const hostiles = () => getLevelHostiles(level).filter((hostile) => (hostile.hp ?? 1) > 0);
  const isOpen = (point) => {
    const rect = playerRect(point);
    return point.x >= 58 && point.x <= W - 58 && point.y >= 58 && point.y <= H - 58 && !solidBlocks().some((block) => rectsTouch(rect, block));
  };
  const clearanceScore = (point) => {
    if (!isOpen(point)) return -Infinity;
    const wallClearance = solidBlocks().reduce((best, block) => {
      const cx = clamp(point.x, block.x, block.x + block.w);
      const cy = clamp(point.y, block.y, block.y + block.h);
      return Math.min(best, Math.hypot(point.x - cx, point.y - cy));
    }, 240);
    const hostileClearance = hostiles().reduce((best, hostile) => Math.min(best, dist(point, hostile)), 360);
    const exitDistance = level.exit ? dist(point, { x: level.exit.x + level.exit.w / 2, y: level.exit.y + level.exit.h / 2 }) : 500;
    return wallClearance * 2 + hostileClearance * 0.85 + Math.min(exitDistance, 520) * 0.18 - Math.abs(point.x - preferred.x) * 0.18 - Math.abs(point.y - preferred.y) * 0.12;
  };
  if (isOpen(preferred) && clearanceScore(preferred) >= 190) {
    level.player = preferred;
    return level;
  }
  const candidates = [
    preferred,
    { x: 140, y: 360 },
    { x: 180, y: 360 },
    { x: 160, y: 360 },
    { x: 100, y: 360 },
    { x: 115, y: 180 },
    { x: 115, y: 540 },
    { x: 180, y: 220 },
    { x: 180, y: 500 },
    { x: 220, y: 180 },
    { x: 220, y: 540 },
    { x: 260, y: 360 }
  ];
  for (let radius = 40; radius <= 420; radius += 40) {
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
      candidates.push({
        x: clamp(preferred.x + Math.cos(angle) * radius, 70, W - 70),
        y: clamp(preferred.y + Math.sin(angle) * radius, 70, H - 70)
      });
    }
  }
  level.player = candidates.filter(isOpen).sort((a, b) => clearanceScore(b) - clearanceScore(a))[0] || { x: 160, y: 360 };
  return level;
}

function getPointEntityRadius(key, entity) {
  if (key === "core") return 34;
  if (key === "boss") return 54;
  if (key === "plates") return entity.r || 34;
  if (key === "switches") return entity.r || 25;
  if (key === "scrap") return 12;
  return entity.r || 25;
}

function movePointEntitiesOutOfWalls(level) {
  const groups = [
    "plates",
    "switches",
    "turrets",
    "drones",
    "missileSentries",
    ...SPECIAL_HOSTILE_KEYS,
    "scrap"
  ];
  if (level.core) groups.push("core");
  if (level.boss) groups.push("boss");
  const barriers = [...(level.walls || []), ...(level.movingWalls || []), ...(level.doors || [])];
  const isOpen = (key, entity, x, y) => {
    const radius = getPointEntityRadius(key, entity);
    const rect = { x: x - radius, y: y - radius, w: radius * 2, h: radius * 2 };
    return x >= radius + 50 &&
      x <= W - radius - 50 &&
      y >= radius + 50 &&
      y <= H - radius - 50 &&
      !barriers.some((barrier) => rectsTouch(rect, barrier));
  };
  groups.forEach((key) => {
    const entities = key === "core" ? [level.core] : key === "boss" ? [level.boss] : level[key] || [];
    entities.forEach((entity) => {
      if (isOpen(key, entity, entity.x, entity.y)) return;
      const candidates = [];
      for (let radius = 20; radius <= 240; radius += 20) {
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
          candidates.push({
            x: Math.round(entity.x + Math.cos(angle) * radius),
            y: Math.round(entity.y + Math.sin(angle) * radius)
          });
        }
      }
      const replacement = candidates.find((candidate) => isOpen(key, entity, candidate.x, candidate.y));
      if (replacement) {
        entity.x = replacement.x;
        entity.y = replacement.y;
      }
    });
  });
}

function moveCargoOutOfWalls(level) {
  const staticBarriers = [...(level.walls || []), ...(level.movingWalls || []), ...(level.doors || [])];
  const directions = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 }
  ];
  const isUsable = (crate, x, y, crateIndex) => {
    const rect = { ...crate, x, y };
    const otherCrates = (level.crates || []).filter((_, index) => index !== crateIndex);
    const blockers = [...staticBarriers, ...otherCrates];
    const cargoFits = (candidate) => candidate.x >= CARGO_MARGIN &&
      candidate.y >= CARGO_MARGIN &&
      candidate.x + candidate.w <= W - CARGO_MARGIN &&
      candidate.y + candidate.h <= H - CARGO_MARGIN;
    if (!cargoFits(rect)) return false;
    if (blockers.some((block) => rectsTouch(rect, block))) return false;
    return directions.some((direction) => {
      const player = {
        x: x + rect.w / 2 - direction.x * (rect.w / 2 + 24),
        y: y + rect.h / 2 - direction.y * (rect.h / 2 + 24)
      };
      const pushed = { ...rect, x: x + direction.x * 14, y: y + direction.y * 14 };
      const playerFits = player.x >= PLAYER_MARGIN &&
        player.x <= W - PLAYER_MARGIN &&
        player.y >= PLAYER_MARGIN &&
        player.y <= H - PLAYER_MARGIN;
      return playerFits &&
        cargoFits(pushed) &&
        !blockers.some((block) => rectsTouch(playerRect(player), block) || rectsTouch(pushed, block));
    });
  };

  (level.crates || []).forEach((crate, crateIndex) => {
    crate.w = crate.w || CELL - 2;
    crate.h = crate.h || CELL - 2;
    if (isUsable(crate, crate.x, crate.y, crateIndex)) return;
    const candidates = [];
    for (let radius = 20; radius <= 360; radius += 20) {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
        candidates.push({
          x: Math.round((crate.x + Math.cos(angle) * radius) / 10) * 10,
          y: Math.round((crate.y + Math.sin(angle) * radius) / 10) * 10
        });
      }
    }
    for (let y = CARGO_MARGIN; y <= H - CARGO_MARGIN - crate.h; y += CELL) {
      for (let x = CARGO_MARGIN; x <= W - CARGO_MARGIN - crate.w; x += CELL) {
        candidates.push({ x, y });
      }
    }
    const replacement = candidates.find((candidate) => isUsable(crate, candidate.x, candidate.y, crateIndex));
    if (replacement) {
      crate.x = replacement.x;
      crate.y = replacement.y;
    }
  });
}

function normalizeInteractionLayout(level, { fillDoorRequirements = false } = {}) {
  ensureLevelArrays(level);
  level.doors = level.doors || [];
  level.lasers = level.lasers || [];
  level.coinCrates = level.coinCrates || [];
  level.plates = level.plates.map((plate, index) => ({
    ...plate,
    id: plate.id || `P${index + 1}`
  }));
  level.switches = level.switches.map((sw, index) => ({
    ...sw,
    id: sw.id || `S${index + 1}`
  }));
  const maxHeldPlates = 1 + MAX_ECHOES + level.crates.length;
  if (level.plates.length > maxHeldPlates) {
    const kept = new Set(level.plates.slice(0, maxHeldPlates).map((p) => p.id));
    level.plates = level.plates.filter((p) => kept.has(p.id));
  }
  const plateIds = level.plates.map((p) => p.id);
  const switchIds = level.switches.map((s) => s.id);
  const availableIds = new Set([...plateIds, ...switchIds]);
  level.lasers = level.lasers.filter((laser) => availableIds.has(laser.disabledBy));
  const normalizedRequirements = [...availableIds];
  level.doors.forEach((door) => {
    const requires = Array.isArray(door.requires) ? door.requires.filter((id) => availableIds.has(id)) : [];
    door.requires = fillDoorRequirements ? normalizedRequirements : [...new Set(requires)];
  });
  level.crates.forEach((crate) => {
    crate.role = "plate-weight";
  });
  moveCargoOutOfWalls(level);
  movePointEntitiesOutOfWalls(level);
  return level;
}

function finalizeStockLevel(level) {
  normalizeInteractionLayout(level, { fillDoorRequirements: true });
  return ensurePlayableSpawn(level);
}

function finalizeCustomLevel(level) {
  const hasExplicitRequirements = (level.doors || []).some((door) => Array.isArray(door.requires) && door.requires.length > 0);
  normalizeInteractionLayout(level, { fillDoorRequirements: !hasExplicitRequirements });
  return ensurePlayableSpawn(level);
}
const segmentIntersectsRect = (a, b, r) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  let tMin = 0.04;
  let tMax = 0.96;
  const checkAxis = (start, delta, min, max) => {
    if (Math.abs(delta) < 0.0001) return start >= min && start <= max;
    const t1 = (min - start) / delta;
    const t2 = (max - start) / delta;
    const near = Math.min(t1, t2);
    const far = Math.max(t1, t2);
    tMin = Math.max(tMin, near);
    tMax = Math.min(tMax, far);
    return tMin <= tMax;
  };
  return checkAxis(a.x, dx, r.x, r.x + r.w) && checkAxis(a.y, dy, r.y, r.y + r.h) && tMax >= 0.04 && tMin <= 0.96;
};
const hasLineOfSight = (from, to, blockers) => !blockers.some((b) => segmentIntersectsRect(from, to, b));
const pointToSegmentDistance = (p, a, b) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 0.0001) return dist(p, a);
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq, 0, 1);
  const px = a.x + dx * t;
  const py = a.y + dy * t;
  return Math.hypot(p.x - px, p.y - py);
};

export {
  rectsTouch,
  dist,
  clamp,
  playerRect,
  getSolidBlocks,
  SPECIAL_HOSTILE_KEYS,
  ensureLevelArrays,
  getLevelHostiles,
  countLevelHostiles,
  areLevelHostilesDefeated,
  nudgeOutOfBlocks,
  finalizeStockLevel,
  finalizeCustomLevel,
  hasLineOfSight,
  pointToSegmentDistance
};
