import { countLevelHostiles } from "./geometry.js";

const CONTRACTS = {
  salvage: {
    id: "salvage",
    label: "Clean Sweep",
    detail: "Recover every salvage shard before extraction.",
    reward: 12,
    progress: (run, level) => `${run.scrap}/${(level.scrap || []).length} salvage`,
    complete: (run, level) => (level.scrap || []).length > 0 && run.scrap >= (level.scrap || []).length
  },
  echoDiscipline: {
    id: "echoDiscipline",
    label: "Recorder Discipline",
    detail: "Extract after deploying no more than 2 Echoes.",
    reward: 14,
    progress: (run) => `${run.echoesDeployed}/2 Echoes deployed`,
    complete: (run) => run.echoesDeployed <= 2
  },
  hull: {
    id: "hull",
    label: "Hull Preservation",
    detail: "Extract with at least 70% hull remaining.",
    reward: 16,
    progress: (run) => `${Math.round(run.hull)}% / 70% hull`,
    complete: (run) => run.hull >= 70
  },
  energy: {
    id: "energy",
    label: "Power Reserve",
    detail: "Extract with at least 30% of maximum energy remaining.",
    reward: 13,
    progress: (run) => `${Math.round(run.energyPercent)}% / 30% energy`,
    complete: (run) => run.energyPercent >= 30
  },
  swift: {
    id: "swift",
    label: "Rapid Extraction",
    detail: "Reach extraction before the contract timer expires.",
    reward: 18,
    progress: (run, _level, contract) => `${Math.round(run.time)}s / ${contract.targetSeconds}s`,
    complete: (run, _level, contract) => run.time <= contract.targetSeconds
  }
};

function getRoomContract(level, levelIndex) {
  const hostileCount = countLevelHostiles(level) + (level.boss ? 3 : 0);
  const candidates = [];
  if ((level.scrap || []).length >= 3) candidates.push(CONTRACTS.salvage);
  if ((level.plates || []).length + (level.switches || []).length >= 2) candidates.push(CONTRACTS.echoDiscipline);
  if (hostileCount > 0) candidates.push(CONTRACTS.hull);
  candidates.push(CONTRACTS.energy);
  candidates.push({
    ...CONTRACTS.swift,
    targetSeconds: 75 + hostileCount * 12 + (level.doors || []).length * 10 + (level.boss ? 45 : 0)
  });
  return { ...candidates[levelIndex % candidates.length], roomIndex: levelIndex };
}

function getContractRunState(game, now = performance.now()) {
  return {
    scrap: game.player.scrap || 0,
    hull: Math.max(0, game.player.hp || 0),
    energyPercent: game.player.maxEnergy ? (game.player.energy / game.player.maxEnergy) * 100 : 0,
    echoesDeployed: game.echoesDeployed || 0,
    time: Math.max(0, (now - game.started) / 1000)
  };
}

function evaluateContract(contract, run, level, extracted = true) {
  return Boolean(extracted && contract && CONTRACTS[contract.id]?.complete(run, level, contract));
}

function getContractProgress(contract, run, level) {
  return contract ? CONTRACTS[contract.id]?.progress(run, level, contract) || "" : "";
}

export { CONTRACTS, getRoomContract, getContractRunState, evaluateContract, getContractProgress };
