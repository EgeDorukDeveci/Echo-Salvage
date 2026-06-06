import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BookOpen,
  Bot,
  Boxes,
  Crosshair,
  DoorOpen,
  Gamepad2,
  Gauge,
  Globe2,
  Lock,
  LogOut,
  Mail,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Settings,
  Shield,
  Sparkles,
  UploadCloud,
  UserRound,
  UserPlus,
  Volume2,
  Wand2,
  X,
  Zap
} from "lucide-react";
import "./main.css";

const W = 1280;
const H = 720;
const ECHO_MS = 8000;
const ECHO_FUTURE_MS = 8000;
const ECHO_FRAME_MS = 50;
const MAX_ECHOES = 3;
const CELL = 40;
const PLAYER_MARGIN = 80;
const CARGO_MARGIN = 64;
const MAX_ENERGY = 120;
const ECHO_COST = 14;
const ECHO_COLORS = ["#00f0d2", "#ffd52d", "#b78cff"];
const ECHO_FILLS = ["rgba(0,240,210,.28)", "rgba(255,213,45,.24)", "rgba(183,140,255,.25)"];
const DASH_COST = 10;
const ABILITY_DEFAULT = "emp";
const DIFFICULTY_TUNING = {
  Easy: {
    maxEnergy: 150,
    damageTaken: 0.75,
    hostileCooldown: 1.22,
    hostileSpeed: 0.9,
    laserDamage: 0.78,
    missileDamage: 40,
    hostileHpBonus: 0
  },
  Standard: {
    maxEnergy: 120,
    damageTaken: 1,
    hostileCooldown: 1,
    hostileSpeed: 1,
    laserDamage: 1,
    missileDamage: 50,
    hostileHpBonus: 0
  },
  Hard: {
    maxEnergy: 95,
    damageTaken: 1.22,
    hostileCooldown: 0.78,
    hostileSpeed: 1.13,
    laserDamage: 1.18,
    missileDamage: 60,
    hostileHpBonus: 1
  }
};

const defaultSettings = {
  volume: 0.7,
  music: false,
  shake: true,
  reduced: false,
  difficulty: "Standard",
  mouseSensitivity: 1,
  uiTheme: "station"
};
const KEYBINDS_KEY = "echo-salvage-keybinds";
const defaultKeybinds = {
  moveUp: "KeyW",
  moveDown: "KeyS",
  moveLeft: "KeyA",
  moveRight: "KeyD",
  shoot: "Space",
  dash: "ShiftLeft",
  ability: "KeyF",
  reload: "KeyT",
  interact: "KeyE",
  echo: "KeyQ"
};
const controlPresets = {
  classic: { moveUp: "KeyW", moveDown: "KeyS", moveLeft: "KeyA", moveRight: "KeyD", shoot: "Space", dash: "ShiftLeft", ability: "KeyF", reload: "KeyT", interact: "KeyE", echo: "KeyQ" },
  arrows: { moveUp: "ArrowUp", moveDown: "ArrowDown", moveLeft: "ArrowLeft", moveRight: "ArrowRight", shoot: "ControlRight", dash: "ShiftRight", ability: "Numpad0", reload: "Numpad1", interact: "Numpad2", echo: "Numpad3" },
  compact: { moveUp: "KeyI", moveDown: "KeyK", moveLeft: "KeyJ", moveRight: "KeyL", shoot: "KeyP", dash: "KeyO", ability: "Semicolon", reload: "BracketLeft", interact: "KeyU", echo: "KeyY" }
};
const keybindActions = [
  { id: "moveUp", label: "Move Up" },
  { id: "moveDown", label: "Move Down" },
  { id: "moveLeft", label: "Move Left" },
  { id: "moveRight", label: "Move Right" },
  { id: "shoot", label: "Shoot" },
  { id: "dash", label: "Dash" },
  { id: "ability", label: "Ability" },
  { id: "reload", label: "Reload" },
  { id: "interact", label: "Interact" },
  { id: "echo", label: "Spawn Echo" }
];

const rooms = [
  "Echo Plate Training",
  "Cargo Pressure Chapel",
  "Laser Switch Spine",
  "First Turret Gallery",
  "Drone Chase Hangar",
  "Split Echo Circuit",
  "Forklift Cargo Lab",
  "Relay Turret Yard",
  "Memory Laser Switchback",
  "Locked Drone Orchard",
  "Twin Echo Nursery",
  "Pressure Cargo Foundry",
  "Scrap Turret Conservatory",
  "Dual Drone Relay",
  "Missile Dash Range",
  "Gravity Node Primer",
  "Jammer Mirror Lock",
  "Sweeper Lock Bay",
  "Shield Drone Gauntlet",
  "Blink Hunter Furnace",
  "Echo Core Finale",
  "Cargo Jammer Vestibule",
  "Shield Turret Atrium",
  "Gravity Cargo Carousel",
  "Repair Bot Dock",
  "Blink Switch Arcade",
  "Missile Cargo Runway",
  "Sweeper Plate Loom",
  "Drone Shield Orchard",
  "Jammer Drone Canal",
  "Gravity Missile Gallery",
  "Repair Sweeper Foundry",
  "Blink Jammer Chapel",
  "Shielded Reactor Relay",
  "Shield Repair Lockchain",
  "Salvage Singularity Core",
  "Cargo Switch Observatory",
  "Turret Crossfire Library",
  "Drone Fork Hangar",
  "Missile Dash Parabola",
  "Gravity Plate Crucible",
  "Jammer Timing Cloister",
  "Sweeper Cargo Weave",
  "Shield Drone Bastion",
  "Repair Turret Depot",
  "Blink Hunter Labyrinth",
  "Gravity Missile Canal",
  "Echo Jammer Switchyard",
  "Sweeper Shield Gallery",
  "Repair Drone Orchard",
  "Core Cargo Furnace",
  "Blink Missile Reliquary",
  "Gravity Shield Foundry",
  "Jammer Repair Cathedral",
  "Singularity Lock Garden",
  "Crown Reactor Gauntlet"
];

const CAMPAIGN_SECTIONS = [
  {
    id: "training-deck",
    label: "Training Deck",
    shortLabel: "Training",
    range: [0, 13],
    theme: "station",
    accent: "#00f0d2",
    blurb: "Movement, pressure plates, cargo discipline, and first-contact combat."
  },
  {
    id: "breach-deck",
    label: "Breach Deck",
    shortLabel: "Breach",
    range: [14, 27],
    theme: "hazard",
    accent: "#ffd52d",
    blurb: "Missiles, gravity pulls, and denser lock chains start testing timing."
  },
  {
    id: "reactor-deck",
    label: "Reactor Deck",
    shortLabel: "Reactor",
    range: [28, 41],
    theme: "reactor",
    accent: "#58e07a",
    blurb: "Support enemies, split routes, and harsher pressure management."
  },
  {
    id: "singularity-deck",
    label: "Singularity Deck",
    shortLabel: "Singularity",
    range: [42, 55],
    theme: "midnight",
    accent: "#b78cff",
    blurb: "Late-game hostile combinations and longer Echo coordination chains."
  }
];

const AUTH_USERS_KEY = "echo-salvage-users";
const AUTH_SESSION_KEY = "echo-salvage-session";
const COMMUNITY_LEVELS_KEY = "echo-salvage-community-levels";
const LEVEL_API_URL = import.meta.env.VITE_LEVEL_API_URL || "http://localhost:8787";
const AUTH_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const PASSWORD_HASH_ITERATIONS = 120000;
const DEV_LOGIN = { nickname: "developer", password: "developer" };
const DEV_COINS = 999999;
const AVATARS = [
  { id: "yellow", label: "Signal Drone", colors: ["#ffd52d", "#061012"] },
  { id: "cyan", label: "Echo Wing", colors: ["#00f0d2", "#062125"] },
  { id: "red", label: "Hazard Skiff", colors: ["#ff4e41", "#2b0b0a"] },
  { id: "green", label: "Repair Unit", colors: ["#58e07a", "#071b10"] },
  { id: "white", label: "Archive Glider", colors: ["#e7f0ef", "#19272d"] },
  { id: "gold", label: "Salvage Ace", colors: ["#ffb000", "#221706"] }
];
const WEAPON_DEFAULT = "pulse";
const COSMETIC_DEFAULTS = { body: "#dfe9e8", accent: "#ffd52d", trail: "#00f0d2", frame: "arrow", cockpit: "slit", engine: "twin", decal: "none", armor: "clean", pet: "none", dashStyle: "streak", weapon: WEAPON_DEFAULT, ability: ABILITY_DEFAULT };
const BODY_COLORS = ["#dfe9e8", "#ffd52d", "#00f0d2", "#58e07a", "#ff4e41", "#ffb000", "#b78cff", "#8aa0ff"];
const TRAIL_COLORS = ["#00f0d2", "#ffd52d", "#58e07a", "#ff4e41", "#e7f0ef", "#ff8a00", "#b78cff", "#8aa0ff"];
const UNIVERSAL_COLORS = [...new Set([
  COSMETIC_DEFAULTS.body,
  COSMETIC_DEFAULTS.accent,
  COSMETIC_DEFAULTS.trail,
  ...BODY_COLORS,
  ...TRAIL_COLORS,
  "#ff6ec7",
  "#9df6a3",
  "#7ef9ff",
  "#f5f7ff",
  "#ff9f7f",
  "#c9ff45",
  "#4de0ff",
  "#f4dd74",
  "#f77d9d",
  "#8cffda",
  "#7a91ff",
  "#f0a6ff",
  "#7ef0b6",
  "#ffcf6b"
])];
const DRONE_FRAMES = [
  { id: "arrow", label: "Arrow" },
  { id: "split", label: "Split Wing" },
  { id: "needle", label: "Needle" },
  { id: "heavy", label: "Heavy Barge" },
  { id: "halo", label: "Halo Skiff" },
  { id: "fang", label: "Fang Runner" },
  { id: "box", label: "Cargo Box" },
  { id: "kite", label: "Kite Wing" },
  { id: "fork", label: "Fork Nose" },
  { id: "moon", label: "Moon Glider" }
];
const COCKPITS = [
  { id: "slit", label: "Signal Slit", price: 0 },
  { id: "bubble", label: "Bubble Canopy", price: 65 },
  { id: "visor", label: "Wide Visor", price: 80 },
  { id: "core", label: "Core Eye", price: 95 },
  { id: "split", label: "Twin Lenses", price: 115 },
  { id: "crown", label: "Crown Glass", price: 135 }
];
const ENGINES = [
  { id: "twin", label: "Twin Jets", price: 0 },
  { id: "ring", label: "Ring Drive", price: 75 },
  { id: "fins", label: "Stabilizer Fins", price: 85 },
  { id: "core", label: "Core Thruster", price: 105 },
  { id: "sidepods", label: "Side Pods", price: 125 },
  { id: "afterburn", label: "Afterburn Rails", price: 150 }
];
const DECALS = [
  { id: "none", label: "No Decal", price: 0 },
  { id: "stripe", label: "Hazard Stripe", price: 45 },
  { id: "star", label: "Salvage Star", price: 70 },
  { id: "chevron", label: "Chevron Mark", price: 85 },
  { id: "circuit", label: "Circuit Trace", price: 105 },
  { id: "crown", label: "Ace Crown", price: 140 }
];
const ARMORS = [
  { id: "clean", label: "Clean Shell", price: 0 },
  { id: "plated", label: "Plated Hull", price: 90 },
  { id: "spiked", label: "Spike Guards", price: 115 },
  { id: "scanner", label: "Scanner Rails", price: 130 },
  { id: "cargo", label: "Cargo Clamps", price: 145 },
  { id: "reactor", label: "Reactor Braces", price: 170 }
];
const PETS = [
  { id: "none", label: "No Pet", color: "#6f858a", price: 0, perk: "No perk" },
  { id: "spark", label: "Spark Bit", color: "#ffd52d", price: 35, perk: "Very slowly refills energy" },
  { id: "wisp", label: "Echo Wisp", color: "#00f0d2", price: 45, perk: "Echo costs less energy" },
  { id: "ember", label: "Ember Dot", color: "#ff4e41", price: 55, perk: "Bullets hit harder" },
  { id: "moss", label: "Moss Byte", color: "#58e07a", price: 55, perk: "Slow hull repair" },
  { id: "orbit", label: "Orbit Pup", color: "#e7f0ef", price: 70, perk: "Small shield bar" },
  { id: "bolt", label: "Bolt Mite", color: "#ffb000", price: 80, perk: "Dash cooldown is shorter" },
  { id: "lumen", label: "Lumen Eye", color: "#b2fff6", price: 95, perk: "Stronger shield recharge" },
  { id: "nova", label: "Nova Seed", color: "#ff8a00", price: 110, perk: "Bigger coin cache rewards" },
  { id: "royal", label: "Royal Core", color: "#b78cff", price: 140, perk: "Energy and hull trickle" },
  { id: "void", label: "Void Fleck", color: "#8aa0ff", price: 160, perk: "Lasers hurt less" }
];
const DASH_STYLES = [
  { id: "streak", label: "Streak", price: 0 },
  { id: "ring", label: "Pulse Ring", price: 60 },
  { id: "spark", label: "Spark Spray", price: 90 },
  { id: "comet", label: "Comet Tail", price: 130 }
];
const WEAPONS = [
  { id: "pulse", label: "Pulse Carbine", price: 0, ammoMax: 18, reloadMs: 1050, fireDelay: 210, bulletSpeed: 620, damage: 1, spread: 0, shotsPerTrigger: 1, burstGap: 0, maxRange: 560, perk: "Balanced starter: stable aim and decent ammo." },
  { id: "pump", label: "Pump Scatter", price: 95, ammoMax: 8, reloadMs: 1450, fireDelay: 520, bulletSpeed: 560, damage: 1, spread: 0.24, shotsPerTrigger: 6, burstGap: 0, maxRange: 170, perk: "Huge close-range burst, but slow fire and small magazine." },
  { id: "burst", label: "Tri-Burst", price: 135, ammoMax: 24, reloadMs: 1300, fireDelay: 460, bulletSpeed: 650, damage: 1, spread: 0.04, shotsPerTrigger: 3, burstGap: 85, maxRange: 600, perk: "Great mid-range pressure with disciplined 3-round bursts." },
  { id: "needle", label: "Needle Rail", price: 175, ammoMax: 10, reloadMs: 1350, fireDelay: 340, bulletSpeed: 860, damage: 2, spread: 0.01, shotsPerTrigger: 1, burstGap: 0, maxRange: 880, perk: "High precision and damage, but low magazine size." },
  { id: "storm", label: "Storm Vector", price: 230, ammoMax: 34, reloadMs: 1600, fireDelay: 105, bulletSpeed: 600, damage: 1, spread: 0.11, shotsPerTrigger: 1, burstGap: 0, maxRange: 390, perk: "Very high DPS, but burns ammo fast and kicks wide." }
];
const ABILITIES = [
  { id: "emp", label: "EMP Pulse", price: 0, energyCost: 24, cooldownMs: 7000, perk: "Disables nearby turrets and stuns drones for a moment." },
  { id: "shield", label: "Shield Surge", price: 110, energyCost: 28, cooldownMs: 9000, perk: "Instantly restores shield and steadies the hull." },
  { id: "phase", label: "Phase Shift", price: 150, energyCost: 26, cooldownMs: 8000, perk: "Briefly ignore incoming damage while slipping through danger." },
  { id: "overdrive", label: "Overdrive", price: 195, energyCost: 32, cooldownMs: 10000, perk: "Short burst of speed and weapon tempo." }
];
const DEFAULT_OWNED = {
  colors: [COSMETIC_DEFAULTS.body, COSMETIC_DEFAULTS.accent, COSMETIC_DEFAULTS.trail],
  bodies: ["#dfe9e8"],
  trails: ["#00f0d2"],
  frames: ["arrow"],
  cockpits: ["slit"],
  engines: ["twin"],
  decals: ["none"],
  armors: ["clean"],
  pets: ["none"],
  dashes: ["streak"],
  weapons: [WEAPON_DEFAULT],
  abilities: [ABILITY_DEFAULT]
};
const BODY_PRICES = { "#ffd52d": 35, "#00f0d2": 45, "#58e07a": 55, "#ff4e41": 70, "#ffb000": 100, "#ff8a00": 80, "#b78cff": 120, "#8aa0ff": 125, "#ff6ec7": 130, "#9df6a3": 110, "#7ef9ff": 115, "#f5f7ff": 135, "#ff9f7f": 90, "#c9ff45": 105, "#4de0ff": 95, "#f4dd74": 98, "#f77d9d": 112, "#8cffda": 118, "#7a91ff": 128, "#f0a6ff": 138, "#7ef0b6": 108, "#ffcf6b": 102, "#e3ffe7": 116, "#fbe7ff": 124, "#9fb8ff": 132 };
const TRAIL_PRICES = { "#ffd52d": 35, "#58e07a": 50, "#ff4e41": 65, "#e7f0ef": 80, "#ff8a00": 95, "#b78cff": 110, "#8aa0ff": 115, "#ff6ec7": 120, "#9df6a3": 90, "#7ef9ff": 100, "#f5f7ff": 125, "#f77d9d": 105, "#c9ff45": 92, "#4de0ff": 96, "#ffcf6b": 99, "#f0a6ff": 130, "#8cffda": 108 };
const COLOR_PRICES = Object.fromEntries(UNIVERSAL_COLORS.map((color, index) => [color, BODY_PRICES[color] || TRAIL_PRICES[color] || 55 + index * 4]));
const FRAME_PRICES = { split: 80, needle: 120 };
const textEncoder = new TextEncoder();

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

function getRoomTier(index) {
  return getCampaignSection(index).shortLabel;
}

function getHighestClearedRoom(progress = {}) {
  let highest = -1;
  Object.entries(progress || {}).forEach(([rawIndex, stars]) => {
    const index = Number(rawIndex);
    if ((Number(stars) || 0) > 0 && index > highest) highest = index;
  });
  return highest;
}

function getNextCampaignRoomIndex(progress = {}) {
  return clamp(getHighestClearedRoom(progress) + 1, 0, rooms.length - 1);
}

function isRoomUnlocked(index, user) {
  if (user?.devMode) return true;
  return index <= getHighestClearedRoom(user?.progress) + 1;
}

function getCurrentSectionIndex(user) {
  return Math.min(CAMPAIGN_SECTIONS.length - 1, Math.floor(getNextCampaignRoomIndex(user?.progress) / 14));
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex = "") {
  const safe = `${hex}`.trim();
  if (!safe || safe.length % 2) return new Uint8Array();
  return new Uint8Array(safe.match(/.{1,2}/g).map((part) => parseInt(part, 16)));
}

function makeRandomHex(length = 16) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

async function derivePasswordHash(password, saltHex, iterations = PASSWORD_HASH_ITERATIONS) {
  const salt = hexToBytes(saltHex);
  const key = await crypto.subtle.importKey("raw", textEncoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, 256);
  return bytesToHex(new Uint8Array(bits));
}

async function createPasswordRecord(password) {
  const salt = makeRandomHex(16);
  return {
    passwordSalt: salt,
    passwordIterations: PASSWORD_HASH_ITERATIONS,
    passwordHash: await derivePasswordHash(password, salt, PASSWORD_HASH_ITERATIONS)
  };
}

async function verifyStoredPassword(user, password) {
  if (user?.passwordHash && user?.passwordSalt) {
    const hash = await derivePasswordHash(password, user.passwordSalt, user.passwordIterations || PASSWORD_HASH_ITERATIONS);
    return hash === user.passwordHash;
  }
  return user?.password === password;
}

function normalizeEconomy(data = {}) {
  const devMode = data.devMode || data.nickname?.toLowerCase() === DEV_LOGIN.nickname;
  return {
    coins: devMode ? DEV_COINS : Number.isFinite(data.coins) ? data.coins : 25,
    owned: {
      colors: [...new Set([...(data.owned?.colors || []), ...(data.owned?.bodies || []), ...(data.owned?.trails || []), ...DEFAULT_OWNED.colors])],
      bodies: [...new Set([...(data.owned?.bodies || []), ...DEFAULT_OWNED.bodies])],
      trails: [...new Set([...(data.owned?.trails || []), ...DEFAULT_OWNED.trails])],
      frames: [...new Set([...(data.owned?.frames || []), ...DEFAULT_OWNED.frames])],
      cockpits: [...new Set([...(data.owned?.cockpits || []), ...DEFAULT_OWNED.cockpits])],
      engines: [...new Set([...(data.owned?.engines || []), ...DEFAULT_OWNED.engines])],
      decals: [...new Set([...(data.owned?.decals || []), ...DEFAULT_OWNED.decals])],
      armors: [...new Set([...(data.owned?.armors || []), ...DEFAULT_OWNED.armors])],
      pets: [...new Set([...(data.owned?.pets || []), ...DEFAULT_OWNED.pets])],
      dashes: [...new Set([...(data.owned?.dashes || []), ...DEFAULT_OWNED.dashes])],
      weapons: [...new Set([...(data.owned?.weapons || []), ...DEFAULT_OWNED.weapons])],
      abilities: [...new Set([...(data.owned?.abilities || []), ...DEFAULT_OWNED.abilities])]
    },
    cosmetic: { ...COSMETIC_DEFAULTS, weapon: WEAPON_DEFAULT, ability: ABILITY_DEFAULT, ...(data.cosmetic || {}) }
  };
}

function makeSession(user) {
  const economy = normalizeEconomy(user);
  return {
    id: user.id,
    nickname: user.nickname,
    email: user.email,
    avatar: user.avatar || "yellow",
    devMode: Boolean(user.devMode),
    progress: user.progress || {},
    sessionNonce: user.sessionNonce,
    sessionExpiresAt: user.sessionExpiresAt,
    ...economy
  };
}

function getStarsForRoom(index, summary) {
  if (summary.result !== "Extracted") return 0;
  let stars = 1;
  if (summary.scrap >= 2) stars += 1;
  if (summary.hull >= 55) stars += 1;
  return stars;
}

function getTotalStars(progress = {}) {
  return Object.values(progress).reduce((sum, value) => sum + (Number(value) || 0), 0);
}

function getStoredKeybinds() {
  try {
    return { ...defaultKeybinds, ...JSON.parse(localStorage.getItem(KEYBINDS_KEY) || "{}") };
  } catch {
    return defaultKeybinds;
  }
}

function keyName(code) {
  const names = {
    Space: "Space",
    ShiftLeft: "Left Shift",
    ShiftRight: "Right Shift",
    ControlLeft: "Left Ctrl",
    ControlRight: "Right Ctrl",
    AltLeft: "Left Alt",
    AltRight: "Right Alt",
    ArrowUp: "Arrow Up",
    ArrowDown: "Arrow Down",
    ArrowLeft: "Arrow Left",
    ArrowRight: "Arrow Right",
    Escape: "Escape"
  };
  if (names[code]) return names[code];
  if (code?.startsWith("Key")) return code.slice(3);
  if (code?.startsWith("Digit")) return code.slice(5);
  return code || "Unset";
}

