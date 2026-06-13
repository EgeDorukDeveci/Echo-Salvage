import { W, H, ECHO_MS, ECHO_FRAME_MS, MAX_ECHOES, PLAYER_MARGIN, CARGO_MARGIN, ECHO_COLORS, ECHO_FILLS } from "./config.js";
import { rectsTouch, clamp, playerRect, areLevelHostilesDefeated, nudgeOutOfBlocks } from "./geometry.js";
import { isRoomObjectiveComplete } from "./rules.js";

const ECHO_REPLAY_FRAMES = ECHO_MS / ECHO_FRAME_MS;

function captureEchoReplay(recording, echoes = [], nextEchoId = 0, fused = false) {
  if (recording.length < ECHO_REPLAY_FRAMES) return null;
  const usedSlots = new Set(echoes.map((echo) => echo.slot));
  const slot = Array.from({ length: MAX_ECHOES }, (_, index) => index).find((index) => !usedSlots.has(index)) ?? 0;
  const frames = recording.slice(-ECHO_REPLAY_FRAMES).map((frame) => ({ ...frame }));
  return {
    id: nextEchoId,
    slot,
    frames,
    age: 0,
    x: frames[0].x,
    y: frames[0].y,
    angle: 0,
    fired: 0,
    echoColor: fused ? "#f4ffff" : ECHO_COLORS[slot] || ECHO_COLORS[0],
    echoFill: fused ? "rgba(126,249,255,.38)" : ECHO_FILLS[slot] || ECHO_FILLS[0],
    ...(fused ? { fused: true } : {})
  };
}

function isCargoBlocked(crate, level, ignoreCrate = null) {
  const blockers = [
    ...level.walls,
    ...level.doors.filter((door) => !door.open),
    ...level.crates.filter((candidate) => candidate !== crate && candidate !== ignoreCrate)
  ];
  return crate.x < CARGO_MARGIN ||
    crate.y < CARGO_MARGIN ||
    crate.x + crate.w > W - CARGO_MARGIN ||
    crate.y + crate.h > H - CARGO_MARGIN ||
    blockers.some((block) => rectsTouch(crate, block));
}

function moveCargo(crate, dx, dy, level) {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 7));
  const stepX = dx / steps;
  const stepY = dy / steps;
  for (let index = 0; index < steps; index += 1) {
    crate.x += stepX;
    if (isCargoBlocked(crate, level)) crate.x -= stepX;
    crate.y += stepY;
    if (isCargoBlocked(crate, level)) crate.y -= stepY;
  }
}

function phaseMove(entity, dx, dy) {
  entity.x = clamp(entity.x + dx, PLAYER_MARGIN, W - PLAYER_MARGIN);
  entity.y = clamp(entity.y + dy, PLAYER_MARGIN, H - PLAYER_MARGIN);
}

function resolveAfterPhase(entity, level) {
  nudgeOutOfBlocks(entity, level.crates, entity.phaseVector, 120);
  nudgeOutOfBlocks(entity, [...level.walls, ...level.doors.filter((door) => !door.open)], entity.phaseVector, 220);
}

function isExtractionReady(level, player, { ignoreLiveCore = false } = {}) {
  const roomSecured =
    (ignoreLiveCore || !level.core || !level.core.alive) &&
    (!level.boss || level.boss.hp <= 0) &&
    areLevelHostilesDefeated(level);
  return rectsTouch(playerRect(player), level.exit) &&
    level.doors.every((door) => door.open) &&
    roomSecured &&
    isRoomObjectiveComplete(level);
}

export {
  ECHO_REPLAY_FRAMES,
  captureEchoReplay,
  isCargoBlocked,
  moveCargo,
  phaseMove,
  resolveAfterPhase,
  isExtractionReady
};
