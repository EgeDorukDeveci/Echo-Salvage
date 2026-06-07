const fs = require("fs");
const path = require("path");
const vm = require("vm");

const appPath = path.join(process.cwd(), "src", "App.jsx");
const source = fs.readFileSync(appPath, "utf8");
const AUDIT_W = 1280;
const AUDIT_H = 720;
const AUDIT_PLAYER_MARGIN = 80;
const AUDIT_CARGO_MARGIN = 64;

function extractBetween(startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start);
  if (start === -1 || end === -1) {
    throw new Error(`Failed to extract source between "${startNeedle}" and "${endNeedle}"`);
  }
  return source.slice(start, end);
}

const boot = `
const W = 1280;
const H = 720;
const ECHO_MS = 8000;
const ECHO_FRAME_MS = 100;
const MAX_ECHOES = 3;
const CELL = 40;
const PLAYER_MARGIN = 80;
const CARGO_MARGIN = 64;
`;

const snippet = [
  extractBetween("const rooms = [", "const AUTH_USERS_KEY"),
  extractBetween("function makeLevel(index = 0) {", "const segmentIntersectsRect"),
  extractBetween("const segmentIntersectsRect", "function glowRect")
].join("\n\n");

const context = {
  structuredClone,
  console,
  Math,
  Set
};
vm.createContext(context);
vm.runInContext(`${boot}\n${snippet}\nthis.auditApi = { rooms, CAMPAIGN_SECTIONS, CAMPAIGN_ROUTE_POINTS, makeLevel, hasLineOfSight, getSolidBlocks, rectsTouch, playerRect, dist, SPECIAL_HOSTILE_KEYS };`, context);

const { rooms, CAMPAIGN_SECTIONS, CAMPAIGN_ROUTE_POINTS, makeLevel, getSolidBlocks, rectsTouch, playerRect, dist, SPECIAL_HOSTILE_KEYS } = context.auditApi;

function centerOf(rect) {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

function supportDistance(level, support) {
  const targets = [
    ...(level.turrets || []),
    ...(level.drones || []),
    ...(level.missileSentries || []),
    ...SPECIAL_HOSTILE_KEYS.filter((key) => key !== "shieldDrones" && key !== "repairBots").flatMap((key) => level[key] || [])
  ].filter((hostile) => hostile.hp > 0);
  return targets.reduce((best, hostile) => Math.min(best, dist(support, hostile)), Infinity);
}

function pointEntityRect(label, entity) {
  const radius = label === "core" ? 34 :
    label === "plate" ? entity.r || 34 :
    label === "switch" ? entity.r || 25 :
    label === "scrap" ? 12 :
    entity.r || 25;
  return { x: entity.x - radius, y: entity.y - radius, w: radius * 2, h: radius * 2 };
}

function cargoHasPushDirection(level, crate, crateIndex) {
  const blockers = [
    ...(level.walls || []),
    ...(level.movingWalls || []),
    ...(level.doors || []),
    ...(level.crates || []).filter((_, index) => index !== crateIndex)
  ];
  const cargoFits = (candidate) => candidate.x >= AUDIT_CARGO_MARGIN &&
    candidate.y >= AUDIT_CARGO_MARGIN &&
    candidate.x + candidate.w <= AUDIT_W - AUDIT_CARGO_MARGIN &&
    candidate.y + candidate.h <= AUDIT_H - AUDIT_CARGO_MARGIN;
  return [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 }
  ].some((direction) => {
    const player = {
      x: crate.x + crate.w / 2 - direction.x * (crate.w / 2 + 24),
      y: crate.y + crate.h / 2 - direction.y * (crate.h / 2 + 24)
    };
    const pushed = { ...crate, x: crate.x + direction.x * 14, y: crate.y + direction.y * 14 };
    const playerFits = player.x >= AUDIT_PLAYER_MARGIN &&
      player.x <= AUDIT_W - AUDIT_PLAYER_MARGIN &&
      player.y >= AUDIT_PLAYER_MARGIN &&
      player.y <= AUDIT_H - AUDIT_PLAYER_MARGIN;
    return playerFits &&
      cargoFits(pushed) &&
      !blockers.some((block) => rectsTouch(playerRect(player), block) || rectsTouch(pushed, block));
  });
}

