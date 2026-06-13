import { CAMPAIGN_SECTIONS, STATION_MUTATIONS, STATION_EVENTS, STATION_EXPEDITION_NODES, STATION_NODE_BY_ID } from "./config.js";
import { clamp } from "./geometry.js";
import { getBossPhase } from "./combat.js";

function getStationNode(id) {
  return STATION_NODE_BY_ID.get(id) || STATION_EXPEDITION_NODES[0];
}

function getStationMutationForNode(node) {
  return STATION_MUTATIONS[(node?.levelIndex || 0) % STATION_MUTATIONS.length];
}

function getStationEventForNode(node, alert = 0) {
  return STATION_EVENTS[((node?.levelIndex || 0) + alert) % STATION_EVENTS.length];
}

const createStationExpedition = () => ({
  active: true,
  currentNode: "dock",
  cleared: ["dock"],
  upgrades: [],
  mods: [],
  salvage: 0,
  hull: 100,
  energy: 128,
  corruption: 0,
  power: 1,
  alert: 0,
  mutation: "blackout",
  event: "quiet"
});
const createInactiveExpedition = () => ({
  active: false,
  currentNode: null,
  cleared: [],
  upgrades: [],
  mods: [],
  salvage: 0,
  hull: 100,
  energy: 120,
  corruption: 0,
  power: 0,
  alert: 0,
  mutation: null,
  event: null
});

function resolveExpeditionRun(current, summary) {
  const node = STATION_NODE_BY_ID.get(current.currentNode);
  const maxEnergy = 120 + (current.mods.includes("capacitorMesh") ? 20 : 0) + current.power * 8;
  if (summary.result !== "Extracted") {
    return {
      ...current,
      hull: 60,
      energy: Math.max(65, Math.round(maxEnergy * 0.5)),
      corruption: clamp((summary.corruption || current.corruption) + 8, 0, 100),
      alert: clamp(current.alert + 1, 0, 5)
    };
  }

  const firstClear = node && !current.cleared.includes(node.id);
  const next = {
    ...current,
    cleared: node ? [...new Set([...current.cleared, node.id])] : current.cleared,
    hull: clamp(summary.hull, 1, 100),
    energy: clamp(summary.energy, 0, maxEnergy),
    corruption: clamp(summary.corruption, 0, 100),
    salvage: current.salvage + Math.max(1, summary.scrap || 0),
    alert: clamp(current.alert + (node?.type === "boss" ? -2 : 1), 0, 5)
  };
  if (!firstClear) return next;

  if (node.reward === "parts") next.salvage += 5;
  if (node.reward === "power") {
    next.power = clamp(current.power + 1, 0, 5);
    next.energy = Math.min(120 + (current.mods.includes("capacitorMesh") ? 20 : 0) + next.power * 8, next.energy + 28);
  }
  if (node.reward === "alert") next.alert = Math.max(0, next.alert - 3);
  if (node.reward === "energy") {
    next.energy = Math.min(maxEnergy, next.energy + 55);
    next.corruption = clamp(next.corruption + 18, 0, 100);
  }
  if (node.reward === "purge") next.corruption = Math.max(0, next.corruption - 48);
  return next;
}

