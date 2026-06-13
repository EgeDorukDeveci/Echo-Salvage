import test from "node:test";
import assert from "node:assert/strict";

import { ECHO_REPLAY_FRAMES, captureEchoReplay, isCargoBlocked, moveCargo, phaseMove, resolveAfterPhase, isExtractionReady } from "../src/game/simulation.js";
import { playerRect, rectsTouch } from "../src/game/geometry.js";
import { makeLevel } from "../src/game/levels.js";
import { evaluateContract, getContractProgress, getRoomContract } from "../src/game/contracts.js";

const emptyLevel = () => ({
  walls: [],
  doors: [],
  crates: [],
  turrets: [],
  drones: [],
  missileSentries: [],
  gravityNodes: [],
  echoJammers: [],
  laserSweepers: [],
  blinkHunters: [],
  shieldDrones: [],
  repairBots: [],
  plates: [],
  switches: [],
  scrap: [],
  objective: { type: "secure" },
  exit: { x: 1100, y: 300, w: 80, h: 120 },
  boss: null,
  core: null
});

test("Echo captures the latest eight-second window as an independent snapshot", () => {
  const recording = Array.from({ length: ECHO_REPLAY_FRAMES + 40 }, (_, index) => ({ x: index, y: index * 2, shoot: index % 7 === 0 }));
  const first = captureEchoReplay(recording, [], 0);
  assert.equal(first.frames.length, ECHO_REPLAY_FRAMES);
  assert.equal(first.frames[0].x, 40);
  assert.equal(first.frames.at(-1).x, ECHO_REPLAY_FRAMES + 39);

  recording.push(...Array.from({ length: 40 }, (_, index) => ({ x: 1000 + index, y: 0, shoot: false })));
  const second = captureEchoReplay(recording, [first], 1);
  assert.equal(second.slot, 1);
  assert.notEqual(second.frames[0].x, first.frames[0].x);
  assert.equal(first.frames[0].x, 40, "later recording changes must not mutate an existing Echo");
});

test("Echo capture refuses an incomplete history window", () => {
  assert.equal(captureEchoReplay(Array.from({ length: ECHO_REPLAY_FRAMES - 1 }, () => ({ x: 0, y: 0 }))), null);
});

test("Cargo movement stops at walls and remains usable", () => {
  const level = emptyLevel();
  const crate = { x: 300, y: 300, w: 42, h: 42 };
  level.crates.push(crate);
  level.walls.push({ x: 355, y: 250, w: 40, h: 140 });
  moveCargo(crate, 100, 0, level);
  assert.equal(rectsTouch(crate, level.walls[0]), false);
  assert.equal(isCargoBlocked(crate, level), false);
  assert.ok(crate.x > 300 && crate.x < 355);
});

test("Phase movement crosses a wall, then resolves outside solid geometry", () => {
  const level = emptyLevel();
  level.walls.push({ x: 300, y: 260, w: 100, h: 200 });
  const player = { x: 250, y: 360, phaseVector: { x: 1, y: 0 } };
  phaseMove(player, 100, 0);
  assert.equal(rectsTouch(playerRect(player), level.walls[0]), true, "phase movement must be allowed through walls");
  resolveAfterPhase(player, level);
  assert.equal(rectsTouch(playerRect(player), level.walls[0]), false, "player must not remain embedded after phase ends");
});

test("Extraction requires open doors, completed objectives, and defeated hostiles", () => {
  const level = emptyLevel();
  const player = { x: 1140, y: 360 };
  level.doors.push({ x: 900, y: 300, w: 40, h: 120, open: false });
  assert.equal(isExtractionReady(level, player), false);

  level.doors[0].open = true;
  level.plates.push({ id: "A", x: 200, y: 200 });
  level.objective = { type: "terminals" };
  level.switches.push({ id: "B", x: 300, y: 200, on: false });
  assert.equal(isExtractionReady(level, player), false);

  level.switches[0].on = true;
  level.drones.push({ hp: 1 });
  assert.equal(isExtractionReady(level, player), false);

  level.drones[0].hp = 0;
  assert.equal(isExtractionReady(level, player), true);
});

test("Live cores block extraction unless the room explicitly ignores them", () => {
  const level = emptyLevel();
  const player = { x: 1140, y: 360 };
  level.core = { alive: true };
  assert.equal(isExtractionReady(level, player), false);
  assert.equal(isExtractionReady(level, player, { ignoreLiveCore: true }), true);
});

test("Section bosses remain distinct and increase in durability", () => {
  const bosses = [13, 27, 41, 58].map((index) => makeLevel(index).boss);
  assert.deepEqual(bosses.map((boss) => boss.name), ["Calibration Warden", "Breach Furnace", "Verdant Maw", "Null Crown"]);
  assert.equal(new Set(bosses.map((boss) => boss.kind)).size, bosses.length);
  assert.deepEqual(bosses.map((boss) => boss.hp), [...bosses.map((boss) => boss.hp)].sort((a, b) => a - b));
});

test("Every campaign room receives one deterministic optional salvage contract", () => {
  const contracts = Array.from({ length: 59 }, (_, index) => getRoomContract(makeLevel(index), index));
  assert.equal(contracts.every(Boolean), true);
  assert.deepEqual(contracts, Array.from({ length: 59 }, (_, index) => getRoomContract(makeLevel(index), index)));
  assert.equal(contracts.every((contract) => contract.reward > 0), true);
});

test("Salvage contracts evaluate run telemetry without changing room completion", () => {
  const level = emptyLevel();
  level.scrap = [{}, {}, {}];
  const salvage = { id: "salvage", reward: 12 };
  const discipline = { id: "echoDiscipline", reward: 14 };
  const energy = { id: "energy", reward: 13 };
  const swift = { id: "swift", reward: 18, targetSeconds: 90 };
  const run = { scrap: 3, echoesDeployed: 2, hull: 70, energyPercent: 30, time: 89 };

  assert.equal(evaluateContract(salvage, run, level), true);
  assert.equal(evaluateContract(salvage, { ...run, scrap: 2 }, level), false);
  assert.equal(evaluateContract(discipline, run, level), true);
  assert.equal(evaluateContract(discipline, { ...run, echoesDeployed: 3 }, level), false);
  assert.equal(evaluateContract(energy, run, level), true);
  assert.equal(evaluateContract(swift, run, level), true);
  assert.equal(evaluateContract(swift, { ...run, time: 91 }, level), false);
  assert.equal(evaluateContract(swift, run, level, false), false);
  assert.equal(getContractProgress(swift, run, level), "89s / 90s");
});