function auditLevel(level, index) {
  const issues = [];
  const plateIds = new Set((level.plates || []).map((plate) => plate.id));
  const switchIds = new Set((level.switches || []).map((sw) => sw.id));
  const allIds = new Set([...plateIds, ...switchIds]);
  if (allIds.size !== plateIds.size + switchIds.size) {
    issues.push("duplicate plate/switch ids");
  }

  const requiredIds = new Set((level.doors || []).flatMap((door) => door.requires || []));
  const disabledIds = new Set((level.lasers || []).map((laser) => laser.disabledBy));
  for (const id of plateIds) {
    if (!requiredIds.has(id) && !disabledIds.has(id)) issues.push(`plate ${id} is unused`);
  }
  for (const id of switchIds) {
    if (!requiredIds.has(id) && !disabledIds.has(id)) issues.push(`switch ${id} is unused`);
  }

  const plateCapacity = 1 + 3 + (level.crates || []).length;
  if ((level.plates || []).length > plateCapacity) {
    issues.push(`needs ${(level.plates || []).length} plate holders but only ${plateCapacity} available`);
  }

  const spawnRect = playerRect(level.player);
  const spawnSolids = getSolidBlocks(level);
  if (spawnSolids.some((block) => rectsTouch(spawnRect, block))) {
    issues.push("player spawn overlaps a solid block");
  }

  const exitRect = level.exit;
  const permanentSolids = [...(level.walls || []), ...(level.movingWalls || []), ...(level.crates || [])];
  if (permanentSolids.some((block) => rectsTouch(exitRect, block))) {
    issues.push("exit overlaps permanent geometry");
  }

  const wallEmbeddedGroups = [
    ["plate", level.plates || []],
    ["switch", level.switches || []],
    ["turret", level.turrets || []],
    ["drone", level.drones || []],
    ["missile sentry", level.missileSentries || []],
    ...SPECIAL_HOSTILE_KEYS.map((key) => [key, level[key] || []]),
    ["scrap", level.scrap || []],
    ["core", level.core ? [level.core] : []]
  ];
  const entityBarriers = [...(level.walls || []), ...(level.movingWalls || []), ...(level.doors || [])];
  wallEmbeddedGroups.forEach(([label, entities]) => {
    entities.forEach((entity, entityIndex) => {
      if (entityBarriers.some((barrier) => rectsTouch(pointEntityRect(label, entity), barrier))) {
        issues.push(`${label} ${entity.id || entityIndex + 1} is embedded in a wall or door`);
      }
    });
  });

  (level.crates || []).forEach((crate, crateIndex) => {
    const blockers = [
      ...(level.walls || []),
      ...(level.movingWalls || []),
      ...(level.doors || []),
      ...(level.crates || []).filter((_, index) => index !== crateIndex)
    ];
    const outsideBounds = crate.x < AUDIT_CARGO_MARGIN ||
      crate.y < AUDIT_CARGO_MARGIN ||
      crate.x + crate.w > AUDIT_W - AUDIT_CARGO_MARGIN ||
      crate.y + crate.h > AUDIT_H - AUDIT_CARGO_MARGIN;
    if (outsideBounds) {
      issues.push(`cargo weight ${crateIndex + 1} is outside usable bounds`);
    } else if (blockers.some((block) => rectsTouch(crate, block))) {
      issues.push(`cargo weight ${crateIndex + 1} overlaps a wall, door, or cargo weight`);
    } else if (!cargoHasPushDirection(level, crate, crateIndex)) {
      issues.push(`cargo weight ${crateIndex + 1} has no usable push direction`);
    }
  });

  (level.movingWalls || []).forEach((wall, wallIndex) => {
    if (!["x", "y"].includes(wall.axis) || !Number.isFinite(wall.range) || wall.range <= 0 || !Number.isFinite(wall.speed) || wall.speed <= 0) {
      issues.push(`shift wall ${wallIndex + 1} has invalid rail settings`);
      return;
    }
    const endpoints = [-wall.range, wall.range].map((offset) => ({
      ...wall,
      x: wall.axis === "x" ? wall.x + offset : wall.x,
      y: wall.axis === "y" ? wall.y + offset : wall.y
    }));
    const staticGeometry = [...(level.walls || []), ...(level.doors || [])];
    if (endpoints.some((endpoint) =>
      endpoint.x < AUDIT_CARGO_MARGIN ||
      endpoint.y < AUDIT_CARGO_MARGIN ||
      endpoint.x + endpoint.w > AUDIT_W - AUDIT_CARGO_MARGIN ||
      endpoint.y + endpoint.h > AUDIT_H - AUDIT_CARGO_MARGIN ||
      staticGeometry.some((block) => rectsTouch(endpoint, block))
    )) {
      issues.push(`shift wall ${wallIndex + 1} rail intersects permanent geometry or room bounds`);
    }
  });

  (level.echoCorruptionZones || []).forEach((zone, zoneIndex) => {
    if (!Number.isFinite(zone.r) || zone.r < 60 || zone.x - zone.r < 60 || zone.x + zone.r > AUDIT_W - 60 || zone.y - zone.r < 60 || zone.y + zone.r > AUDIT_H - 60) {
      issues.push(`echo corruption field ${zoneIndex + 1} is invalid or outside usable bounds`);
    }
  });

  const supportBots = [...(level.shieldDrones || []), ...(level.repairBots || [])];
  supportBots.forEach((support, supportIndex) => {
    const gap = supportDistance(level, support);
    if (!Number.isFinite(gap) || gap > 240) {
      issues.push(`support bot ${supportIndex + 1} is too isolated`);
    }
  });

  const liveThreats = [
    ...(level.turrets || []),
    ...(level.drones || []),
    ...(level.missileSentries || []),
    ...SPECIAL_HOSTILE_KEYS.flatMap((key) => level[key] || [])
  ].filter((hostile) => hostile.hp > 0);
  if (index >= 4 && liveThreats.length === 0 && !level.core) {
    issues.push("advanced room has no hostiles or core objective");
  }

  if ((level.crates || []).some((crate) => crate.role !== "plate-weight")) {
    issues.push("cargo crate missing plate-weight role");
  }

  const rewards = (level.coinCrates || []).length + (level.scrap || []).length;
  if (rewards < 2) {
    issues.push("room reward density is too low");
  }

  return issues;
}