function clamp01(value) {
  return clamp(value, 0, 1);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function getCampaignSection(index = 0) {
  return CAMPAIGN_SECTIONS.find((section) => index >= section.range[0] && index <= section.range[1]) || CAMPAIGN_SECTIONS[0];
}

function getCampaignSectionProgress(index = 0) {
  const section = getCampaignSection(index);
  const [start, end] = section.range;
  return start === end ? 1 : clamp01((index - start) / (end - start));
}

function getCampaignTheme(index = 0) {
  return getCampaignSection(index).theme;
}

function getCampaignTuning(index = 0) {
  const section = getCampaignSection(index);
  const t = getCampaignSectionProgress(index);
  if (section.id === "training-deck") {
    return {
      maxEnergy: Math.round(lerp(150, 126, t)),
      damageTaken: lerp(0.74, 0.98, t),
      hostileCooldown: lerp(1.28, 1.02, t),
      hostileSpeed: lerp(0.88, 1.02, t),
      laserDamage: lerp(0.78, 0.98, t),
      missileDamage: lerp(38, 48, t),
      hostileHpBonus: 0
    };
  }
  if (section.id === "breach-deck") {
    return {
      maxEnergy: Math.round(lerp(124, 110, t)),
      damageTaken: lerp(1, 1.08, t),
      hostileCooldown: lerp(1, 0.92, t),
      hostileSpeed: lerp(1.02, 1.08, t),
      laserDamage: lerp(1, 1.08, t),
      missileDamage: lerp(50, 56, t),
      hostileHpBonus: 0
    };
  }
  if (section.id === "reactor-deck") {
    return {
      maxEnergy: Math.round(lerp(108, 96, t)),
      damageTaken: lerp(1.08, 1.18, t),
      hostileCooldown: lerp(0.9, 0.82, t),
      hostileSpeed: lerp(1.08, 1.16, t),
      laserDamage: lerp(1.08, 1.18, t),
      missileDamage: lerp(56, 62, t),
      hostileHpBonus: t > 0.45 ? 1 : 0
    };
  }
  return {
    maxEnergy: Math.round(lerp(95, 84, t)),
    damageTaken: lerp(1.18, 1.3, t),
    hostileCooldown: lerp(0.82, 0.72, t),
    hostileSpeed: lerp(1.16, 1.24, t),
    laserDamage: lerp(1.18, 1.32, t),
    missileDamage: lerp(62, 70, t),
    hostileHpBonus: 1
  };
}

function getRoomMechanicHint(level) {
  const hasCorruption = (level?.echoCorruptionZones || []).length > 0;
  const hasMovingWalls = (level?.movingWalls || []).length > 0;
  if (hasCorruption && hasMovingWalls) return "Keep Echoes outside corruption fields while timing the shifting station rails.";
  if (hasCorruption) return "Corruption fields disable Echo plate weight, interactions, and weapons while an Echo is inside.";
  if (hasMovingWalls) return "Shift walls move on predictable rails and pause when blocked by you or cargo.";
  return "Use Echo timing, cargo, switches, and cover.";
}

function getObjectiveText(level) {
  const objective = level?.objective || { type: "secure" };
  if (objective.type === "salvage") {
    const remaining = (level.scrap || []).filter((item) => !item.taken).length;
    return remaining ? `Recover all salvage · ${remaining} remaining` : "Salvage recovered · reach extraction";
  }
  if (objective.type === "terminals") {
    const remaining = (level.switches || []).filter((item) => !item.on).length;
    return remaining ? `Stabilize every terminal · ${remaining} remaining` : "Terminals stabilized · reach extraction";
  }
  if (objective.type === "boss") {
    if (level.boss?.hp > 0) {
      const phase = getBossPhase(level.boss);
      const state = phase === 1 ? "heavy armor" : phase === 2 ? "armor breaking" : "core exposed";
      return `Defeat ${level.boss.name} · phase ${phase} · ${state}`;
    }
    return `${level.boss?.name || "Boss"} defeated · reach extraction`;
  }
  if (objective.type === "core") return level.core?.alive ? "Destroy the station core" : "Core destroyed · reach extraction";
  return "Break the lock chain and extract.";
}

function isRoomObjectiveComplete(level) {
  const objective = level.objective || { type: "secure" };
  if (objective.type === "salvage") return (level.scrap || []).every((item) => item.taken);
  if (objective.type === "terminals") return (level.switches || []).every((item) => item.on);
  if (objective.type === "boss") return !level.boss || level.boss.hp <= 0;
  if (objective.type === "core") return !level.core || !level.core.alive;
  return true;
}

export {
  getStationNode,
  getStationMutationForNode,
  getStationEventForNode,
  createStationExpedition,
  createInactiveExpedition,
  resolveExpeditionRun,
  lerp,
  getCampaignSection,
  getCampaignTheme,
  getCampaignTuning,
  getRoomMechanicHint,
  getObjectiveText,
  isRoomObjectiveComplete
};
