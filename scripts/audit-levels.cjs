const fs = require("fs");
const path = require("path");
const vm = require("vm");

const appPath = path.join(process.cwd(), "src", "App.jsx");
const source = fs.readFileSync(appPath, "utf8");

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
const PLAYER_MARGIN = 80;
const CARGO_MARGIN = 58;
`;

const snippet = [
  extractBetween("const rooms = [", "const CAMPAIGN_SECTIONS"),
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
vm.runInContext(`${boot}\n${snippet}\nthis.auditApi = { rooms, makeLevel, hasLineOfSight, getSolidBlocks, rectsTouch, playerRect, dist, SPECIAL_HOSTILE_KEYS };`, context);

const { rooms, makeLevel, getSolidBlocks, rectsTouch, playerRect, dist, SPECIAL_HOSTILE_KEYS } = context.auditApi;

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
  const permanentSolids = [...(level.walls || []), ...(level.crates || [])];
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
  const entityBarriers = [...(level.walls || []), ...(level.doors || [])];
  wallEmbeddedGroups.forEach(([label, entities]) => {
    entities.forEach((entity, entityIndex) => {
      if (entityBarriers.some((barrier) => rectsTouch(pointEntityRect(label, entity), barrier))) {
        issues.push(`${label} ${entity.id || entityIndex + 1} is embedded in a wall or door`);
      }
    });
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