function getStoredUsers() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveStoredUsers(users) {
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

function getStoredSession() {
  try {
    const session = JSON.parse(localStorage.getItem(AUTH_SESSION_KEY) || "null");
    if (!session || !session.id) return null;
    if (session.sessionExpiresAt && session.sessionExpiresAt < Date.now()) {
      localStorage.removeItem(AUTH_SESSION_KEY);
      return null;
    }
    const user = getStoredUsers().find((entry) => entry.id === session.id);
    if (!user) {
      localStorage.removeItem(AUTH_SESSION_KEY);
      return null;
    }
    if (user.sessionNonce && session.sessionNonce !== user.sessionNonce) {
      localStorage.removeItem(AUTH_SESSION_KEY);
      return null;
    }
    return makeSession({ ...user, ...session });
  } catch {
    localStorage.removeItem(AUTH_SESSION_KEY);
    return null;
  }
}

function updateStoredUserProfile(updated) {
  const normalized = { ...updated, ...normalizeEconomy(updated) };
  const users = getStoredUsers();
  const nextUsers = users.some((user) => user.id === normalized.id)
    ? users.map((user) => (user.id === normalized.id ? { ...user, ...normalized } : user))
    : [...users, normalized];
  saveStoredUsers(nextUsers);
  const session = makeSession(normalized);
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  return session;
}

function updateUserEconomy(user, updater) {
  const current = getStoredUsers().find((u) => u.id === user?.id) || user;
  const next = updater({ ...current, ...normalizeEconomy(current) });
  return updateStoredUserProfile(next);
}

function getLocalCommunityLevels() {
  try {
    return JSON.parse(localStorage.getItem(COMMUNITY_LEVELS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveLocalCommunityLevels(levels) {
  localStorage.setItem(COMMUNITY_LEVELS_KEY, JSON.stringify(levels));
}

function encodeLevelCode(level) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(level))));
}

function decodeLevelCode(code) {
  return JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
}

async function fetchCommunityLevels() {
  try {
    const response = await fetch(`${LEVEL_API_URL}/api/levels`);
    if (!response.ok) throw new Error("Community server unavailable");
    return { levels: await response.json(), source: "global" };
  } catch {
    return { levels: getLocalCommunityLevels(), source: "local" };
  }
}

async function publishCommunityLevel(payload) {
  const levelCode = payload.code || encodeLevelCode(payload.level);
  const codedPayload = { ...payload, code: levelCode };
  try {
    const response = await fetch(`${LEVEL_API_URL}/api/levels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(codedPayload)
    });
    if (!response.ok) throw new Error("Publish failed");
    return { level: await response.json(), source: "global" };
  } catch {
    const level = { ...codedPayload, id: `local-${Date.now()}`, plays: 0, likes: 0, createdAt: new Date().toISOString() };
    saveLocalCommunityLevels([level, ...getLocalCommunityLevels()]);
    return { level, source: "local" };
  }
}

function makeLevel(index = 0) {
  const shell = [
    { x: 40, y: 40, w: 1200, h: 22 },
    { x: 40, y: 658, w: 1200, h: 22 },
    { x: 40, y: 40, w: 22, h: 640 },
    { x: 1218, y: 40, w: 22, h: 640 }
  ];
  const wall = (x, y, w, h) => ({ x, y, w, h });
  const plate = (id, x, y) => ({ x, y, r: 34, id });
  const sw = (id, x, y) => ({ x, y, r: 25, id, on: false });
  const gate = (...requires) => [{ x: 1080, y: 305, w: 58, h: 112, requires, open: false }];
  const scrap = (...points) => points.map(([x, y]) => ({ x, y, taken: false }));
  const coin = (x, y, value) => ({ x, y, w: 34, h: 34, value, taken: false });
  const crate = (x, y, size = 42) => ({ x, y, w: size, h: size });

  const fallback = {
    name: "Custom Deck",
    player: { x: 160, y: 360 },
    exit: { x: 1160, y: 360, w: 58, h: 114 },
    walls: [wall(430, 190, 42, 250), wall(690, 235, 250, 42)],
    crates: [crate(350, 285)],
    coinCrates: [coin(360, 560, 12), coin(850, 180, 10)],
    plates: [plate("A", 255, 360)],
    switches: [sw("B", 925, 360)],
    doors: gate("A", "B"),
    turrets: [],
    drones: [],
    missileSentries: [],
    gravityNodes: [],
    echoJammers: [],
    laserSweepers: [],
    blinkHunters: [],
    shieldDrones: [],
    repairBots: [],
    lasers: [],
    scrap: scrap([470, 180], [710, 560], [980, 520]),
    core: null
  };

  const layouts = [
    {
      name: "Echo Plate Training",
      walls: [wall(440, 150, 42, 170), wall(440, 410, 42, 170), wall(730, 240, 240, 42)],
      crates: [crate(545, 510)],
      plates: [plate("A", 250, 360)],
      switches: [sw("B", 920, 360)],
      doors: gate("A", "B"),
      scrap: scrap([520, 190], [820, 530], [1010, 260])
    },
    {
      name: "Cargo Pressure Chapel",
      player: { x: 160, y: 540 },
      exit: { x: 595, y: 80, w: 104, h: 58 },
      walls: [wall(315, 200, 42, 340), wall(455, 145, 42, 145), wall(455, 430, 42, 145), wall(780, 145, 42, 145), wall(780, 430, 42, 145), wall(620, 290, 180, 42)],
      crates: [crate(500, 180), crate(500, 500)],
      plates: [plate("A", 235, 190), plate("B", 235, 530)],
      switches: [sw("C", 1000, 500)],
      doors: [{ x: 590, y: 142, w: 114, h: 32, requires: [], open: false }],
      scrap: scrap([540, 360], [825, 205], [995, 220])
    },
    {
      name: "Laser Switch Spine",
      exit: { x: 590, y: 585, w: 108, h: 58 },
      walls: [wall(360, 120, 42, 460), wall(760, 120, 42, 460), wall(520, 235, 130, 42), wall(520, 445, 130, 42)],
      crates: [crate(245, 515)],
      plates: [plate("A", 585, 360)],
      switches: [sw("B", 1000, 180)],
      doors: [{ x: 586, y: 542, w: 116, h: 32, requires: [], open: false }],
      lasers: [
        { x1: 485, y1: 90, x2: 485, y2: 630, id: "L1", disabledBy: "A" },
        { x1: 665, y1: 90, x2: 665, y2: 630, id: "L2", disabledBy: "B" }
      ],
      scrap: scrap([245, 190], [590, 530], [1000, 540])
    },
    {
      name: "First Turret Gallery",
      exit: { x: 1000, y: 82, w: 112, h: 58 },
      walls: [wall(350, 120, 360, 42), wall(350, 558, 360, 42), wall(600, 265, 42, 190), wall(900, 180, 42, 360)],
      crates: [crate(255, 500)],
      plates: [plate("A", 235, 360), plate("B", 780, 535)],
      switches: [sw("C", 1015, 190)],
      doors: [{ x: 995, y: 144, w: 122, h: 32, requires: [], open: false }],
      turrets: [{ x: 520, y: 245, hp: 2, cooldown: 450 }],
      scrap: scrap([510, 520], [780, 180], [995, 500])
    },
    {
      name: "Drone Chase Hangar",
      walls: [wall(315, 110, 42, 500), wall(610, 80, 42, 220), wall(610, 420, 42, 220), wall(870, 180, 210, 42), wall(870, 500, 210, 42)],
      crates: [crate(465, 500)],
      plates: [plate("A", 240, 360)],
      switches: [sw("B", 760, 360)],
      doors: gate("A", "B"),
      drones: [{ x: 540, y: 180, hp: 2, cooldown: 700 }, { x: 980, y: 525, hp: 2, cooldown: 1000 }],
      lasers: [{ x1: 700, y1: 100, x2: 700, y2: 620, id: "L1", disabledBy: "B" }],
      scrap: scrap([500, 245], [805, 520], [1030, 250])
    },
    {
      name: "Split Echo Circuit",
      walls: [wall(390, 100, 42, 210), wall(390, 410, 42, 210), wall(650, 80, 42, 250), wall(650, 390, 42, 250), wall(910, 170, 42, 380)],
      crates: [crate(515, 185)],
      plates: [plate("A", 235, 205), plate("B", 235, 515)],
      switches: [sw("C", 795, 205), sw("D", 1015, 515)],
      doors: gate("A", "B", "C", "D"),
      turrets: [{ x: 805, y: 360, hp: 2, cooldown: 750 }],
      lasers: [{ x1: 545, y1: 95, x2: 545, y2: 625, id: "L1", disabledBy: "C" }],
      scrap: scrap([505, 520], [805, 515], [1015, 205])
    },
    {
      name: "Forklift Cargo Lab",
      exit: { x: 610, y: 585, w: 112, h: 58 },
      walls: [wall(285, 170, 240, 42), wall(285, 500, 240, 42), wall(735, 150, 42, 420), wall(920, 250, 42, 220)],
      crates: [crate(410, 330, 62), crate(580, 165), crate(580, 515)],
      plates: [plate("A", 255, 360), plate("B", 665, 180), plate("C", 665, 540)],
      switches: [sw("D", 1015, 360)],
      doors: [{ x: 605, y: 542, w: 122, h: 32, requires: [], open: false }],
      turrets: [{ x: 835, y: 360, hp: 2, cooldown: 700 }],
      scrap: scrap([420, 250], [620, 360], [1000, 535])
    },
    {
      name: "Relay Turret Yard",
      player: { x: 160, y: 540 },
      exit: { x: 610, y: 80, w: 112, h: 58 },
      walls: [wall(310, 155, 250, 42), wall(310, 525, 250, 42), wall(700, 180, 42, 140), wall(700, 400, 42, 220), wall(940, 220, 42, 280)],
      coinCrates: [coin(455, 360, 18), coin(1010, 525, 14)],
      plates: [plate("A", 230, 360)],
      switches: [sw("B", 590, 180), sw("C", 590, 540), sw("D", 1015, 360)],
      doors: [{ x: 605, y: 142, w: 122, h: 32, requires: [], open: false }],
      turrets: [{ x: 825, y: 360, hp: 2, cooldown: 650 }, { x: 1030, y: 190, hp: 2, cooldown: 850 }],
      lasers: [{ x1: 655, y1: 95, x2: 655, y2: 625, id: "L1", disabledBy: "B" }],
      scrap: scrap([450, 360], [825, 540], [1015, 540])
    },
    {
      name: "Memory Laser Switchback",
      walls: [wall(315, 95, 42, 245), wall(315, 380, 42, 245), wall(555, 145, 260, 42), wall(555, 535, 260, 42), wall(920, 145, 42, 430)],
      crates: [crate(470, 500)],
      plates: [plate("A", 230, 200), plate("B", 230, 520)],
      switches: [sw("C", 690, 360), sw("D", 1015, 360)],
      doors: gate("A", "B", "C", "D"),
      drones: [{ x: 835, y: 500, hp: 2, cooldown: 900 }],
      lasers: [{ x1: 455, y1: 95, x2: 455, y2: 625, id: "L1", disabledBy: "A" }, { x1: 850, y1: 95, x2: 850, y2: 625, id: "L2", disabledBy: "C" }],
      scrap: scrap([495, 205], [690, 520], [1015, 205])
    },
    {
      name: "Locked Drone Orchard",
      walls: [wall(285, 120, 42, 200), wall(285, 420, 42, 200), wall(520, 245, 280, 42), wall(520, 435, 280, 42), wall(940, 120, 42, 500)],
      crates: [crate(410, 515)],
      plates: [plate("A", 220, 360), plate("B", 655, 535)],
      switches: [sw("C", 655, 185), sw("D", 1020, 360)],
      doors: gate("A", "B", "C", "D"),
      turrets: [{ x: 840, y: 360, hp: 2, cooldown: 650 }],
      drones: [{ x: 1000, y: 520, hp: 2, cooldown: 950 }],
      scrap: scrap([410, 190], [655, 360], [1015, 185])
    },
    {
      name: "Twin Echo Nursery",
      walls: [wall(340, 100, 42, 230), wall(340, 390, 42, 230), wall(675, 160, 42, 400), wall(920, 245, 42, 230)],
      coinCrates: [coin(520, 205, 22), coin(1005, 515, 18)],
      plates: [plate("A", 230, 205), plate("B", 230, 515), plate("C", 805, 360)],
      switches: [sw("D", 1015, 360)],
      doors: gate("A", "B", "C", "D"),
      drones: [{ x: 530, y: 515, hp: 2, cooldown: 850 }, { x: 990, y: 190, hp: 2, cooldown: 1000 }],
      lasers: [{ x1: 505, y1: 95, x2: 505, y2: 625, id: "L1", disabledBy: "C" }],
      scrap: scrap([515, 205], [805, 515], [1010, 515])
    },
    {
      name: "Pressure Cargo Foundry",
      player: { x: 160, y: 560 },
      exit: { x: 610, y: 80, w: 112, h: 58 },
      walls: [wall(300, 500, 260, 42), wall(300, 178, 42, 322), wall(610, 180, 42, 155), wall(610, 390, 42, 165), wall(850, 178, 42, 322), wall(850, 178, 220, 42)],
      crates: [crate(480, 185), crate(480, 500), crate(760, 360)],
      plates: [plate("A", 220, 185), plate("B", 220, 535), plate("C", 760, 185), plate("D", 760, 535)],
      switches: [sw("E", 1030, 360)],
      doors: [{ x: 605, y: 142, w: 122, h: 32, requires: [], open: false }],
      turrets: [{ x: 1030, y: 185, hp: 2, cooldown: 700 }],
      scrap: scrap([480, 360], [760, 260], [1030, 535])
    },
    {
      name: "Scrap Turret Conservatory",
      player: { x: 165, y: 185 },
      exit: { x: 590, y: 585, w: 112, h: 58 },
      walls: [wall(320, 185, 42, 350), wall(520, 145, 230, 42), wall(520, 532, 230, 42), wall(920, 185, 42, 350), wall(570, 300, 140, 42), wall(570, 378, 140, 42)],
      crates: [crate(420, 505)],
      plates: [plate("A", 230, 360), plate("B", 700, 535)],
      switches: [sw("C", 1015, 360)],
      doors: [{ x: 585, y: 542, w: 122, h: 32, requires: [], open: false }],
      turrets: [{ x: 640, y: 205, hp: 2, cooldown: 600 }, { x: 840, y: 515, hp: 2, cooldown: 900 }],
      drones: [{ x: 1030, y: 205, hp: 2, cooldown: 950 }],
      scrap: scrap([455, 205], [700, 360], [1000, 205])
    },
    {
      name: "Dual Drone Relay",
      walls: [wall(360, 90, 42, 245), wall(360, 385, 42, 245), wall(760, 90, 42, 245), wall(760, 385, 42, 245)],
      coinCrates: [coin(585, 360, 24), coin(1015, 205, 18)],
      plates: [plate("A", 235, 205), plate("B", 235, 520)],
      switches: [sw("C", 585, 205), sw("D", 940, 520)],
      doors: gate("A", "B", "C", "D"),
      drones: [{ x: 560, y: 520, hp: 2, cooldown: 750 }, { x: 965, y: 205, hp: 3, cooldown: 950 }],
      lasers: [{ x1: 610, y1: 90, x2: 610, y2: 630, id: "L1", disabledBy: "C" }],
      scrap: scrap([585, 360], [940, 205], [1030, 540])
    },
    {
      name: "Missile Dash Range",
      exit: { x: 1005, y: 82, w: 112, h: 58 },
      walls: [wall(310, 105, 42, 510), wall(560, 220, 260, 42), wall(560, 460, 260, 42), wall(960, 105, 42, 510)],
      crates: [crate(430, 520)],
      plates: [plate("A", 230, 360), plate("B", 690, 540)],
      switches: [sw("C", 1015, 180), sw("D", 1015, 540)],
      doors: [{ x: 1000, y: 144, w: 122, h: 32, requires: [], open: false }],
      missileSentries: [{ x: 875, y: 360, hp: 3, cooldown: 2700, lockMs: 0 }],
      turrets: [{ x: 700, y: 185, hp: 2, cooldown: 850 }],
      scrap: scrap([430, 180], [700, 360], [1015, 360])
    },
    {
      name: "Gravity Node Primer",
      exit: { x: 590, y: 585, w: 112, h: 58 },
      walls: [wall(350, 105, 42, 225), wall(350, 390, 42, 225), wall(790, 105, 42, 510), wall(560, 270, 125, 42)],
      crates: [crate(530, 500)],
      plates: [plate("A", 230, 360), plate("B", 625, 540)],
      switches: [sw("C", 1015, 360)],
      doors: [{ x: 585, y: 542, w: 122, h: 32, requires: [], open: false }],
      gravityNodes: [{ x: 600, y: 210, hp: 4, pulse: 0 }],
      drones: [{ x: 900, y: 530, hp: 2, cooldown: 900 }],
      scrap: scrap([525, 190], [625, 360], [1015, 530])
    },
    {
      name: "Jammer Mirror Lock",
      walls: [wall(300, 130, 42, 180), wall(300, 410, 42, 180), wall(620, 95, 42, 225), wall(620, 400, 42, 225), wall(930, 130, 42, 460)],
      crates: [crate(475, 190)],
      plates: [plate("A", 230, 205), plate("B", 230, 515), plate("C", 760, 360)],
      switches: [sw("D", 1010, 360)],
      doors: gate("A", "B", "C", "D"),
      echoJammers: [{ x: 760, y: 200, hp: 5, pulse: 0 }],
      turrets: [{ x: 880, y: 520, hp: 2, cooldown: 800 }],
      lasers: [{ x1: 515, y1: 100, x2: 515, y2: 620, id: "L1", disabledBy: "C" }],
      scrap: scrap([475, 520], [760, 520], [1010, 190])
    },
    {
      name: "Sweeper Lock Bay",
      exit: { x: 1000, y: 82, w: 112, h: 58 },
      walls: [wall(300, 100, 42, 520), wall(525, 220, 260, 42), wall(525, 460, 260, 42), wall(940, 100, 42, 520)],
      crates: [crate(450, 530)],
      plates: [plate("A", 230, 360), plate("B", 635, 540)],
      switches: [sw("C", 1015, 185), sw("D", 1015, 535)],
      doors: [{ x: 995, y: 144, w: 122, h: 32, requires: [], open: false }],
      laserSweepers: [{ x: 650, y: 360, hp: 4, angle: 0, speed: 0.001 }],
      turrets: [{ x: 900, y: 535, hp: 2, cooldown: 800 }],
      scrap: scrap([450, 185], [635, 185], [1015, 360])
    },
    {
      name: "Shield Drone Gauntlet",
      walls: [wall(280, 120, 42, 480), wall(485, 105, 42, 210), wall(485, 405, 42, 210), wall(760, 245, 230, 42), wall(760, 435, 230, 42)],
      crates: [crate(390, 520), crate(640, 185)],
      plates: [plate("A", 220, 185), plate("B", 220, 535), plate("C", 650, 360)],
      switches: [sw("D", 1015, 360)],
      doors: gate("A", "B", "C", "D"),
      shieldDrones: [{ x: 930, y: 500, hp: 4, cooldown: 700 }],
      turrets: [{ x: 720, y: 185, hp: 2, cooldown: 650 }, { x: 1000, y: 540, hp: 2, cooldown: 800 }],
      drones: [{ x: 1015, y: 185, hp: 2, cooldown: 900 }],
      scrap: scrap([390, 185], [650, 535], [1015, 250])
    },
    {
      name: "Blink Hunter Furnace",
      player: { x: 640, y: 585 },
      exit: { x: 115, y: 305, w: 58, h: 114 },
      walls: [wall(270, 120, 42, 220), wall(270, 430, 42, 180), wall(500, 210, 320, 42), wall(500, 470, 320, 42), wall(930, 120, 42, 480), wall(420, 320, 170, 42)],
      crates: [crate(395, 530)],
      plates: [plate("A", 210, 180), plate("B", 210, 540), plate("C", 650, 360)],
      switches: [sw("D", 1020, 180), sw("E", 1020, 540)],
      doors: [{ x: 185, y: 305, w: 42, h: 112, requires: [], open: false }],
      blinkHunters: [{ x: 805, y: 360, hp: 4, cooldown: 900, blink: 700 }],
      drones: [{ x: 1000, y: 360, hp: 2, cooldown: 1000 }],
      lasers: [{ x1: 455, y1: 95, x2: 455, y2: 625, id: "L1", disabledBy: "C" }],
      scrap: scrap([395, 185], [650, 540], [1020, 360])
    },
    {
      name: "Echo Core Finale",
      walls: [wall(250, 120, 42, 480), wall(430, 120, 42, 175), wall(430, 425, 42, 175), wall(620, 120, 42, 480), wall(790, 120, 42, 175), wall(790, 425, 42, 175), wall(965, 120, 42, 480)],
      crates: [crate(350, 525), crate(710, 185)],
      plates: [plate("A", 205, 180), plate("B", 535, 540), plate("C", 885, 180), plate("D", 885, 540)],
      switches: [sw("E", 535, 180), sw("F", 1030, 360)],
      doors: gate("A", "B", "C", "D", "E", "F"),
      turrets: [{ x: 350, y: 360, hp: 3, cooldown: 650 }, { x: 720, y: 360, hp: 3, cooldown: 700 }],
      drones: [{ x: 1010, y: 180, hp: 2, cooldown: 700 }, { x: 1010, y: 540, hp: 2, cooldown: 900 }],
      missileSentries: [{ x: 900, y: 360, hp: 3, cooldown: 2600, lockMs: 0 }],
      gravityNodes: [{ x: 650, y: 540, hp: 4, pulse: 0 }],
      echoJammers: [{ x: 720, y: 185, hp: 5, pulse: 0 }],
      shieldDrones: [{ x: 950, y: 250, hp: 4, cooldown: 700 }],
      lasers: [{ x1: 700, y1: 95, x2: 700, y2: 625, id: "L1", disabledBy: "E" }],
      core: { x: 1045, y: 360, hp: 8, alive: true },
      scrap: scrap([350, 185], [535, 360], [1030, 535])
    },
    {
      name: "Cargo Jammer Vestibule",
      player: { x: 170, y: 565 },
      exit: { x: 615, y: 78, w: 94, h: 58 },
      walls: [wall(250, 505, 220, 42), wall(250, 250, 42, 255), wall(430, 250, 210, 42), wall(598, 250, 42, 190), wall(598, 438, 260, 42), wall(816, 210, 42, 228), wall(700, 168, 270, 42), wall(700, 558, 330, 42)],
      crates: [crate(430, 170), crate(430, 508)],
      coinCrates: [coin(470, 350, 44), coin(970, 185, 36)],
      plates: [plate("A", 225, 180), plate("B", 225, 540), plate("C", 690, 360)],
      switches: [sw("D", 1015, 360)],
      doors: [{ x: 612, y: 140, w: 100, h: 32, requires: [], open: false }],
      echoJammers: [{ x: 650, y: 205, hp: 5, pulse: 0 }],
      turrets: [{ x: 940, y: 520, hp: 2, cooldown: 900 }],
      lasers: [{ x1: 760, y1: 95, x2: 760, y2: 625, id: "L1", disabledBy: "C" }],
      scrap: scrap([430, 360], [690, 540], [1015, 205])
    },
    {
      name: "Shield Turret Atrium",
      player: { x: 165, y: 555 },
      exit: { x: 612, y: 586, w: 94, h: 58 },
      walls: [wall(352, 142, 170, 42), wall(760, 142, 170, 42), wall(352, 536, 170, 42), wall(760, 536, 170, 42), wall(590, 252, 110, 42), wall(590, 426, 110, 42), wall(515, 295, 42, 130), wall(735, 295, 42, 130)],
      crates: [crate(390, 520)],
      coinCrates: [coin(390, 175, 46), coin(1000, 540, 38)],
      plates: [plate("A", 220, 185), plate("B", 220, 535)],
      switches: [sw("C", 650, 360), sw("D", 1015, 360)],
      doors: [{ x: 610, y: 546, w: 100, h: 32, requires: [], open: false }],
      turrets: [{ x: 765, y: 305, hp: 3, cooldown: 720 }, { x: 930, y: 420, hp: 2, cooldown: 880 }],
      shieldDrones: [{ x: 845, y: 360, hp: 4, cooldown: 700 }],
      scrap: scrap([390, 360], [650, 535], [1015, 185])
    },
    {
      name: "Gravity Cargo Carousel",
      player: { x: 165, y: 180 },
      exit: { x: 1085, y: 102, w: 58, h: 94 },
      walls: [wall(410, 190, 110, 42), wall(410, 488, 110, 42), wall(740, 190, 110, 42), wall(740, 488, 110, 42), wall(370, 230, 42, 260), wall(850, 230, 42, 260), wall(560, 305, 160, 42), wall(560, 373, 160, 42)],
      crates: [crate(455, 185), crate(785, 500)],
      coinCrates: [coin(545, 360, 48), coin(985, 205, 40)],
      plates: [plate("A", 230, 205), plate("B", 230, 515), plate("C", 735, 540)],
      switches: [sw("D", 1015, 360)],
      doors: [{ x: 1018, y: 128, w: 54, h: 116, requires: [], open: false }],
      gravityNodes: [{ x: 720, y: 250, hp: 4, pulse: 0 }],
      drones: [{ x: 995, y: 520, hp: 2, cooldown: 1050 }],
      lasers: [{ x1: 790, y1: 95, x2: 790, y2: 625, id: "L1", disabledBy: "C" }],
      scrap: scrap([455, 360], [735, 185], [1015, 535])
    },
    {
      name: "Repair Bot Dock",
      player: { x: 165, y: 180 },
      exit: { x: 1045, y: 580, w: 94, h: 58 },
      walls: [wall(265, 250, 300, 42), wall(265, 430, 300, 42), wall(610, 128, 42, 160), wall(610, 432, 42, 160), wall(790, 250, 270, 42), wall(790, 430, 270, 42), wall(840, 292, 42, 138), wall(1015, 470, 42, 110)],
      crates: [crate(435, 515)],
      coinCrates: [coin(455, 205, 50), coin(895, 360, 42)],
      plates: [plate("A", 225, 360), plate("B", 695, 535)],
      switches: [sw("C", 695, 185), sw("D", 1015, 360)],
      doors: [{ x: 1040, y: 535, w: 108, h: 30, requires: [], open: false }],
      turrets: [{ x: 665, y: 360, hp: 3, cooldown: 650 }, { x: 990, y: 205, hp: 2, cooldown: 850 }],
      drones: [{ x: 990, y: 530, hp: 2, cooldown: 900 }],
      repairBots: [{ x: 820, y: 360, hp: 3, cooldown: 800 }],
      scrap: scrap([435, 185], [695, 360], [1015, 535])
    },
    {
      name: "Blink Switch Arcade",
      player: { x: 1030, y: 360 },
      exit: { x: 108, y: 305, w: 58, h: 114 },
      walls: [wall(230, 110, 42, 170), wall(230, 440, 42, 170), wall(390, 255, 170, 42), wall(390, 422, 170, 42), wall(650, 110, 42, 170), wall(650, 440, 42, 170), wall(810, 255, 170, 42), wall(810, 422, 170, 42)],
      crates: [crate(420, 520)],
      coinCrates: [coin(425, 185, 52), coin(1010, 525, 44)],
      plates: [plate("A", 220, 185), plate("B", 220, 535), plate("C", 690, 360)],
      switches: [sw("D", 1010, 185), sw("E", 1010, 535)],
      doors: [{ x: 178, y: 305, w: 42, h: 112, requires: [], open: false }],
      blinkHunters: [{ x: 800, y: 360, hp: 4, cooldown: 900, blink: 900 }],
      turrets: [{ x: 660, y: 535, hp: 2, cooldown: 850 }],
      scrap: scrap([420, 360], [690, 185], [1010, 360])
    },
    {
      name: "Missile Cargo Runway",
      player: { x: 160, y: 600 },
      exit: { x: 1088, y: 95, w: 58, h: 100 },
      walls: [wall(245, 270, 840, 42), wall(245, 410, 840, 42), wall(410, 95, 42, 175), wall(590, 452, 42, 150), wall(780, 95, 42, 175), wall(965, 452, 42, 150)],
      crates: [crate(440, 515), crate(720, 335)],
      coinCrates: [coin(440, 185, 54), coin(1000, 360, 46)],
      plates: [plate("A", 230, 360), plate("B", 680, 185), plate("C", 680, 535)],
      switches: [sw("D", 1015, 185), sw("E", 1015, 535)],
      doors: [{ x: 1020, y: 126, w: 52, h: 120, requires: [], open: false }],
      missileSentries: [{ x: 865, y: 360, hp: 3, cooldown: 2700, lockMs: 0 }],
      turrets: [{ x: 700, y: 360, hp: 2, cooldown: 900 }],
      scrap: scrap([440, 360], [680, 360], [1015, 360])
    },
    {
      name: "Sweeper Plate Loom",
      player: { x: 160, y: 185 },
      exit: { x: 585, y: 585, w: 116, h: 58 },
      walls: [wall(260, 230, 270, 42), wall(420, 448, 270, 42), wall(650, 230, 270, 42), wall(815, 448, 270, 42), wall(530, 272, 42, 176), wall(690, 272, 42, 176)],
      crates: [crate(420, 510)],
      coinCrates: [coin(420, 190, 56), coin(985, 530, 48)],
      plates: [plate("A", 225, 185), plate("B", 225, 535), plate("C", 710, 360)],
      switches: [sw("D", 1015, 360)],
      doors: [{ x: 584, y: 542, w: 120, h: 32, requires: [], open: false }],
      laserSweepers: [{ x: 665, y: 360, hp: 4, angle: 0.6, speed: 0.0011 }],
      drones: [{ x: 990, y: 185, hp: 2, cooldown: 1000 }],
      lasers: [{ x1: 800, y1: 95, x2: 800, y2: 625, id: "L1", disabledBy: "C" }],
      scrap: scrap([420, 360], [710, 535], [1015, 185])
    },
    {
      name: "Drone Shield Orchard",
      player: { x: 155, y: 565 },
      exit: { x: 1045, y: 82, w: 94, h: 58 },
      walls: [wall(270, 215, 130, 42), wall(270, 460, 130, 42), wall(520, 145, 42, 130), wall(520, 445, 42, 130), wall(700, 300, 160, 42), wall(910, 165, 42, 145), wall(910, 410, 42, 145), wall(1020, 140, 42, 110)],
      crates: [crate(385, 520), crate(630, 185)],
      coinCrates: [coin(385, 185, 58), coin(1005, 520, 50)],
      plates: [plate("A", 215, 185), plate("B", 215, 535), plate("C", 660, 360)],
      switches: [sw("D", 1015, 360)],
      doors: [{ x: 1040, y: 144, w: 108, h: 32, requires: [], open: false }],
      drones: [{ x: 760, y: 185, hp: 2, cooldown: 850 }, { x: 975, y: 500, hp: 3, cooldown: 980 }],
      shieldDrones: [{ x: 940, y: 455, hp: 4, cooldown: 700 }],
      turrets: [{ x: 995, y: 410, hp: 2, cooldown: 900 }],
      scrap: scrap([385, 360], [660, 535], [1015, 250])
    },
    {
      name: "Jammer Drone Canal",
      player: { x: 160, y: 185 },
      exit: { x: 110, y: 505, w: 58, h: 114 },
      walls: [wall(250, 250, 820, 42), wall(250, 428, 820, 42), wall(425, 95, 42, 155), wall(425, 470, 42, 155), wall(690, 95, 42, 155), wall(690, 470, 42, 155), wall(940, 95, 42, 155)],
      crates: [crate(460, 515)],
      coinCrates: [coin(460, 190, 60), coin(1015, 540, 52)],
      plates: [plate("A", 230, 205), plate("B", 230, 520), plate("C", 755, 360)],
      switches: [sw("D", 1015, 360)],
      doors: [{ x: 180, y: 505, w: 42, h: 112, requires: [], open: false }],
      echoJammers: [{ x: 745, y: 210, hp: 5, pulse: 0 }],
      drones: [{ x: 830, y: 520, hp: 2, cooldown: 900 }, { x: 1010, y: 205, hp: 2, cooldown: 1000 }],
      lasers: [{ x1: 500, y1: 95, x2: 500, y2: 625, id: "L1", disabledBy: "A" }, { x1: 850, y1: 95, x2: 850, y2: 625, id: "L2", disabledBy: "C" }],
      scrap: scrap([460, 360], [755, 540], [1015, 205])
    },
    {
      name: "Gravity Missile Gallery",
      player: { x: 170, y: 540 },
      exit: { x: 596, y: 78, w: 100, h: 58 },
      walls: [wall(300, 480, 180, 42), wall(300, 205, 42, 275), wall(480, 205, 185, 42), wall(665, 205, 42, 170), wall(665, 415, 42, 170), wall(850, 475, 210, 42), wall(850, 155, 42, 205)],
      crates: [crate(430, 515)],
      coinCrates: [coin(430, 185, 62), coin(1000, 360, 54)],
      plates: [plate("A", 225, 360), plate("B", 650, 185), plate("C", 650, 535)],
      switches: [sw("D", 1015, 185), sw("E", 1015, 535)],
      doors: [{ x: 590, y: 140, w: 112, h: 32, requires: [], open: false }],
      gravityNodes: [{ x: 650, y: 360, hp: 4, pulse: 0 }],
      missileSentries: [{ x: 865, y: 360, hp: 3, cooldown: 2500, lockMs: 0 }],
      turrets: [{ x: 1000, y: 360, hp: 2, cooldown: 850 }],
      scrap: scrap([430, 360], [650, 260], [1015, 360])
    },
    {
      name: "Repair Sweeper Foundry",
      player: { x: 160, y: 185 },
      exit: { x: 1085, y: 500, w: 58, h: 112 },
      walls: [wall(260, 315, 210, 42), wall(470, 155, 42, 160), wall(470, 357, 42, 185), wall(640, 155, 260, 42), wall(640, 523, 260, 42), wall(900, 197, 42, 326), wall(1010, 315, 42, 150)],
      crates: [crate(430, 520), crate(710, 330)],
      coinCrates: [coin(430, 190, 64), coin(1000, 535, 56)],
      plates: [plate("A", 225, 185), plate("B", 225, 535), plate("C", 700, 360)],
      switches: [sw("D", 1015, 360)],
      doors: [{ x: 1020, y: 500, w: 52, h: 114, requires: [], open: false }],
      laserSweepers: [{ x: 650, y: 360, hp: 4, angle: 1.1, speed: 0.0013 }],
      repairBots: [{ x: 830, y: 360, hp: 3, cooldown: 780 }],
      turrets: [{ x: 900, y: 270, hp: 2, cooldown: 760 }, { x: 900, y: 450, hp: 2, cooldown: 900 }],
      scrap: scrap([430, 360], [700, 535], [1015, 185])
    },
    {
      name: "Blink Jammer Chapel",
      player: { x: 640, y: 585 },
      exit: { x: 596, y: 80, w: 100, h: 58 },
      walls: [wall(280, 320, 270, 42), wall(730, 320, 270, 42), wall(500, 145, 42, 175), wall(742, 145, 42, 175), wall(500, 362, 42, 170), wall(742, 362, 42, 170), wall(585, 252, 110, 42), wall(585, 426, 110, 42)],
      crates: [crate(395, 520)],
      coinCrates: [coin(395, 185, 66), coin(1015, 535, 58)],
      plates: [plate("A", 210, 185), plate("B", 210, 535), plate("C", 650, 360)],
      switches: [sw("D", 1015, 185), sw("E", 1015, 535)],
      doors: [{ x: 590, y: 142, w: 112, h: 32, requires: [], open: false }],
      blinkHunters: [{ x: 790, y: 360, hp: 4, cooldown: 900, blink: 800 }],
      echoJammers: [{ x: 650, y: 185, hp: 5, pulse: 0 }],
      drones: [{ x: 1000, y: 360, hp: 2, cooldown: 950 }],
      scrap: scrap([395, 360], [650, 535], [1015, 360])
    },
    {
      name: "Shielded Reactor Relay",
      player: { x: 160, y: 560 },
      exit: { x: 1052, y: 102, w: 88, h: 58 },
      walls: [wall(260, 505, 250, 42), wall(260, 178, 42, 327), wall(500, 178, 42, 175), wall(500, 415, 42, 132), wall(700, 125, 42, 215), wall(700, 430, 42, 170), wall(870, 250, 245, 42), wall(870, 435, 245, 42)],
      crates: [crate(350, 525), crate(555, 185)],
      coinCrates: [coin(350, 185, 68), coin(1010, 535, 60)],
      plates: [plate("A", 205, 185), plate("B", 555, 535), plate("C", 800, 185)],
      switches: [sw("D", 800, 535), sw("E", 1015, 360)],
      doors: [{ x: 1048, y: 164, w: 100, h: 32, requires: [], open: false }],
      turrets: [{ x: 560, y: 360, hp: 3, cooldown: 650 }, { x: 1000, y: 185, hp: 2, cooldown: 820 }],
      shieldDrones: [{ x: 950, y: 255, hp: 4, cooldown: 700 }],
      repairBots: [{ x: 940, y: 320, hp: 3, cooldown: 850 }],
      core: { x: 1015, y: 360, hp: 7, alive: true },
      scrap: scrap([350, 360], [555, 360], [1015, 220])
    },
    {
      name: "Shield Repair Lockchain",
      player: { x: 155, y: 185 },
      exit: { x: 110, y: 525, w: 58, h: 96 },
      walls: [wall(250, 250, 220, 42), wall(428, 250, 42, 178), wall(428, 428, 220, 42), wall(648, 150, 42, 278), wall(648, 150, 260, 42), wall(866, 192, 42, 278), wall(686, 470, 310, 42), wall(996, 300, 42, 170)],
      crates: [crate(340, 525), crate(700, 185)],
      coinCrates: [coin(340, 185, 72), coin(1025, 535, 62)],
      plates: [plate("A", 205, 185), plate("B", 525, 535), plate("C", 890, 185), plate("D", 890, 535)],
      switches: [sw("E", 525, 185), sw("F", 1030, 360)],
      doors: [{ x: 178, y: 520, w: 42, h: 106, requires: [], open: false }],
      turrets: [{ x: 350, y: 360, hp: 3, cooldown: 700 }, { x: 880, y: 360, hp: 3, cooldown: 760 }],
      drones: [{ x: 1000, y: 535, hp: 2, cooldown: 900 }],
      laserSweepers: [{ x: 525, y: 360, hp: 4, angle: 0.4, speed: 0.001 }],
      shieldDrones: [{ x: 930, y: 315, hp: 4, cooldown: 700 }],
      repairBots: [{ x: 980, y: 455, hp: 3, cooldown: 900 }],
      lasers: [{ x1: 700, y1: 95, x2: 700, y2: 625, id: "L1", disabledBy: "E" }],
      scrap: scrap([350, 185], [525, 360], [890, 360], [1030, 185])
    },
    {
      name: "Salvage Singularity Core",
      player: { x: 640, y: 585 },
      exit: { x: 598, y: 78, w: 100, h: 58 },
      walls: [wall(260, 500, 250, 42), wall(260, 180, 42, 320), wall(470, 180, 260, 42), wall(730, 180, 42, 185), wall(555, 365, 217, 42), wall(555, 407, 42, 135), wall(780, 500, 250, 42), wall(988, 180, 42, 320), wall(778, 180, 250, 42)],
      crates: [crate(325, 525), crate(675, 185), crate(675, 525)],
      coinCrates: [coin(325, 185, 80), coin(1025, 535, 70)],
      plates: [plate("A", 195, 185), plate("B", 500, 535), plate("C", 850, 185), plate("D", 850, 535)],
      switches: [sw("E", 500, 185), sw("F", 1030, 360)],
      doors: [{ x: 592, y: 140, w: 112, h: 32, requires: [], open: false }],
      turrets: [{ x: 325, y: 360, hp: 3, cooldown: 650 }, { x: 875, y: 360, hp: 3, cooldown: 720 }],
      drones: [{ x: 1030, y: 185, hp: 2, cooldown: 800 }, { x: 1030, y: 535, hp: 2, cooldown: 980 }],
      missileSentries: [{ x: 900, y: 250, hp: 3, cooldown: 2700, lockMs: 0 }],
      gravityNodes: [{ x: 650, y: 360, hp: 4, pulse: 0 }],
      echoJammers: [{ x: 690, y: 185, hp: 5, pulse: 0 }],
      blinkHunters: [{ x: 815, y: 535, hp: 4, cooldown: 950, blink: 900 }],
      shieldDrones: [{ x: 965, y: 315, hp: 4, cooldown: 700 }],
      repairBots: [{ x: 985, y: 420, hp: 3, cooldown: 850 }],
      lasers: [{ x1: 710, y1: 95, x2: 710, y2: 625, id: "L1", disabledBy: "E" }],
      core: { x: 1035, y: 360, hp: 10, alive: true },
      scrap: scrap([325, 185], [500, 360], [850, 360], [1030, 250], [1030, 470])
    },
    {
      name: "Cargo Switch Observatory",
      player: { x: 160, y: 555 },
      exit: { x: 1048, y: 84, w: 96, h: 58 },
      walls: [wall(300, 500, 260, 42), wall(300, 180, 42, 320), wall(520, 180, 230, 42), wall(520, 500, 230, 42), wall(750, 250, 42, 250), wall(930, 160, 42, 180), wall(930, 420, 42, 180)],
      crates: [crate(435, 520), crate(650, 185)],
      coinCrates: [coin(440, 360, 82), coin(995, 535, 66)],
      plates: [plate("A", 225, 185), plate("B", 225, 535), plate("C", 805, 535)],
      switches: [sw("D", 805, 185), sw("E", 1030, 360)],
      doors: [{ x: 1042, y: 146, w: 108, h: 32, requires: [], open: false }],
      turrets: [{ x: 650, y: 360, hp: 3, cooldown: 720 }],
      drones: [{ x: 980, y: 515, hp: 2, cooldown: 920 }],
      scrap: scrap([435, 185], [650, 535], [805, 360], [1030, 220])
    },
    {
      name: "Turret Crossfire Library",
      player: { x: 1035, y: 185 },
      exit: { x: 110, y: 510, w: 58, h: 100 },
      walls: [wall(260, 250, 160, 42), wall(260, 430, 160, 42), wall(470, 130, 42, 220), wall(470, 410, 42, 190), wall(690, 185, 42, 350), wall(890, 130, 42, 220), wall(890, 410, 42, 190), wall(560, 320, 250, 42)],
      crates: [crate(810, 185), crate(555, 520)],
      coinCrates: [coin(1000, 535, 84), coin(350, 185, 68)],
      plates: [plate("A", 1015, 535), plate("B", 650, 535), plate("C", 230, 185)],
      switches: [sw("D", 230, 535), sw("E", 560, 185)],
      doors: [{ x: 178, y: 505, w: 42, h: 110, requires: [], open: false }],
      turrets: [{ x: 610, y: 185, hp: 3, cooldown: 760 }, { x: 820, y: 530, hp: 3, cooldown: 860 }, { x: 365, y: 360, hp: 2, cooldown: 980 }],
      scrap: scrap([1010, 360], [650, 185], [365, 535], [230, 360])
    },
    {
      name: "Drone Fork Hangar",
      player: { x: 160, y: 180 },
      exit: { x: 1045, y: 580, w: 96, h: 58 },
      walls: [wall(255, 250, 290, 42), wall(255, 430, 290, 42), wall(545, 110, 42, 180), wall(545, 470, 42, 150), wall(730, 250, 280, 42), wall(730, 430, 280, 42), wall(990, 292, 42, 138)],
      crates: [crate(455, 520), crate(745, 185)],
      coinCrates: [coin(455, 185, 86), coin(995, 360, 70)],
      plates: [plate("A", 230, 535), plate("B", 650, 185), plate("C", 650, 535)],
      switches: [sw("D", 1030, 185), sw("E", 1030, 535)],
      doors: [{ x: 1040, y: 535, w: 108, h: 32, requires: [], open: false }],
      drones: [{ x: 520, y: 360, hp: 2, cooldown: 860 }, { x: 820, y: 185, hp: 3, cooldown: 940 }, { x: 920, y: 535, hp: 3, cooldown: 1000 }],
      scrap: scrap([455, 360], [650, 360], [1030, 360])
    },
    {
      name: "Missile Dash Parabola",
      player: { x: 160, y: 600 },
      exit: { x: 595, y: 82, w: 108, h: 58 },
      walls: [wall(275, 520, 250, 42), wall(275, 155, 42, 365), wall(500, 155, 200, 42), wall(700, 155, 42, 185), wall(700, 430, 42, 160), wall(840, 360, 240, 42), wall(1035, 155, 42, 245)],
      crates: [crate(405, 185), crate(825, 510)],
      coinCrates: [coin(405, 360, 88), coin(1000, 535, 72)],
      plates: [plate("A", 225, 185), plate("B", 595, 535), plate("C", 965, 535)],
      switches: [sw("D", 965, 185), sw("E", 595, 360)],
      doors: [{ x: 590, y: 144, w: 116, h: 32, requires: [], open: false }],
      missileSentries: [{ x: 855, y: 250, hp: 3, cooldown: 2600, lockMs: 0 }, { x: 1015, y: 480, hp: 3, cooldown: 2900, lockMs: 0 }],
      turrets: [{ x: 565, y: 205, hp: 2, cooldown: 920 }],
      scrap: scrap([405, 535], [595, 185], [965, 360])
    },
    {
      name: "Gravity Plate Crucible",
      player: { x: 165, y: 175 },
      exit: { x: 110, y: 510, w: 58, h: 100 },
      walls: [wall(265, 235, 220, 42), wall(265, 455, 220, 42), wall(485, 140, 42, 235), wall(485, 455, 42, 145), wall(700, 140, 42, 235), wall(700, 415, 42, 185), wall(895, 235, 240, 42), wall(895, 455, 240, 42)],
      crates: [crate(385, 525), crate(810, 185)],
      coinCrates: [coin(385, 185, 90), coin(1030, 535, 74)],
      plates: [plate("A", 220, 185), plate("B", 220, 535), plate("C", 610, 360), plate("D", 1015, 185)],
      switches: [sw("E", 1015, 535)],
      doors: [{ x: 178, y: 505, w: 42, h: 110, requires: [], open: false }],
      gravityNodes: [{ x: 610, y: 220, hp: 4, pulse: 0 }, { x: 845, y: 520, hp: 4, pulse: 0 }],
      drones: [{ x: 1030, y: 360, hp: 2, cooldown: 960 }],
      scrap: scrap([385, 360], [610, 535], [845, 185], [1015, 360])
    },
    {
      name: "Jammer Timing Cloister",
      player: { x: 640, y: 590 },
      exit: { x: 592, y: 80, w: 112, h: 58 },
      walls: [wall(275, 300, 250, 42), wall(755, 300, 250, 42), wall(420, 125, 42, 175), wall(420, 342, 42, 185), wall(835, 125, 42, 175), wall(835, 342, 42, 185), wall(560, 430, 160, 42), wall(560, 215, 160, 42)],
      crates: [crate(385, 520), crate(905, 520)],
      coinCrates: [coin(385, 185, 92), coin(905, 185, 76)],
      plates: [plate("A", 215, 185), plate("B", 215, 535), plate("C", 1015, 535)],
      switches: [sw("D", 1015, 185), sw("E", 650, 360)],
      doors: [{ x: 586, y: 142, w: 124, h: 32, requires: [], open: false }],
      echoJammers: [{ x: 650, y: 235, hp: 5, pulse: 0 }],
      turrets: [{ x: 805, y: 360, hp: 3, cooldown: 780 }],
      drones: [{ x: 1015, y: 360, hp: 2, cooldown: 960 }],
      scrap: scrap([385, 360], [650, 535], [905, 360])
    },
    {
      name: "Sweeper Cargo Weave",
      player: { x: 155, y: 185 },
      exit: { x: 1085, y: 505, w: 58, h: 106 },
      walls: [wall(260, 250, 240, 42), wall(405, 430, 240, 42), wall(645, 250, 240, 42), wall(805, 430, 240, 42), wall(500, 292, 42, 138), wall(885, 292, 42, 138)],
      crates: [crate(420, 520), crate(720, 185)],
      coinCrates: [coin(420, 185, 94), coin(1000, 535, 78)],
      plates: [plate("A", 225, 185), plate("B", 225, 535), plate("C", 685, 535), plate("D", 1015, 185)],
      switches: [sw("E", 685, 360), sw("F", 1015, 360)],
      doors: [{ x: 1020, y: 500, w: 52, h: 116, requires: [], open: false }],
      laserSweepers: [{ x: 650, y: 360, hp: 4, angle: 0.2, speed: 0.0012 }, { x: 930, y: 360, hp: 4, angle: 1.6, speed: 0.001 }],
      drones: [{ x: 990, y: 205, hp: 2, cooldown: 1050 }],
      lasers: [{ x1: 790, y1: 95, x2: 790, y2: 625, id: "L1", disabledBy: "E" }],
      scrap: scrap([420, 360], [685, 185], [1015, 535])
    },
    {
      name: "Shield Drone Bastion",
      player: { x: 1035, y: 560 },
      exit: { x: 110, y: 90, w: 58, h: 104 },
      walls: [wall(250, 245, 250, 42), wall(250, 500, 250, 42), wall(500, 120, 42, 165), wall(500, 380, 42, 220), wall(725, 185, 42, 360), wall(930, 245, 42, 255), wall(610, 315, 130, 42)],
      crates: [crate(820, 520), crate(370, 185)],
      coinCrates: [coin(820, 185, 96), coin(370, 535, 80)],
      plates: [plate("A", 1020, 185), plate("B", 1020, 535), plate("C", 610, 535)],
      switches: [sw("D", 220, 185), sw("E", 220, 535)],
      doors: [{ x: 178, y: 124, w: 42, h: 114, requires: [], open: false }],
      turrets: [{ x: 760, y: 360, hp: 3, cooldown: 720 }, { x: 965, y: 225, hp: 3, cooldown: 840 }],
      drones: [{ x: 920, y: 510, hp: 2, cooldown: 950 }],
      shieldDrones: [{ x: 870, y: 310, hp: 4, cooldown: 700 }],
      scrap: scrap([820, 360], [610, 185], [370, 360], [220, 360])
    },
    {
      name: "Repair Turret Depot",
      player: { x: 165, y: 175 },
      exit: { x: 1045, y: 580, w: 96, h: 58 },
      walls: [wall(285, 235, 260, 42), wall(285, 455, 260, 42), wall(545, 120, 42, 155), wall(545, 497, 42, 105), wall(760, 165, 42, 430), wall(960, 235, 42, 275), wall(640, 340, 160, 42)],
      crates: [crate(430, 520), crate(860, 185)],
      coinCrates: [coin(430, 185, 98), coin(1000, 360, 82)],
      plates: [plate("A", 225, 185), plate("B", 225, 535), plate("C", 635, 535)],
      switches: [sw("D", 635, 185), sw("E", 1015, 535)],
      doors: [{ x: 1040, y: 535, w: 108, h: 32, requires: [], open: false }],
      turrets: [{ x: 660, y: 360, hp: 3, cooldown: 680 }, { x: 870, y: 300, hp: 3, cooldown: 760 }, { x: 870, y: 450, hp: 3, cooldown: 860 }],
      repairBots: [{ x: 805, y: 375, hp: 3, cooldown: 800 }],
      drones: [{ x: 1015, y: 200, hp: 2, cooldown: 980 }],
      scrap: scrap([430, 360], [635, 360], [1015, 185])
    },
    {
      name: "Blink Hunter Labyrinth",
      player: { x: 1035, y: 545 },
      exit: { x: 110, y: 305, w: 58, h: 114 },
      walls: [wall(250, 120, 42, 210), wall(250, 430, 42, 210), wall(430, 205, 220, 42), wall(430, 470, 220, 42), wall(650, 120, 42, 210), wall(650, 430, 42, 210), wall(820, 205, 220, 42), wall(820, 470, 220, 42), wall(520, 335, 160, 42)],
      crates: [crate(860, 520)],
      coinCrates: [coin(860, 185, 100), coin(385, 535, 84)],
      plates: [plate("A", 1015, 185), plate("B", 1015, 535), plate("C", 600, 185), plate("D", 385, 535)],
      switches: [sw("E", 220, 185), sw("F", 220, 535)],
      doors: [{ x: 178, y: 305, w: 42, h: 112, requires: [], open: false }],
      blinkHunters: [{ x: 790, y: 360, hp: 4, cooldown: 900, blink: 800 }, { x: 470, y: 360, hp: 4, cooldown: 1050, blink: 1100 }],
      drones: [{ x: 600, y: 535, hp: 2, cooldown: 980 }],
      scrap: scrap([860, 360], [600, 360], [385, 185], [220, 360])
    },
    {
      name: "Gravity Missile Canal",
      player: { x: 160, y: 560 },
      exit: { x: 596, y: 82, w: 104, h: 58 },
      walls: [wall(255, 250, 880, 42), wall(255, 440, 880, 42), wall(390, 95, 42, 155), wall(390, 482, 42, 135), wall(615, 180, 42, 70), wall(615, 482, 42, 135), wall(840, 95, 42, 155), wall(1010, 482, 42, 135)],
      crates: [crate(440, 520), crate(900, 185)],
      coinCrates: [coin(440, 185, 102), coin(1020, 535, 86)],
      plates: [plate("A", 225, 185), plate("B", 225, 535), plate("C", 685, 535)],
      switches: [sw("D", 685, 185), sw("E", 1015, 185), sw("F", 1015, 535)],
      doors: [{ x: 590, y: 144, w: 116, h: 32, requires: [], open: false }],
      gravityNodes: [{ x: 650, y: 360, hp: 4, pulse: 0 }],
      missileSentries: [{ x: 835, y: 360, hp: 3, cooldown: 2500, lockMs: 0 }, { x: 1030, y: 360, hp: 3, cooldown: 3000, lockMs: 0 }],
      turrets: [{ x: 500, y: 360, hp: 2, cooldown: 900 }],
      scrap: scrap([440, 360], [685, 360], [1015, 360])
    },
    {
      name: "Echo Jammer Switchyard",
      player: { x: 155, y: 180 },
      exit: { x: 1085, y: 505, w: 58, h: 106 },
      walls: [wall(260, 145, 42, 205), wall(260, 430, 42, 185), wall(455, 250, 240, 42), wall(455, 470, 240, 42), wall(695, 110, 42, 180), wall(695, 512, 42, 105), wall(910, 235, 42, 290), wall(1010, 330, 42, 160)],
      crates: [crate(430, 520), crate(785, 185)],
      coinCrates: [coin(430, 185, 104), coin(1005, 535, 88)],
      plates: [plate("A", 225, 535), plate("B", 575, 185), plate("C", 575, 535)],
      switches: [sw("D", 225, 185), sw("E", 1015, 185), sw("F", 1015, 360)],
      doors: [{ x: 1020, y: 500, w: 52, h: 116, requires: [], open: false }],
      echoJammers: [{ x: 760, y: 360, hp: 5, pulse: 0 }],
      turrets: [{ x: 945, y: 205, hp: 3, cooldown: 760 }],
      drones: [{ x: 945, y: 520, hp: 3, cooldown: 980 }, { x: 600, y: 360, hp: 2, cooldown: 900 }],
      lasers: [{ x1: 820, y1: 95, x2: 820, y2: 625, id: "L1", disabledBy: "E" }],
      scrap: scrap([430, 360], [575, 360], [1015, 225], [1015, 535])
    },
    {
      name: "Sweeper Shield Gallery",
      player: { x: 640, y: 585 },
      exit: { x: 596, y: 82, w: 104, h: 58 },
      walls: [wall(270, 500, 250, 42), wall(270, 180, 42, 320), wall(520, 180, 42, 170), wall(520, 420, 42, 160), wall(735, 180, 42, 170), wall(735, 420, 42, 160), wall(910, 250, 250, 42), wall(910, 455, 250, 42), wall(590, 325, 130, 42)],
      crates: [crate(360, 520), crate(840, 520)],
      coinCrates: [coin(360, 185, 106), coin(1000, 535, 90)],
      plates: [plate("A", 205, 185), plate("B", 205, 535), plate("C", 845, 185), plate("D", 845, 535)],
      switches: [sw("E", 500, 360), sw("F", 1030, 360)],
      doors: [{ x: 590, y: 144, w: 116, h: 32, requires: [], open: false }],
      laserSweepers: [{ x: 660, y: 360, hp: 4, angle: 0.8, speed: 0.0012 }],
      turrets: [{ x: 935, y: 300, hp: 3, cooldown: 760 }, { x: 935, y: 470, hp: 3, cooldown: 880 }],
      shieldDrones: [{ x: 870, y: 360, hp: 4, cooldown: 700 }],
      scrap: scrap([360, 360], [660, 535], [845, 360], [1030, 185])
    },
    {
      name: "Repair Drone Orchard",
      player: { x: 1035, y: 185 },
      exit: { x: 110, y: 520, w: 58, h: 96 },
      walls: [wall(260, 245, 180, 42), wall(260, 500, 180, 42), wall(475, 130, 42, 170), wall(475, 412, 42, 190), wall(700, 245, 250, 42), wall(700, 500, 250, 42), wall(940, 287, 42, 213), wall(585, 350, 160, 42)],
      crates: [crate(835, 520), crate(365, 185)],
      coinCrates: [coin(835, 185, 108), coin(365, 535, 92)],
      plates: [plate("A", 1015, 535), plate("B", 650, 185), plate("C", 365, 535)],
      switches: [sw("D", 1015, 360), sw("E", 220, 185), sw("F", 220, 535)],
      doors: [{ x: 178, y: 515, w: 42, h: 106, requires: [], open: false }],
      drones: [{ x: 740, y: 360, hp: 3, cooldown: 860 }, { x: 600, y: 535, hp: 3, cooldown: 960 }, { x: 390, y: 360, hp: 2, cooldown: 1050 }],
      turrets: [{ x: 600, y: 185, hp: 2, cooldown: 840 }],
      repairBots: [{ x: 650, y: 420, hp: 3, cooldown: 780 }],
      scrap: scrap([835, 360], [650, 535], [365, 360], [220, 360])
    },
    {
      name: "Core Cargo Furnace",
      player: { x: 160, y: 560 },
      exit: { x: 1045, y: 82, w: 96, h: 58 },
      walls: [wall(260, 500, 250, 42), wall(260, 175, 42, 325), wall(500, 175, 42, 170), wall(500, 415, 42, 160), wall(720, 175, 42, 170), wall(720, 415, 42, 160), wall(900, 250, 230, 42), wall(900, 455, 230, 42)],
      crates: [crate(350, 525), crate(610, 185), crate(820, 525)],
      coinCrates: [coin(350, 185, 110), coin(1000, 535, 94)],
      plates: [plate("A", 205, 185), plate("B", 555, 535), plate("C", 830, 185), plate("D", 830, 535)],
      switches: [sw("E", 555, 185), sw("F", 1015, 360)],
      doors: [{ x: 1040, y: 144, w: 108, h: 32, requires: [], open: false }],
      turrets: [{ x: 610, y: 360, hp: 3, cooldown: 720 }, { x: 965, y: 225, hp: 3, cooldown: 820 }],
      drones: [{ x: 965, y: 525, hp: 3, cooldown: 980 }],
      core: { x: 1015, y: 360, hp: 8, alive: true },
      scrap: scrap([350, 360], [555, 360], [830, 360], [1015, 220])
    },
    {
      name: "Blink Missile Reliquary",
      player: { x: 640, y: 585 },
      exit: { x: 596, y: 82, w: 104, h: 58 },
      walls: [wall(260, 320, 260, 42), wall(780, 320, 260, 42), wall(430, 145, 42, 175), wall(430, 362, 42, 180), wall(780, 145, 42, 175), wall(780, 362, 42, 180), wall(555, 230, 150, 42), wall(555, 452, 150, 42), wall(960, 150, 42, 160)],
      crates: [crate(380, 520), crate(910, 520)],
      coinCrates: [coin(380, 185, 112), coin(910, 185, 96)],
      plates: [plate("A", 215, 185), plate("B", 215, 535), plate("C", 1015, 185), plate("D", 1015, 535)],
      switches: [sw("E", 650, 360), sw("F", 1015, 360)],
      doors: [{ x: 590, y: 144, w: 116, h: 32, requires: [], open: false }],
      blinkHunters: [{ x: 775, y: 360, hp: 4, cooldown: 900, blink: 800 }],
      missileSentries: [{ x: 925, y: 250, hp: 3, cooldown: 2600, lockMs: 0 }],
      drones: [{ x: 1015, y: 520, hp: 2, cooldown: 1000 }],
      scrap: scrap([380, 360], [650, 535], [910, 360], [1015, 250])
    },
    {
      name: "Gravity Shield Foundry",
      player: { x: 155, y: 185 },
      exit: { x: 1085, y: 500, w: 58, h: 112 },
      walls: [wall(260, 250, 210, 42), wall(260, 455, 210, 42), wall(470, 135, 42, 160), wall(470, 497, 42, 105), wall(690, 135, 42, 235), wall(690, 430, 42, 170), wall(890, 250, 240, 42), wall(890, 455, 240, 42), wall(560, 350, 150, 42)],
      crates: [crate(395, 520), crate(810, 185)],
      coinCrates: [coin(395, 185, 114), coin(1005, 535, 98)],
      plates: [plate("A", 225, 185), plate("B", 225, 535), plate("C", 790, 535)],
      switches: [sw("D", 790, 185), sw("E", 1015, 360)],
      doors: [{ x: 1020, y: 500, w: 52, h: 114, requires: [], open: false }],
      gravityNodes: [{ x: 650, y: 360, hp: 4, pulse: 0 }],
      turrets: [{ x: 925, y: 300, hp: 3, cooldown: 740 }, { x: 925, y: 470, hp: 3, cooldown: 880 }],
      shieldDrones: [{ x: 860, y: 360, hp: 4, cooldown: 700 }],
      drones: [{ x: 1015, y: 205, hp: 2, cooldown: 980 }],
      scrap: scrap([395, 360], [790, 360], [1015, 185], [1015, 535])
    },
    {
      name: "Jammer Repair Cathedral",
      player: { x: 1035, y: 560 },
      exit: { x: 110, y: 90, w: 58, h: 104 },
      walls: [wall(250, 500, 250, 42), wall(250, 178, 42, 322), wall(480, 178, 42, 160), wall(480, 420, 42, 160), wall(700, 140, 42, 235), wall(700, 430, 42, 170), wall(900, 245, 42, 255), wall(560, 305, 150, 42), wall(560, 385, 150, 42)],
      crates: [crate(820, 520), crate(360, 185)],
      coinCrates: [coin(820, 185, 116), coin(360, 535, 100)],
      plates: [plate("A", 1015, 185), plate("B", 1015, 535), plate("C", 600, 535)],
      switches: [sw("D", 220, 185), sw("E", 220, 535), sw("F", 600, 185)],
      doors: [{ x: 178, y: 124, w: 42, h: 114, requires: [], open: false }],
      echoJammers: [{ x: 620, y: 250, hp: 5, pulse: 0 }],
      turrets: [{ x: 790, y: 330, hp: 3, cooldown: 720 }, { x: 895, y: 500, hp: 3, cooldown: 880 }],
      drones: [{ x: 550, y: 520, hp: 2, cooldown: 980 }],
      repairBots: [{ x: 820, y: 410, hp: 3, cooldown: 800 }],
      scrap: scrap([820, 360], [600, 360], [360, 360], [220, 360])
    },
    {
      name: "Singularity Lock Garden",
      player: { x: 160, y: 560 },
      exit: { x: 596, y: 82, w: 104, h: 58 },
      walls: [wall(250, 505, 250, 42), wall(250, 180, 42, 325), wall(500, 180, 42, 165), wall(500, 430, 42, 160), wall(720, 180, 42, 165), wall(720, 430, 42, 160), wall(940, 180, 42, 325), wall(555, 300, 170, 42), wall(555, 395, 170, 42), wall(835, 300, 170, 42)],
      crates: [crate(350, 525), crate(610, 185), crate(820, 525)],
      coinCrates: [coin(350, 185, 120), coin(1030, 535, 104)],
      plates: [plate("A", 205, 185), plate("B", 205, 535), plate("C", 610, 535), plate("D", 845, 185)],
      switches: [sw("E", 610, 360), sw("F", 1030, 360)],
      doors: [{ x: 590, y: 144, w: 116, h: 32, requires: [], open: false }],
      gravityNodes: [{ x: 650, y: 250, hp: 4, pulse: 0 }],
      laserSweepers: [{ x: 650, y: 450, hp: 4, angle: 1.1, speed: 0.0011 }],
      missileSentries: [{ x: 875, y: 360, hp: 3, cooldown: 2700, lockMs: 0 }],
      shieldDrones: [{ x: 920, y: 305, hp: 4, cooldown: 700 }],
      turrets: [{ x: 985, y: 250, hp: 3, cooldown: 780 }],
      core: { x: 1030, y: 455, hp: 9, alive: true },
      scrap: scrap([350, 360], [610, 535], [845, 535], [1030, 250])
    },
    {
      name: "Crown Reactor Gauntlet",
      player: { x: 640, y: 585 },
      exit: { x: 596, y: 80, w: 104, h: 58 },
      walls: [wall(240, 500, 265, 42), wall(240, 180, 42, 320), wall(455, 180, 42, 165), wall(455, 430, 42, 160), wall(640, 180, 42, 190), wall(640, 430, 42, 170), wall(825, 180, 42, 165), wall(825, 430, 42, 160), wall(1000, 180, 42, 320), wall(535, 305, 130, 42), wall(715, 385, 130, 42)],
      crates: [crate(330, 525), crate(540, 185), crate(820, 525)],
      coinCrates: [coin(330, 185, 130), coin(1030, 535, 110)],
      plates: [plate("A", 195, 185), plate("B", 195, 535), plate("C", 500, 535), plate("D", 850, 185)],
      switches: [sw("E", 500, 185), sw("F", 850, 535), sw("G", 1030, 360)],
      doors: [{ x: 590, y: 142, w: 116, h: 32, requires: [], open: false }],
      turrets: [{ x: 330, y: 360, hp: 3, cooldown: 680 }, { x: 900, y: 360, hp: 3, cooldown: 740 }],
      drones: [{ x: 1030, y: 205, hp: 3, cooldown: 900 }, { x: 1030, y: 535, hp: 3, cooldown: 1000 }],
      missileSentries: [{ x: 780, y: 250, hp: 3, cooldown: 2600, lockMs: 0 }],
      gravityNodes: [{ x: 650, y: 360, hp: 4, pulse: 0 }],
      echoJammers: [{ x: 650, y: 205, hp: 5, pulse: 0 }],
      laserSweepers: [{ x: 780, y: 480, hp: 4, angle: 0.7, speed: 0.001 }],
      blinkHunters: [{ x: 865, y: 535, hp: 4, cooldown: 950, blink: 900 }],
      shieldDrones: [{ x: 950, y: 300, hp: 4, cooldown: 700 }],
      repairBots: [{ x: 960, y: 435, hp: 3, cooldown: 850 }],
      core: { x: 1035, y: 360, hp: 11, alive: true },
      scrap: scrap([330, 360], [500, 360], [850, 360], [1030, 250], [1030, 470])
    }
  ];

  const layout = layouts[index] || fallback;
  const base = {
    ...fallback,
    ...layout,
    name: rooms[index] || layout.name || fallback.name,
    theme: index,
    walls: [...shell, ...(layout.walls || fallback.walls)],
    crates: layout.crates || [],
    coinCrates: layout.coinCrates?.length ? layout.coinCrates : [
    { x: 335 + (index % 4) * 90, y: 560 - (index % 3) * 80, w: 34, h: 34, value: 10 + index * 2, taken: false },
    { x: 880 - (index % 5) * 45, y: 165 + (index % 4) * 70, w: 34, h: 34, value: 8 + index, taken: false }
    ],
    plates: layout.plates || fallback.plates,
    switches: layout.switches || fallback.switches,
    doors: layout.doors || fallback.doors,
    turrets: layout.turrets || [],
    drones: layout.drones || [],
    missileSentries: layout.missileSentries || [],
    gravityNodes: layout.gravityNodes || [],
    echoJammers: layout.echoJammers || [],
    laserSweepers: layout.laserSweepers || [],
    blinkHunters: layout.blinkHunters || [],
    shieldDrones: layout.shieldDrones || [],
    repairBots: layout.repairBots || [],
    lasers: layout.lasers || [],
    scrap: layout.scrap || fallback.scrap,
    core: layout.core || null
  };
  return structuredClone(finalizeStockLevel(base));
}

const rectsTouch = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const playerRect = (p) => ({ x: p.x - 15, y: p.y - 15, w: 30, h: 30 });
const getSolidBlocks = (level) => [...level.walls, ...level.doors.filter((d) => !d.open), ...level.crates];
const SPECIAL_HOSTILE_KEYS = ["gravityNodes", "echoJammers", "laserSweepers", "blinkHunters", "shieldDrones", "repairBots"];
const LEVEL_ARRAY_KEYS = ["walls", "crates", "coinCrates", "plates", "switches", "doors", "turrets", "drones", "missileSentries", ...SPECIAL_HOSTILE_KEYS, "lasers", "scrap"];

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
  LEVEL_ARRAY_KEYS.forEach((key) => {
    level[key] = level[key] || [];
  });
  level.exit = level.exit || { x: 1160, y: 360, w: 58, h: 114 };
  const preferred = {
    x: Number.isFinite(level.player?.x) ? level.player.x : 160,
    y: Number.isFinite(level.player?.y) ? level.player.y : 360
  };
  const solidBlocks = () => getSolidBlocks(level);
  const hostiles = () => [
    ...(level.turrets || []),
    ...(level.drones || []),
    ...(level.missileSentries || []),
    ...SPECIAL_HOSTILE_KEYS.flatMap((key) => level[key] || [])
  ].filter((hostile) => (hostile.hp ?? 1) > 0);
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

function finalizeStockLevel(level) {
  LEVEL_ARRAY_KEYS.forEach((key) => {
    level[key] = level[key] || [];
  });
  const maxHeldPlates = 1 + MAX_ECHOES + level.crates.length;
  if (level.plates.length > maxHeldPlates) {
    const kept = new Set(level.plates.slice(0, maxHeldPlates).map((p) => p.id));
    level.plates = level.plates.filter((p) => kept.has(p.id));
    level.lasers = level.lasers.filter((l) => kept.has(l.disabledBy) || level.switches.some((s) => s.id === l.disabledBy));
  }
  const plateIds = level.plates.map((p) => p.id);
  const switchIds = level.switches.map((s) => s.id);
  level.doors.forEach((door) => {
    door.requires = [...new Set([...plateIds, ...switchIds])];
  });
  level.crates.forEach((crate) => {
    crate.role = "plate-weight";
  });
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

function glowRect(ctx, x, y, w, h, color, fill, glow = 16, line = 3) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  ctx.fillStyle = fill;
  ctx.strokeStyle = color;
  ctx.lineWidth = line;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x + 0.5, y + 0.5, w, h);
  ctx.restore();
}

function drawLabel(ctx, text, x, y, color = "#ffd52d") {
  const pad = 7;
  ctx.save();
  ctx.font = "900 13px Rajdhani, Bahnschrift, sans-serif";
  ctx.textBaseline = "middle";
  const width = ctx.measureText(text).width + pad * 2;
  ctx.fillStyle = "rgba(5, 13, 16, 0.9)";
  ctx.strokeStyle = "rgba(75, 116, 128, 0.7)";
  ctx.lineWidth = 1;
  ctx.fillRect(x, y - 11, width, 22);
  ctx.strokeRect(x + 0.5, y - 10.5, width, 22);
  ctx.fillStyle = color;
  ctx.fillText(text, x + pad, y);
  ctx.restore();
}

function drawHealthBar(ctx, x, y, value, max, color = "#ff4e41") {
  const width = 46;
  const height = 6;
  const fill = clamp(value / max, 0, 1);
  ctx.save();
  ctx.fillStyle = "rgba(5, 13, 16, 0.9)";
  ctx.strokeStyle = "rgba(75, 116, 128, 0.85)";
  ctx.lineWidth = 1;
  ctx.fillRect(x - width / 2, y, width, height);
  ctx.strokeRect(x - width / 2 + 0.5, y + 0.5, width, height);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.fillRect(x - width / 2 + 1, y + 1, (width - 2) * fill, height - 2);
  ctx.restore();
}

function Button({ children, primary, danger, className = "", ...props }) {
  return (
    <button className={`btn ${primary ? "btn-primary" : ""} ${danger ? "btn-danger" : ""} ${className}`} {...props}>
      {children}
    </button>
  );
}

function AvatarBadge({ avatar = "yellow", size = "md" }) {
  const selected = AVATARS.find((item) => item.id === avatar) || AVATARS[0];
  return (
    <span className={`avatar-badge avatar-${size}`} style={{ "--avatar-main": selected.colors[0], "--avatar-bg": selected.colors[1] }}>
      <span />
    </span>
  );
}

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("signup");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const cleanNick = nickname.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    if (cleanNick.length < 2) {
      setMessage("Nickname needs at least 2 characters.");
      return;
    }
    if (cleanPassword.length < 4) {
      setMessage("Password needs at least 4 characters.");
      return;
    }
    setBusy(true);
    if (cleanNick.toLowerCase() === DEV_LOGIN.nickname && cleanPassword === DEV_LOGIN.password) {
      const users = getStoredUsers();
      const existing = users.find((u) => u.nickname.toLowerCase() === DEV_LOGIN.nickname);
      const devUser = {
        ...(existing || {}),
        id: existing?.id || "dev-local-profile",
        nickname: DEV_LOGIN.nickname,
        email: existing?.email || "",
        password: DEV_LOGIN.password,
        avatar: existing?.avatar || "gold",
        cosmetic: existing?.cosmetic || COSMETIC_DEFAULTS,
        coins: DEV_COINS,
        owned: {
          colors: UNIVERSAL_COLORS,
          bodies: BODY_COLORS,
          trails: TRAIL_COLORS,
          frames: DRONE_FRAMES.map((frame) => frame.id),
          cockpits: COCKPITS.map((cockpit) => cockpit.id),
          engines: ENGINES.map((engine) => engine.id),
          decals: DECALS.map((decal) => decal.id),
          armors: ARMORS.map((armor) => armor.id),
          pets: PETS.map((pet) => pet.id),
          dashes: DASH_STYLES.map((dash) => dash.id),
          weapons: WEAPONS.map((weapon) => weapon.id),
          abilities: ABILITIES.map((ability) => ability.id)
        },
        devMode: true,
        sessionNonce: makeRandomHex(16),
        sessionExpiresAt: Date.now() + AUTH_SESSION_TTL_MS,
        createdAt: existing?.createdAt || new Date().toISOString()
      };
      saveStoredUsers([devUser, ...users.filter((u) => u.id !== devUser.id && u.nickname.toLowerCase() !== DEV_LOGIN.nickname)]);
      const session = makeSession(devUser);
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
      onAuth(session);
      setBusy(false);
      return;
    }
    try {
      const users = getStoredUsers();
      const found = users.find((u) => u.nickname.toLowerCase() === cleanNick.toLowerCase());
      if (mode === "signup") {
        if (found) {
          setMessage("That nickname is already registered.");
          setBusy(false);
          return;
        }
        const passwordRecord = await createPasswordRecord(cleanPassword);
        const sessionNonce = makeRandomHex(16);
        const sessionExpiresAt = Date.now() + AUTH_SESSION_TTL_MS;
        const user = {
          id: crypto.randomUUID?.() || `${Date.now()}`,
          nickname: cleanNick,
          email: cleanEmail,
          avatar: "yellow",
          cosmetic: COSMETIC_DEFAULTS,
          coins: 25,
          owned: DEFAULT_OWNED,
          createdAt: new Date().toISOString(),
          sessionNonce,
          sessionExpiresAt,
          ...passwordRecord
        };
        saveStoredUsers([...users, user]);
        const session = makeSession(user);
        localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
        onAuth(session);
        setBusy(false);
        return;
      }
      if (!found || !(await verifyStoredPassword(found, cleanPassword))) {
        setMessage("Nickname or password is incorrect.");
        setBusy(false);
        return;
      }
      let updated = { ...found };
      if (!updated.passwordHash || !updated.passwordSalt) {
        const passwordRecord = await createPasswordRecord(cleanPassword);
        updated = { ...updated, ...passwordRecord };
        delete updated.password;
      }
      updated.sessionNonce = makeRandomHex(16);
      updated.sessionExpiresAt = Date.now() + AUTH_SESSION_TTL_MS;
      const session = updateStoredUserProfile(updated);
      onAuth(session);
    } catch {
      setMessage("Login storage failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overlay auth-overlay">
      <div className="auth-grid">
        <section className="panel auth-panel">
          <div className="panel-header">
            <span className="badge">Crew Access</span>
            <span className="status-pill">Local Save</span>
          </div>
          <h1 className="title auth-title">Echo Salvage</h1>
          <p className="lead">Create a station profile or return with your nickname and password. Email is optional.</p>
          <div className="auth-tabs" role="tablist" aria-label="Account mode">
            <button data-active={mode === "signup"} onClick={() => { setMode("signup"); setMessage(""); }} type="button"><UserPlus size={18} /> Sign Up</button>
            <button data-active={mode === "login"} onClick={() => { setMode("login"); setMessage(""); }} type="button"><Lock size={18} /> Login</button>
          </div>
          <form className="auth-form" onSubmit={submit}>
            <label>
              <span><UserRound size={16} /> Nickname</span>
              <input value={nickname} onChange={(e) => setNickname(e.target.value)} autoComplete="username" placeholder="salvage-pilot" />
            </label>
            {mode === "signup" && (
              <label>
                <span><Mail size={16} /> Email optional</span>
                <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" placeholder="pilot@example.com" />
              </label>
            )}
            <label>
              <span><Lock size={16} /> Password</span>
              <input value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} type="password" placeholder="4+ characters" />
            </label>
            {message && <p className="auth-message">{message}</p>}
            <Button primary className="auth-submit" type="submit">{busy ? "Securing Access..." : mode === "signup" ? "Create Profile" : "Enter Station"}</Button>
          </form>
        </section>
        <section className="panel auth-brief">
          <Brief icon={<UserRound />} title="Nickname Required" text="Your callsign appears on this browser profile and can be used to login later." />
          <Brief icon={<Mail />} title="Email Optional" text="Leave email blank if you want. Nickname and password are enough for this local build." />
          <Brief icon={<Shield />} title="Prototype Storage" text="Accounts are saved locally in this browser for testing the flow." />
        </section>
      </div>
    </div>
  );
}

function useAmbient(settings) {
  const audio = useRef(null);
  useEffect(() => {
    if (!settings.music) {
      audio.current?.ctx?.close();
      audio.current = null;
      return;
    }
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.gain.value = settings.volume * 0.08;
    gain.connect(ctx.destination);
    const notes = [146.83, 196, 246.94, 293.66];
    const oscillators = notes.map((n, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = i % 2 ? "triangle" : "sine";
      osc.frequency.value = n;
      g.gain.value = 0.18 / notes.length;
      osc.connect(g).connect(gain);
      osc.start();
      return { osc, g };
    });
    const timer = setInterval(() => {
      oscillators.forEach(({ osc, g }, i) => {
        const now = ctx.currentTime;
        osc.frequency.linearRampToValueAtTime(notes[(i + Math.floor(now / 8)) % notes.length] * (i > 1 ? 0.5 : 1), now + 3);
        g.gain.linearRampToValueAtTime((0.11 + Math.random() * 0.08) / notes.length, now + 2.5);
      });
    }, 3800);
    audio.current = { ctx, timer };
    return () => {
      clearInterval(timer);
      ctx.close();
    };
  }, [settings.music, settings.volume]);
}

function drawLevel(ctx, level, game, shake = 0, cosmetic = COSMETIC_DEFAULTS, uiTheme = "station") {
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  if (shake) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  ctx.fillStyle = "#020b0d";
  ctx.fillRect(0, 0, W, H);
  const palettes = [
    ["rgba(0, 32, 34, 0.78)", "rgba(0, 18, 20, 0.94)", "rgba(15, 18, 6, 0.78)"],
    ["rgba(22, 31, 8, 0.7)", "rgba(0, 18, 20, 0.95)", "rgba(37, 24, 9, 0.7)"],
    ["rgba(28, 5, 8, 0.56)", "rgba(0, 13, 17, 0.96)", "rgba(9, 29, 33, 0.72)"],
    ["rgba(18, 8, 26, 0.5)", "rgba(0, 15, 17, 0.95)", "rgba(34, 10, 8, 0.62)"]
  ];
  const theme = palettes[(level.theme || 0) % palettes.length];
  const globalTheme = {
    station: { grid: "rgba(0,240,210,.09)", wallEdge: "rgba(131, 176, 185, 0.72)", wallFill: "rgba(24, 42, 47, 0.9)", laser: "#ff4e41", laserGlow: "#ff4e41" },
    hazard: { grid: "rgba(255,170,86,.14)", wallEdge: "rgba(255, 184, 94, 0.82)", wallFill: "rgba(54, 32, 14, 0.9)", laser: "#ff6b34", laserGlow: "#ff8a00" },
    reactor: { grid: "rgba(112,245,152,.12)", wallEdge: "rgba(125, 232, 160, 0.8)", wallFill: "rgba(18, 45, 29, 0.9)", laser: "#7bffd3", laserGlow: "#58e07a" },
    midnight: { grid: "rgba(167,188,255,.11)", wallEdge: "rgba(156, 176, 255, 0.8)", wallFill: "rgba(28, 34, 56, 0.92)", laser: "#9aa8ff", laserGlow: "#8aa0ff" }
  }[uiTheme] || { grid: "rgba(0,240,210,.09)", wallEdge: "rgba(131, 176, 185, 0.72)", wallFill: "rgba(24, 42, 47, 0.9)", laser: "#ff4e41", laserGlow: "#ff4e41" };
  const floor = ctx.createLinearGradient(0, 0, W, 0);
  floor.addColorStop(0, theme[0]);
  floor.addColorStop(0.46, theme[1]);
  floor.addColorStop(1, theme[2]);
  ctx.fillStyle = floor;
  ctx.fillRect(70, 50, W - 140, H - 100);
  ctx.strokeStyle = globalTheme.grid;
  ctx.lineWidth = 1;
  for (let x = 80; x < W - 80; x += CELL) {
    ctx.beginPath();
    ctx.moveTo(x, 70);
    ctx.lineTo(x, H - 70);
    ctx.stroke();
  }
  for (let y = 70; y < H - 70; y += CELL) {
    ctx.beginPath();
    ctx.moveTo(80, y);
    ctx.lineTo(W - 80, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255, 213, 45, .06)";
  for (let y = 120; y < H - 100; y += 92) {
    ctx.beginPath();
    ctx.moveTo(95, y);
    ctx.lineTo(175, y);
    ctx.lineTo(202, y + 20);
    ctx.stroke();
  }

  level.walls.forEach((w) => {
    glowRect(ctx, w.x, w.y, w.w, w.h, globalTheme.wallEdge, globalTheme.wallFill, 12, 2);
    ctx.fillStyle = "rgba(204, 231, 232, 0.14)";
    if (w.h > w.w) ctx.fillRect(w.x + 6, w.y + 8, Math.max(2, w.w - 12), 2);
    else ctx.fillRect(w.x + 8, w.y + 6, Math.max(2, w.w - 16), 2);
  });

  level.crates.forEach((c) => {
    drawLabel(ctx, "PLATE CARGO", c.x - 18, c.y - 14, "#9ab0b2");
    glowRect(ctx, c.x, c.y, c.w, c.h, "#ffd52d", "rgba(81, 65, 22, 0.78)", 15, 3);
    ctx.fillStyle = "rgba(255, 213, 45, 0.28)";
    ctx.fillRect(c.x + 8, c.y + 7, c.w - 16, 3);
    ctx.fillStyle = "#ffed8a";
    ctx.font = "900 12px Rajdhani, Bahnschrift, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("WEIGHT", c.x + c.w / 2, c.y + c.h / 2 + 4);
    ctx.textAlign = "left";
  });

  level.coinCrates?.forEach((c) => {
    if (c.taken) return;
    drawLabel(ctx, "COIN CACHE", c.x - 19, c.y - 14, "#ffb000");
    glowRect(ctx, c.x, c.y, c.w, c.h, "#ffb000", "rgba(85, 52, 9, 0.82)", 18, 3);
    ctx.fillStyle = "#ffed8a";
    ctx.font = "900 18px Rajdhani, Bahnschrift, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("$", c.x + c.w / 2, c.y + c.h / 2 + 6);
    ctx.textAlign = "left";
  });

  const active = game.activeIds;
  level.plates.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = active.has(p.id) ? "rgba(88,224,122,.35)" : "rgba(255,213,45,.16)";
    ctx.strokeStyle = active.has(p.id) ? "#58e07a" : "rgba(255,213,45,.7)";
    ctx.shadowColor = active.has(p.id) ? "#58e07a" : "#ffd52d";
    ctx.shadowBlur = 12;
    ctx.lineWidth = 3;
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#e7f0ef";
    ctx.fillText(p.id, p.x - 4, p.y + 4);
  });

  level.switches.forEach((s) => {
    drawLabel(ctx, "TERMINAL", s.x - 26, s.y - 37);
    glowRect(ctx, s.x - 24, s.y - 30, 48, 58, active.has(s.id) ? "#58e07a" : "#ffd52d", active.has(s.id) ? "rgba(29, 70, 39, .72)" : "rgba(61, 48, 15, .72)", 16, 3);
    ctx.fillStyle = active.has(s.id) ? "#cfffe0" : "#ffd52d";
    ctx.font = "900 12px Rajdhani, Bahnschrift, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(active.has(s.id) ? "ON" : "PRESS E", s.x, s.y + 5);
    ctx.textAlign = "left";
  });

  level.doors.forEach((d) => {
    drawLabel(ctx, "EXIT GATE", d.x - 8, d.y - 18, d.open ? "#00f0d2" : "#ff4e41");
    glowRect(ctx, d.x, d.y, d.w, d.h, d.open ? "#00f0d2" : "#ff4e41", d.open ? "rgba(0, 240, 210, .2)" : "rgba(255, 78, 65, .28)", 20, 4);
    ctx.font = "900 13px Rajdhani, Bahnschrift, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = d.open ? "#00f0d2" : "#ff7c72";
    ctx.fillText(d.open ? "OPEN" : "LOCKED", d.x + d.w / 2, d.y + d.h / 2);
    ctx.textAlign = "left";
  });

  level.lasers.forEach((l) => {
    if (active.has(l.disabledBy)) return;
    ctx.strokeStyle = globalTheme.laser;
    ctx.lineWidth = 5;
    ctx.shadowColor = globalTheme.laserGlow;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(l.x1, l.y1);
    ctx.lineTo(l.x2, l.y2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  });

  level.scrap.forEach((s) => {
    if (s.taken) return;
    ctx.shadowColor = "#ffd52d";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#ffd52d";
    ctx.strokeStyle = "#fff6ad";
    ctx.beginPath();
    ctx.moveTo(s.x, s.y - 10);
    ctx.lineTo(s.x + 11, s.y);
    ctx.lineTo(s.x, s.y + 10);
    ctx.lineTo(s.x - 11, s.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
  });

  level.drones?.forEach((d) => {
    if (d.hp > 0) drawHostileDrone(ctx, d);
  });
  level.missileSentries?.forEach((m) => {
    if (m.hp <= 0) return;
    const lockRatio = clamp((m.lockMs || 0) / 1400, 0, 1);
    if (lockRatio > 0.08) {
      ctx.save();
      ctx.strokeStyle = `rgba(255,78,65,${0.25 + lockRatio * 0.45})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 7]);
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(game.player.x, game.player.y);
      ctx.stroke();
      ctx.restore();
    }
    drawLabel(ctx, lockRatio > 0.7 ? "MISSILE LOCK" : "MISSILE SENTRY", m.x - 46, m.y - 38, lockRatio > 0.7 ? "#ff4e41" : "#ffb000");
    drawHealthBar(ctx, m.x, m.y - 50, m.hp, m.maxHp || 3, "#ffb000");
    ctx.save();
    ctx.fillStyle = "#24190f";
    ctx.strokeStyle = "#ffb000";
    ctx.shadowColor = "#ffb000";
    ctx.shadowBlur = 12;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffd52d";
    ctx.fillRect(m.x + 8, m.y - 3, 10, 6);
    ctx.restore();
  });

  level.gravityNodes?.forEach((h) => {
    if (h.hp <= 0) return;
    ctx.save();
    ctx.strokeStyle = "rgba(138,160,255,0.22)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(h.x, h.y, 150 + Math.sin((h.pulse || 0) * 0.01) * 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    drawSpecialHostile(ctx, h, "GRAVITY NODE", "#8aa0ff", "diamond");
  });
  level.echoJammers?.forEach((h) => {
    if (h.hp <= 0) return;
    ctx.save();
    ctx.strokeStyle = "rgba(183,140,255,0.24)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.arc(h.x, h.y, 185, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    drawSpecialHostile(ctx, h, "ECHO JAMMER", "#b78cff", "hex");
  });
  level.laserSweepers?.forEach((h) => {
    if (h.hp <= 0) return;
    const a = h.angle || 0;
    ctx.save();
    ctx.strokeStyle = "#ff4e41";
    ctx.shadowColor = "#ff4e41";
    ctx.shadowBlur = 16;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(h.x - Math.cos(a) * 220, h.y - Math.sin(a) * 220);
    ctx.lineTo(h.x + Math.cos(a) * 220, h.y + Math.sin(a) * 220);
    ctx.stroke();
    ctx.restore();
    drawSpecialHostile(ctx, h, "LASER SWEEPER", "#ff4e41", "circle");
  });
  level.blinkHunters?.forEach((h) => h.hp > 0 && drawSpecialHostile(ctx, h, "BLINK HUNTER", "#ff6ec7", "diamond"));
  level.shieldDrones?.forEach((h) => {
    if (h.hp <= 0) return;
    ctx.save();
    ctx.strokeStyle = "rgba(0,240,210,0.26)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(h.x, h.y, 105, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    drawSpecialHostile(ctx, h, "SHIELD DRONE", "#00f0d2", "hex");
  });
  level.repairBots?.forEach((h) => h.hp > 0 && drawSpecialHostile(ctx, h, "REPAIR BOT", "#58e07a", "circle"));

  level.turrets.forEach((t) => {
    if (t.hp <= 0) return;
    if (t.seesPlayer) {
      ctx.save();
      ctx.strokeStyle = "rgba(255, 78, 65, 0.34)";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(t.x, t.y);
      ctx.lineTo(game.player.x, game.player.y);
      ctx.stroke();
      ctx.restore();
    }
    drawLabel(ctx, t.seesPlayer ? "TURRET LOCK" : "TURRET", t.x - 28, t.y - 38, t.seesPlayer ? "#ff4e41" : "#ff7c72");
    drawHealthBar(ctx, t.x, t.y - 50, t.hp, t.maxHp || 3, "#ff4e41");
    ctx.fillStyle = "#33272a";
    ctx.strokeStyle = t.seesPlayer ? "#ff4e41" : "rgba(255, 78, 65, 0.55)";
    ctx.shadowColor = t.seesPlayer ? "#ff4e41" : "rgba(255, 78, 65, 0.45)";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ff4e41";
    ctx.fillRect(t.x - 4, t.y - 30, 8, 24);
    ctx.shadowBlur = 0;
  });

  if (level.core?.alive) {
    ctx.fillStyle = "rgba(255,213,45,.18)";
    ctx.strokeStyle = "#ffd52d";
    ctx.beginPath();
    ctx.arc(level.core.x, level.core.y, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffd52d";
    ctx.fillText("CORE", level.core.x - 17, level.core.y + 5);
  }

  drawLabel(ctx, "EXTRACT", level.exit.x - 3, level.exit.y - 18, "#00f0d2");
  glowRect(ctx, level.exit.x, level.exit.y, level.exit.w, level.exit.h, "#00f0d2", "rgba(0,240,210,.17)", 22, 4);
  ctx.font = "900 13px Rajdhani, Bahnschrift, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#00f0d2";
  ctx.fillText("OPEN", level.exit.x + level.exit.w / 2, level.exit.y + level.exit.h / 2);
  ctx.textAlign = "left";

  game.dashBursts?.forEach((burst) => drawDashBurst(ctx, burst, cosmetic));
  game.abilityBursts?.forEach((burst) => drawAbilityBurst(ctx, burst));
  game.coinPopups?.forEach((popup) => {
    const life = popup.life / popup.maxLife;
    const drift = (1 - life) * 24;
    ctx.save();
    ctx.globalAlpha = Math.max(0, life);
    ctx.shadowColor = "#ffb000";
    ctx.shadowBlur = 16;
    ctx.fillStyle = "#ffed8a";
    ctx.font = "900 20px Rajdhani, Bahnschrift, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`+${popup.amount}`, popup.x, popup.y - drift);
    ctx.fillStyle = "#ffd52d";
    for (let i = 0; i < 3; i += 1) {
      const a = popup.spin + i * 2.1;
      ctx.beginPath();
      ctx.arc(popup.x + Math.cos(a) * 14, popup.y - drift + Math.sin(a) * 7, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });
  game.echoes.forEach((e) => {
    drawDrone(ctx, e, true, cosmetic);
    drawLabel(ctx, `ECHO ${e.slot + 1}`, e.x - 26, e.y + 38, e.echoColor || "#00f0d2");
  });
  const now = performance.now();
  drawCargoTether(ctx, level, game, now);
  if (game.spawnFlash > 0) {
    const flash = clamp(game.spawnFlash / 1200, 0, 1);
    ctx.save();
    ctx.globalAlpha = 0.24 + flash * 0.48;
    ctx.strokeStyle = cosmetic.trail || "#00f0d2";
    ctx.shadowColor = cosmetic.trail || "#00f0d2";
    ctx.shadowBlur = 22;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(game.player.x, game.player.y, 32 + (1 - flash) * 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(0, 240, 210, 0.13)";
    ctx.beginPath();
    ctx.arc(game.player.x, game.player.y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  drawDrone(ctx, game.player, false, cosmetic);
  drawPet(ctx, game.player, cosmetic, performance.now());
  if (game.echoStatus && now < (game.echoStatusUntil || 0)) {
    drawLabel(ctx, game.echoStatus.toUpperCase(), game.player.x - 42, game.player.y - 45, "#ffd52d");
  }

  game.bullets.forEach((b) => {
    ctx.fillStyle = b.owner === "enemy" ? "#ff4e41" : "#ffd52d";
    ctx.beginPath();
    ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  game.railBeams?.forEach((beam) => {
    const alpha = clamp(beam.life / beam.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "rgba(178,255,246,0.92)";
    ctx.shadowColor = "#b2fff6";
    ctx.shadowBlur = 20;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(beam.x1, beam.y1);
    ctx.lineTo(beam.x2, beam.y2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(beam.x1, beam.y1);
    ctx.lineTo(beam.x2, beam.y2);
    ctx.stroke();
    ctx.restore();
  });
  game.missiles?.forEach((m) => {
    ctx.save();
    ctx.fillStyle = "#ffb000";
    ctx.shadowColor = "#ff4e41";
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffd52d";
    ctx.fillRect(m.x - 11, m.y - 2, 6, 4);
    ctx.restore();
  });
  ctx.restore();
}

function drawDashBurst(ctx, burst, cosmetic = COSMETIC_DEFAULTS) {
  const life = burst.life / burst.maxLife;
  ctx.save();
  ctx.globalAlpha = Math.max(0, life) * 0.65;
  ctx.translate(burst.x, burst.y);
  ctx.rotate(burst.angle);
  ctx.shadowColor = cosmetic.trail;
  ctx.shadowBlur = 22;
  if (cosmetic.dashStyle === "ring") {
    ctx.strokeStyle = cosmetic.trail;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 52 * (1 - life) + 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (cosmetic.dashStyle === "spark") {
    ctx.fillStyle = cosmetic.trail;
    for (let i = 0; i < 9; i += 1) {
      ctx.beginPath();
      ctx.arc(-20 - i * 8, Math.sin(i * 1.7) * 18 * life, 3 + life * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }
  const grad = ctx.createLinearGradient(-95, 0, 20, 0);
  grad.addColorStop(0, "rgba(0, 240, 210, 0)");
  grad.addColorStop(0.35, cosmetic.dashStyle === "comet" ? "rgba(255, 138, 0, 0.52)" : "rgba(0, 240, 210, 0.45)");
  grad.addColorStop(1, cosmetic.trail);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(22, 0);
  ctx.lineTo(-96, -18 * life);
  ctx.lineTo(-72, 0);
  ctx.lineTo(-96, 18 * life);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawAbilityBurst(ctx, burst) {
  const life = burst.life / burst.maxLife;
  ctx.save();
  ctx.translate(burst.x, burst.y);
  ctx.globalAlpha = Math.max(0, life) * 0.8;
  ctx.lineWidth = 4;
  const radius = 18 + (1 - life) * 88;
  const color =
    burst.type === "shield" ? "#b2fff6" :
      burst.type === "phase" ? "#8aa0ff" :
        burst.type === "overdrive" ? "#ff8a00" :
          "#00f0d2";
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawHostileDrone(ctx, d) {
  ctx.save();
  ctx.translate(d.x, d.y);
  ctx.rotate(d.angle || 0);
  ctx.shadowColor = "#ff4e41";
  ctx.shadowBlur = 16;
  ctx.fillStyle = "rgba(58, 23, 24, 0.92)";
  ctx.strokeStyle = "#ff4e41";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(2, -16);
  ctx.lineTo(-19, -10);
  ctx.lineTo(-12, 0);
  ctx.lineTo(-19, 10);
  ctx.lineTo(2, 16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffd52d";
  ctx.fillRect(0, -4, 10, 8);
  ctx.restore();
  drawLabel(ctx, "HUNTER DRONE", d.x - 38, d.y - 34, "#ff7c72");
}

function drawSpecialHostile(ctx, h, label, color, shape = "circle") {
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  ctx.strokeStyle = color;
  ctx.fillStyle = "rgba(13, 20, 24, 0.92)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (shape === "diamond") {
    ctx.moveTo(0, -20);
    ctx.lineTo(20, 0);
    ctx.lineTo(0, 20);
    ctx.lineTo(-20, 0);
    ctx.closePath();
  } else if (shape === "hex") {
    for (let i = 0; i < 6; i += 1) {
      const a = Math.PI / 6 + i * Math.PI / 3;
      const x = Math.cos(a) * 21;
      const y = Math.sin(a) * 21;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  } else {
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawLabel(ctx, label, h.x - 42, h.y - 38, color);
  drawHealthBar(ctx, h.x, h.y - 50, h.hp, h.maxHp || 4, color);
}

function drawDrone(ctx, p, echo, cosmetic = COSMETIC_DEFAULTS) {
  const echoColor = p.echoColor || "#00f0d2";
  const skin = echo ? { ...COSMETIC_DEFAULTS, body: p.echoFill || "rgba(0,240,210,.28)", accent: echoColor, trail: echoColor, frame: cosmetic.frame } : { ...COSMETIC_DEFAULTS, ...cosmetic };
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle || 0);
  ctx.globalAlpha = echo ? 0.48 : 1;
  if (p.dashTrail && !echo) {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = skin.trail;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(-54, -12);
    ctx.lineTo(-44, 0);
    ctx.lineTo(-54, 12);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.shadowColor = echo ? echoColor : skin.accent;
  ctx.shadowBlur = echo ? 16 : p.dashTrail ? 22 : 12;
  ctx.fillStyle = skin.body;
  ctx.strokeStyle = echo ? echoColor : skin.accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (skin.frame === "split") {
    ctx.moveTo(23, 0);
    ctx.lineTo(-8, -18);
    ctx.lineTo(-1, -5);
    ctx.lineTo(-20, -10);
    ctx.lineTo(-10, 0);
    ctx.lineTo(-20, 10);
    ctx.lineTo(-1, 5);
    ctx.lineTo(-8, 18);
  } else if (skin.frame === "needle") {
    ctx.moveTo(28, 0);
    ctx.lineTo(-10, -9);
    ctx.lineTo(-22, 0);
    ctx.lineTo(-10, 9);
  } else if (skin.frame === "heavy") {
    ctx.moveTo(24, 0);
    ctx.lineTo(6, -18);
    ctx.lineTo(-22, -14);
    ctx.lineTo(-28, 0);
    ctx.lineTo(-22, 14);
    ctx.lineTo(6, 18);
  } else if (skin.frame === "halo") {
    ctx.ellipse(0, 0, 25, 14, 0, 0, Math.PI * 2);
  } else if (skin.frame === "fang") {
    ctx.moveTo(28, 0);
    ctx.lineTo(-4, -17);
    ctx.lineTo(-15, -6);
    ctx.lineTo(-27, -13);
    ctx.lineTo(-14, 0);
    ctx.lineTo(-27, 13);
    ctx.lineTo(-15, 6);
    ctx.lineTo(-4, 17);
  } else if (skin.frame === "box") {
    ctx.rect(-22, -15, 42, 30);
    ctx.moveTo(28, 0);
    ctx.lineTo(18, -9);
    ctx.lineTo(18, 9);
  } else if (skin.frame === "kite") {
    ctx.moveTo(27, 0);
    ctx.lineTo(-2, -24);
    ctx.lineTo(-18, 0);
    ctx.lineTo(-2, 24);
  } else if (skin.frame === "fork") {
    ctx.moveTo(26, -7);
    ctx.lineTo(6, -16);
    ctx.lineTo(-20, -10);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-20, 10);
    ctx.lineTo(6, 16);
    ctx.lineTo(26, 7);
    ctx.lineTo(13, 0);
  } else if (skin.frame === "moon") {
    ctx.arc(0, 0, 22, -1.15, 1.15);
    ctx.quadraticCurveTo(-22, 0, 0, -22);
  } else {
    ctx.moveTo(23, 0);
    ctx.lineTo(-16, -15);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-16, 15);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (skin.armor !== "clean" && !echo) {
    ctx.strokeStyle = skin.accent;
    ctx.lineWidth = 2;
    if (skin.armor === "plated") {
      [-8, 4, 14].forEach((x) => {
        ctx.beginPath();
        ctx.moveTo(x, -10);
        ctx.lineTo(x + 5, 10);
        ctx.stroke();
      });
    } else if (skin.armor === "spiked") {
      ctx.fillStyle = skin.accent;
      [-10, 6].forEach((x) => {
        ctx.beginPath();
        ctx.moveTo(x, -15);
        ctx.lineTo(x + 6, -25);
        ctx.lineTo(x + 10, -14);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, 15);
        ctx.lineTo(x + 6, 25);
        ctx.lineTo(x + 10, 14);
        ctx.fill();
      });
    } else if (skin.armor === "scanner") {
      ctx.strokeRect(-12, -20, 26, 4);
      ctx.strokeRect(-12, 16, 26, 4);
    } else if (skin.armor === "cargo") {
      ctx.strokeRect(-20, -13, 10, 9);
      ctx.strokeRect(-20, 4, 10, 9);
    } else if (skin.armor === "reactor") {
      ctx.beginPath();
      ctx.arc(-9, 0, 8, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = echo ? echoColor : "#061012";
  if (skin.cockpit === "bubble") {
    ctx.beginPath();
    ctx.arc(4, 0, 7, 0, Math.PI * 2);
    ctx.fill();
  } else if (skin.cockpit === "visor") {
    ctx.fillRect(-4, -6, 18, 12);
  } else if (skin.cockpit === "core") {
    ctx.fillStyle = skin.accent;
    ctx.beginPath();
    ctx.arc(5, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#061012";
    ctx.beginPath();
    ctx.arc(5, 0, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (skin.cockpit === "split") {
    ctx.fillRect(0, -7, 7, 5);
    ctx.fillRect(0, 2, 7, 5);
  } else if (skin.cockpit === "crown") {
    ctx.beginPath();
    ctx.moveTo(-3, 6);
    ctx.lineTo(1, -7);
    ctx.lineTo(6, 2);
    ctx.lineTo(12, -7);
    ctx.lineTo(14, 6);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillRect(-2, -4, 12, 8);
  }
  ctx.fillStyle = echo ? "rgba(0,240,210,.55)" : skin.accent;
  if (skin.engine === "ring") {
    ctx.beginPath();
    ctx.arc(-18, 0, 7, 0, Math.PI * 2);
    ctx.strokeStyle = skin.accent;
    ctx.stroke();
  } else if (skin.engine === "fins") {
    ctx.fillRect(-20, -10, 10, 4);
    ctx.fillRect(-20, 6, 10, 4);
  } else if (skin.engine === "core") {
    ctx.beginPath();
    ctx.arc(-18, 0, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (skin.engine === "sidepods") {
    ctx.fillRect(-20, -11, 9, 6);
    ctx.fillRect(-20, 5, 9, 6);
  } else if (skin.engine === "afterburn") {
    ctx.fillRect(-23, -5, 12, 3);
    ctx.fillRect(-23, 2, 12, 3);
  } else {
    ctx.fillRect(-18, -3, 7, 6);
  }
  if (skin.decal !== "none" && !echo) {
    ctx.strokeStyle = skin.accent;
    ctx.fillStyle = skin.accent;
    ctx.lineWidth = 2;
    if (skin.decal === "stripe") {
      ctx.beginPath();
      ctx.moveTo(-6, -10);
      ctx.lineTo(10, 8);
      ctx.stroke();
    } else if (skin.decal === "star") {
      ctx.beginPath();
      for (let i = 0; i < 5; i += 1) {
        const a = -Math.PI / 2 + i * Math.PI * 0.8;
        ctx.lineTo(-1 + Math.cos(a) * 6, Math.sin(a) * 6);
      }
      ctx.closePath();
      ctx.fill();
    } else if (skin.decal === "chevron") {
      ctx.beginPath();
      ctx.moveTo(-6, -7);
      ctx.lineTo(5, 0);
      ctx.lineTo(-6, 7);
      ctx.stroke();
    } else if (skin.decal === "circuit") {
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(0, 0);
      ctx.lineTo(4, -6);
      ctx.stroke();
    } else if (skin.decal === "crown") {
      ctx.fillRect(-6, -2, 14, 4);
      ctx.fillRect(-4, -8, 3, 6);
      ctx.fillRect(2, -10, 3, 8);
      ctx.fillRect(8, -8, 3, 6);
    }
  }
  ctx.restore();
}

function drawPet(ctx, player, cosmetic = COSMETIC_DEFAULTS, now = 0) {
  if (!cosmetic.pet || cosmetic.pet === "none") return;
  const pet = PETS.find((item) => item.id === cosmetic.pet);
  if (!pet) return;
  const orbit = now / 620;
  const px = player.x + Math.cos(orbit) * 34 - 22;
  const py = player.y + Math.sin(orbit) * 18 + 24;
  ctx.save();
  ctx.strokeStyle = "rgba(0, 240, 210, 0.22)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(px, py);
  ctx.stroke();
  ctx.translate(px, py);
  ctx.shadowColor = pet.color;
  ctx.shadowBlur = 20;
  ctx.fillStyle = pet.color;
  ctx.strokeStyle = "rgba(5, 13, 16, 0.9)";
  ctx.lineWidth = 3;
  if (cosmetic.pet === "orbit" || cosmetic.pet === "royal") {
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = pet.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 23, 9, now / 600, 0, Math.PI * 2);
    ctx.stroke();
  } else if (cosmetic.pet === "bolt") {
    ctx.beginPath();
    ctx.moveTo(8, -13);
    ctx.lineTo(-3, -1);
    ctx.lineTo(5, -1);
    ctx.lineTo(-8, 13);
    ctx.lineTo(-1, 2);
    ctx.lineTo(-9, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(5, 13, 16, 0.85)";
    ctx.fillRect(-4, -3, 8, 6);
  }
  ctx.restore();
}

function drawCargoTether(ctx, level, game, now = 0) {
  const tether = game.cargoTether;
  if (!tether) return;
  const crate = level.crates[tether.index];
  if (!crate) return;
  const cx = crate.x + crate.w / 2;
  const cy = crate.y + crate.h / 2;
  const pulse = 0.55 + Math.sin(now / 140) * 0.2;
  ctx.save();
  ctx.strokeStyle = `rgba(0, 240, 210, ${0.22 + pulse * 0.18})`;
  ctx.shadowColor = "#00f0d2";
  ctx.shadowBlur = 16;
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 9]);
  ctx.beginPath();
  ctx.moveTo(game.player.x, game.player.y);
  ctx.lineTo(cx, cy);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = "rgba(255, 213, 45, 0.72)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(crate.w, crate.h) / 2 + 8 + pulse * 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function getPetPerks(cosmetic = COSMETIC_DEFAULTS) {
  switch (cosmetic.pet) {
    case "spark":
      return { energyRegen: 0.45 };
    case "wisp":
      return { echoDiscount: 6 };
    case "ember":
      return { bulletDamage: 2 };
    case "moss":
      return { hullRegen: 1.5 };
    case "orbit":
      return { maxShield: 18, shieldRegen: 1.2 };
    case "bolt":
      return { dashRegenMultiplier: 1.55 };
    case "lumen":
      return { maxShield: 26, shieldRegen: 2.4 };
    case "nova":
      return { coinBonus: 1.35 };
    case "royal":
      return { maxShield: 18, shieldRegen: 1.2, energyRegen: 1.5, hullRegen: 0.8 };
    case "void":
      return { maxShield: 14, shieldRegen: 1.2, laserResist: 0.45 };
    default:
      return {};
  }
}

function getWeaponById(id) {
  return WEAPONS.find((w) => w.id === id) || WEAPONS[0];
}

function getAbilityById(id) {
  return ABILITIES.find((ability) => ability.id === id) || ABILITIES[0];
}

function getDifficultyTuning(difficulty = "Standard") {
  return DIFFICULTY_TUNING[difficulty] || DIFFICULTY_TUNING.Standard;
}

function getRunTuning(levelIndex, customLevel, settings) {
  if (customLevel) return getDifficultyTuning(settings.difficulty);
  return getCampaignTuning(levelIndex);
}

function useGame({ levelIndex, customLevel, screen, setScreen, settings, setSummary, cosmetic, awardCoins, keybinds }) {
  const canvas = useRef(null);
  const game = useRef(null);
  const runInstance = useRef(0);
  const keys = useRef(new Set());
  const mouse = useRef({ x: 0, y: 0, down: false });
  const aim = useRef({ x: W / 2, y: H / 2 });
  const dashQueued = useRef(false);
  const abilityQueued = useRef(false);
  const interactQueued = useRef(false);
  const touch = useRef({ up: false, down: false, left: false, right: false, shoot: false, interact: false });
  const mobileMove = useRef({ x: 0, y: 0 });
  const mobileAim = useRef({ x: 0, y: 0, active: false, shooting: false });
  const clearInputState = () => {
    keys.current.clear();
    mouse.current.down = false;
    dashQueued.current = false;
    abilityQueued.current = false;
    interactQueued.current = false;
    touch.current = { up: false, down: false, left: false, right: false, shoot: false, interact: false };
    mobileMove.current = { x: 0, y: 0 };
    mobileAim.current = { x: 0, y: 0, active: false, shooting: false };
  };

  const reset = () => {
    runInstance.current += 1;
    const level = customLevel ? ensurePlayableSpawn(structuredClone(customLevel)) : makeLevel(levelIndex);
    const perks = getPetPerks(cosmetic);
    const weapon = getWeaponById(cosmetic.weapon);
    const ability = getAbilityById(cosmetic.ability);
    const tuning = getRunTuning(levelIndex, customLevel, settings);
    const maxShield = perks.maxShield || 0;
    const hostileHpBonus = tuning.hostileHpBonus || 0;
    const tuneHostileHp = (h, fallback = 2) => {
      h.baseHp = h.baseHp || h.maxHp || h.hp || fallback;
      h.maxHp = h.baseHp + hostileHpBonus;
      h.hp = Math.min(h.maxHp, (h.hp || h.baseHp) + hostileHpBonus);
    };
    level.coinCrates = level.coinCrates || [];
    level.turrets.forEach((t) => {
      tuneHostileHp(t, 2);
    });
    level.drones?.forEach((d) => {
      tuneHostileHp(d, 2);
    });
    level.missileSentries?.forEach((m) => {
      tuneHostileHp(m, 3);
      m.cooldown = m.cooldown ?? 2400;
      m.lockMs = m.lockMs || 0;
    });
    SPECIAL_HOSTILE_KEYS.forEach((key) => {
      level[key] = level[key] || [];
      level[key].forEach((h) => {
        tuneHostileHp(h, 3);
        h.cooldown = h.cooldown ?? 900;
      });
    });
    game.current = {
      level,
      activeIds: new Set(),
      player: {
        x: level.player.x,
        y: level.player.y,
        angle: 0,
        hp: 100,
        energy: tuning.maxEnergy,
        maxEnergy: tuning.maxEnergy,
        shield: maxShield,
        maxShield,
        dash: 100,
        scrap: 0,
        coinsEarned: 0,
        weaponId: weapon.id,
        ammo: weapon.ammoMax,
        ammoMax: weapon.ammoMax,
        isReloading: false,
        reloadUntil: 0,
        nextShotAt: 0,
        triggerHeld: false,
        abilityId: ability.id,
        abilityReadyAt: 0,
        phaseUntil: 0,
        overdriveUntil: 0,
        phaseVector: { x: 0, y: 0 }
      },
      echoes: [],
      bullets: [],
      missiles: [],
      dashBursts: [],
      railBeams: [],
      cargoTether: null,
      coinPopups: [],
      abilityBursts: [],
      spawnFlash: 1200,
      nextEchoId: 0,
      echoStatus: "",
      echoStatusUntil: 0,
      recording: [],
      recordTimer: 0,
      started: performance.now(),
      last: performance.now(),
      status: "playing",
      runId: runInstance.current,
      shake: 0,
      campaignSection: getCampaignSection(levelIndex),
      tuning
    };
  };

  useEffect(reset, [levelIndex, customLevel, settings.difficulty]);

  useEffect(() => {
    const down = (e) => {
      const boundCodes = new Set([...Object.values(keybinds), "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
      if (boundCodes.has(e.code)) e.preventDefault();
      const firstPress = !keys.current.has(e.code);
      if (e.code === keybinds.dash && firstPress) dashQueued.current = true;
      if (e.code === keybinds.ability && firstPress) abilityQueued.current = true;
      if (e.code === keybinds.interact && firstPress) interactQueued.current = true;
      keys.current.add(e.code);
      if (e.code === keybinds.echo && firstPress) spawnEcho();
      if (e.code === "Escape" && game.current?.status === "playing") setScreen("paused");
      if (e.code === "KeyR") reset();
    };
    const up = (e) => keys.current.delete(e.code);
    const visibility = () => {
      if (document.hidden) clearInputState();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clearInputState);
    window.addEventListener("contextmenu", clearInputState);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clearInputState);
      window.removeEventListener("contextmenu", clearInputState);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [keybinds]);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const move = (e) => {
      const r = c.getBoundingClientRect();
      const nextX = ((e.clientX - r.left) / r.width) * W;
      const nextY = ((e.clientY - r.top) / r.height) * H;
      const sens = clamp(settings.mouseSensitivity || 1, 0.25, 2.5);
      aim.current.x += (nextX - aim.current.x) * sens;
      aim.current.y += (nextY - aim.current.y) * sens;
      mouse.current.x = aim.current.x;
      mouse.current.y = aim.current.y;
    };
    const mouseDown = (e) => {
      if (e.button !== 0) {
        e.preventDefault();
        clearInputState();
        return;
      }
      mouse.current.down = true;
    };
    const mouseUp = (e) => {
      if (e.button === 0) mouse.current.down = false;
    };
    const contextMenu = (e) => {
      e.preventDefault();
      mouse.current.down = false;
    };
    c.addEventListener("mousemove", move);
    c.addEventListener("mousedown", mouseDown);
    c.addEventListener("contextmenu", contextMenu);
    window.addEventListener("mouseup", mouseUp);
    window.addEventListener("mouseleave", clearInputState);
    return () => {
      c.removeEventListener("mousemove", move);
      c.removeEventListener("mousedown", mouseDown);
      c.removeEventListener("contextmenu", contextMenu);
      window.removeEventListener("mouseup", mouseUp);
      window.removeEventListener("mouseleave", clearInputState);
    };
  }, [settings.mouseSensitivity]);

  function spawnEcho() {
    const g = game.current;
    if (!g) return;
    const perks = getPetPerks(cosmetic);
    const echoCost = Math.max(8, ECHO_COST - (perks.echoDiscount || 0));
    const blockEcho = (message, shake = 4) => {
      g.echoStatus = message;
      g.echoStatusUntil = performance.now() + 1300;
      if (settings.shake && !settings.reduced) g.shake = Math.max(g.shake, shake);
    };
    if (g?.level.echoJammers?.some((j) => j.hp > 0 && dist(j, g.player) < 185)) {
      blockEcho("Echo jammed", 6);
      return;
    }
    if (g.echoes.length >= MAX_ECHOES) {
      blockEcho("Echo slots full");
      return;
    }
    if (g.recording.length < 8) {
      blockEcho("Recording route...");
      return;
    }
    if (g.player.energy < echoCost) {
      blockEcho(`Need ${Math.ceil(echoCost - g.player.energy)} energy`);
      return;
    }
    g.player.energy -= echoCost;
    const frames = g.recording.slice(-ECHO_MS / ECHO_FRAME_MS);
    const usedSlots = new Set(g.echoes.map((echo) => echo.slot));
    const slot = Array.from({ length: MAX_ECHOES }, (_, i) => i).find((i) => !usedSlots.has(i)) ?? 0;
    const id = g.nextEchoId ?? 0;
    g.nextEchoId = id + 1;
    g.echoes.push({
      id,
      slot,
      frames,
      age: 0,
      futureMs: 0,
      x: frames[0].x,
      y: frames[0].y,
      angle: 0,
      fired: 0,
      echoColor: ECHO_COLORS[slot] || ECHO_COLORS[0],
      echoFill: ECHO_FILLS[slot] || ECHO_FILLS[0]
    });
    g.echoStatus = `Echo ${slot + 1} online`;
    g.echoStatusUntil = performance.now() + 1100;
    if (settings.shake && !settings.reduced) g.shake = 8;
  }

  function shoot(from, owner = "player") {
    const g = game.current;
    const angle = from.angle || 0;
    const perks = owner === "player" ? getPetPerks(cosmetic) : {};
    const weapon = owner === "player" ? getWeaponById(g.player.weaponId || cosmetic.weapon) : null;
    const level = g.level;
    const speed = weapon?.bulletSpeed || 620;
    const damage = (weapon?.damage || 1) + (perks.bulletDamage || 0);
    if (owner === "player" && weapon?.id === "needle") {
      const range = weapon.maxRange || 880;
      const x1 = from.x + Math.cos(angle) * 18;
      const y1 = from.y + Math.sin(angle) * 18;
      const x2 = from.x + Math.cos(angle) * range;
      const y2 = from.y + Math.sin(angle) * range;
      const line = { x: x1, y: y1 };
      const end = { x: x2, y: y2 };
      g.railBeams.push({ x1, y1, x2, y2, life: 110, maxLife: 110 });
      const blockers = getSolidBlocks(level);
      level.turrets.forEach((t) => {
        if (t.hp > 0 && pointToSegmentDistance({ x: t.x, y: t.y }, line, end) < 24 && hasLineOfSight(line, t, blockers)) t.hp -= damage;
      });
      level.drones?.forEach((d) => {
        if (d.hp > 0 && pointToSegmentDistance({ x: d.x, y: d.y }, line, end) < 22 && hasLineOfSight(line, d, blockers)) d.hp -= damage;
      });
        level.missileSentries?.forEach((m) => {
          if (m.hp > 0 && pointToSegmentDistance({ x: m.x, y: m.y }, line, end) < 23 && hasLineOfSight(line, m, blockers)) m.hp -= damage;
        });
        SPECIAL_HOSTILE_KEYS.forEach((key) => {
          level[key]?.forEach((h) => {
            if (h.hp > 0 && pointToSegmentDistance({ x: h.x, y: h.y }, line, end) < 24 && hasLineOfSight(line, h, blockers)) h.hp -= damage;
          });
        });
      if (level.core?.alive && pointToSegmentDistance(level.core, line, end) < 32 && hasLineOfSight(line, level.core, blockers)) {
        level.core.hp -= damage;
        if (level.core.hp <= 0) level.core.alive = false;
      }
      return;
    }
    g.bullets.push({
      x: from.x + Math.cos(angle) * 24,
      y: from.y + Math.sin(angle) * 24,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 900,
      owner,
      damage,
      maxRange: weapon?.maxRange || 9999,
      traveled: 0
    });
  }

  function startReload(now) {
    const g = game.current;
    const weapon = getWeaponById(g.player.weaponId || cosmetic.weapon);
    if (g.player.isReloading || g.player.ammo >= weapon.ammoMax) return;
    g.player.isReloading = true;
    g.player.reloadUntil = now + weapon.reloadMs;
  }

  function useAbility(now) {
    const g = game.current;
    const ability = getAbilityById(g.player.abilityId || cosmetic.ability);
    if (now < g.player.abilityReadyAt || g.player.energy < ability.energyCost) return;
    g.player.energy -= ability.energyCost;
    g.player.abilityReadyAt = now + ability.cooldownMs;
    g.abilityBursts.push({ x: g.player.x, y: g.player.y, type: ability.id, life: 520, maxLife: 520 });
    if (ability.id === "emp") {
      g.level.turrets.forEach((t) => {
        if (t.hp > 0 && dist(t, g.player) < 210) t.cooldown = Math.max(t.cooldown, 2800);
      });
      g.level.drones?.forEach((d) => {
        if (d.hp > 0 && dist(d, g.player) < 220) d.cooldown = Math.max(d.cooldown, 1800);
      });
    } else if (ability.id === "shield") {
      g.player.shield = Math.min(g.player.maxShield || 30, (g.player.shield || 0) + 18);
      g.player.hp = clamp(g.player.hp + 10, 0, 100);
    } else if (ability.id === "phase") {
      g.player.phaseUntil = now + 1700;
    } else if (ability.id === "overdrive") {
      g.player.overdriveUntil = now + 2400;
    }
    if (settings.shake && !settings.reduced) g.shake = Math.max(g.shake, 6);
  }

  function firePlayerWeapon(now) {
    const g = game.current;
    const weapon = getWeaponById(g.player.weaponId || cosmetic.weapon);
    if (g.player.isReloading) return;
    if (g.player.ammo <= 0) {
      startReload(now);
      return;
    }
    if (now < g.player.nextShotAt) return;
    g.player.ammo -= 1;
    const base = g.player.angle;
    const runId = g.runId;
    for (let i = 0; i < weapon.shotsPerTrigger; i += 1) {
      const spread = weapon.spread ? (Math.random() * 2 - 1) * weapon.spread : 0;
      const a = base + spread;
      const burstDelay = i * (weapon.burstGap || 0);
      if (burstDelay === 0) {
        shoot({ x: g.player.x, y: g.player.y, angle: a }, "player");
      } else {
        setTimeout(() => {
          const live = game.current;
          if (!live || live.status !== "playing" || live.runId !== runId) return;
          shoot({ x: live.player.x, y: live.player.y, angle: a }, "player");
        }, burstDelay);
      }
    }
    const overdriveRate = now < (g.player.overdriveUntil || 0) ? 0.68 : 1;
    g.player.nextShotAt = now + weapon.fireDelay * overdriveRate;
    if (g.player.ammo <= 0) startReload(now);
  }

  function crateBlocked(crate, level, ignoreCrate = null) {
    const blockers = [...level.walls, ...level.doors.filter((d) => !d.open), ...level.crates.filter((c) => c !== crate && c !== ignoreCrate)];
    return crate.x < CARGO_MARGIN || crate.y < CARGO_MARGIN || crate.x + crate.w > W - CARGO_MARGIN || crate.y + crate.h > H - CARGO_MARGIN || blockers.some((b) => rectsTouch(crate, b));
  }

  function moveCrate(crate, dx, dy, level) {
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 7));
    const stepX = dx / steps;
    const stepY = dy / steps;
    for (let i = 0; i < steps; i += 1) {
      crate.x += stepX;
      if (crateBlocked(crate, level)) crate.x -= stepX;
      crate.y += stepY;
      if (crateBlocked(crate, level)) crate.y -= stepY;
    }
  }

  function tryMove(entity, dx, dy, level, canPushCargo = false) {
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 7));
    const stepX = dx / steps;
    const stepY = dy / steps;
    const staticBlocks = () => [...level.walls, ...level.doors.filter((d) => !d.open)];
    const moveAxis = (axis, amount) => {
      if (!amount) return;
      entity[axis] += amount;
      const rect = playerRect(entity);
      if (staticBlocks().some((b) => rectsTouch(rect, b))) {
        entity[axis] -= amount;
        return;
      }
      const hitCrate = canPushCargo ? level.crates.find((c) => rectsTouch(rect, c)) : null;
      if (!hitCrate) {
        if (level.crates.some((c) => rectsTouch(rect, c))) entity[axis] -= amount;
        return;
      }
      hitCrate[axis] += amount;
      if (crateBlocked(hitCrate, level)) {
        hitCrate[axis] -= amount;
        entity[axis] -= amount;
      }
    };

    for (let i = 0; i < steps; i += 1) {
      moveAxis("x", stepX);
      moveAxis("y", stepY);
    }
    entity.x = clamp(entity.x, PLAYER_MARGIN, W - PLAYER_MARGIN);
    entity.y = clamp(entity.y, PLAYER_MARGIN, H - PLAYER_MARGIN);
  }

  function phaseMove(entity, dx, dy) {
    entity.x = clamp(entity.x + dx, PLAYER_MARGIN, W - PLAYER_MARGIN);
    entity.y = clamp(entity.y + dy, PLAYER_MARGIN, H - PLAYER_MARGIN);
  }

  function resolvePlayerAfterPhase(entity, level) {
    nudgeOutOfBlocks(entity, level.crates, entity.phaseVector, 120);
    const solids = [...level.walls, ...level.doors.filter((door) => !door.open)];
    nudgeOutOfBlocks(entity, solids, entity.phaseVector, 220);
  }

  function updateCargoTether(g, dt) {
    const tether = g.cargoTether;
    if (!tether) return;
    const crate = g.level.crates[tether.index];
    if (!crate) {
      g.cargoTether = null;
      return;
    }
    tether.pulse = (tether.pulse || 0) + dt;
    const desiredDistance = 66;
    const target = {
      x: g.player.x - Math.cos(g.player.angle) * desiredDistance,
      y: g.player.y - Math.sin(g.player.angle) * desiredDistance
    };
    const center = { x: crate.x + crate.w / 2, y: crate.y + crate.h / 2 };
    const gap = dist(center, target);
    if (gap > 8) {
      const pull = Math.min(gap, 150 * dt / 1000);
      moveCrate(crate, ((target.x - center.x) / gap) * pull, ((target.y - center.y) / gap) * pull, g.level);
    }
    const currentCenter = { x: crate.x + crate.w / 2, y: crate.y + crate.h / 2 };
    if (dist(currentCenter, g.player) > 155) g.cargoTether = null;
  }

  function interact(actor, options = {}) {
    const g = game.current;
    g.level.switches.forEach((s) => {
      if (dist(actor, s) < 54) s.on = true;
    });
    if (!options.toggleCargo) return;
    const nearest = g.level.crates
      .map((crate, index) => ({ crate, index, gap: dist(actor, { x: crate.x + crate.w / 2, y: crate.y + crate.h / 2 }) }))
      .filter((item) => item.gap < 82)
      .sort((a, b) => a.gap - b.gap)[0];
    if (!nearest || g.cargoTether?.index === nearest.index) {
      g.cargoTether = null;
    } else {
      g.cargoTether = { index: nearest.index, pulse: 0 };
    }
  }

  function damagePlayer(g, amount) {
    if (amount <= 0 || performance.now() < (g.player.phaseUntil || 0)) return;
    const tunedAmount = amount * (g.tuning?.damageTaken || 1);
    const blocked = Math.min(g.player.shield || 0, tunedAmount);
    g.player.shield = Math.max(0, (g.player.shield || 0) - blocked);
    g.player.hp -= tunedAmount - blocked;
  }

  useEffect(() => {
    let raf;
    const loop = (now) => {
      const g = game.current;
      if (!g || screen !== "playing") {
        raf = requestAnimationFrame(loop);
        return;
      }
      const dt = Math.min(34, now - g.last);
      g.last = now;
      if (!document.hasFocus()) clearInputState();
      const level = g.level;
      const perks = getPetPerks(cosmetic);
      const tuning = g.tuning || getDifficultyTuning(settings.difficulty);
      const hostileSpeed = tuning.hostileSpeed || 1;
      const maxShield = perks.maxShield || 0;
      g.player.maxShield = maxShield;
      g.player.shield = clamp(g.player.shield || 0, 0, maxShield);
      const speed = 170;
      let mx = 0;
      let my = 0;
      if (keys.current.has(keybinds.moveUp) || keys.current.has("ArrowUp") || touch.current.up) my -= 1;
      if (keys.current.has(keybinds.moveDown) || keys.current.has("ArrowDown") || touch.current.down) my += 1;
      if (keys.current.has(keybinds.moveLeft) || keys.current.has("ArrowLeft") || touch.current.left) mx -= 1;
      if (keys.current.has(keybinds.moveRight) || keys.current.has("ArrowRight") || touch.current.right) mx += 1;
      if (!mx && !my) {
        mx = mobileMove.current.x;
        my = mobileMove.current.y;
      }
      if (!mx && !my && dashQueued.current && mobileAim.current.active) {
        mx = mobileAim.current.x;
        my = mobileAim.current.y;
      }
      if (mx || my) {
        const len = Math.hypot(mx, my);
        const nx = mx / len;
        const ny = my / len;
        if (dashQueued.current && g.player.dash >= 100 && g.player.energy >= DASH_COST) {
          const dashAngle = Math.atan2(ny, nx);
          g.dashBursts.push({ x: g.player.x, y: g.player.y, angle: dashAngle, life: 260, maxLife: 260 });
          phaseMove(g.player, nx * 116, ny * 116);
          g.player.dash = 0;
          g.player.energy -= DASH_COST;
          g.player.dashTrail = 180;
          g.player.phaseVector = { x: nx, y: ny };
          if (settings.shake && !settings.reduced) g.shake = 5;
        }
        dashQueued.current = false;
        const overdriveBoost = now < (g.player.overdriveUntil || 0) ? 1.22 : 1;
        const dashBoost = g.player.dashTrail > 0 ? 1.35 : 1;
        const moveX = nx * speed * dashBoost * overdriveBoost * dt / 1000;
        const moveY = ny * speed * dashBoost * overdriveBoost * dt / 1000;
        if (g.player.dashTrail > 0) {
          phaseMove(g.player, moveX, moveY);
        } else {
          tryMove(g.player, moveX, moveY, level, true);
        }
      } else if (dashQueued.current) {
        dashQueued.current = false;
      }
      if (abilityQueued.current) {
        useAbility(now);
        abilityQueued.current = false;
      }
      if (mobileAim.current.active && (Math.abs(mobileAim.current.x) > 0.05 || Math.abs(mobileAim.current.y) > 0.05)) {
        g.player.angle = Math.atan2(mobileAim.current.y, mobileAim.current.x);
      } else {
        g.player.angle = Math.atan2(mouse.current.y - g.player.y, mouse.current.x - g.player.x);
      }
      const wantsShoot = mouse.current.down || keys.current.has(keybinds.shoot) || touch.current.shoot || mobileAim.current.shooting;
      if (wantsShoot && !g.player.triggerHeld) firePlayerWeapon(now);
      if (wantsShoot && (g.player.weaponId === "storm" || g.player.weaponId === "pulse" || g.player.weaponId === "needle")) firePlayerWeapon(now);
      g.player.triggerHeld = wantsShoot;
      if (keys.current.has(keybinds.reload)) startReload(now);
      const wantsInteract = keys.current.has(keybinds.interact) || touch.current.interact;
      if (wantsInteract || interactQueued.current) interact(g.player, { toggleCargo: interactQueued.current });
      interactQueued.current = false;

      g.echoes.forEach((e) => {
        e.age += dt;
        const frame = e.frames[Math.floor(e.age / ECHO_FRAME_MS)];
        if (!frame) return;
        e.x = frame.x;
        e.y = frame.y;
        e.angle = frame.angle;
        if (frame.interact) interact(e);
        if (frame.fire && e.age - e.fired > 210) {
          e.fired = e.age;
          shoot(e);
        }
      });
      g.echoes = g.echoes.filter((e) => e.age < e.frames.length * ECHO_FRAME_MS || e.futureMs < ECHO_FUTURE_MS);
      updateCargoTether(g, dt);

      const bodies = [g.player, ...g.echoes, ...level.crates.map((c) => ({ x: c.x + c.w / 2, y: c.y + c.h / 2 }))];
      g.activeIds = new Set(level.switches.filter((s) => s.on).map((s) => s.id));
      level.plates.forEach((p) => {
        if (bodies.some((b) => dist(b, p) < p.r + 18)) g.activeIds.add(p.id);
      });
      level.doors.forEach((d) => {
        d.open = d.requires.every((id) => g.activeIds.has(id));
      });

      level.scrap.forEach((s) => {
        if (!s.taken && dist(g.player, s) < 28) {
          s.taken = true;
          g.player.scrap += 1;
          g.player.energy = clamp(g.player.energy + 24, 0, g.player.maxEnergy || MAX_ENERGY);
        }
      });

      level.coinCrates?.forEach((c) => {
        if (!c.taken && dist(g.player, { x: c.x + c.w / 2, y: c.y + c.h / 2 }) < 32) {
          c.taken = true;
          const amount = Math.round((c.value || 10) * (perks.coinBonus || 1));
          g.player.coinsEarned += amount;
          g.coinPopups.push({ x: c.x + c.w / 2, y: c.y + c.h / 2 - 8, amount, life: 780, maxLife: 780, spin: Math.random() * Math.PI * 2 });
          awardCoins?.(amount);
        }
      });

      level.drones?.forEach((d) => {
        if (d.hp <= 0) return;
        const a = Math.atan2(g.player.y - d.y, g.player.x - d.x);
        d.angle = a;
        const gap = dist(d, g.player);
        if (gap > 155) {
          d.x = clamp(d.x + Math.cos(a) * 115 * hostileSpeed * dt / 1000, 58, W - 58);
          d.y = clamp(d.y + Math.sin(a) * 115 * hostileSpeed * dt / 1000, 58, H - 58);
        }
        if (gap < 34) {
          damagePlayer(g, dt * 0.035);
          if (settings.shake && !settings.reduced) g.shake = Math.max(g.shake, 4);
        }
        d.cooldown -= dt;
        if (d.cooldown <= 0 && gap < 520) {
          g.bullets.push({ x: d.x + Math.cos(a) * 20, y: d.y + Math.sin(a) * 20, vx: Math.cos(a) * 360 * hostileSpeed, vy: Math.sin(a) * 360 * hostileSpeed, life: 1500, owner: "enemy" });
          d.cooldown = 1050 * (tuning.hostileCooldown || 1);
        }
      });
      level.missileSentries?.forEach((m) => {
        if (m.hp <= 0) return;
        const gap = dist(m, g.player);
        const blockers = getSolidBlocks(level);
        const seesPlayer = hasLineOfSight(m, g.player, blockers) && gap < 720;
        m.cooldown -= dt;
        if (seesPlayer) {
          m.lockMs = Math.min(1600, (m.lockMs || 0) + dt);
          if (m.lockMs >= 1400 && m.cooldown <= 0) {
            g.missiles.push({ x: m.x, y: m.y, vx: 0, vy: 0, speed: 245 * hostileSpeed, turn: 0.09 * hostileSpeed, life: 3600 });
            m.cooldown = 2800 * (tuning.hostileCooldown || 1);
            m.lockMs = 0;
          }
        } else {
          m.lockMs = Math.max(0, (m.lockMs || 0) - dt * 0.9);
        }
      });
      level.gravityNodes?.forEach((h) => {
        if (h.hp <= 0) return;
        h.pulse = (h.pulse || 0) + dt;
        const gap = dist(h, g.player);
        if (gap < 175 && gap > 24) {
          const a = Math.atan2(h.y - g.player.y, h.x - g.player.x);
          tryMove(g.player, Math.cos(a) * 70 * hostileSpeed * dt / 1000, Math.sin(a) * 70 * hostileSpeed * dt / 1000, level, false);
        }
      });
      level.laserSweepers?.forEach((h) => {
        if (h.hp <= 0) return;
        h.angle = (h.angle || 0) + (h.speed || 0.0012) * dt;
        const a = h.angle;
        const p1 = { x: h.x - Math.cos(a) * 230, y: h.y - Math.sin(a) * 230 };
        const p2 = { x: h.x + Math.cos(a) * 230, y: h.y + Math.sin(a) * 230 };
        if (pointToSegmentDistance(g.player, p1, p2) < 16 && hasLineOfSight(h, g.player, getSolidBlocks(level))) {
          damagePlayer(g, dt * 0.04);
        }
      });
      level.blinkHunters?.forEach((h) => {
        if (h.hp <= 0) return;
        h.cooldown -= dt;
        h.blink -= dt;
        const a = Math.atan2(g.player.y - h.y, g.player.x - h.x);
        h.angle = a;
        if (h.blink <= 0 && dist(h, g.player) > 130) {
          h.x = clamp(g.player.x - Math.cos(a) * 120, 70, W - 70);
          h.y = clamp(g.player.y - Math.sin(a) * 120, 70, H - 70);
          h.blink = 2200 * (tuning.hostileCooldown || 1);
          if (settings.shake && !settings.reduced) g.shake = Math.max(g.shake, 4);
        } else if (dist(h, g.player) > 42) {
          h.x = clamp(h.x + Math.cos(a) * 95 * hostileSpeed * dt / 1000, 58, W - 58);
          h.y = clamp(h.y + Math.sin(a) * 95 * hostileSpeed * dt / 1000, 58, H - 58);
        }
        if (dist(h, g.player) < 32) damagePlayer(g, dt * 0.05);
      });
      level.shieldDrones?.forEach((h) => {
        if (h.hp <= 0) return;
        h.pulse = (h.pulse || 0) + dt;
      });
      level.repairBots?.forEach((h) => {
        if (h.hp <= 0) return;
        h.cooldown -= dt;
        if (h.cooldown <= 0) {
          const repairables = [...level.turrets, ...(level.drones || []), ...(level.missileSentries || []), ...SPECIAL_HOSTILE_KEYS.flatMap((key) => level[key] || [])]
            .filter((target) => target !== h && target.hp > 0 && target.maxHp && target.hp < target.maxHp && dist(h, target) < 165);
          repairables.sort((a, b) => dist(h, a) - dist(h, b));
          if (repairables[0]) repairables[0].hp = Math.min(repairables[0].maxHp, repairables[0].hp + 1);
          h.cooldown = 1100;
        }
      });

      level.turrets.forEach((t) => {
        if (t.hp <= 0) return;
        t.cooldown -= dt;
        const blockers = getSolidBlocks(level);
        const seesPlayer = hasLineOfSight(t, g.player, blockers);
        t.seesPlayer = seesPlayer;
        if (t.cooldown <= 0 && seesPlayer) {
          const a = Math.atan2(g.player.y - t.y, g.player.x - t.x);
          g.bullets.push({ x: t.x, y: t.y, vx: Math.cos(a) * 310 * hostileSpeed, vy: Math.sin(a) * 310 * hostileSpeed, life: 1800, owner: "enemy" });
          t.cooldown = 1350 * (tuning.hostileCooldown || 1);
        }
      });

      g.bullets.forEach((b) => {
        const dx = b.vx * dt / 1000;
        const dy = b.vy * dt / 1000;
        b.x += dx;
        b.y += dy;
        b.traveled = (b.traveled || 0) + Math.hypot(dx, dy);
        b.life -= dt;
        if (b.traveled > (b.maxRange || 9999)) b.life = 0;
        if (getSolidBlocks(level).some((w) => rectsTouch({ x: b.x - 3, y: b.y - 3, w: 6, h: 6 }, w))) b.life = 0;
        const shielded = (target) => level.shieldDrones?.some((s) => s.hp > 0 && dist(s, target) < 110 && dist(s, target) > 18);
        level.turrets.forEach((t) => {
          if (b.owner !== "enemy" && t.hp > 0 && dist(b, t) < 25) {
            t.hp -= shielded(t) ? 0 : b.damage || 1;
            b.life = 0;
          }
        });
        level.drones?.forEach((d) => {
          if (b.owner !== "enemy" && d.hp > 0 && dist(b, d) < 24) {
            d.hp -= shielded(d) ? 0 : b.damage || 1;
            b.life = 0;
            if (d.hp <= 0) {
              g.player.energy = clamp(g.player.energy + 12, 0, g.player.maxEnergy || MAX_ENERGY);
            }
          }
        });
        level.missileSentries?.forEach((m) => {
          if (b.owner !== "enemy" && m.hp > 0 && dist(b, m) < 25) {
            m.hp -= shielded(m) ? 0 : b.damage || 1;
            b.life = 0;
          }
        });
        SPECIAL_HOSTILE_KEYS.forEach((key) => {
          level[key]?.forEach((h) => {
            if (b.owner !== "enemy" && h.hp > 0 && dist(b, h) < 25) {
              h.hp -= b.damage || 1;
              b.life = 0;
            }
          });
        });
        if (b.owner !== "enemy" && level.core?.alive && dist(b, level.core) < 32) {
          level.core.hp -= b.damage || 1;
          b.life = 0;
          if (level.core.hp <= 0) level.core.alive = false;
        }
        if (b.owner === "enemy" && dist(b, g.player) < 18) {
          damagePlayer(g, 10);
          b.life = 0;
          if (settings.shake && !settings.reduced) g.shake = 7;
        }
      });
      g.bullets = g.bullets.filter((b) => b.life > 0 && b.x > 0 && b.x < W && b.y > 0 && b.y < H);
      g.missiles.forEach((missile) => {
        missile.life -= dt;
        const target = Math.atan2(g.player.y - missile.y, g.player.x - missile.x);
        const current = Math.atan2(missile.vy || 0.001, missile.vx || 0.001);
        let delta = target - current;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        const next = current + clamp(delta, -missile.turn, missile.turn);
        missile.vx = Math.cos(next) * missile.speed;
        missile.vy = Math.sin(next) * missile.speed;
        missile.x += missile.vx * dt / 1000;
        missile.y += missile.vy * dt / 1000;
        if (getSolidBlocks(level).some((w) => rectsTouch({ x: missile.x - 5, y: missile.y - 5, w: 10, h: 10 }, w))) missile.life = 0;
        if (dist(missile, g.player) < 20) {
          const dashed = g.player.dashTrail > 0;
          if (!dashed) damagePlayer(g, tuning.missileDamage || 50);
          missile.life = 0;
          if (settings.shake && !settings.reduced) g.shake = 10;
        }
      });
      g.missiles = g.missiles.filter((m) => m.life > 0 && m.x > 0 && m.x < W && m.y > 0 && m.y < H);

      level.lasers.forEach((l) => {
        if (g.activeIds.has(l.disabledBy)) return;
        const vertical = Math.abs(l.x1 - l.x2) < 2;
        const near = vertical ? Math.abs(g.player.x - l.x1) < 14 && g.player.y > Math.min(l.y1, l.y2) && g.player.y < Math.max(l.y1, l.y2) : Math.abs(g.player.y - l.y1) < 14 && g.player.x > Math.min(l.x1, l.x2) && g.player.x < Math.max(l.x1, l.x2);
        if (near) damagePlayer(g, dt * 0.018 * (perks.laserResist || 1) * (tuning.laserDamage || 1));
      });

      g.player.energy = clamp(g.player.energy + (perks.energyRegen || 0) * dt / 1000, 0, g.player.maxEnergy || MAX_ENERGY);
      g.player.hp = clamp(g.player.hp + (perks.hullRegen || 0) * dt / 1000, 0, 100);
      if (g.player.maxShield > 0) g.player.shield = clamp((g.player.shield || 0) + (perks.shieldRegen || 0) * dt / 1000, 0, g.player.maxShield);
      g.recordTimer += dt;
      while (g.recordTimer >= ECHO_FRAME_MS) {
        g.recordTimer -= ECHO_FRAME_MS;
        const frame = {
          x: g.player.x,
          y: g.player.y,
          angle: g.player.angle,
          fire: wantsShoot,
          interact: keys.current.has(keybinds.interact) || touch.current.interact
        };
        g.recording.push(frame);
        while (g.recording.length > ECHO_MS / ECHO_FRAME_MS) g.recording.shift();
        g.echoes.forEach((echo) => {
          if (echo.futureMs < ECHO_FUTURE_MS) {
            echo.frames.push({ ...frame });
            echo.futureMs += ECHO_FRAME_MS;
          }
        });
      }
      const overdriveRecharge = now < (g.player.overdriveUntil || 0) ? 1.3 : 1;
      g.player.dash = clamp(g.player.dash + dt * 0.055 * (perks.dashRegenMultiplier || 1) * overdriveRecharge, 0, 100);
      const activeWeapon = getWeaponById(g.player.weaponId || cosmetic.weapon);
      g.player.ammoMax = activeWeapon.ammoMax;
      if (g.player.isReloading && now >= g.player.reloadUntil) {
        g.player.isReloading = false;
        g.player.ammo = activeWeapon.ammoMax;
      }
      const hadPhase = (g.player.dashTrail || 0) > 0;
      g.player.dashTrail = Math.max(0, (g.player.dashTrail || 0) - dt);
      if (hadPhase && g.player.dashTrail === 0) resolvePlayerAfterPhase(g.player, level);
      g.dashBursts.forEach((burst) => burst.life -= dt);
      g.dashBursts = g.dashBursts.filter((burst) => burst.life > 0);
      g.railBeams.forEach((beam) => {
        beam.life -= dt;
      });
      g.railBeams = g.railBeams.filter((beam) => beam.life > 0);
      g.coinPopups.forEach((popup) => {
        popup.life -= dt;
        popup.spin += dt * 0.014;
      });
      g.coinPopups = g.coinPopups.filter((popup) => popup.life > 0);
      g.abilityBursts.forEach((burst) => {
        burst.life -= dt;
      });
      g.abilityBursts = g.abilityBursts.filter((burst) => burst.life > 0);
      g.spawnFlash = Math.max(0, (g.spawnFlash || 0) - dt);
      g.shake = Math.max(0, g.shake - dt * 0.03);

      if (g.player.hp <= 0) {
        setSummary({ result: "Signal Lost", scrap: g.player.scrap, hull: Math.max(0, Math.round(g.player.hp)), time: Math.round((now - g.started) / 1000), room: level.name, levelIndex, isCustom: Boolean(customLevel) });
        setScreen("summary");
      }
      const roomSecured =
        (!level.core || !level.core.alive || levelIndex < 4) &&
        level.turrets.every((t) => t.hp <= 0) &&
        (level.drones || []).every((d) => d.hp <= 0) &&
        (level.missileSentries || []).every((m) => m.hp <= 0) &&
        SPECIAL_HOSTILE_KEYS.every((key) => (level[key] || []).every((h) => h.hp <= 0));
      if (rectsTouch(playerRect(g.player), level.exit) && level.doors.every((d) => d.open) && roomSecured) {
        setSummary({ result: "Extracted", scrap: g.player.scrap, hull: Math.max(0, Math.round(g.player.hp)), time: Math.round((now - g.started) / 1000), room: level.name, levelIndex, isCustom: Boolean(customLevel) });
        setScreen("summary");
      }

      const ctx = canvas.current?.getContext("2d");
      if (ctx) drawLevel(ctx, level, g, g.shake, cosmetic, settings.uiTheme);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [screen, settings, levelIndex, cosmetic, keybinds]);

  function mobileInput(action, pressed) {
    if (action in touch.current) touch.current[action] = pressed;
  }
  function mobileAction(action) {
    const now = performance.now();
    if (action === "dash") dashQueued.current = true;
    if (action === "echo") spawnEcho();
    if (action === "ability") useAbility(now);
    if (action === "reload") startReload(now);
    if (action === "pause" && game.current?.status === "playing") setScreen("paused");
  }
  function setMobileMove(x, y) {
    mobileMove.current.x = x;
    mobileMove.current.y = y;
  }
  function setMobileAim(x, y, active) {
    mobileAim.current.x = x;
    mobileAim.current.y = y;
    mobileAim.current.active = active;
    mobileAim.current.shooting = false;
  }
  function setMobileShooting(shooting) {
    mobileAim.current.shooting = shooting;
  }
  return { canvas, game, reset, spawnEcho, mobileInput, mobileAction, setMobileMove, setMobileAim, setMobileShooting };
}

function GameView({ levelIndex, customLevel, screen, setScreen, settings, setSummary, cosmetic, awardCoins, keybinds }) {
  const { canvas, game, reset, spawnEcho, mobileInput, mobileAction, setMobileMove, setMobileAim, setMobileShooting } = useGame({ levelIndex, customLevel, screen, setScreen, settings, setSummary, cosmetic, awardCoins, keybinds });
  const [tick, setTick] = useState(0);
  const [controlMode, setControlMode] = useState(() => localStorage.getItem("echo-salvage-control-mode") || "pc");
  const [leftStick, setLeftStick] = useState({ x: 0, y: 0 });
  const [rightStick, setRightStick] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const id = setInterval(() => setTick((v) => v + 1), 120);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    localStorage.setItem("echo-salvage-control-mode", controlMode);
  }, [controlMode]);
  const g = game.current;
  const isMobile = controlMode === "mobile";
  const hold = (action, pressed) => (e) => {
    e.preventDefault();
    mobileInput(action, pressed);
  };
  const stickValueFromPointer = (e, radius = 44) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const len = Math.hypot(dx, dy);
    if (!len) return { x: 0, y: 0, force: 0 };
    const limited = Math.min(radius, len);
    return { x: (dx / len) * (limited / radius), y: (dy / len) * (limited / radius), force: len / radius };
  };
  const onLeftStickStart = (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const v = stickValueFromPointer(e);
    setLeftStick({ x: v.x, y: v.y });
    setMobileMove(v.x, v.y);
  };
  const onLeftStickMove = (e) => {
    e.preventDefault();
    if (e.buttons === 0 && e.pointerType === "mouse") return;
    const v = stickValueFromPointer(e);
    setLeftStick({ x: v.x, y: v.y });
    setMobileMove(v.x, v.y);
  };
  const onLeftStickEnd = (e) => {
    e.preventDefault();
    setLeftStick({ x: 0, y: 0 });
    setMobileMove(0, 0);
  };
  const onRightStickStart = (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const v = stickValueFromPointer(e);
    setRightStick({ x: v.x, y: v.y });
    setMobileAim(v.x, v.y, true);
    setMobileShooting(false);
  };
  const onRightStickMove = (e) => {
    e.preventDefault();
    if (e.buttons === 0 && e.pointerType === "mouse") return;
    const v = stickValueFromPointer(e);
    setRightStick({ x: v.x, y: v.y });
    setMobileAim(v.x, v.y, true);
    setMobileShooting(v.force > 0.82);
  };
  const onRightStickEnd = (e) => {
    e.preventDefault();
    setRightStick({ x: 0, y: 0 });
    setMobileAim(0, 0, false);
    setMobileShooting(false);
  };
  return (
    <div className={`game-shell ${isMobile ? "mobile-layout" : ""}`}>
      <canvas ref={canvas} className="game-canvas" width={W} height={H} />
      <div className="hud">
        <div className="hud-cluster vitals-card">
          <div className="hud-title">
            <span>{g?.level.name ?? "Training Bay"}</span>
            <strong>Deck {levelIndex + 1}/{rooms.length}</strong>
          </div>
          <Meter label="Hull" value={g?.player.hp ?? 100} color="#ffd52d" />
          <Meter label="Energy" value={g?.player.energy ?? MAX_ENERGY} max={g?.player.maxEnergy ?? MAX_ENERGY} color="#ffd52d" />
          {(g?.player.maxShield ?? 0) > 0 && <Meter label="Shield" value={g?.player.shield ?? 0} max={g?.player.maxShield ?? 1} color="#00f0d2" />}
        </div>
        <div className="hud-card objective-card">
          <strong>Objective</strong>
          <span>Break the lock chain and extract.</span>
          <small>Use Echo timing, cargo, switches, and cover.</small>
        </div>
        <div className="hud-cluster stat-grid">
          <div className="stat-tile"><Shield size={16} /><span>Scrap</span><strong>{g?.player.scrap ?? 0}</strong></div>
          <div className="stat-tile"><Sparkles size={16} /><span>Coins</span><strong>{g?.player.coinsEarned ?? 0}</strong></div>
          <button className="stat-tile" onClick={spawnEcho}><Radio size={16} /><span>Echo</span><strong>{g?.echoes.length ?? 0}/{MAX_ECHOES}</strong></button>
          <div className="stat-tile"><Zap size={16} /><span>Dash</span><strong>{Math.round(g?.player.dash ?? 100)}%</strong></div>
          <div className="stat-tile"><Crosshair size={16} /><span>Ammo</span><strong>{g?.player.isReloading ? "..." : `${g?.player.ammo ?? 0}/${g?.player.ammoMax ?? 0}`}</strong></div>
          <div className="stat-tile"><Gauge size={16} /><span>Weapon</span><strong>{getWeaponById(g?.player.weaponId).label.split(" ")[0]}</strong></div>
          <div className="stat-tile"><Radio size={16} /><span>Ability</span><strong>{Math.max(0, Math.ceil(((g?.player.abilityReadyAt ?? 0) - performance.now()) / 1000)) || "READY"}</strong></div>
          <div className="hud-help">
            <button className="mode-chip" onClick={() => setControlMode(isMobile ? "pc" : "mobile")}>{isMobile ? "Mobile Mode" : "PC Mode"}</button>
            <span>{isMobile ? "Twin-stick touch active." : `${keyName(keybinds.interact)} toggles nearby cargo tether. ${keyName(keybinds.echo)} spawns Echo. ${keyName(keybinds.reload)} reloads.`}</span>
          </div>
        </div>
      </div>
      {isMobile && (
        <div className="mobile-dock">
          <div className="mobile-stick" onPointerDown={onLeftStickStart} onPointerMove={onLeftStickMove} onPointerUp={onLeftStickEnd} onPointerCancel={onLeftStickEnd}>
            <span className="mobile-stick-ring" />
            <span className="mobile-stick-knob" style={{ transform: `translate(${leftStick.x * 34}px, ${leftStick.y * 34}px)` }} />
          </div>
          <div className="mobile-actions">
            <button className="mobile-action mobile-action-dash" onClick={() => mobileAction("dash")}>Dash</button>
            <button className="mobile-action mobile-action-echo" onClick={() => mobileAction("echo")}>Echo</button>
            <button className="mobile-action mobile-action-ability" onClick={() => mobileAction("ability")}>Ability</button>
            <button className="mobile-action mobile-action-pause" onClick={() => mobileAction("pause")}>Pause</button>
          </div>
          <div className="mobile-stick mobile-stick-aim" onPointerDown={onRightStickStart} onPointerMove={onRightStickMove} onPointerUp={onRightStickEnd} onPointerCancel={onRightStickEnd}>
            <span className="mobile-stick-ring" />
            <span className="mobile-stick-fire-ring" />
            <span className="mobile-stick-knob" style={{ transform: `translate(${rightStick.x * 34}px, ${rightStick.y * 34}px)` }} />
          </div>
        </div>
      )}
    </div>
  );
}

function Meter({ label, value, max = 100, color }) {
  return (
    <div className="meter">
      <div className="meter-label"><span>{label}</span><span>{Math.round(value)}%</span></div>
      <div className="meter-track"><div className="meter-fill" style={{ width: `${clamp((value / max) * 100, 0, 100)}%`, background: color }} /></div>
    </div>
  );
}

function MainMenu({ openBriefing, startRoom, setScreen, user, onLogout, openSettings, openControls }) {
  const totalStars = getTotalStars(user?.progress);
  const currentSection = CAMPAIGN_SECTIONS[getCurrentSectionIndex(user)];
  return (
    <div className="overlay">
      <div className="menu-grid">
        <section className="panel command-panel">
          <div className="panel-header">
            <span className="badge">Orbital Salvage Run</span>
            <button className="profile-pill" onClick={() => setScreen("profile")}>
              <AvatarBadge avatar={user?.avatar} />
              <span>{user?.devMode ? "Dev" : "Pilot"} {user?.nickname}</span>
            </button>
          </div>
          <h1 className="title">Echo Salvage</h1>
          <p className="lead">Pilot a drone through locked station rooms. The Echo replays an eight-second action window, then continues with the next recorded actions you perform after deployment.</p>
          <div className="campaign-status" style={{ "--section-accent": currentSection.accent }}>
            <span>{currentSection.label}</span>
            <strong>{totalStars} stars banked</strong>
            <small>{currentSection.blurb}</small>
          </div>
          <div className="button-grid">
            <Button primary onClick={openBriefing}><Play size={22} /> Begin Training</Button>
            <Button onClick={() => setScreen("editor")}><Wand2 size={20} /> Level Creator</Button>
            <Button className="construction-tab" onClick={() => setScreen("community")}><Globe2 size={20} /> Community Levels <span>In Construction</span></Button>
            <Button onClick={() => setScreen("profile")}><UserRound size={20} /> Customization Bay</Button>
            <Button onClick={openSettings}><Settings size={20} /> Settings</Button>
            <Button onClick={openControls}><Gamepad2 size={20} /> Controls</Button>
            <Button danger onClick={onLogout}><LogOut size={20} /> Logout</Button>
          </div>
        </section>
        <section className="panel campaign-panel">
          <h2>Run Brief</h2>
          <Brief icon={<Bot />} title="Campaign Flow" text="The station is now split into four decks. You clear them in order; stars rate performance, but they no longer let you jump ahead and skip rooms." />
          <div className="star-brief"><Sparkles size={18} /><span>{totalStars} stars recovered</span><small>Clear one room to open the next. Replays stay open for practice and better star runs.</small></div>
          <div className="section-grid">
            {CAMPAIGN_SECTIONS.map((section) => {
              const [start, end] = section.range;
              const sectionRooms = rooms.slice(start, end + 1);
              const cleared = sectionRooms.filter((_, offset) => (Number(user?.progress?.[start + offset]) || 0) > 0).length;
              const active = currentSection.id === section.id;
              return (
                <section className="campaign-section" key={section.id} data-active={active} style={{ "--section-accent": section.accent }}>
                  <div className="campaign-section-head">
                    <div>
                      <small>{section.shortLabel}</small>
                      <h3>{section.label}</h3>
                    </div>
                    <span>{cleared}/{sectionRooms.length}</span>
                  </div>
                  <p>{section.blurb}</p>
                  <div className="section-rooms">
                    {sectionRooms.map((r, offset) => {
                      const i = start + offset;
                      const unlocked = isRoomUnlocked(i, user);
                      const roomStars = user?.progress?.[i] || 0;
                      return (
                        <button className="room-card" data-locked={!unlocked} disabled={!unlocked} key={r} onClick={() => { if (!unlocked) return; startRoom(i); }}>
                          <span className="room-num">{i + 1}</span>
                          <span className="room-tier">{getRoomTier(i)}</span>
                          <span className="room-name">{r}</span>
                          <span className="room-stars">{unlocked ? `${"★".repeat(roomStars)}${"☆".repeat(3 - roomStars)}` : "LOCKED"}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
          <p className="small-copy" style={{ marginTop: 16 }}>Keyboard recommended. Pause with Escape. Restart room with R.</p>
        </section>
      </div>
    </div>
  );
}

function Briefing({ setScreen, startRun }) {
  return (
    <div className="overlay">
      <div className="menu-grid">
        <section className="panel">
          <div className="panel-header"><span className="badge">First Boot</span><span className="status-pill">Echo Link Unstable</span></div>
          <h1 className="title" style={{ fontSize: "clamp(46px, 6vw, 70px)" }}>Your past self is the tool.</h1>
          <p className="lead">Create an Echo after doing something useful. It replays your recent action window, then follows the actions you record immediately afterward on a delay.</p>
          <div className="button-grid">
            <Button primary onClick={startRun}><Play size={22} /> Start Run</Button>
            <Button onClick={() => setScreen("menu")}>Main Menu</Button>
          </div>
        </section>
        <section className="panel">
          <Brief icon={<Boxes />} title="Read the labels" text="Plate cargo is pushable weight for pressure plates. Switches latch, plates need bodies or cargo, and gates require the whole lock chain." />
          <Brief icon={<Zap />} title="Record, then replay" text="The Echo starts eight seconds in your past and keeps following the next actions you perform after release, delayed behind you." />
          <Brief icon={<Shield />} title="Clear the lock chain" text="Locked gates show how many requirements remain. Solve the room, survive the hazards, and extract." />
        </section>
      </div>
    </div>
  );
}

function Brief({ icon, title, text }) {
  return <div className="brief-card"><div className="brief-icon">{icon}</div><div><h3>{title}</h3><p>{text}</p></div></div>;
}

function createInitialSummaryState() {
  return { result: "Extracted", scrap: 0, hull: 100, time: 0, room: rooms[0], levelIndex: 0, isCustom: false };
}

function ProfileScreen({ user, setUser, setScreen }) {
  const [avatar, setAvatar] = useState(user?.avatar || "yellow");
  const [cosmetic, setCosmetic] = useState({ ...COSMETIC_DEFAULTS, ...(user?.cosmetic || {}) });
  const [message, setMessage] = useState("");
  const economy = normalizeEconomy(user);
  const owned = economy.owned;
  const ownedColors = owned.colors || [];
  const previewRef = useRef(null);

  const equipCosmetic = (slot, value) => {
    setCosmetic((current) => ({ ...current, [slot]: value }));
  };

  const buy = (bucket, id, price, label, afterUnlock) => {
    const latestUser = getStoredUsers().find((u) => u.id === user?.id) || user;
    const latestEconomy = normalizeEconomy(latestUser);
    if (latestEconomy.owned[bucket]?.includes(id)) {
      setMessage(`${label} is already unlocked.`);
      return;
    }
    if (latestEconomy.coins < price) {
      setMessage(`Need ${price - latestEconomy.coins} more coins for ${label}.`);
      return;
    }
    const session = updateUserEconomy(latestUser, (current) => {
      const normalized = normalizeEconomy(current);
      return {
        ...current,
        coins: normalized.coins - price,
        owned: {
          ...normalized.owned,
          [bucket]: [...(normalized.owned[bucket] || []), id]
        }
      };
    });
    setUser(session);
    afterUnlock?.();
    setMessage(`Unlocked ${label}.`);
  };

  const chooseColor = (slot, color) => {
    if (!ownedColors.includes(color)) {
      setMessage("Unlock this color once, then use it anywhere.");
      return;
    }
    equipCosmetic(slot, color);
  };

  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    let raf = 0;
    const weapon = getWeaponById(cosmetic.weapon);
    const ability = getAbilityById(cosmetic.ability);

    const render = (now) => {
      const t = now / 1000;
      const burstPhase = (t % 2.6) / 2.6;
      const burstLife = burstPhase < 0.55 ? 1 - burstPhase / 0.55 : 0;
      const previewPlayer = {
        x: 66,
        y: 62,
        angle: 0,
        dashTrail: burstPhase < 0.18 ? 160 : 0
      };

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#041014";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "rgba(0, 240, 210, 0.08)";
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      if (burstLife > 0) {
        drawDashBurst(ctx, { x: 48, y: 62, angle: 0, life: burstLife * 260, maxLife: 260 }, cosmetic);
      }

      drawDrone(ctx, previewPlayer, false, cosmetic);
      drawPet(ctx, previewPlayer, cosmetic, now);

      const bulletCount = Math.min(weapon.shotsPerTrigger, 6);
      const bulletSpread = weapon.spread || 0;
      const bulletTravel = ((t * (weapon.id === "storm" ? 2.2 : 1.2)) % 1) * 64;
      for (let i = 0; i < bulletCount; i += 1) {
        const spreadOffset = bulletCount === 1 ? 0 : (i - (bulletCount - 1) / 2) * Math.max(6, bulletSpread * 70);
        const bx = 112 + bulletTravel;
        const by = 62 + spreadOffset;
        ctx.save();
        ctx.shadowColor = cosmetic.trail;
        ctx.shadowBlur = 10;
        ctx.fillStyle = weapon.damage > 1 ? "#ffb000" : "#ffd52d";
        ctx.beginPath();
        ctx.arc(bx, by, weapon.damage > 1 ? 4.5 : 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.fillStyle = "#dbe8e7";
      ctx.font = "900 13px Rajdhani, Bahnschrift, sans-serif";
      ctx.fillText(weapon.label, 12, 16);
      ctx.fillStyle = "#91a9ac";
      ctx.font = "700 11px Rajdhani, Bahnschrift, sans-serif";
      if (((t * 1000) % ability.cooldownMs) < 900) {
        drawAbilityBurst(ctx, { x: 66, y: 62, type: ability.id, life: 360, maxLife: 520 });
      }
      ctx.fillText(`Dash: ${DASH_STYLES.find((dash) => dash.id === cosmetic.dashStyle)?.label || "Streak"}`, 12, 90);
      ctx.fillText(`Pet: ${PETS.find((pet) => pet.id === cosmetic.pet)?.label || "No Pet"}`, 12, 104);
      ctx.fillText(`Ability: ${ability.label}`, 12, 118);

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [cosmetic]);

  const save = () => {
    const current = getStoredUsers().find((u) => u.id === user?.id);
    if (!current) {
      setMessage("Profile not found. Log in again.");
      return;
    }
    const currentOwned = normalizeEconomy(current).owned;
    const currentColors = currentOwned.colors || [];
    const nextCosmetic = {
      ...cosmetic,
      body: currentColors.includes(cosmetic.body) ? cosmetic.body : COSMETIC_DEFAULTS.body,
      trail: currentColors.includes(cosmetic.trail) ? cosmetic.trail : COSMETIC_DEFAULTS.trail,
      accent: currentColors.includes(cosmetic.accent) ? cosmetic.accent : COSMETIC_DEFAULTS.accent,
      frame: currentOwned.frames.includes(cosmetic.frame) ? cosmetic.frame : COSMETIC_DEFAULTS.frame,
      cockpit: currentOwned.cockpits.includes(cosmetic.cockpit) ? cosmetic.cockpit : COSMETIC_DEFAULTS.cockpit,
      engine: currentOwned.engines.includes(cosmetic.engine) ? cosmetic.engine : COSMETIC_DEFAULTS.engine,
      decal: currentOwned.decals.includes(cosmetic.decal) ? cosmetic.decal : COSMETIC_DEFAULTS.decal,
      armor: currentOwned.armors.includes(cosmetic.armor) ? cosmetic.armor : COSMETIC_DEFAULTS.armor,
      pet: currentOwned.pets.includes(cosmetic.pet) ? cosmetic.pet : "none",
      dashStyle: currentOwned.dashes.includes(cosmetic.dashStyle) ? cosmetic.dashStyle : "streak"
      ,
      weapon: currentOwned.weapons.includes(cosmetic.weapon) ? cosmetic.weapon : WEAPON_DEFAULT,
      ability: currentOwned.abilities.includes(cosmetic.ability) ? cosmetic.ability : ABILITY_DEFAULT
    };
    const session = updateStoredUserProfile({ ...current, avatar, cosmetic: nextCosmetic });
    setUser(session);
    setMessage("Customization saved.");
  };

  return (
    <div className="overlay">
      <section className="panel profile-panel">
        <div className="drawer-head">
          <div>
            <span className="badge">Customization Bay</span>
            <h2>{user?.nickname} | {economy.coins} Coins</h2>
            <p className="small-copy">Buy parts and colors here, then equip them immediately in the same bay.</p>
          </div>
          <div className="profile-head-actions">
            <AvatarBadge avatar={avatar} size="lg" />
            <Button onClick={() => setScreen("menu")} aria-label="Close profile"><X /></Button>
          </div>
        </div>
        <p className="auth-message profile-message" data-visible={Boolean(message)} aria-live="polite">{message || "Customization ready."}</p>
        <div className="profile-preview">
          <canvas width="360" height="206" ref={previewRef} />
          <div className="profile-preview-copy">
            <strong>Live Preview</strong>
            <span>Colors are universal. Buy one color and apply it to paint, glow, trail, and engine-style effects.</span>
          </div>
        </div>
        <div className="profile-scroll">
          <div className="avatar-grid">
            {AVATARS.map((item) => (
              <button className="avatar-choice" data-active={avatar === item.id} key={item.id} onClick={() => setAvatar(item.id)}>
                <AvatarBadge avatar={item.id} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
          <div className="customizer-grid">
            <div>
              <label>Body Paint</label>
              <div className="swatch-row">
                {UNIVERSAL_COLORS.map((color) => <button key={color} className="swatch" data-active={cosmetic.body === color} data-locked={!ownedColors.includes(color)} style={{ background: color }} onClick={() => chooseColor("body", color)} />)}
              </div>
            </div>
            <div>
              <label>Glow Accent</label>
              <div className="swatch-row">
                {UNIVERSAL_COLORS.map((color) => <button key={color} className="swatch" data-active={cosmetic.accent === color} data-locked={!ownedColors.includes(color)} style={{ background: color }} onClick={() => chooseColor("accent", color)} />)}
              </div>
            </div>
            <div>
              <label>Dash / Trail Color</label>
              <div className="swatch-row">
                {UNIVERSAL_COLORS.map((color) => <button key={color} className="swatch" data-active={cosmetic.trail === color} data-locked={!ownedColors.includes(color)} style={{ background: color }} onClick={() => chooseColor("trail", color)} />)}
              </div>
            </div>
            <div>
              <label>Drone Frame</label>
              <div className="frame-row">
                {DRONE_FRAMES.map((frame) => <button key={frame.id} data-active={cosmetic.frame === frame.id} data-locked={!owned.frames.includes(frame.id)} onClick={() => owned.frames.includes(frame.id) ? setCosmetic({ ...cosmetic, frame: frame.id }) : setMessage("Unlock this frame in the shop first.")}>{frame.label}</button>)}
              </div>
            </div>
            <div>
              <label>Cockpit</label>
              <div className="frame-row">
                {COCKPITS.map((cockpit) => <button key={cockpit.id} data-active={cosmetic.cockpit === cockpit.id} data-locked={!owned.cockpits.includes(cockpit.id)} onClick={() => owned.cockpits.includes(cockpit.id) ? setCosmetic({ ...cosmetic, cockpit: cockpit.id }) : setMessage("Unlock this cockpit in the shop first.")}>{cockpit.label}</button>)}
              </div>
            </div>
            <div>
              <label>Engine</label>
              <div className="frame-row">
                {ENGINES.map((engine) => <button key={engine.id} data-active={cosmetic.engine === engine.id} data-locked={!owned.engines.includes(engine.id)} onClick={() => owned.engines.includes(engine.id) ? setCosmetic({ ...cosmetic, engine: engine.id }) : setMessage("Unlock this engine in the shop first.")}>{engine.label}</button>)}
              </div>
            </div>
            <div>
              <label>Armor Kit</label>
              <div className="frame-row">
                {ARMORS.map((armor) => <button key={armor.id} data-active={cosmetic.armor === armor.id} data-locked={!owned.armors.includes(armor.id)} onClick={() => owned.armors.includes(armor.id) ? setCosmetic({ ...cosmetic, armor: armor.id }) : setMessage("Unlock this armor kit in the shop first.")}>{armor.label}</button>)}
              </div>
            </div>
            <div>
              <label>Decal</label>
              <div className="frame-row">
                {DECALS.map((decal) => <button key={decal.id} data-active={cosmetic.decal === decal.id} data-locked={!owned.decals.includes(decal.id)} onClick={() => owned.decals.includes(decal.id) ? setCosmetic({ ...cosmetic, decal: decal.id }) : setMessage("Unlock this decal in the shop first.")}>{decal.label}</button>)}
              </div>
            </div>
            <div>
              <label>Dash Animation</label>
              <div className="frame-row">
                {DASH_STYLES.map((dash) => <button key={dash.id} data-active={cosmetic.dashStyle === dash.id} data-locked={!owned.dashes.includes(dash.id)} onClick={() => owned.dashes.includes(dash.id) ? setCosmetic({ ...cosmetic, dashStyle: dash.id }) : setMessage("Unlock this dash animation in the shop first.")}>{dash.label}</button>)}
              </div>
            </div>
            <div>
              <label>Pet</label>
              <div className="frame-row">
                {PETS.map((pet) => <button key={pet.id} data-active={cosmetic.pet === pet.id} data-locked={!owned.pets.includes(pet.id)} onClick={() => owned.pets.includes(pet.id) ? setCosmetic({ ...cosmetic, pet: pet.id }) : setMessage("Unlock this pet in the shop first.")}><span>{pet.label}</span><small>{pet.perk}</small></button>)}
              </div>
            </div>
            <div>
              <label>Weapon Style</label>
              <div className="frame-row">
                {WEAPONS.map((weapon) => <button key={weapon.id} data-active={cosmetic.weapon === weapon.id} data-locked={!owned.weapons.includes(weapon.id)} onClick={() => owned.weapons.includes(weapon.id) ? setCosmetic({ ...cosmetic, weapon: weapon.id }) : setMessage("Unlock this weapon in the shop first.")}><span>{weapon.label}</span><small>{weapon.perk}</small></button>)}
              </div>
            </div>
            <div>
              <label>Ability</label>
              <div className="frame-row">
                {ABILITIES.map((ability) => <button key={ability.id} data-active={cosmetic.ability === ability.id} data-locked={!owned.abilities.includes(ability.id)} onClick={() => owned.abilities.includes(ability.id) ? setCosmetic({ ...cosmetic, ability: ability.id }) : setMessage("Unlock this ability in the shop first.")}><span>{ability.label}</span><small>{ability.perk}</small></button>)}
              </div>
            </div>
          </div>
          <div className="bay-shop">
            <div className="bay-shop-head">
              <div>
                <span className="badge">Shop</span>
                <h3>Unlock More Parts</h3>
              </div>
              <p className="small-copy">Colors are bought once and can be used on every cosmetic slot that supports color.</p>
            </div>
            <ShopSection title="Universal Colors">
              {UNIVERSAL_COLORS.map((color) => (
                <ShopItem key={color} colorCard owned={ownedColors.includes(color)} label={color.toUpperCase()} price={COLOR_PRICES[color] || 60} color={color} onBuy={() => buy("colors", color, COLOR_PRICES[color] || 60, "color", () => equipCosmetic("body", color))} />
              ))}
            </ShopSection>
            <ShopSection title="Drone Frames">
              {DRONE_FRAMES.filter((f) => f.id !== COSMETIC_DEFAULTS.frame).map((frame) => (
                <ShopItem key={frame.id} owned={owned.frames.includes(frame.id)} label={frame.label} price={FRAME_PRICES[frame.id] || 80} onBuy={() => buy("frames", frame.id, FRAME_PRICES[frame.id] || 80, frame.label, () => equipCosmetic("frame", frame.id))} />
              ))}
            </ShopSection>
            <ShopSection title="Cockpits">
              {COCKPITS.filter((cockpit) => cockpit.id !== COSMETIC_DEFAULTS.cockpit).map((cockpit) => (
                <ShopItem key={cockpit.id} owned={owned.cockpits.includes(cockpit.id)} label={cockpit.label} price={cockpit.price} onBuy={() => buy("cockpits", cockpit.id, cockpit.price, cockpit.label, () => equipCosmetic("cockpit", cockpit.id))} />
              ))}
            </ShopSection>
            <ShopSection title="Engines">
              {ENGINES.filter((engine) => engine.id !== COSMETIC_DEFAULTS.engine).map((engine) => (
                <ShopItem key={engine.id} owned={owned.engines.includes(engine.id)} label={engine.label} price={engine.price} onBuy={() => buy("engines", engine.id, engine.price, engine.label, () => equipCosmetic("engine", engine.id))} />
              ))}
            </ShopSection>
            <ShopSection title="Armor Kits">
              {ARMORS.filter((armor) => armor.id !== COSMETIC_DEFAULTS.armor).map((armor) => (
                <ShopItem key={armor.id} owned={owned.armors.includes(armor.id)} label={armor.label} price={armor.price} onBuy={() => buy("armors", armor.id, armor.price, armor.label, () => equipCosmetic("armor", armor.id))} />
              ))}
            </ShopSection>
            <ShopSection title="Decals">
              {DECALS.filter((decal) => decal.id !== COSMETIC_DEFAULTS.decal).map((decal) => (
                <ShopItem key={decal.id} owned={owned.decals.includes(decal.id)} label={decal.label} price={decal.price} onBuy={() => buy("decals", decal.id, decal.price, decal.label, () => equipCosmetic("decal", decal.id))} />
              ))}
            </ShopSection>
            <ShopSection title="Dash Animations">
              {DASH_STYLES.filter((dash) => dash.id !== COSMETIC_DEFAULTS.dashStyle).map((dash) => (
                <ShopItem key={dash.id} owned={owned.dashes.includes(dash.id)} label={dash.label} price={dash.price} onBuy={() => buy("dashes", dash.id, dash.price, dash.label, () => equipCosmetic("dashStyle", dash.id))} />
              ))}
            </ShopSection>
            <ShopSection title="Pets">
              {PETS.filter((pet) => pet.id !== "none").map((pet) => (
                <ShopItem key={pet.id} owned={owned.pets.includes(pet.id)} label={pet.label} detail={pet.perk} price={pet.price} color={pet.color} onBuy={() => buy("pets", pet.id, pet.price, pet.label, () => equipCosmetic("pet", pet.id))} />
              ))}
            </ShopSection>
            <ShopSection title="Weapon Styles">
              {WEAPONS.filter((weapon) => weapon.id !== WEAPON_DEFAULT).map((weapon) => (
                <ShopItem key={weapon.id} owned={owned.weapons.includes(weapon.id)} label={weapon.label} detail={weapon.perk} price={weapon.price} onBuy={() => buy("weapons", weapon.id, weapon.price, weapon.label, () => equipCosmetic("weapon", weapon.id))} />
              ))}
            </ShopSection>
            <ShopSection title="Abilities">
              {ABILITIES.filter((ability) => ability.id !== ABILITY_DEFAULT).map((ability) => (
                <ShopItem key={ability.id} owned={owned.abilities.includes(ability.id)} label={ability.label} detail={ability.perk} price={ability.price} onBuy={() => buy("abilities", ability.id, ability.price, ability.label, () => equipCosmetic("ability", ability.id))} />
              ))}
            </ShopSection>
          </div>
        </div>
        <div className="profile-actions">
          <Button primary onClick={save}><UserRound /> Save Character</Button>
          <Button onClick={() => setScreen("menu")}>Back To Menu</Button>
        </div>
      </section>
    </div>
  );
}

function ShopScreen({ user, setUser, setScreen }) {
  return <ProfileScreen user={user} setUser={setUser} setScreen={setScreen} />;
}

function ShopSection({ title, children }) {
  return <div className="shop-section"><h3>{title}</h3><div className="shop-grid">{children}</div></div>;
}

function ShopItem({ label, detail, price, owned, color, colorCard = false, onBuy }) {
  const handleClick = () => {
    if (owned) return;
    onBuy?.();
  };

  return (
    <button className="shop-item" data-owned={owned} data-color-card={colorCard} type="button" aria-disabled={owned} onClick={handleClick}>
      {color && <span className="shop-swatch" style={{ background: color }} />}
      <strong>{label}</strong>
      {detail && <small>{detail}</small>}
      <span className="shop-price">{owned ? "Unlocked" : `${price} coins`}</span>
    </button>
  );
}

function SettingsDrawer({ settings, setSettings, setScreen, returnScreen = "menu" }) {
  return (
    <div className="drawer">
      <div className="drawer-head">
        <div><h2>Station Settings</h2><p className="small-copy">Adjust run feel and accessibility preferences.</p></div>
        <button className="btn" onClick={() => setScreen(returnScreen)} aria-label="Close settings"><X /></button>
      </div>
      <div className="setting"><label>Volume {Math.round(settings.volume * 100)}%</label><input type="range" min="0" max="1" step="0.01" value={settings.volume} onChange={(e) => setSettings({ ...settings, volume: Number(e.target.value) })} /></div>
      <Toggle title="Cosy Background Song" text="Original procedural ambient loop generated in-browser." value={settings.music} onChange={(music) => setSettings({ ...settings, music })} />
      <Toggle title="Screen Shake" text="Impact feedback from hits, lasers, and Echo deployment." value={settings.shake} onChange={(shake) => setSettings({ ...settings, shake })} />
      <Toggle title="Reduced Motion" text="Softens camera jitter and heavy pulses." value={settings.reduced} onChange={(reduced) => setSettings({ ...settings, reduced })} />
      <div className="setting">
        <label>Mouse Sensitivity {settings.mouseSensitivity.toFixed(2)}x</label>
        <input type="range" min="0.25" max="2.5" step="0.05" value={settings.mouseSensitivity} onChange={(e) => setSettings({ ...settings, mouseSensitivity: Number(e.target.value) })} />
      </div>
      <div className="setting">
        <label>Theme</label>
        <select value={settings.uiTheme} onChange={(e) => setSettings({ ...settings, uiTheme: e.target.value })}>
          <option value="station">Station</option>
          <option value="hazard">Hazard</option>
          <option value="reactor">Reactor</option>
          <option value="midnight">Midnight</option>
        </select>
        <p className="small-copy">Menu surfaces use this. Stock campaign rooms now shift theme automatically by deck.</p>
      </div>
      <div className="setting">
        <label>Difficulty</label>
        <select value={settings.difficulty} onChange={(e) => setSettings({ ...settings, difficulty: e.target.value })}>
          <option>Easy</option>
          <option>Standard</option>
          <option>Hard</option>
        </select>
        <p className="small-copy">Applies to custom levels and editor tests. The stock campaign now ramps pressure automatically as you climb deeper into the station.</p>
      </div>
    </div>
  );
}

function Toggle({ title, text, value, onChange }) {
  return <div className="setting switch"><div><label>{title}</label><p className="small-copy">{text}</p></div><button className="toggle" data-on={value} onClick={() => onChange(!value)}><span /></button></div>;
}

function Controls({ setScreen, keybinds, setKeybinds, returnScreen = "menu" }) {
  const [listening, setListening] = useState(null);
  const setBind = (action, code) => {
    const next = { ...keybinds, [action]: code };
    setKeybinds(next);
    localStorage.setItem(KEYBINDS_KEY, JSON.stringify(next));
    setListening(null);
  };
  const resetBinds = () => {
    setKeybinds(defaultKeybinds);
    localStorage.removeItem(KEYBINDS_KEY);
    setListening(null);
  };
  const applyPreset = (id) => {
    const preset = controlPresets[id];
    if (!preset) return;
    const next = { ...preset };
    setKeybinds(next);
    localStorage.setItem(KEYBINDS_KEY, JSON.stringify(next));
    setListening(null);
  };
  useEffect(() => {
    if (!listening) return undefined;
    const onKey = (e) => {
      e.preventDefault();
      if (e.code === "Escape") {
        setListening(null);
        return;
      }
      setBind(listening, e.code);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [listening, keybinds]);
  return (
    <div className="overlay">
      <section className="panel modal">
        <div className="drawer-head">
          <div><h2>Controls</h2><p className="small-copy">{listening ? "Press a key to bind it. Escape cancels." : "Click an action, then press the key you want."}</p></div>
          <Button onClick={() => setScreen(returnScreen)}><X /></Button>
        </div>
        <div className="controls-grid">
          {keybindActions.map((action) => (
            <button className="control-card control-bind" data-listening={listening === action.id} key={action.id} onClick={() => setListening(action.id)}>
              <span>{action.label}</span>
              <strong>{listening === action.id ? "Press key..." : keyName(keybinds[action.id])}</strong>
            </button>
          ))}
          <div className="control-card">Aim: Mouse</div>
          <div className="control-card">Shoot also works with Left Click</div>
          <div className="control-card">Arrow keys always move as backup</div>
        </div>
        <div className="controls-grid">
          <button className="control-card control-bind" onClick={() => applyPreset("classic")}><span>Preset: Classic</span><strong>WASD</strong></button>
          <button className="control-card control-bind" onClick={() => applyPreset("arrows")}><span>Preset: Arrow Pilot</span><strong>Arrows</strong></button>
          <button className="control-card control-bind" onClick={() => applyPreset("compact")}><span>Preset: Compact</span><strong>IJKL</strong></button>
        </div>
        <div className="profile-actions controls-actions">
          <Button onClick={resetBinds}><RotateCcw /> Reset Defaults</Button>
          <Button primary onClick={() => setScreen(returnScreen)}>{returnScreen === "paused" ? "Back To Pause" : "Back To Menu"}</Button>
        </div>
      </section>
    </div>
  );
}

function PauseMenu({ setScreen, retryLevel, openSettings, openControls, abandonRun }) {
  return (
    <div className="overlay">
      <section className="panel modal">
        <h1 className="title" style={{ fontSize: 58 }}>Paused</h1>
        <div className="button-grid">
          <Button primary onClick={() => setScreen("playing")}><Play /> Resume</Button>
          <Button onClick={retryLevel}><RotateCcw /> Retry Level</Button>
          <Button onClick={openSettings}><Settings /> Settings</Button>
          <Button onClick={openControls}><Gamepad2 /> Controls</Button>
          <Button danger onClick={abandonRun}>Abandon Run</Button>
        </div>
      </section>
    </div>
  );
}

function Summary({ summary, setScreen, next, user, setUser, returnToMenu }) {
  const earnedStars = getStarsForRoom(summary.levelIndex, summary);
  const isCustomRun = Boolean(summary.isCustom);
  const atFinalRoom = isCustomRun || summary.levelIndex >= rooms.length - 1;
  useEffect(() => {
    if (summary.result !== "Extracted" || user?.devMode || isCustomRun) return;
    const current = getStoredUsers().find((u) => u.id === user?.id) || user;
    const progress = { ...(current.progress || {}) };
    const previous = progress[summary.levelIndex] || 0;
    if (earnedStars > previous) {
      progress[summary.levelIndex] = earnedStars;
      setUser(updateStoredUserProfile({ ...current, progress }));
    }
  }, [earnedStars, isCustomRun, setUser, summary.levelIndex, summary.result, user]);
  return (
    <div className="overlay">
      <section className="panel modal">
        <span className="badge">Run Summary</span>
        <h1 className="title" style={{ fontSize: 58 }}>{summary.result}</h1>
        <p className="lead">{summary.room} | {Math.round(summary.time)}s | Scrap recovered: {Math.round(summary.scrap)} | Hull {Math.round(summary.hull ?? 0)}%</p>
        <div className="summary-stars">{"★".repeat(earnedStars)}{"☆".repeat(3 - earnedStars)}</div>
        <div className="button-grid">
          <Button primary onClick={next}><DoorOpen /> {isCustomRun ? "Return To Menu" : atFinalRoom ? "Return To Menu" : "Next Room"}</Button>
          <Button onClick={returnToMenu}><BookOpen /> Main Menu</Button>
        </div>
      </section>
    </div>
  );
}

function CommunityLevels({ returnToMenu, setScreen, playLevel }) {
  return (
    <div className="overlay">
      <section className="panel community-panel">
        <div className="drawer-head">
          <div>
            <span className="badge construction-badge">In Construction</span>
            <h2>Community Levels</h2>
            <p className="small-copy">Global level publishing is paused while the main game is being built.</p>
          </div>
          <div className="community-actions">
            <Button onClick={returnToMenu}>Menu</Button>
          </div>
        </div>
        <div className="community-list">
          <div className="community-empty construction-empty">
            <Globe2 size={38} />
            <h3>Community Relay Offline</h3>
            <p>This tab is intentionally parked for now. The editor can still make/import level codes locally, but public publishing is not part of the current build.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function Editor({ returnToMenu, setScreen, setCustomLevel, user, settings = defaultSettings }) {
  const canvas = useRef(null);
  const [mode, setMode] = useState("build");
  const [tool, setTool] = useState("wall");
  const [level, setLevel] = useState(makeLevel(0));
  const [code, setCode] = useState("");
  const [publishName, setPublishName] = useState("Untitled Echo Map");
  const [publishNote, setPublishNote] = useState("");
  const [publishStatus, setPublishStatus] = useState("");
  const [selected, setSelected] = useState(null);
  const editorKeys = ["walls", "crates", "coinCrates", "plates", "switches", "turrets", "drones", "missileSentries", ...SPECIAL_HOSTILE_KEYS, "scrap"];
  const tools = [
    { id: "wall", label: "Wall", hint: "Solid station structure" },
    { id: "cargo", label: "Cargo", hint: "Push/block puzzle crate" },
    { id: "coinCache", label: "Coin Cache", hint: "Collectable currency cache" },
    { id: "plate", label: "Pressure Plate", hint: "Needs a body or Echo" },
    { id: "switch", label: "Terminal", hint: "Interact with E" },
    { id: "turret", label: "Turret", hint: "Shoots when it sees you" },
    { id: "drone", label: "Enemy Drone", hint: "Chases and attacks the player" },
    { id: "missileSentry", label: "Missile Sentry", hint: "Locks and fires a heavy homing missile" },
    { id: "gravityNode", label: "Gravity Node", hint: "Pulls the player into danger" },
    { id: "echoJammer", label: "Echo Jammer", hint: "Blocks Echo spawning nearby" },
    { id: "laserSweeper", label: "Laser Sweeper", hint: "Rotating beam hazard" },
    { id: "blinkHunter", label: "Blink Hunter", hint: "Teleports close then rushes" },
    { id: "shieldDrone", label: "Shield Drone", hint: "Protects nearby hostiles" },
    { id: "repairBot", label: "Repair Bot", hint: "Repairs damaged enemies" },
    { id: "scrap", label: "Scrap", hint: "Restores energy" },
    { id: "exit", label: "Exit Gate", hint: "Extraction target" },
  ];
  const activeTool = tools.find((item) => item.id === tool) || tools[0];
  const selectedObject = selected?.key === "exit" ? level.exit : selected ? level[selected.key]?.[selected.index] : null;

  const getObjectRect = (obj, key) => {
    if (!obj) return null;
    if (key === "exit") return { x: obj.x, y: obj.y, w: obj.w, h: obj.h };
    if (obj.w || obj.h) return { x: obj.x, y: obj.y, w: obj.w || CELL, h: obj.h || CELL };
    const r = obj.r || 24;
    return { x: obj.x - r, y: obj.y - r, w: r * 2, h: r * 2 };
  };

  const pointFromEvent = (e) => {
    const point = e.touches?.[0] || e.changedTouches?.[0] || e;
    const r = canvas.current.getBoundingClientRect();
    const rawX = ((point.clientX - r.left) / r.width) * W;
    const rawY = ((point.clientY - r.top) / r.height) * H;
    return {
      rawX,
      rawY,
      x: Math.floor(rawX / CELL) * CELL,
      y: Math.floor(rawY / CELL) * CELL
    };
  };

  const findObjectAt = (rawX, rawY, source = level) => {
    const cursor = { x: rawX - 3, y: rawY - 3, w: 6, h: 6 };
    for (const key of [...editorKeys].reverse()) {
      const list = source[key] || [];
      for (let index = list.length - 1; index >= 0; index -= 1) {
        if (rectsTouch(cursor, getObjectRect(list[index], key))) return { key, index };
      }
    }
    if (source.exit && rectsTouch(cursor, getObjectRect(source.exit, "exit"))) return { key: "exit", index: 0 };
    return null;
  };

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    drawLevel(ctx, level, { player: level.player, echoes: [], bullets: [], activeIds: new Set() }, 0, COSMETIC_DEFAULTS, settings.uiTheme);
    if (selectedObject) {
      const rect = getObjectRect(selectedObject, selected.key);
      ctx.save();
      ctx.strokeStyle = "#ffd52d";
      ctx.shadowColor = "#ffd52d";
      ctx.shadowBlur = 12;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(rect.x - 5, rect.y - 5, rect.w + 10, rect.h + 10);
      ctx.restore();
    }
  }, [level, settings.uiTheme, selectedObject, selected]);

  const placeToolAt = (toolId, x, y) => {
    const next = structuredClone(level);
    LEVEL_ARRAY_KEYS.forEach((key) => {
      next[key] = next[key] || [];
    });
    if (toolId === "wall") next.walls.push({ x, y, w: CELL, h: CELL });
    if (toolId === "cargo") next.crates.push({ x: x + 1, y: y + 1, w: CELL - 2, h: CELL - 2 });
    if (toolId === "coinCache") {
      next.coinCrates = next.coinCrates || [];
      next.coinCrates.push({ x: x + 3, y: y + 3, w: CELL - 6, h: CELL - 6, value: 12, taken: false });
    }
    if (toolId === "plate") next.plates.push({ x: x + 20, y: y + 20, r: 26, id: `P${next.plates.length + 1}` });
    if (toolId === "switch") next.switches.push({ x: x + 20, y: y + 20, r: 22, id: `S${next.switches.length + 1}`, on: false });
    if (toolId === "turret") next.turrets.push({ x: x + 20, y: y + 20, hp: 2, cooldown: 0 });
    if (toolId === "drone") {
      next.drones = next.drones || [];
      next.drones.push({ x: x + 20, y: y + 20, hp: 2, cooldown: 450 });
    }
    if (toolId === "missileSentry") {
      next.missileSentries = next.missileSentries || [];
      next.missileSentries.push({ x: x + 20, y: y + 20, hp: 3, cooldown: 2200, lockMs: 0 });
    }
    if (toolId === "gravityNode") next.gravityNodes.push({ x: x + 20, y: y + 20, hp: 4, pulse: 0 });
    if (toolId === "echoJammer") next.echoJammers.push({ x: x + 20, y: y + 20, hp: 5, pulse: 0 });
    if (toolId === "laserSweeper") next.laserSweepers.push({ x: x + 20, y: y + 20, hp: 4, angle: 0, speed: 0.0012 });
    if (toolId === "blinkHunter") next.blinkHunters.push({ x: x + 20, y: y + 20, hp: 3, cooldown: 1200, blink: 900 });
    if (toolId === "shieldDrone") next.shieldDrones.push({ x: x + 20, y: y + 20, hp: 4, cooldown: 700 });
    if (toolId === "repairBot") next.repairBots.push({ x: x + 20, y: y + 20, hp: 3, cooldown: 900 });
    if (toolId === "scrap") next.scrap.push({ x: x + 20, y: y + 20, taken: false });
    if (toolId === "exit") next.exit = { x, y, w: 58, h: 114 };
    setLevel(next);
  };

  const removeSelection = (target = selected) => {
    if (!target) return;
    if (target.key === "exit") return;
    setLevel((current) => {
      const next = structuredClone(current);
      next[target.key] = (next[target.key] || []).filter((_, index) => index !== target.index);
      return next;
    });
    setSelected(null);
  };

  const editSelection = (patcher) => {
    if (!selected) return;
    setLevel((current) => {
      const next = structuredClone(current);
      const obj = selected.key === "exit" ? next.exit : next[selected.key]?.[selected.index];
      if (!obj) return current;
      patcher(obj);
      return next;
    });
  };

  const nudgeSelection = (dx, dy) => editSelection((obj) => {
    obj.x = clamp((obj.x || 0) + dx, 40, W - 40);
    obj.y = clamp((obj.y || 0) + dy, 40, H - 40);
  });

  const resizeSelection = (dw, dh) => editSelection((obj) => {
    if (!("w" in obj) && !("h" in obj)) return;
    obj.w = clamp((obj.w || CELL) + dw, 20, 420);
    obj.h = clamp((obj.h || CELL) + dh, 20, 420);
  });

  const handleCanvasPointer = (e) => {
    e.preventDefault();
    if (e.button === 2) return;
    const point = pointFromEvent(e);
    const hit = findObjectAt(point.rawX, point.rawY);
    if (mode === "delete") {
      if (hit) removeSelection(hit);
      return;
    }
    if (mode === "edit") {
      setSelected(hit);
      return;
    }
    placeToolAt(tool, point.x, point.y);
    setSelected(null);
  };

  const handleCanvasContext = (e) => {
    e.preventDefault();
    const point = pointFromEvent(e);
    const hit = findObjectAt(point.rawX, point.rawY);
    setSelected(hit);
    setMode("edit");
  };

  const publish = async () => {
    setPublishStatus("Publishing is in construction. Use Make Code for local testing.");
  };

  const exportCode = () => {
    setCode(encodeLevelCode(level));
    setPublishStatus("Level code generated.");
  };

  const importCode = () => {
    try {
      setLevel(decodeLevelCode(code));
      setPublishStatus("Level code imported.");
    } catch {
      try {
        setLevel(JSON.parse(code));
        setPublishStatus("Legacy JSON imported.");
      } catch {
        setPublishStatus("Invalid level code.");
      }
    }
  };

  return (
    <div className="editor">
      <main className="editor-canvas-wrap">
        <canvas ref={canvas} className="editor-canvas" width={W} height={H} onPointerDown={handleCanvasPointer} onContextMenu={handleCanvasContext} onTouchStart={handleCanvasPointer} />
      </main>
      <aside className="editor-topbar">
        <div>
          <h2>Level Creator</h2>
          <p>Build, edit, or delete. Right-click an object to inspect it.</p>
        </div>
        <div className="editor-actions">
          <Button primary onClick={() => { setCustomLevel(level); setScreen("playing"); }}><Play /> Test</Button>
          <Button onClick={exportCode}>Make Code</Button>
          <Button onClick={importCode}>Import</Button>
          <Button onClick={returnToMenu}>Menu</Button>
        </div>
      </aside>
      <aside className="editor-inspector" data-open={Boolean(selectedObject)}>
        {selectedObject ? (
          <>
            <span>Selected</span>
            <strong>{selected.key === "exit" ? "Exit Gate" : selected.key.replace(/([A-Z])/g, " $1")}</strong>
            <div className="editor-move-pad">
              <button onClick={() => nudgeSelection(0, -CELL)}>Up</button>
              <button onClick={() => nudgeSelection(-CELL, 0)}>Left</button>
              <button onClick={() => nudgeSelection(CELL, 0)}>Right</button>
              <button onClick={() => nudgeSelection(0, CELL)}>Down</button>
            </div>
            <div className="editor-size-row">
              <button onClick={() => resizeSelection(CELL, 0)}>W+</button>
              <button onClick={() => resizeSelection(-CELL, 0)}>W-</button>
              <button onClick={() => resizeSelection(0, CELL)}>H+</button>
              <button onClick={() => resizeSelection(0, -CELL)}>H-</button>
            </div>
            <Button danger onClick={() => removeSelection()}>Delete Object</Button>
          </>
        ) : (
          <>
            <span>Right Click</span>
            <strong>Edit Object</strong>
            <p>Select a wall, cargo, plate, hostile, scrap, or gate.</p>
          </>
        )}
      </aside>
      <aside className="editor-bottombar">
        <div className="editor-tool-status">
          <small>{mode}</small>
          <strong>{mode === "build" ? activeTool.label : mode === "edit" ? "Object Inspector" : "Delete Tool"}</strong>
          <p>{mode === "build" ? activeTool.hint : mode === "edit" ? "Left-click or right-click an object, then use the inspector." : "Click an object to remove it."}</p>
        </div>
        <div className="editor-mode-tabs">
          {["build", "edit", "delete"].map((item) => <button key={item} data-active={mode === item} onClick={() => setMode(item)}>{item}</button>)}
        </div>
        <div className="tools">{tools.map((t) => <button type="button" className="tool-btn" data-active={mode === "build" && tool === t.id} key={t.id} onClick={() => { setMode("build"); setTool(t.id); }}><span>{t.label}</span><small>{t.hint}</small></button>)}</div>
        <details className="publish-box">
          <summary><span className="badge construction-badge">In Construction</span> Codes and Publish</summary>
          <div className="publish-grid">
            <label>Publish Title</label>
            <input value={publishName} onChange={(e) => setPublishName(e.target.value)} />
            <label>Description</label>
            <textarea rows="2" value={publishNote} onChange={(e) => setPublishNote(e.target.value)} placeholder="What makes this room interesting?" />
            <Button onClick={publish}><UploadCloud /> Publishing Paused</Button>
            <label>Level Code</label>
            <textarea rows="4" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Local level codes appear here." />
            {publishStatus && <p className="small-copy">{publishStatus}</p>}
          </div>
        </details>
      </aside>
    </div>
  );
}

function App() {
  const [bootState] = useState(() => {
    const session = getStoredSession();
    return {
      user: session,
      screen: session ? "menu" : "auth"
    };
  });
  const [user, setUser] = useState(bootState.user);
  const [screen, setScreen] = useState(bootState.screen);
  const [levelIndex, setLevelIndex] = useState(0);
  const [runSeed, setRunSeed] = useState(0);
  const [customLevel, setCustomLevel] = useState(null);
  const [settings, setSettings] = useState(defaultSettings);
  const [keybinds, setKeybinds] = useState(() => getStoredKeybinds());
  const [overlayReturnScreen, setOverlayReturnScreen] = useState("menu");
  const [summary, setSummary] = useState(createInitialSummaryState);
  const activeCosmetic = useMemo(() => ({ ...COSMETIC_DEFAULTS, ...(user?.cosmetic || {}) }), [user?.cosmetic]);
  const deckTheme = customLevel ? settings.uiTheme : getCampaignTheme(levelIndex);
  const menuTheme = getCampaignTheme(getNextCampaignRoomIndex(user?.progress));
  const appTheme = screen === "playing" || screen === "paused" || screen === "summary" ? deckTheme : menuTheme;
  useAmbient(settings);
  const returnToMenu = () => {
    setCustomLevel(null);
    setOverlayReturnScreen("menu");
    setScreen("menu");
  };
  const openBriefing = () => {
    setCustomLevel(null);
    setScreen("briefing");
  };
  const startCampaignRoom = (index = 0) => {
    setCustomLevel(null);
    setLevelIndex(index);
    setScreen("playing");
  };
  const next = () => {
    if (summary.isCustom) {
      returnToMenu();
      return;
    }
    if (levelIndex >= rooms.length - 1) {
      returnToMenu();
      return;
    }
    setCustomLevel(null);
    setLevelIndex((v) => Math.min(v + 1, rooms.length - 1));
    setScreen("playing");
  };
  const retryLevel = () => {
    setRunSeed((v) => v + 1);
    setScreen("playing");
  };
  const playCommunityLevel = (level) => {
    setCustomLevel(structuredClone(level));
    setRunSeed((v) => v + 1);
    setScreen("playing");
  };
  const logout = () => {
    localStorage.removeItem(AUTH_SESSION_KEY);
    setCustomLevel(null);
    setLevelIndex(0);
    setRunSeed(0);
    setOverlayReturnScreen("menu");
    setSummary(createInitialSummaryState());
    setUser(null);
    setScreen("auth");
  };
  const openSettingsFrom = (origin) => {
    setOverlayReturnScreen(origin);
    setScreen("settings");
  };
  const openControlsFrom = (origin) => {
    setOverlayReturnScreen(origin);
    setScreen("controls");
  };
  return (
    <div className="app" data-theme={appTheme}>
      <div className="frame" />
      {(screen === "playing" || screen === "paused" || screen === "summary") && <GameView key={`${levelIndex}-${runSeed}-${customLevel ? "custom" : "stock"}`} levelIndex={levelIndex} customLevel={customLevel} screen={screen === "playing" ? "playing" : "idle"} setScreen={setScreen} settings={settings} setSummary={setSummary} cosmetic={activeCosmetic} keybinds={keybinds} awardCoins={(amount) => {
        if (!user?.id) return;
        const session = updateUserEconomy(user, (current) => ({ ...current, coins: normalizeEconomy(current).coins + amount }));
        setUser(session);
      }} />}
      {screen === "auth" && <AuthScreen onAuth={(session) => { setUser(session); setScreen("menu"); }} />}
      {screen === "menu" && <MainMenu user={user} onLogout={logout} setScreen={setScreen} openBriefing={openBriefing} startRoom={startCampaignRoom} openSettings={() => openSettingsFrom("menu")} openControls={() => openControlsFrom("menu")} />}
      {screen === "profile" && <ProfileScreen user={user} setUser={setUser} setScreen={setScreen} />}
      {screen === "shop" && <ShopScreen user={user} setUser={setUser} setScreen={setScreen} />}
      {screen === "briefing" && <Briefing setScreen={setScreen} startRun={() => startCampaignRoom(0)} />}
      {screen === "settings" && <SettingsDrawer settings={settings} setSettings={setSettings} setScreen={setScreen} returnScreen={overlayReturnScreen} />}
      {screen === "controls" && <Controls setScreen={setScreen} keybinds={keybinds} setKeybinds={setKeybinds} returnScreen={overlayReturnScreen} />}
      {screen === "paused" && <PauseMenu setScreen={setScreen} retryLevel={retryLevel} abandonRun={returnToMenu} openSettings={() => openSettingsFrom("paused")} openControls={() => openControlsFrom("paused")} />}
      {screen === "summary" && <Summary summary={summary} setScreen={setScreen} next={next} returnToMenu={returnToMenu} user={user} setUser={setUser} />}
      {screen === "community" && <CommunityLevels returnToMenu={returnToMenu} setScreen={setScreen} playLevel={playCommunityLevel} />}
      {screen === "editor" && <Editor returnToMenu={returnToMenu} user={user} setScreen={setScreen} setCustomLevel={setCustomLevel} settings={settings} />}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