const pacingRules = [
  { key: "missileSentries", minRoom: 15, label: "Missile Sentry" },
  { key: "gravityNodes", minRoom: 16, label: "Gravity Node" },
  { key: "echoJammers", minRoom: 17, label: "Echo Jammer" },
  { key: "laserSweepers", minRoom: 18, label: "Laser Sweeper" },
  { key: "shieldDrones", minRoom: 19, label: "Shield Drone" },
  { key: "blinkHunters", minRoom: 20, label: "Blink Hunter" },
  { key: "repairBots", minRoom: 25, label: "Repair Bot" }
];

function auditCampaignPacing(levels) {
  const issues = [];
  const longestSection = Math.max(...CAMPAIGN_SECTIONS.map((section) => section.range[1] - section.range[0] + 1));
  if (CAMPAIGN_ROUTE_POINTS.length < longestSection) {
    issues.push(`Campaign map has ${CAMPAIGN_ROUTE_POINTS.length} route points but needs ${longestSection}`);
  }
  levels.slice(0, 14).forEach((level, index) => {
    pacingRules.forEach((rule) => {
      if ((level[rule.key] || []).length > 0) {
        issues.push(`Training deck room ${index + 1} introduces ${rule.label} too early`);
      }
    });
    if (level.core) issues.push(`Training deck room ${index + 1} introduces a reactor core too early`);
  });

  pacingRules.forEach((rule) => {
    const firstIndex = levels.findIndex((level) => (level[rule.key] || []).length > 0);
    if (firstIndex !== -1 && firstIndex + 1 < rule.minRoom) {
      issues.push(`${rule.label} first appears in room ${firstIndex + 1}, expected room ${rule.minRoom} or later`);
    }
  });

  const firstCore = levels.findIndex((level) => level.core);
  if (firstCore !== -1 && firstCore + 1 < 21) {
    issues.push(`Reactor core first appears in room ${firstCore + 1}, expected room 21 or later`);
  }
  const firstCorruption = levels.findIndex((level) => (level.echoCorruptionZones || []).length > 0);
  if (firstCorruption !== -1 && firstCorruption + 1 < 43) {
    issues.push(`Echo Corruption first appears in room ${firstCorruption + 1}, expected room 43 or later`);
  }
  const firstMovingRoom = levels.findIndex((level) => (level.movingWalls || []).length > 0);
  if (firstMovingRoom !== -1 && firstMovingRoom + 1 < 46) {
    issues.push(`Shift Walls first appear in room ${firstMovingRoom + 1}, expected room 46 or later`);
  }

  return issues;
}

const allIssues = [];
const levels = rooms.map((_, index) => makeLevel(index));
levels.forEach((level, index) => {
  const roomName = rooms[index];
  const issues = auditLevel(level, index);
  if (issues.length) {
    allIssues.push({ index: index + 1, name: roomName, issues });
  }
});

const pacingIssues = auditCampaignPacing(levels);
if (pacingIssues.length) {
  allIssues.push({ index: 0, name: "Campaign pacing", issues: pacingIssues });
}

if (allIssues.length) {
  console.error("Level audit failed:");
  allIssues.forEach((entry) => {
    console.error(`${entry.index}. ${entry.name}`);
    entry.issues.forEach((issue) => console.error(`  - ${issue}`));
  });
  process.exit(1);
}

console.log(`Level audit passed for ${rooms.length} rooms.`);
