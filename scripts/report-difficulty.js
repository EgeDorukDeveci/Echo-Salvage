import { rooms } from "../src/game/config.js";
import { makeLevel } from "../src/game/levels.js";

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
