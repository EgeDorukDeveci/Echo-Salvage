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
vm.runInContext(`${boot}\n${snippet}\nthis.reportApi = { rooms, makeLevel };`, context);

const { rooms, makeLevel } = context.reportApi;

const weights = {
  turrets: 1,
  drones: 1.25,
  missileSentries: 2,
  gravityNodes: 1.5,
  echoJammers: 1.5,
  laserSweepers: 1.5,
  blinkHunters: 1.8,
  shieldDrones: 1.3,
  repairBots: 1.4,
  core: 2.5,
  plates: 0.3,
  switches: 0.25,
  lasers: 0.35
};

function levelScore(level) {
  return (
    (level.turrets?.length || 0) * weights.turrets +
    (level.drones?.length || 0) * weights.drones +
    (level.missileSentries?.length || 0) * weights.missileSentries +
    (level.gravityNodes?.length || 0) * weights.gravityNodes +
    (level.echoJammers?.length || 0) * weights.echoJammers +
    (level.laserSweepers?.length || 0) * weights.laserSweepers +
    (level.blinkHunters?.length || 0) * weights.blinkHunters +
    (level.shieldDrones?.length || 0) * weights.shieldDrones +
    (level.repairBots?.length || 0) * weights.repairBots +
    (level.core ? weights.core : 0) +
    (level.plates?.length || 0) * weights.plates +
    (level.switches?.length || 0) * weights.switches +
    (level.lasers?.length || 0) * weights.lasers
  );
}

const rows = rooms.map((name, index) => {
  const level = makeLevel(index);
  return {
    room: index + 1,
    score: levelScore(level),
    name
  };
});

rows.forEach((row) => {
  console.log(`${String(row.room).padStart(2, "0")}  ${row.score.toFixed(2).padStart(5, " ")}  ${row.name}`);
});
