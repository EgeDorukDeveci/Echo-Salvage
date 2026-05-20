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
const CELL = 40;
const MAX_ENERGY = 120;
const ECHO_COST = 22;
const DASH_COST = 10;
const ABILITY_DEFAULT = "emp";

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
  "Training Bay",
  "Cargo Chapel",
  "Laser Spine",
  "Pressure Lock",
  "Relay Atrium",
  "Split Circuit",
  "Forklift Lab",
  "Switchyard Delta",
  "Memory Switchback",
  "Locked Orchard",
  "Echo Nursery",
  "Pressure Foundry",
  "Scrap Conservatory",
  "Memory Dock",
  "Twin Echo Vault",
  "Dual Relay",
  "Lockstep Furnace",
  "Null Dock",
  "Signal Cathedral",
  "Mirror Relay Stack",
  "Cinder Switchyard",
  "Scanner Chapel",
  "Glass Spine",
  "Mirror Plate",
  "Amber Causeway",
  "Final Relay",
  "Golden Pressure Court",
  "Tri-Plate Annex",
  "Turret Gallery",
  "Echo Bait Lab",
  "Vacuum Gallery",
  "Reactor Seed",
  "Laser Cage",
  "Capraza Fire",
  "Pulse Corridor",
  "Archive Sluice",
  "Long Echo Crossing",
  "Redline Transit",
  "Phase Lock",
  "Cargo Switch Maze",
  "Signal Storm",
  "Coin Cache Depot",
  "Forked Laser Hall",
  "Drone Hangar",
  "Laser Bloom",
  "Plate Orchestra",
  "Red Archive",
  "Echo Gauntlet",
  "Broken Gatehouse",
  "Phase Loom",
  "Coin Cache Promenade",
  "Blind Turret Row",
  "Hunter Drone Nest",
  "Sentry Choir",
  "Drone Kennel",
  "Turret Blindspot",
  "Drone Refueling Bay",
  "Hunter Drone Chapel",
  "Silent Hangar",
  "Scrapline Arcade",
  "Reactor Cloister",
  "Archive Core",
  "Reactor Halo",
  "Salvage Crown",
  "Station Heart",
  "The Last Eight Seconds"
];

const AUTH_USERS_KEY = "echo-salvage-users";
const AUTH_SESSION_KEY = "echo-salvage-session";
const COMMUNITY_LEVELS_KEY = "echo-salvage-community-levels";
const LEVEL_API_URL = import.meta.env.VITE_LEVEL_API_URL || "http://localhost:8787";
const DEV_LOGIN = { nickname: "developer", password: "echo-dev" };
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
  { id: "spark", label: "Spark Bit", color: "#ffd52d", price: 35, perk: "Slowly refills energy" },
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
const FRAME_PRICES = { split: 80, needle: 120 };
const COIN_PACKS = [
  { id: "tiny", label: "Tiny Cache", coins: 100, price: "$0.49" },
  { id: "small", label: "Small Cache", coins: 260, price: "$0.99" },
  { id: "crew", label: "Crew Cache", coins: 700, price: "$1.99" }
];

function normalizeEconomy(data = {}) {
  const devMode = data.devMode || data.nickname?.toLowerCase() === DEV_LOGIN.nickname;
  return {
    coins: devMode ? DEV_COINS : Number.isFinite(data.coins) ? data.coins : 25,
    owned: {
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
  return { id: user.id, nickname: user.nickname, email: user.email, avatar: user.avatar || "yellow", devMode: Boolean(user.devMode), progress: user.progress || {}, ...economy };
}

function getStarsForRoom(index, summary) {
  if (summary.result !== "Extracted") return 0;
  let stars = 1;
  if (summary.scrap >= 2) stars += 1;
  if (summary.hull >= 55) stars += 1;
  return stars;
}

function getRequiredStars(index) {
  if (index < 5) return 0;
  return Math.max(0, Math.floor((index - 4) / 2));
}

function getTotalStars(progress = {}) {
  return Object.values(progress).reduce((sum, value) => sum + (Number(value) || 0), 0);
}

function isRoomUnlocked(index, user) {
  if (user?.devMode) return true;
  return getTotalStars(user?.progress) >= getRequiredStars(index);
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
    return session ? makeSession(session) : null;
  } catch {
    return null;
  }
}

function updateStoredUserProfile(updated) {
  const normalized = { ...updated, ...normalizeEconomy(updated) };
  const users = getStoredUsers().map((u) => (u.id === normalized.id ? { ...u, ...normalized } : u));
  saveStoredUsers(users);
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
  const name = rooms[index] ?? "Custom Deck";
  const shell = [
    { x: 40, y: 40, w: 1200, h: 22 },
    { x: 40, y: 658, w: 1200, h: 22 },
    { x: 40, y: 40, w: 22, h: 640 },
    { x: 1218, y: 40, w: 22, h: 640 }
  ];
  const base = {
    name,
    player: { x: 100, y: 360 },
    exit: { x: 1160, y: 360, w: 58, h: 114 },
    theme: index,
    walls: [
      ...shell,
      { x: 310, y: 90, w: 26, h: 210 },
      { x: 310, y: 420, w: 26, h: 210 },
      { x: 800, y: 80, w: 26, h: 205 },
      { x: 800, y: 435, w: 26, h: 205 }
    ],
    crates: [{ x: 520, y: 460, w: 38, h: 38 }],
    coinCrates: [{ x: 360, y: 560, w: 34, h: 34, value: 12, taken: false }],
    plates: [{ x: 220, y: 330, r: 34, id: "A" }],
    switches: [{ x: 620, y: 160, r: 25, id: "B", on: false }],
    doors: [{ x: 1080, y: 302, w: 34, h: 116, requires: ["A", "B"], open: false }],
    turrets: [{ x: 900, y: 160, hp: 2, cooldown: 0 }],
    drones: [],
    missileSentries: [],
    lasers: [{ x1: 455, y1: 110, x2: 455, y2: 610, id: "L1", disabledBy: "A" }],
    scrap: [
      { x: 470, y: 180, taken: false },
      { x: 710, y: 560, taken: false },
      { x: 980, y: 520, taken: false }
    ],
    core: { x: 1030, y: 190, hp: 4, alive: true }
  };

  const set = (patch) => Object.assign(base, patch);
  if (name === "Training Bay") {
    set({
      walls: [...shell, { x: 430, y: 190, w: 42, h: 250 }, { x: 690, y: 235, w: 250, h: 42 }],
      crates: [{ x: 350, y: 285, w: 42, h: 42 }, { x: 545, y: 500, w: 42, h: 42 }],
      turrets: [],
      lasers: [],
      core: null,
      plates: [{ x: 255, y: 360, r: 34, id: "A" }],
      switches: [{ x: 925, y: 360, r: 25, id: "B", on: false }],
      doors: [{ x: 1080, y: 305, w: 58, h: 112, requires: ["A", "B"], open: false }]
    });
  } else if (name === "Pressure Lock") {
    set({
      walls: [...shell, { x: 300, y: 95, w: 42, h: 230 }, { x: 300, y: 395, w: 42, h: 230 }, { x: 710, y: 95, w: 42, h: 530 }],
      plates: [{ x: 230, y: 190, r: 34, id: "A" }, { x: 230, y: 525, r: 34, id: "B" }],
      switches: [{ x: 560, y: 360, r: 25, id: "C", on: false }],
      doors: [{ x: 1080, y: 305, w: 58, h: 112, requires: ["A", "B", "C"], open: false }],
      turrets: [],
      lasers: [],
      core: null,
      crates: [{ x: 500, y: 180, w: 42, h: 42 }, { x: 500, y: 515, w: 42, h: 42 }]
    });
  } else if (name === "Laser Spine") {
    set({
      walls: [...shell, { x: 365, y: 120, w: 42, h: 460 }, { x: 770, y: 120, w: 42, h: 460 }],
      plates: [{ x: 590, y: 360, r: 34, id: "A" }],
      switches: [{ x: 1010, y: 175, r: 25, id: "B", on: false }],
      doors: [{ x: 1080, y: 305, w: 58, h: 112, requires: ["A", "B"], open: false }],
      lasers: [
        { x1: 485, y1: 90, x2: 485, y2: 630, id: "L1", disabledBy: "A" },
        { x1: 665, y1: 90, x2: 665, y2: 630, id: "L2", disabledBy: "B" }
      ],
      turrets: [],
      core: null,
      crates: [{ x: 245, y: 515, w: 42, h: 42 }]
    });
  } else if (name === "Turret Gallery") {
    set({
      walls: [...shell, { x: 390, y: 120, w: 420, h: 42 }, { x: 390, y: 558, w: 420, h: 42 }, { x: 610, y: 270, w: 42, h: 180 }],
      turrets: [{ x: 510, y: 245, hp: 2, cooldown: 0 }, { x: 790, y: 475, hp: 2, cooldown: 350 }, { x: 980, y: 210, hp: 3, cooldown: 700 }],
      plates: [{ x: 235, y: 360, r: 34, id: "A" }],
      switches: [{ x: 940, y: 535, r: 25, id: "B", on: false }],
      doors: [{ x: 1080, y: 305, w: 58, h: 112, requires: ["A", "B"], open: false }],
      lasers: [],
      core: null
    });
  } else if (name === "Reactor Seed") {
    set({
      walls: [...shell, { x: 280, y: 110, w: 42, h: 500 }, { x: 930, y: 110, w: 42, h: 500 }, { x: 430, y: 200, w: 390, h: 42 }, { x: 430, y: 480, w: 390, h: 42 }],
      core: { x: 650, y: 360, hp: 6, alive: true },
      plates: [{ x: 225, y: 160, r: 34, id: "A" }, { x: 225, y: 560, r: 34, id: "B" }],
      switches: [{ x: 1030, y: 360, r: 25, id: "C", on: false }],
      doors: [{ x: 1080, y: 305, w: 58, h: 112, requires: ["A", "B", "C"], open: false }],
      turrets: [{ x: 835, y: 360, hp: 2, cooldown: 200 }],
      lasers: [{ x1: 380, y1: 100, x2: 380, y2: 620, id: "L1", disabledBy: "A" }]
    });
  } else if (name === "Forklift Lab") {
    set({
      walls: [...shell, { x: 285, y: 170, w: 210, h: 42 }, { x: 285, y: 500, w: 210, h: 42 }, { x: 735, y: 170, w: 42, h: 370 }],
      crates: [{ x: 410, y: 330, w: 62, h: 62 }, { x: 580, y: 165, w: 42, h: 42 }, { x: 580, y: 515, w: 42, h: 42 }],
      plates: [{ x: 255, y: 360, r: 34, id: "A" }, { x: 665, y: 360, r: 34, id: "B" }],
      switches: [{ x: 1015, y: 360, r: 25, id: "C", on: false }],
      doors: [{ x: 1080, y: 305, w: 58, h: 112, requires: ["A", "B", "C"], open: false }],
      turrets: [],
      lasers: [],
      core: null
    });
  } else if (name === "Dual Relay") {
    set({
      walls: [...shell, { x: 360, y: 90, w: 42, h: 245 }, { x: 360, y: 385, w: 42, h: 245 }, { x: 760, y: 90, w: 42, h: 245 }, { x: 760, y: 385, w: 42, h: 245 }],
      plates: [{ x: 235, y: 205, r: 34, id: "A" }, { x: 235, y: 520, r: 34, id: "B" }],
      switches: [{ x: 585, y: 205, r: 25, id: "C", on: false }, { x: 940, y: 520, r: 25, id: "D", on: false }],
      doors: [{ x: 1080, y: 305, w: 58, h: 112, requires: ["A", "B", "C", "D"], open: false }],
      turrets: [],
      lasers: [{ x1: 610, y1: 90, x2: 610, y2: 630, id: "L1", disabledBy: "C" }],
      core: null
    });
  } else if (name === "Drone Hangar") {
    set({
      walls: [...shell, { x: 300, y: 140, w: 42, h: 440 }, { x: 610, y: 80, w: 42, h: 220 }, { x: 610, y: 420, w: 42, h: 220 }, { x: 880, y: 180, w: 210, h: 42 }, { x: 880, y: 500, w: 210, h: 42 }],
      drones: [{ x: 520, y: 180, hp: 2, cooldown: 400 }, { x: 820, y: 520, hp: 2, cooldown: 800 }, { x: 990, y: 350, hp: 3, cooldown: 1200 }],
      missileSentries: [{ x: 910, y: 360, hp: 3, cooldown: 2400, lockMs: 0 }],
      plates: [{ x: 240, y: 360, r: 34, id: "A" }],
      switches: [{ x: 760, y: 360, r: 25, id: "B", on: false }],
      doors: [{ x: 1080, y: 305, w: 58, h: 112, requires: ["A", "B"], open: false }],
      turrets: [],
      lasers: [{ x1: 690, y1: 100, x2: 690, y2: 620, id: "L1", disabledBy: "B" }],
      core: null
    });
  } else if (name === "Mirror Plate") {
    set({
      walls: [...shell, { x: 310, y: 130, w: 42, h: 180 }, { x: 310, y: 410, w: 42, h: 180 }, { x: 610, y: 130, w: 42, h: 180 }, { x: 610, y: 410, w: 42, h: 180 }, { x: 910, y: 130, w: 42, h: 180 }, { x: 910, y: 410, w: 42, h: 180 }],
      plates: [{ x: 235, y: 205, r: 34, id: "A" }, { x: 235, y: 515, r: 34, id: "B" }, { x: 740, y: 360, r: 34, id: "C" }],
      switches: [{ x: 520, y: 205, r: 25, id: "D", on: false }],
      doors: [{ x: 1080, y: 305, w: 58, h: 112, requires: ["A", "B", "C", "D"], open: false }],
      turrets: [{ x: 1030, y: 190, hp: 2, cooldown: 300 }],
      lasers: [],
      core: null,
      crates: [{ x: 520, y: 500, w: 42, h: 42 }, { x: 740, y: 205, w: 42, h: 42 }]
    });
  } else if (name === "Signal Storm") {
    set({
      walls: [...shell, { x: 260, y: 180, w: 220, h: 42 }, { x: 260, y: 500, w: 220, h: 42 }, { x: 590, y: 95, w: 42, h: 220 }, { x: 590, y: 405, w: 42, h: 220 }, { x: 820, y: 180, w: 220, h: 42 }, { x: 820, y: 500, w: 220, h: 42 }],
      plates: [{ x: 235, y: 360, r: 34, id: "A" }],
      switches: [{ x: 715, y: 185, r: 25, id: "B", on: false }, { x: 715, y: 535, r: 25, id: "C", on: false }],
      doors: [{ x: 1080, y: 305, w: 58, h: 112, requires: ["A", "B", "C"], open: false }],
      lasers: [
        { x1: 355, y1: 90, x2: 355, y2: 630, id: "L1", disabledBy: "A" },
        { x1: 785, y1: 90, x2: 785, y2: 630, id: "L2", disabledBy: "B" },
        { x1: 120, y1: 360, x2: 1100, y2: 360, id: "L3", disabledBy: "C" }
      ],
      drones: [{ x: 995, y: 535, hp: 2, cooldown: 600 }],
      missileSentries: [{ x: 980, y: 140, hp: 3, cooldown: 2600, lockMs: 0 }],
      turrets: [],
      core: null
    });
  } else if (name === "Laser Cage") {
    set({
      walls: [...shell, { x: 250, y: 105, w: 42, h: 510 }, { x: 520, y: 105, w: 42, h: 510 }, { x: 790, y: 105, w: 42, h: 510 }, { x: 250, y: 105, w: 590, h: 42 }, { x: 250, y: 573, w: 590, h: 42 }],
      plates: [{ x: 385, y: 360, r: 34, id: "A" }],
      switches: [{ x: 655, y: 205, r: 25, id: "B", on: false }, { x: 655, y: 515, r: 25, id: "C", on: false }],
      doors: [{ x: 1080, y: 305, w: 58, h: 112, requires: ["A", "B", "C"], open: false }],
      lasers: [
        { x1: 610, y1: 145, x2: 610, y2: 573, id: "L1", disabledBy: "B" },
        { x1: 880, y1: 145, x2: 880, y2: 573, id: "L2", disabledBy: "C" }
      ],
      turrets: [{ x: 990, y: 360, hp: 2, cooldown: 200 }],
      core: null,
      crates: [{ x: 385, y: 205, w: 42, h: 42 }, { x: 385, y: 515, w: 42, h: 42 }]
    });
  } else if (name === "Memory Dock") {
    set({
      walls: [...shell, { x: 310, y: 150, w: 42, h: 420 }, { x: 470, y: 150, w: 280, h: 42 }, { x: 470, y: 528, w: 280, h: 42 }, { x: 880, y: 150, w: 42, h: 420 }],
      plates: [{ x: 230, y: 360, r: 34, id: "A" }, { x: 610, y: 360, r: 34, id: "B" }],
      switches: [{ x: 1015, y: 360, r: 25, id: "C", on: false }],
      doors: [{ x: 1080, y: 305, w: 58, h: 112, requires: ["A", "B", "C"], open: false }],
      lasers: [{ x1: 455, y1: 150, x2: 455, y2: 570, id: "L1", disabledBy: "A" }, { x1: 765, y1: 150, x2: 765, y2: 570, id: "L2", disabledBy: "B" }],
      turrets: [],
      core: null,
      scrap: [{ x: 520, y: 250, taken: false }, { x: 520, y: 470, taken: false }, { x: 990, y: 180, taken: false }, { x: 990, y: 540, taken: false }]
    });
  } else if (name === "Capraza Fire") {
    set({
      walls: [...shell, { x: 260, y: 95, w: 42, h: 240 }, { x: 260, y: 385, w: 42, h: 240 }, { x: 505, y: 230, w: 300, h: 42 }, { x: 505, y: 450, w: 300, h: 42 }, { x: 930, y: 95, w: 42, h: 530 }],
      plates: [{ x: 220, y: 360, r: 34, id: "A" }],
      switches: [{ x: 620, y: 360, r: 25, id: "B", on: false }],
      doors: [{ x: 1080, y: 305, w: 58, h: 112, requires: ["A", "B"], open: false }],
      turrets: [{ x: 505, y: 150, hp: 2, cooldown: 0 }, { x: 805, y: 570, hp: 2, cooldown: 500 }],
      drones: [{ x: 1010, y: 205, hp: 2, cooldown: 900 }],
      lasers: [{ x1: 380, y1: 100, x2: 880, y2: 620, id: "L1", disabledBy: "B" }],
      core: null
    });
  } else if (name === "Phase Lock") {
    set({
      walls: [...shell, { x: 325, y: 110, w: 42, h: 190 }, { x: 325, y: 420, w: 42, h: 190 }, { x: 535, y: 260, w: 250, h: 42 }, { x: 535, y: 420, w: 250, h: 42 }, { x: 950, y: 110, w: 42, h: 500 }],
      plates: [{ x: 235, y: 205, r: 34, id: "A" }, { x: 235, y: 515, r: 34, id: "B" }],
      switches: [{ x: 660, y: 340, r: 25, id: "C", on: false }],
      doors: [{ x: 1080, y: 305, w: 58, h: 112, requires: ["A", "B", "C"], open: false }],
      lasers: [
        { x1: 440, y1: 105, x2: 440, y2: 615, id: "L1", disabledBy: "A" },
        { x1: 835, y1: 105, x2: 835, y2: 615, id: "L2", disabledBy: "B" }
      ],
      turrets: [{ x: 1010, y: 360, hp: 3, cooldown: 350 }],
      missileSentries: [{ x: 900, y: 560, hp: 3, cooldown: 2500, lockMs: 0 }],
      core: null
    });
  } else if (name === "Archive Core") {
    set({
      walls: [...shell, { x: 260, y: 120, w: 42, h: 480 }, { x: 430, y: 120, w: 42, h: 175 }, { x: 430, y: 425, w: 42, h: 175 }, { x: 620, y: 120, w: 42, h: 480 }, { x: 790, y: 120, w: 42, h: 175 }, { x: 790, y: 425, w: 42, h: 175 }, { x: 965, y: 120, w: 42, h: 480 }],
      plates: [{ x: 205, y: 180, r: 34, id: "A" }, { x: 535, y: 540, r: 34, id: "B" }, { x: 885, y: 180, r: 34, id: "C" }],
      switches: [{ x: 535, y: 180, r: 25, id: "D", on: false }, { x: 885, y: 540, r: 25, id: "E", on: false }],
      doors: [{ x: 1080, y: 305, w: 58, h: 112, requires: ["A", "B", "C", "D", "E"], open: false }],
      turrets: [{ x: 350, y: 360, hp: 2, cooldown: 0 }, { x: 720, y: 360, hp: 2, cooldown: 450 }],
      drones: [{ x: 1010, y: 180, hp: 2, cooldown: 500 }, { x: 1010, y: 540, hp: 2, cooldown: 850 }],
      lasers: [{ x1: 710, y1: 95, x2: 710, y2: 625, id: "L1", disabledBy: "D" }, { x1: 890, y1: 95, x2: 890, y2: 625, id: "L2", disabledBy: "E" }],
      core: { x: 1045, y: 360, hp: 8, alive: true }
    });
  } else {
    const n = name.toLowerCase();
    const v = index % 6;
    const addWall = (x, y, w, h) => base.walls.push({ x, y, w, h });
    const addLaser = (x1, y1, x2, y2, id, disabledBy = "C") => base.lasers.push({ x1, y1, x2, y2, id, disabledBy });
    const addTurret = (x, y, hp = 2, cooldown = 350) => base.turrets.push({ x, y, hp, cooldown });
    const addDrone = (x, y, hp = 2, cooldown = 650) => base.drones.push({ x, y, hp, cooldown });
    const addMissile = (x, y, hp = 3, cooldown = 2600) => base.missileSentries.push({ x, y, hp, cooldown, lockMs: 0 });
    const addPlate = (x, y, id) => base.plates.push({ x, y, r: 34, id });
    const addSwitch = (x, y, id) => base.switches.push({ x, y, r: 25, id, on: false });
    const setDoor = (requires) => {
      const plateIds = new Set(base.plates.map((p) => p.id));
      const switchIds = new Set(base.switches.map((s) => s.id));
      const safeRequires = [...new Set(requires.filter((id) => plateIds.has(id) || switchIds.has(id)))];
      base.doors = [{ x: 1080, y: 305, w: 58, h: 112, requires: safeRequires.length ? safeRequires : ["B"], open: false }];
    };

    base.walls = [...shell];
    base.plates = [{ x: 230, y: 360, r: 34, id: "A" }];
    base.switches = [{ x: 610, y: 360, r: 25, id: "B", on: false }];
    base.lasers = [];
    base.turrets = [];
    base.drones = [];
    base.missileSentries = [];
    base.crates = [];
    base.scrap = [
      { x: 420 + v * 35, y: 170, taken: false },
      { x: 660, y: 550 - v * 20, taken: false },
      { x: 980 - v * 22, y: 510, taken: false }
    ];
    base.core = null;
    setDoor(["A", "B"]);

    if (n.includes("cargo") || n.includes("forklift") || n.includes("scrapline")) {
      addWall(285, 150, 260, 42);
      addWall(285, 505, 260, 42);
      addWall(760, 170, 42, 380);
      base.crates = [
        { x: 390, y: 310, w: 62, h: 62 },
        { x: 545, y: 190, w: 42, h: 42 },
        { x: 570, y: 500, w: 42, h: 42 },
        { x: 885, y: 330, w: 52, h: 52 }
      ];
      addPlate(645, 360, "C");
      addSwitch(970, 190, "D");
      setDoor(["A", "B", "C", "D"]);
    } else if (n.includes("drone") || n.includes("hunter") || n.includes("hangar") || n.includes("kennel")) {
      addWall(300, 110, 42, 500);
      addWall(585, 90, 42, 210);
      addWall(585, 420, 42, 210);
      addWall(850, 160, 250, 42);
      addWall(850, 520, 250, 42);
      addDrone(500, 185, 2, 500);
      addDrone(760, 520, 2, 900);
      addDrone(1010, 360, 3, 1200);
      if (index > 20) addMissile(930, 230);
      addSwitch(760, 360, "C");
      addLaser(700, 95, 700, 625, "L1", "C");
      setDoor(["A", "B", "C"]);
    } else if (n.includes("laser") || n.includes("scanner") || n.includes("glass") || n.includes("bloom")) {
      addWall(250, 100, 42, 520);
      addWall(505, 180, 42, 360);
      addWall(760, 100, 42, 520);
      addWall(980, 180, 42, 360);
      addLaser(375, 95, 375, 625, "L1", "A");
      addLaser(630, 95, 630, 625, "L2", "B");
      addLaser(120, 360, 1110, 360, "L3", "C");
      addPlate(890, 540, "C");
      addSwitch(890, 180, "D");
      setDoor(["A", "B", "C", "D"]);
      addTurret(1040, 540, 2, 700);
    } else if (n.includes("relay") || n.includes("switch") || n.includes("signal")) {
      addWall(330, 90, 42, 230);
      addWall(330, 400, 42, 230);
      addWall(620, 220, 230, 42);
      addWall(620, 460, 230, 42);
      addWall(960, 120, 42, 480);
      addSwitch(520, 185, "C");
      addSwitch(720, 535, "D");
      addSwitch(1015, 360, "E");
      addPlate(235, 520, "F");
      addLaser(575, 95, 575, 625, "L1", "C");
      setDoor(["A", "B", "C", "D", "E", "F"]);
    } else if (n.includes("reactor") || n.includes("core") || n.includes("heart") || n.includes("crown") || n.includes("last eight")) {
      addWall(275, 105, 42, 510);
      addWall(910, 105, 42, 510);
      addWall(440, 205, 320, 42);
      addWall(440, 475, 320, 42);
      base.core = { x: 640, y: 360, hp: index > 55 ? 10 : 7, alive: true };
      addTurret(820, 360, 3, 450);
      if (index > 35) addMissile(1010, 190);
      addPlate(215, 180, "C");
      addPlate(215, 540, "D");
      addSwitch(1020, 360, "E");
      addLaser(385, 95, 385, 625, "L1", "C");
      setDoor(["A", "B", "C", "D", "E"]);
    } else if (n.includes("coin") || n.includes("golden") || n.includes("promenade") || n.includes("cache")) {
      addWall(290, 135, 42, 190);
      addWall(290, 405, 42, 190);
      addWall(560, 95, 42, 230);
      addWall(560, 395, 42, 230);
      addWall(850, 245, 250, 42);
      addWall(850, 435, 250, 42);
      base.coinCrates = [
        { x: 430, y: 170, w: 34, h: 34, value: 30 + index, taken: false },
        { x: 430, y: 515, w: 34, h: 34, value: 24 + index, taken: false },
        { x: 915, y: 340, w: 34, h: 34, value: 34 + index, taken: false }
      ];
      addTurret(745, 180, 2, 450);
      addTurret(745, 540, 2, 850);
      addSwitch(1015, 185, "C");
      addPlate(690, 360, "D");
      setDoor(["A", "B", "C", "D"]);
    } else if (n.includes("mirror") || n.includes("echo") || n.includes("memory") || n.includes("archive")) {
      addWall(310, 120, 42, 170);
      addWall(310, 430, 42, 170);
      addWall(520, 250, 250, 42);
      addWall(520, 430, 250, 42);
      addWall(940, 120, 42, 480);
      addPlate(230, 190, "C");
      addPlate(230, 530, "D");
      addPlate(640, 360, "E");
      addSwitch(1020, 360, "F");
      addLaser(445, 95, 445, 625, "L1", "C");
      addLaser(835, 95, 835, 625, "L2", "D");
      setDoor(["A", "B", "C", "D", "E", "F"]);
    } else if (n.includes("turret") || n.includes("sentry") || n.includes("choir") || n.includes("gallery")) {
      addWall(380, 115, 450, 42);
      addWall(380, 565, 450, 42);
      addWall(610, 260, 42, 200);
      addWall(950, 170, 42, 380);
      addTurret(455, 245, 2, 0);
      addTurret(780, 475, 2, 350);
      addTurret(1015, 250, 3, 650);
      if (index > 30) addMissile(910, 540);
      addSwitch(900, 360, "C");
      setDoor(["A", "B", "C"]);
    } else if (n.includes("pressure") || n.includes("plate") || n.includes("orchestra") || n.includes("court")) {
      addWall(330, 95, 42, 530);
      addWall(630, 95, 42, 230);
      addWall(630, 395, 42, 230);
      addWall(930, 95, 42, 530);
      addPlate(220, 185, "C");
      addPlate(220, 535, "D");
      addPlate(780, 185, "E");
      addPlate(780, 535, "F");
      addSwitch(1040, 360, "G");
      base.crates = [{ x: 500, y: 180, w: 42, h: 42 }, { x: 500, y: 500, w: 42, h: 42 }, { x: 760, y: 340, w: 42, h: 42 }];
      setDoor(["A", "B", "C", "D", "E", "F", "G"]);
    } else if (n.includes("corridor") || n.includes("transit") || n.includes("causeway") || n.includes("crossing")) {
      addWall(250, 120, 42, 180);
      addWall(250, 420, 42, 180);
      addWall(430, 260, 620, 42);
      addWall(430, 420, 620, 42);
      addLaser(410, 100, 410, 620, "L1", "A");
      addLaser(810, 100, 810, 620, "L2", "C");
      addPlate(620, 550, "C");
      addTurret(980, 185, 2, 500);
      addDrone(1020, 540, 2, 900);
      setDoor(["A", "B", "C"]);
    } else {
      const offset = v * 55;
      addWall(260 + offset, 95, 42, 260);
      addWall(470, 420, 340, 42);
      addWall(850 - offset / 3, 125, 42, 390);
      addPlate(650, 550, "C");
      setDoor(["A", "B", "C"]);
      addTurret(985, 560, 2, 500);
      if (index % 2 === 0) addLaser(720, 110, 1070, 110, "L2", "C");
    }
    const splitTallWall = (wall) => {
      if (wall.w > 54 || wall.h < 430 || wall.x <= 70 || wall.x >= 1140) return [wall];
      const midGap = 118;
      const upper = Math.max(90, 300 - midGap / 2 - wall.y);
      const lowerY = 300 + midGap / 2;
      const lowerH = Math.max(90, wall.y + wall.h - lowerY);
      return [
        { ...wall, h: upper },
        { ...wall, y: lowerY, h: lowerH }
      ].filter((part) => part.h >= 70);
    };
    const splitWideWall = (wall) => {
      if (wall.h > 54 || wall.w < 430 || wall.y <= 70 || wall.y >= 600) return [wall];
      const midGap = 132;
      const left = Math.max(120, 640 - midGap / 2 - wall.x);
      const rightX = 640 + midGap / 2;
      const rightW = Math.max(120, wall.x + wall.w - rightX);
      return [
        { ...wall, w: left },
        { ...wall, x: rightX, w: rightW }
      ].filter((part) => part.w >= 90);
    };
    base.walls = base.walls.flatMap((wall) => splitWideWall(wall).flatMap(splitTallWall));
    base.crates = base.crates.filter((crate) => crate.x < 1010 && crate.x > 120);
    base.switches = base.switches.map((s) => ({ ...s, x: clamp(s.x, 190, 1035), y: clamp(s.y, 120, 600) }));
    base.plates = base.plates.map((p) => ({ ...p, x: clamp(p.x, 180, 990), y: clamp(p.y, 120, 600) }));
    base.lasers = base.lasers.filter((l) => l.disabledBy && [...base.plates, ...base.switches].some((o) => o.id === l.disabledBy));
    const required = new Set(base.doors.flatMap((door) => door.requires));
    const available = new Set([...base.plates.map((p) => p.id), ...base.switches.map((s) => s.id)]);
    base.doors.forEach((door) => {
      door.requires = door.requires.filter((id) => available.has(id));
      if (door.requires.length > 4) door.requires = door.requires.slice(0, 4);
      if (!door.requires.length) door.requires = ["B"];
    });
    base.scrap = base.scrap.filter((s) => s.x > 110 && s.x < 1100 && s.y > 90 && s.y < 630);
    if (!base.scrap.length) base.scrap = [{ x: 470, y: 180, taken: false }, { x: 790, y: 520, taken: false }];
    [...required].forEach((id) => {
      if (!available.has(id)) base.switches.push({ x: 620, y: 360, r: 25, id, on: false });
    });
    const tier = Math.min(5, Math.floor((index - 15) / 10) + 1);
    const hpBonus = Math.floor(tier / 2);
    const cooldownScale = 1 - tier * 0.055;
    base.turrets.forEach((t) => {
      t.hp = Math.min(6, (t.hp || 2) + hpBonus);
      t.cooldown = Math.max(220, Math.round((t.cooldown || 500) * cooldownScale));
    });
    base.drones.forEach((d) => {
      d.hp = Math.min(6, (d.hp || 2) + Math.floor((tier + 1) / 3));
      d.cooldown = Math.max(360, Math.round((d.cooldown || 800) * cooldownScale));
    });
    base.missileSentries.forEach((m) => {
      m.hp = Math.min(7, (m.hp || 3) + Math.floor(tier / 3));
      m.cooldown = Math.max(1750, Math.round((m.cooldown || 2600) * (1 - tier * 0.04)));
    });
    if (base.core?.alive) base.core.hp = Math.min(12, (base.core.hp || 6) + tier);

    const addProgressSwitch = (id, x, y) => {
      if (!base.switches.some((s) => s.id === id)) base.switches.push({ x, y, r: 25, id, on: false });
      base.doors.forEach((door) => {
        if (!door.requires.includes(id)) door.requires.push(id);
      });
    };
    const lockTarget = Math.min(4, 2 + Math.floor(tier / 2));
    if (base.doors[0]?.requires.length < lockTarget) addProgressSwitch("H", 505, tier % 2 ? 185 : 535);
    if (base.doors[0]?.requires.length < lockTarget) addProgressSwitch("I", 915, tier % 2 ? 535 : 185);
    base.doors.forEach((door) => {
      door.requires = [...new Set(door.requires)].slice(0, lockTarget);
    });

    if (tier >= 2 && base.turrets.length + base.drones.length === 0) addTurret(900, 520, 2 + hpBonus, 650);
    if (tier >= 3 && base.drones.length < 2 && !n.includes("pressure")) addDrone(960, 520, 2 + Math.floor(tier / 3), 850);
    if (tier >= 4 && base.turrets.length < 2 && !n.includes("drone")) addTurret(1010, 190, 3 + hpBonus, 520);
    if (tier >= 5 && !base.missileSentries.length && !n.includes("training")) addMissile(970, 360, 3 + Math.floor(tier / 3), 2300);
    const openAt = (p) => ![...base.walls, ...base.crates].some((block) => rectsTouch({ x: p.x - 18, y: p.y - 18, w: 36, h: 36 }, block));
    base.turrets = base.turrets.filter(openAt);
    base.drones = base.drones.filter(openAt);
    base.missileSentries = base.missileSentries.filter(openAt);
    if (tier >= 4 && base.turrets.length + base.drones.length === 0) base.turrets.push({ x: 930, y: 500, hp: 3 + hpBonus, cooldown: 560 });
  }
  base.missileSentries = base.missileSentries || [];
  base.coinCrates = base.coinCrates?.length ? base.coinCrates : [
    { x: 335 + (index % 4) * 90, y: 560 - (index % 3) * 80, w: 34, h: 34, value: 10 + index * 2, taken: false },
    { x: 880 - (index % 5) * 45, y: 165 + (index % 4) * 70, w: 34, h: 34, value: 8 + index, taken: false }
  ];
  return structuredClone(base);
}

const rectsTouch = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const playerRect = (p) => ({ x: p.x - 15, y: p.y - 15, w: 30, h: 30 });
const getSolidBlocks = (level) => [...level.walls, ...level.doors.filter((d) => !d.open), ...level.crates];
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

  const submit = (e) => {
    e.preventDefault();
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
        createdAt: existing?.createdAt || new Date().toISOString()
      };
      saveStoredUsers([devUser, ...users.filter((u) => u.id !== devUser.id && u.nickname.toLowerCase() !== DEV_LOGIN.nickname)]);
      const session = makeSession(devUser);
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
      onAuth(session);
      return;
    }
    const users = getStoredUsers();
    const found = users.find((u) => u.nickname.toLowerCase() === cleanNick.toLowerCase());
    if (mode === "signup") {
      if (found) {
        setMessage("That nickname is already registered.");
        return;
      }
      const user = {
        id: crypto.randomUUID?.() || `${Date.now()}`,
        nickname: cleanNick,
        email: cleanEmail,
        password: cleanPassword,
        avatar: "yellow",
        cosmetic: COSMETIC_DEFAULTS,
        coins: 25,
        owned: DEFAULT_OWNED,
        createdAt: new Date().toISOString()
      };
      saveStoredUsers([...users, user]);
      const session = makeSession(user);
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
      onAuth(session);
      return;
    }
    if (!found || found.password !== cleanPassword) {
      setMessage("Nickname or password is incorrect.");
      return;
    }
    const session = makeSession(found);
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    onAuth(session);
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
            <Button primary className="auth-submit" type="submit">{mode === "signup" ? "Create Profile" : "Enter Station"}</Button>
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
    drawLabel(ctx, "CARGO", c.x - 5, c.y - 14, "#9ab0b2");
    glowRect(ctx, c.x, c.y, c.w, c.h, "#ffd52d", "rgba(81, 65, 22, 0.78)", 15, 3);
    ctx.fillStyle = "rgba(255, 213, 45, 0.28)";
    ctx.fillRect(c.x + 8, c.y + 7, c.w - 16, 3);
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
  game.echoes.forEach((e) => drawDrone(ctx, e, true, cosmetic));
  drawDrone(ctx, game.player, false, cosmetic);
  drawPet(ctx, game.player, cosmetic, performance.now());

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

function drawDrone(ctx, p, echo, cosmetic = COSMETIC_DEFAULTS) {
  const skin = echo ? { ...COSMETIC_DEFAULTS, body: "rgba(0,240,210,.28)", accent: "#00f0d2", trail: "#00f0d2", frame: cosmetic.frame } : { ...COSMETIC_DEFAULTS, ...cosmetic };
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
  ctx.shadowColor = echo ? "#00f0d2" : skin.accent;
  ctx.shadowBlur = echo ? 16 : p.dashTrail ? 22 : 12;
  ctx.fillStyle = skin.body;
  ctx.strokeStyle = echo ? "#00f0d2" : skin.accent;
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
  ctx.fillStyle = echo ? "#00f0d2" : "#061012";
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

function getPetPerks(cosmetic = COSMETIC_DEFAULTS) {
  switch (cosmetic.pet) {
    case "spark":
      return { energyRegen: 2.8 };
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

function useGame({ levelIndex, customLevel, screen, setScreen, settings, setSummary, cosmetic, awardCoins, keybinds }) {
  const canvas = useRef(null);
  const game = useRef(null);
  const keys = useRef(new Set());
  const mouse = useRef({ x: 0, y: 0, down: false });
  const aim = useRef({ x: W / 2, y: H / 2 });
  const dashQueued = useRef(false);
  const abilityQueued = useRef(false);
  const touch = useRef({ up: false, down: false, left: false, right: false, shoot: false, interact: false });
  const mobileMove = useRef({ x: 0, y: 0 });
  const mobileAim = useRef({ x: 0, y: 0, active: false, shooting: false });

  const reset = () => {
    const level = customLevel ? structuredClone(customLevel) : makeLevel(levelIndex);
    const perks = getPetPerks(cosmetic);
    const weapon = getWeaponById(cosmetic.weapon);
    const ability = getAbilityById(cosmetic.ability);
    const maxShield = perks.maxShield || 0;
    level.coinCrates = level.coinCrates || [];
    level.turrets.forEach((t) => {
      t.maxHp = t.maxHp || t.hp || 2;
    });
    level.drones?.forEach((d) => {
      d.maxHp = d.maxHp || d.hp || 2;
    });
    level.missileSentries?.forEach((m) => {
      m.maxHp = m.maxHp || m.hp || 3;
      m.cooldown = m.cooldown ?? 2400;
      m.lockMs = m.lockMs || 0;
    });
    game.current = {
      level,
      activeIds: new Set(),
      player: {
        x: level.player.x,
        y: level.player.y,
        angle: 0,
        hp: 100,
        energy: MAX_ENERGY,
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
        overdriveUntil: 0
      },
      echoes: [],
      bullets: [],
      missiles: [],
      dashBursts: [],
      railBeams: [],
      coinPopups: [],
      abilityBursts: [],
      recording: [],
      started: performance.now(),
      last: performance.now(),
      status: "playing",
      shake: 0
    };
  };

  useEffect(reset, [levelIndex, customLevel]);

  useEffect(() => {
    const down = (e) => {
      const boundCodes = new Set([...Object.values(keybinds), "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
      if (boundCodes.has(e.code)) e.preventDefault();
      if (e.code === keybinds.dash && !keys.current.has(e.code)) dashQueued.current = true;
      if (e.code === keybinds.ability && !keys.current.has(e.code)) abilityQueued.current = true;
      keys.current.add(e.code);
      if (e.code === keybinds.echo) spawnEcho();
      if (e.code === "Escape" && game.current?.status === "playing") setScreen("paused");
      if (e.code === "KeyR") reset();
    };
    const up = (e) => keys.current.delete(e.code);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
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
    c.addEventListener("mousemove", move);
    c.addEventListener("mousedown", () => (mouse.current.down = true));
    window.addEventListener("mouseup", () => (mouse.current.down = false));
    return () => {
      c.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", () => (mouse.current.down = false));
    };
  }, [settings.mouseSensitivity]);

  function spawnEcho() {
    const g = game.current;
    const perks = getPetPerks(cosmetic);
    const echoCost = Math.max(8, ECHO_COST - (perks.echoDiscount || 0));
    if (!g || g.recording.length < 8 || g.player.energy < echoCost) return;
    g.player.energy -= echoCost;
    g.echoes.push({ frames: g.recording.slice(), age: 0, x: g.recording[0].x, y: g.recording[0].y, angle: 0, fired: 0 });
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
    for (let i = 0; i < weapon.shotsPerTrigger; i += 1) {
      const spread = weapon.spread ? (Math.random() * 2 - 1) * weapon.spread : 0;
      const a = base + spread;
      const burstDelay = i * (weapon.burstGap || 0);
      if (burstDelay === 0) {
        shoot({ x: g.player.x, y: g.player.y, angle: a }, "player");
      } else {
        setTimeout(() => {
          const live = game.current;
          if (!live || live.status !== "playing") return;
          shoot({ x: live.player.x, y: live.player.y, angle: a }, "player");
        }, burstDelay);
      }
    }
    const overdriveRate = now < (g.player.overdriveUntil || 0) ? 0.68 : 1;
    g.player.nextShotAt = now + weapon.fireDelay * overdriveRate;
    if (g.player.ammo <= 0) startReload(now);
  }

  function tryMove(entity, dx, dy, level) {
    const blocks = getSolidBlocks(level);
    entity.x += dx;
    if (blocks.some((b) => rectsTouch(playerRect(entity), b))) entity.x -= dx;
    entity.y += dy;
    if (blocks.some((b) => rectsTouch(playerRect(entity), b))) entity.y -= dy;
    entity.x = clamp(entity.x, 58, W - 58);
    entity.y = clamp(entity.y, 58, H - 58);
  }

  function interact(actor) {
    const g = game.current;
    g.level.switches.forEach((s) => {
      if (dist(actor, s) < 54) s.on = true;
    });
  }

  function damagePlayer(g, amount) {
    if (amount <= 0 || performance.now() < (g.player.phaseUntil || 0)) return;
    const blocked = Math.min(g.player.shield || 0, amount);
    g.player.shield = Math.max(0, (g.player.shield || 0) - blocked);
    g.player.hp -= amount - blocked;
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
      const level = g.level;
      const perks = getPetPerks(cosmetic);
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
          tryMove(g.player, nx * 116, ny * 116, level);
          g.player.dash = 0;
          g.player.energy -= DASH_COST;
          g.player.dashTrail = 180;
          if (settings.shake && !settings.reduced) g.shake = 5;
        }
        dashQueued.current = false;
        const overdriveBoost = now < (g.player.overdriveUntil || 0) ? 1.22 : 1;
        const dashBoost = g.player.dashTrail > 0 ? 1.35 : 1;
        tryMove(g.player, nx * speed * dashBoost * overdriveBoost * dt / 1000, ny * speed * dashBoost * overdriveBoost * dt / 1000, level);
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
      if (keys.current.has(keybinds.interact) || touch.current.interact) interact(g.player);

      g.echoes.forEach((e) => {
        e.age += dt;
        const frame = e.frames[Math.min(e.frames.length - 1, Math.floor(e.age / 50))];
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
      g.echoes = g.echoes.filter((e) => e.age < ECHO_MS);

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
          g.player.energy = clamp(g.player.energy + 24, 0, MAX_ENERGY);
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
          d.x = clamp(d.x + Math.cos(a) * 115 * dt / 1000, 58, W - 58);
          d.y = clamp(d.y + Math.sin(a) * 115 * dt / 1000, 58, H - 58);
        }
        if (gap < 34) {
          damagePlayer(g, dt * 0.035);
          if (settings.shake && !settings.reduced) g.shake = Math.max(g.shake, 4);
        }
        d.cooldown -= dt;
        if (d.cooldown <= 0 && gap < 520) {
          g.bullets.push({ x: d.x + Math.cos(a) * 20, y: d.y + Math.sin(a) * 20, vx: Math.cos(a) * 360, vy: Math.sin(a) * 360, life: 1500, owner: "enemy" });
          d.cooldown = settings.difficulty === "Hard" ? 760 : 1050;
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
            g.missiles.push({ x: m.x, y: m.y, vx: 0, vy: 0, speed: 245, turn: 0.09, life: 3600 });
            m.cooldown = settings.difficulty === "Hard" ? 2100 : 2800;
            m.lockMs = 0;
          }
        } else {
          m.lockMs = Math.max(0, (m.lockMs || 0) - dt * 0.9);
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
          g.bullets.push({ x: t.x, y: t.y, vx: Math.cos(a) * 310, vy: Math.sin(a) * 310, life: 1800, owner: "enemy" });
          t.cooldown = settings.difficulty === "Hard" ? 900 : 1350;
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
        level.turrets.forEach((t) => {
          if (b.owner !== "enemy" && t.hp > 0 && dist(b, t) < 25) {
            t.hp -= b.damage || 1;
            b.life = 0;
          }
        });
        level.drones?.forEach((d) => {
          if (b.owner !== "enemy" && d.hp > 0 && dist(b, d) < 24) {
            d.hp -= b.damage || 1;
            b.life = 0;
            if (d.hp <= 0) {
              g.player.energy = clamp(g.player.energy + 12, 0, MAX_ENERGY);
            }
          }
        });
        if (b.owner !== "enemy" && level.core?.alive && dist(b, level.core) < 32) {
          level.core.hp -= b.damage || 1;
          b.life = 0;
          if (level.core.hp <= 0) level.core.alive = false;
        }
        if (b.owner === "enemy" && dist(b, g.player) < 18) {
          damagePlayer(g, settings.difficulty === "Easy" ? 7 : 11);
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
          if (!dashed) damagePlayer(g, 50);
          missile.life = 0;
          if (settings.shake && !settings.reduced) g.shake = 10;
        }
      });
      g.missiles = g.missiles.filter((m) => m.life > 0 && m.x > 0 && m.x < W && m.y > 0 && m.y < H);

      level.lasers.forEach((l) => {
        if (g.activeIds.has(l.disabledBy)) return;
        const vertical = Math.abs(l.x1 - l.x2) < 2;
        const near = vertical ? Math.abs(g.player.x - l.x1) < 14 && g.player.y > Math.min(l.y1, l.y2) && g.player.y < Math.max(l.y1, l.y2) : Math.abs(g.player.y - l.y1) < 14 && g.player.x > Math.min(l.x1, l.x2) && g.player.x < Math.max(l.x1, l.x2);
        if (near) damagePlayer(g, dt * 0.018 * (perks.laserResist || 1));
      });

      g.player.energy = clamp(g.player.energy + (perks.energyRegen || 0) * dt / 1000, 0, MAX_ENERGY);
      g.player.hp = clamp(g.player.hp + (perks.hullRegen || 0) * dt / 1000, 0, 100);
      if (g.player.maxShield > 0) g.player.shield = clamp((g.player.shield || 0) + (perks.shieldRegen || 0) * dt / 1000, 0, g.player.maxShield);
      const didFire = mouse.current.down || keys.current.has(keybinds.shoot);
      g.recording.push({ x: g.player.x, y: g.player.y, angle: g.player.angle, fire: didFire, interact: keys.current.has(keybinds.interact) });
      while (g.recording.length > ECHO_MS / 50) g.recording.shift();
      const overdriveRecharge = now < (g.player.overdriveUntil || 0) ? 1.3 : 1;
      g.player.dash = clamp(g.player.dash + dt * 0.055 * (perks.dashRegenMultiplier || 1) * overdriveRecharge, 0, 100);
      const activeWeapon = getWeaponById(g.player.weaponId || cosmetic.weapon);
      g.player.ammoMax = activeWeapon.ammoMax;
      if (g.player.isReloading && now >= g.player.reloadUntil) {
        g.player.isReloading = false;
        g.player.ammo = activeWeapon.ammoMax;
      }
      g.player.dashTrail = Math.max(0, (g.player.dashTrail || 0) - dt);
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
      g.shake = Math.max(0, g.shake - dt * 0.03);

      if (g.player.hp <= 0) {
        setSummary({ result: "Signal Lost", scrap: g.player.scrap, hull: Math.max(0, Math.round(g.player.hp)), time: Math.round((now - g.started) / 1000), room: level.name, levelIndex });
        setScreen("summary");
      }
      const roomSecured =
        (!level.core || !level.core.alive || levelIndex < 4) &&
        level.turrets.every((t) => t.hp <= 0) &&
        (level.drones || []).every((d) => d.hp <= 0) &&
        (level.missileSentries || []).every((m) => m.hp <= 0);
      if (rectsTouch(playerRect(g.player), level.exit) && level.doors.every((d) => d.open) && roomSecured) {
        setSummary({ result: "Extracted", scrap: g.player.scrap, hull: Math.max(0, Math.round(g.player.hp)), time: Math.round((now - g.started) / 1000), room: level.name, levelIndex });
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
        <div className="hud-cluster">
          <div className="hud-title">
            <span>{g?.level.name ?? "Training Bay"}</span>
            <strong>Deck {levelIndex + 1}/{rooms.length}</strong>
          </div>
          <Meter label="Hull" value={g?.player.hp ?? 100} color="#ffd52d" />
          <Meter label="Energy" value={g?.player.energy ?? MAX_ENERGY} max={MAX_ENERGY} color="#ffd52d" />
          {(g?.player.maxShield ?? 0) > 0 && <Meter label="Shield" value={g?.player.shield ?? 0} max={g?.player.maxShield ?? 1} color="#00f0d2" />}
        </div>
        <div className="hud-card objective-card">
          <strong>Objective</strong>
          <span>Use the Echo plan, break the lock chain, and reach extraction.</span>
          <small>Shift dashes and spends energy. Secure turrets/drones before extraction.</small>
        </div>
        <div className="hud-cluster stat-grid">
          <div className="stat-tile"><Shield size={16} /><span>Scrap</span><strong>{g?.player.scrap ?? 0}</strong></div>
          <div className="stat-tile"><Sparkles size={16} /><span>Coins</span><strong>{g?.player.coinsEarned ?? 0}</strong></div>
          <button className="stat-tile" onClick={spawnEcho}><Radio size={16} /><span>Echo</span><strong>{g?.echoes.length ?? 0}/3</strong></button>
          <div className="stat-tile"><Zap size={16} /><span>Dash</span><strong>{Math.round(g?.player.dash ?? 100)}%</strong></div>
          <div className="stat-tile"><Crosshair size={16} /><span>Ammo</span><strong>{g?.player.isReloading ? "..." : `${g?.player.ammo ?? 0}/${g?.player.ammoMax ?? 0}`}</strong></div>
          <div className="stat-tile"><Gauge size={16} /><span>Weapon</span><strong>{getWeaponById(g?.player.weaponId).label.split(" ")[0]}</strong></div>
          <div className="stat-tile"><Radio size={16} /><span>Ability</span><strong>{Math.max(0, Math.ceil(((g?.player.abilityReadyAt ?? 0) - performance.now()) / 1000)) || "READY"}</strong></div>
          <div className="hud-help">
            <button className="mode-chip" onClick={() => setControlMode(isMobile ? "pc" : "mobile")}>{isMobile ? "Mobile Mode" : "PC Mode"}</button>
            <span>{isMobile ? "Twin-stick touch active." : `Keyboard recommended. Escape pauses. R restarts room. ${keyName(keybinds.reload)} reloads. ${keyName(keybinds.ability)} uses ability.`}</span>
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

function MainMenu({ setScreen, setLevelIndex, user, onLogout }) {
  const totalStars = getTotalStars(user?.progress);
  return (
    <div className="overlay">
      <div className="menu-grid">
        <section className="panel">
          <div className="panel-header">
            <span className="badge">Orbital Salvage Run</span>
            <button className="profile-pill" onClick={() => setScreen("profile")}>
              <AvatarBadge avatar={user?.avatar} />
              <span>{user?.devMode ? "Dev" : "Pilot"} {user?.nickname}</span>
            </button>
          </div>
          <h1 className="title">Echo Salvage</h1>
          <p className="lead">Pilot a drone through locked station rooms. Move, shoot, dash, and interact, then deploy an Echo that repeats your last eight seconds.</p>
          <div className="button-grid">
            <Button primary onClick={() => setScreen("briefing")}><Play size={22} /> Begin Training</Button>
            <Button onClick={() => setScreen("editor")}><Wand2 size={20} /> Level Creator</Button>
            <Button onClick={() => setScreen("community")}><Globe2 size={20} /> Community Levels</Button>
            <Button onClick={() => setScreen("profile")}><UserRound size={20} /> Profile</Button>
            <Button onClick={() => setScreen("shop")}><Sparkles size={20} /> Shop</Button>
            <Button onClick={() => setScreen("settings")}><Settings size={20} /> Settings</Button>
            <Button onClick={() => setScreen("controls")}><Gamepad2 size={20} /> Controls</Button>
            <Button danger onClick={onLogout}><LogOut size={20} /> Logout</Button>
          </div>
        </section>
        <section className="panel">
          <h2>Run Brief</h2>
          <Brief icon={<Bot />} title="Tutorial" text="Room one teaches movement, cargo crates, coin caches, interacting, combat, and pressure plates before the Echo puzzles escalate." />
          <div className="star-brief"><Sparkles size={18} /><span>{totalStars} stars recovered</span><small>Later decks unlock gently as you extract from earlier rooms.</small></div>
          <div className="rooms">
            {rooms.map((r, i) => {
              const unlocked = isRoomUnlocked(i, user);
              const roomStars = user?.progress?.[i] || 0;
              return (
              <button className="room-card" data-locked={!unlocked} disabled={!unlocked} key={r} onClick={() => { if (!unlocked) return; setLevelIndex(i); setScreen("playing"); }}>
                <span className="room-num">{i + 1}</span>
                <span className="room-name">{r}</span>
                <span className="room-stars">{unlocked ? `${"★".repeat(roomStars)}${"☆".repeat(3 - roomStars)}` : `${getRequiredStars(i)} ★`}</span>
              </button>
            );})}
          </div>
          <p className="small-copy" style={{ marginTop: 16 }}>Keyboard recommended. Pause with Escape. Restart room with R.</p>
        </section>
      </div>
    </div>
  );
}

function Briefing({ setScreen }) {
  return (
    <div className="overlay">
      <div className="menu-grid">
        <section className="panel">
          <div className="panel-header"><span className="badge">First Boot</span><span className="status-pill">Echo Link Unstable</span></div>
          <h1 className="title" style={{ fontSize: "clamp(46px, 6vw, 70px)" }}>Your past self is the tool.</h1>
          <p className="lead">Create an Echo after doing something useful. It repeats your last eight seconds while you handle the next job.</p>
          <div className="button-grid">
            <Button primary onClick={() => setScreen("playing")}><Play size={22} /> Start Run</Button>
            <Button onClick={() => setScreen("menu")}>Main Menu</Button>
          </div>
        </section>
        <section className="panel">
          <Brief icon={<Boxes />} title="Read the labels" text="Pressure plates, relay switches, scanner beams, turrets, reactor cores, scrap, and exit gates all behave differently." />
          <Brief icon={<Zap />} title="Record, then replay" text="Stand on plates, shoot targets, or press switches, then spawn an Echo with Q so it repeats the action." />
          <Brief icon={<Shield />} title="Clear the lock chain" text="Locked gates show how many requirements remain. Solve the room, survive the hazards, and extract." />
        </section>
      </div>
    </div>
  );
}

function Brief({ icon, title, text }) {
  return <div className="brief-card"><div className="brief-icon">{icon}</div><div><h3>{title}</h3><p>{text}</p></div></div>;
}

function ProfileScreen({ user, setUser, setScreen }) {
  const [avatar, setAvatar] = useState(user?.avatar || "yellow");
  const [cosmetic, setCosmetic] = useState({ ...COSMETIC_DEFAULTS, ...(user?.cosmetic || {}) });
  const [message, setMessage] = useState("");
  const owned = normalizeEconomy(user).owned;
  const previewRef = useRef(null);

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
    const nextCosmetic = {
      ...cosmetic,
      body: owned.bodies.includes(cosmetic.body) ? cosmetic.body : COSMETIC_DEFAULTS.body,
      trail: owned.trails.includes(cosmetic.trail) ? cosmetic.trail : COSMETIC_DEFAULTS.trail,
      accent: owned.trails.includes(cosmetic.accent) ? cosmetic.accent : COSMETIC_DEFAULTS.accent,
      frame: owned.frames.includes(cosmetic.frame) ? cosmetic.frame : COSMETIC_DEFAULTS.frame,
      cockpit: owned.cockpits.includes(cosmetic.cockpit) ? cosmetic.cockpit : COSMETIC_DEFAULTS.cockpit,
      engine: owned.engines.includes(cosmetic.engine) ? cosmetic.engine : COSMETIC_DEFAULTS.engine,
      decal: owned.decals.includes(cosmetic.decal) ? cosmetic.decal : COSMETIC_DEFAULTS.decal,
      armor: owned.armors.includes(cosmetic.armor) ? cosmetic.armor : COSMETIC_DEFAULTS.armor,
      pet: owned.pets.includes(cosmetic.pet) ? cosmetic.pet : "none",
      dashStyle: owned.dashes.includes(cosmetic.dashStyle) ? cosmetic.dashStyle : "streak"
      ,
      weapon: owned.weapons.includes(cosmetic.weapon) ? cosmetic.weapon : WEAPON_DEFAULT,
      ability: owned.abilities.includes(cosmetic.ability) ? cosmetic.ability : ABILITY_DEFAULT
    };
    const session = updateStoredUserProfile({ ...current, avatar, cosmetic: nextCosmetic });
    setUser(session);
    setMessage("Profile picture updated.");
  };

  return (
    <div className="overlay">
      <section className="panel profile-panel">
        <div className="drawer-head">
          <div>
            <span className="badge">Pilot Profile</span>
            <h2>{user?.nickname}</h2>
            <p className="small-copy">{user?.email || "No email attached"}</p>
          </div>
          <div className="profile-head-actions">
            <AvatarBadge avatar={avatar} size="lg" />
            <Button onClick={() => setScreen("menu")} aria-label="Close profile"><X /></Button>
          </div>
        </div>
        <div className="profile-preview">
          <canvas width="220" height="126" ref={previewRef} />
          <div className="profile-preview-copy">
            <strong>Live Preview</strong>
            <span>Hull, cockpit, armor, engines, decals, dash, pet, weapon, and ability update here as you switch cosmetics.</span>
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
              <label>Paint</label>
              <div className="swatch-row">
                {BODY_COLORS.map((color) => <button key={color} className="swatch" data-active={cosmetic.body === color} data-locked={!owned.bodies.includes(color)} style={{ background: color }} onClick={() => owned.bodies.includes(color) ? setCosmetic({ ...cosmetic, body: color }) : setMessage("Unlock this paint in the shop first.")} />)}
              </div>
            </div>
            <div>
              <label>Trail Color</label>
              <div className="swatch-row">
                {TRAIL_COLORS.map((color) => <button key={color} className="swatch" data-active={cosmetic.trail === color} data-locked={!owned.trails.includes(color)} style={{ background: color }} onClick={() => owned.trails.includes(color) ? setCosmetic({ ...cosmetic, trail: color, accent: color }) : setMessage("Unlock this trail color in the shop first.")} />)}
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
        </div>
        <div className="profile-actions">
          {message && <p className="auth-message">{message}</p>}
          <Button primary onClick={save}><UserRound /> Save Character</Button>
          <Button onClick={() => setScreen("shop")}><Sparkles /> Open Shop</Button>
          <Button onClick={() => setScreen("menu")}>Back To Menu</Button>
        </div>
      </section>
    </div>
  );
}

function ShopScreen({ user, setUser, setScreen }) {
  const [message, setMessage] = useState("");
  const economy = normalizeEconomy(user);

  const buy = (bucket, id, price, label) => {
    if (economy.owned[bucket].includes(id)) {
      setMessage(`${label} is already unlocked.`);
      return;
    }
    if (economy.coins < price) {
      setMessage(`Need ${price - economy.coins} more coins for ${label}.`);
      return;
    }
    const session = updateUserEconomy(user, (current) => ({
      ...current,
      coins: normalizeEconomy(current).coins - price,
      owned: {
        ...normalizeEconomy(current).owned,
        [bucket]: [...normalizeEconomy(current).owned[bucket], id]
      }
    }));
    setUser(session);
    setMessage(`Unlocked ${label}.`);
  };

  const demoCoinPack = (pack) => {
    const session = updateUserEconomy(user, (current) => ({ ...current, coins: normalizeEconomy(current).coins + pack.coins }));
    setUser(session);
    setMessage(`${pack.label} added ${pack.coins} coins in demo mode. Real payments need Stripe checkout before launch.`);
  };

  return (
    <div className="overlay">
      <section className="panel shop-panel">
        <div className="drawer-head">
          <div>
            <span className="badge">Salvage Shop</span>
            <h2>{economy.coins} Coins</h2>
            <p className="small-copy">{user?.devMode ? "Developer wallet active for testing." : "Earn coins from orange crates in rooms, then unlock skins, dash effects, pets, weapons, and abilities."}</p>
          </div>
          <Button onClick={() => setScreen("profile")}>Profile</Button>
        </div>
        {message && <p className="auth-message">{message}</p>}
        <div className="shop-sections">
          <ShopSection title="Paint Jobs">
            {BODY_COLORS.filter((c) => c !== COSMETIC_DEFAULTS.body).map((color) => (
              <ShopItem key={color} owned={economy.owned.bodies.includes(color)} label={color.toUpperCase()} price={BODY_PRICES[color] || 50} color={color} onBuy={() => buy("bodies", color, BODY_PRICES[color] || 50, "paint job")} />
            ))}
          </ShopSection>
          <ShopSection title="Dash Trails">
            {TRAIL_COLORS.filter((c) => c !== COSMETIC_DEFAULTS.trail).map((color) => (
              <ShopItem key={color} owned={economy.owned.trails.includes(color)} label={color.toUpperCase()} price={TRAIL_PRICES[color] || 50} color={color} onBuy={() => buy("trails", color, TRAIL_PRICES[color] || 50, "trail color")} />
            ))}
          </ShopSection>
          <ShopSection title="Frames">
            {DRONE_FRAMES.filter((f) => f.id !== "arrow").map((frame) => (
              <ShopItem key={frame.id} owned={economy.owned.frames.includes(frame.id)} label={frame.label} price={FRAME_PRICES[frame.id] || 80} onBuy={() => buy("frames", frame.id, FRAME_PRICES[frame.id] || 80, frame.label)} />
            ))}
          </ShopSection>
          <ShopSection title="Cockpits">
            {COCKPITS.filter((cockpit) => cockpit.id !== "slit").map((cockpit) => (
              <ShopItem key={cockpit.id} owned={economy.owned.cockpits.includes(cockpit.id)} label={cockpit.label} price={cockpit.price} onBuy={() => buy("cockpits", cockpit.id, cockpit.price, cockpit.label)} />
            ))}
          </ShopSection>
          <ShopSection title="Engines">
            {ENGINES.filter((engine) => engine.id !== "twin").map((engine) => (
              <ShopItem key={engine.id} owned={economy.owned.engines.includes(engine.id)} label={engine.label} price={engine.price} onBuy={() => buy("engines", engine.id, engine.price, engine.label)} />
            ))}
          </ShopSection>
          <ShopSection title="Armor Kits">
            {ARMORS.filter((armor) => armor.id !== "clean").map((armor) => (
              <ShopItem key={armor.id} owned={economy.owned.armors.includes(armor.id)} label={armor.label} price={armor.price} onBuy={() => buy("armors", armor.id, armor.price, armor.label)} />
            ))}
          </ShopSection>
          <ShopSection title="Decals">
            {DECALS.filter((decal) => decal.id !== "none").map((decal) => (
              <ShopItem key={decal.id} owned={economy.owned.decals.includes(decal.id)} label={decal.label} price={decal.price} onBuy={() => buy("decals", decal.id, decal.price, decal.label)} />
            ))}
          </ShopSection>
          <ShopSection title="Dash Animations">
            {DASH_STYLES.filter((d) => d.id !== "streak").map((dash) => (
              <ShopItem key={dash.id} owned={economy.owned.dashes.includes(dash.id)} label={dash.label} price={dash.price} onBuy={() => buy("dashes", dash.id, dash.price, dash.label)} />
            ))}
          </ShopSection>
          <ShopSection title="Pets">
            {PETS.filter((p) => p.id !== "none").map((pet) => (
              <ShopItem key={pet.id} owned={economy.owned.pets.includes(pet.id)} label={pet.label} detail={pet.perk} price={pet.price} color={pet.color} onBuy={() => buy("pets", pet.id, pet.price, pet.label)} />
            ))}
          </ShopSection>
          <ShopSection title="Weapon Styles">
            {WEAPONS.filter((weapon) => weapon.id !== WEAPON_DEFAULT).map((weapon) => (
              <ShopItem key={weapon.id} owned={economy.owned.weapons.includes(weapon.id)} label={weapon.label} detail={weapon.perk} price={weapon.price} onBuy={() => buy("weapons", weapon.id, weapon.price, weapon.label)} />
            ))}
          </ShopSection>
          <ShopSection title="Abilities">
            {ABILITIES.filter((ability) => ability.id !== ABILITY_DEFAULT).map((ability) => (
              <ShopItem key={ability.id} owned={economy.owned.abilities.includes(ability.id)} label={ability.label} detail={ability.perk} price={ability.price} onBuy={() => buy("abilities", ability.id, ability.price, ability.label)} />
            ))}
          </ShopSection>
          <ShopSection title="Coin Packs Demo">
            {COIN_PACKS.map((pack) => (
              <ShopItem key={pack.id} label={`${pack.label} ${pack.price}`} price={`${pack.coins} coins`} onBuy={() => demoCoinPack(pack)} />
            ))}
          </ShopSection>
        </div>
      </section>
    </div>
  );
}

function ShopSection({ title, children }) {
  return <div className="shop-section"><h3>{title}</h3><div className="shop-grid">{children}</div></div>;
}

function ShopItem({ label, detail, price, owned, color, onBuy }) {
  return (
    <button className="shop-item" data-owned={owned} onClick={onBuy}>
      {color && <span className="shop-swatch" style={{ background: color }} />}
      <strong>{label}</strong>
      {detail && <small>{detail}</small>}
      <span>{owned ? "Owned" : price}</span>
    </button>
  );
}

function SettingsDrawer({ settings, setSettings, setScreen }) {
  return (
    <div className="drawer">
      <div className="drawer-head">
        <div><h2>Station Settings</h2><p className="small-copy">Adjust run feel and accessibility preferences.</p></div>
        <button className="btn" onClick={() => setScreen("menu")} aria-label="Close settings"><X /></button>
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
      </div>
      <div className="setting"><label>Difficulty</label><select value={settings.difficulty} onChange={(e) => setSettings({ ...settings, difficulty: e.target.value })}><option>Easy</option><option>Standard</option><option>Hard</option></select></div>
    </div>
  );
}

function Toggle({ title, text, value, onChange }) {
  return <div className="setting switch"><div><label>{title}</label><p className="small-copy">{text}</p></div><button className="toggle" data-on={value} onClick={() => onChange(!value)}><span /></button></div>;
}

function Controls({ setScreen, keybinds, setKeybinds }) {
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
          <Button onClick={() => setScreen("menu")}><X /></Button>
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
          <Button primary onClick={() => setScreen("menu")}>Back To Menu</Button>
        </div>
      </section>
    </div>
  );
}

function PauseMenu({ setScreen, retryLevel }) {
  return (
    <div className="overlay">
      <section className="panel modal">
        <h1 className="title" style={{ fontSize: 58 }}>Paused</h1>
        <div className="button-grid">
          <Button primary onClick={() => setScreen("playing")}><Play /> Resume</Button>
          <Button onClick={retryLevel}><RotateCcw /> Retry Level</Button>
          <Button onClick={() => setScreen("settings")}><Settings /> Settings</Button>
          <Button onClick={() => setScreen("controls")}><Gamepad2 /> Controls</Button>
          <Button danger onClick={() => setScreen("menu")}>Abandon Run</Button>
        </div>
      </section>
    </div>
  );
}

function Summary({ summary, setScreen, next, user, setUser }) {
  const earnedStars = getStarsForRoom(summary.levelIndex, summary);
  useEffect(() => {
    if (summary.result !== "Extracted" || user?.devMode) return;
    const current = getStoredUsers().find((u) => u.id === user?.id) || user;
    const progress = { ...(current.progress || {}) };
    const previous = progress[summary.levelIndex] || 0;
    if (earnedStars > previous) {
      progress[summary.levelIndex] = earnedStars;
      setUser(updateStoredUserProfile({ ...current, progress }));
    }
  }, [summary.result, summary.levelIndex]);
  return (
    <div className="overlay">
      <section className="panel modal">
        <span className="badge">Run Summary</span>
        <h1 className="title" style={{ fontSize: 58 }}>{summary.result}</h1>
        <p className="lead">{summary.room} | {summary.time}s | Scrap recovered: {summary.scrap} | Hull {summary.hull ?? 0}%</p>
        <div className="summary-stars">{"★".repeat(earnedStars)}{"☆".repeat(3 - earnedStars)}</div>
        <div className="button-grid">
          <Button primary onClick={next}><DoorOpen /> Next Room</Button>
          <Button onClick={() => setScreen("menu")}><BookOpen /> Main Menu</Button>
        </div>
      </section>
    </div>
  );
}

function CommunityLevels({ setScreen, playLevel }) {
  const [levels, setLevels] = useState([]);
  const [source, setSource] = useState("loading");
  const [status, setStatus] = useState("Scanning public relay...");

  const load = async () => {
    setStatus("Scanning public relay...");
    const result = await fetchCommunityLevels();
    setLevels(result.levels);
    setSource(result.source);
    setStatus(result.source === "global" ? "Global relay online." : "Local fallback. Run the community server for real global publishing.");
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="overlay">
      <section className="panel community-panel">
        <div className="drawer-head">
          <div>
            <span className="badge">Community Relay</span>
            <h2>Published Maps</h2>
            <p className="small-copy">{status}</p>
          </div>
          <div className="community-actions">
            <Button onClick={load}><RotateCcw /> Refresh</Button>
            <Button onClick={() => setScreen("menu")}>Menu</Button>
          </div>
        </div>
        <div className="community-list">
          {levels.length === 0 && (
            <div className="community-empty">
              <Globe2 size={34} />
              <p>No maps published yet. Build one in the Level Creator and publish it.</p>
            </div>
          )}
          {levels.map((entry) => (
            <article className="community-card" key={entry.id || `${entry.title}-${entry.createdAt}`}>
              <div>
                <h3>{entry.title}</h3>
                <p>{entry.description || "No briefing attached."}</p>
                <small>By {entry.author || "Unknown"} | {source === "global" ? "Global" : "Local"} | Code {entry.code ? entry.code.slice(0, 10) : "legacy"} | Plays {entry.plays || 0}</small>
              </div>
              <Button primary onClick={() => playLevel(entry.level || decodeLevelCode(entry.code))}><Play /> Play</Button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Editor({ setScreen, setCustomLevel, user }) {
  const canvas = useRef(null);
  const [tool, setTool] = useState("wall");
  const [level, setLevel] = useState(makeLevel(0));
  const [code, setCode] = useState("");
  const [publishName, setPublishName] = useState("Untitled Echo Map");
  const [publishNote, setPublishNote] = useState("");
  const [publishStatus, setPublishStatus] = useState("");
  const tools = [
    { id: "wall", label: "Wall", hint: "Solid station structure" },
    { id: "cargo", label: "Cargo", hint: "Push/block puzzle crate" },
    { id: "coinCache", label: "Coin Cache", hint: "Collectable currency cache" },
    { id: "plate", label: "Pressure Plate", hint: "Needs a body or Echo" },
    { id: "switch", label: "Terminal", hint: "Interact with E" },
    { id: "turret", label: "Turret", hint: "Shoots when it sees you" },
    { id: "drone", label: "Enemy Drone", hint: "Chases and attacks the player" },
    { id: "missileSentry", label: "Missile Sentry", hint: "Locks and fires a heavy homing missile" },
    { id: "scrap", label: "Scrap", hint: "Restores energy" },
    { id: "exit", label: "Exit Gate", hint: "Extraction target" },
    { id: "erase", label: "Erase", hint: "Remove editor pieces" }
  ];
  const activeTool = tools.find((item) => item.id === tool) || tools[0];

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx) drawLevel(ctx, level, { player: level.player, echoes: [], bullets: [], activeIds: new Set() }, 0, COSMETIC_DEFAULTS, settings.uiTheme);
  }, [level]);

  const place = (e) => {
    const r = canvas.current.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * W / CELL) * CELL;
    const y = Math.floor(((e.clientY - r.top) / r.height) * H / CELL) * CELL;
    const next = structuredClone(level);
    if (tool === "wall") next.walls.push({ x, y, w: CELL, h: CELL });
    if (tool === "cargo") next.crates.push({ x: x + 1, y: y + 1, w: CELL - 2, h: CELL - 2 });
    if (tool === "coinCache") {
      next.coinCrates = next.coinCrates || [];
      next.coinCrates.push({ x: x + 3, y: y + 3, w: CELL - 6, h: CELL - 6, value: 12, taken: false });
    }
    if (tool === "plate") next.plates.push({ x: x + 20, y: y + 20, r: 26, id: `P${next.plates.length + 1}` });
    if (tool === "switch") next.switches.push({ x: x + 20, y: y + 20, r: 22, id: `S${next.switches.length + 1}`, on: false });
    if (tool === "turret") next.turrets.push({ x: x + 20, y: y + 20, hp: 2, cooldown: 0 });
    if (tool === "drone") {
      next.drones = next.drones || [];
      next.drones.push({ x: x + 20, y: y + 20, hp: 2, cooldown: 450 });
    }
    if (tool === "missileSentry") {
      next.missileSentries = next.missileSentries || [];
      next.missileSentries.push({ x: x + 20, y: y + 20, hp: 3, cooldown: 2200, lockMs: 0 });
    }
    if (tool === "scrap") next.scrap.push({ x: x + 20, y: y + 20, taken: false });
    if (tool === "exit") next.exit = { x, y, w: 58, h: 114 };
    if (tool === "erase") {
      ["walls", "crates", "coinCrates", "plates", "switches", "turrets", "drones", "missileSentries", "scrap"].forEach((k) => {
        next[k] = next[k] || [];
        next[k] = next[k].filter((o) => !rectsTouch({ x, y, w: CELL, h: CELL }, { x: (o.x ?? 0) - (o.r ?? 0), y: (o.y ?? 0) - (o.r ?? 0), w: o.w ?? (o.r ?? 22) * 2, h: o.h ?? (o.r ?? 22) * 2 }));
      });
    }
    setLevel(next);
  };

  const publish = async () => {
    const cleanName = publishName.trim();
    if (cleanName.length < 3) {
      setPublishStatus("Give the map a title first.");
      return;
    }
    setPublishStatus("Publishing...");
    const publishedLevel = { ...structuredClone(level), name: cleanName };
    const levelCode = encodeLevelCode(publishedLevel);
    const payload = {
      title: cleanName,
      description: publishNote.trim(),
      author: user?.nickname || "Anonymous",
      level: publishedLevel,
      code: levelCode,
      version: 1
    };
    const result = await publishCommunityLevel(payload);
    setCode(levelCode);
    setPublishStatus(result.source === "global" ? "Published as level code and saved to the relay." : "Saved as a level code in this browser.");
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
      <aside className="editor-side">
        <div className="drawer-head"><div><h2>Level Creator</h2><p className="small-copy">Paint station pieces, export a room, or test it instantly.</p></div></div>
        <div className="editor-tool-status">
          <span>Active Tool</span>
          <strong>{activeTool.label}</strong>
          <p>{activeTool.hint}</p>
        </div>
        <div className="tools">{tools.map((t) => <button className="tool-btn" data-active={tool === t.id} key={t.id} onClick={() => setTool(t.id)}><span>{t.label}</span><small>{t.hint}</small></button>)}</div>
        <div className="editor-actions">
          <Button primary onClick={() => { setCustomLevel(level); setScreen("playing"); }}><Play /> Test</Button>
          <Button onClick={exportCode}>Make Code</Button>
          <Button onClick={importCode}>Import Code</Button>
          <Button onClick={() => setScreen("menu")}>Menu</Button>
        </div>
        <div className="publish-box">
          <label>Publish Title</label>
          <input value={publishName} onChange={(e) => setPublishName(e.target.value)} />
          <label>Description</label>
          <textarea rows="3" value={publishNote} onChange={(e) => setPublishNote(e.target.value)} placeholder="What makes this room interesting?" />
          <Button primary onClick={publish}><UploadCloud /> Publish Map</Button>
          {publishStatus && <p className="small-copy">{publishStatus}</p>}
        </div>
        <div className="setting"><label>Level Code</label><textarea rows="8" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Published maps become a code here. Share or import this code." /></div>
      </aside>
      <main className="editor-canvas-wrap"><canvas ref={canvas} className="editor-canvas" width={W} height={H} onClick={place} /></main>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(() => getStoredSession());
  const [screen, setScreen] = useState(() => (getStoredSession() ? "menu" : "auth"));
  const [levelIndex, setLevelIndex] = useState(0);
  const [runSeed, setRunSeed] = useState(0);
  const [customLevel, setCustomLevel] = useState(null);
  const [settings, setSettings] = useState(defaultSettings);
  const [keybinds, setKeybinds] = useState(() => getStoredKeybinds());
  const [summary, setSummary] = useState({ result: "Extracted", scrap: 0, hull: 100, time: 0, room: rooms[0], levelIndex: 0 });
  const activeCosmetic = useMemo(() => ({ ...COSMETIC_DEFAULTS, ...(user?.cosmetic || {}) }), [user?.cosmetic]);
  useAmbient(settings);
  const next = () => {
    setCustomLevel(null);
    setLevelIndex((v) => {
      const target = (v + 1) % rooms.length;
      return isRoomUnlocked(target, user) ? target : v;
    });
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
    setUser(null);
    setScreen("auth");
  };
  return (
    <div className="app" data-theme={settings.uiTheme}>
      <div className="frame" />
      {(screen === "playing" || screen === "paused" || screen === "summary") && <GameView key={`${levelIndex}-${runSeed}-${customLevel ? "custom" : "stock"}`} levelIndex={levelIndex} customLevel={customLevel} screen={screen === "playing" ? "playing" : "idle"} setScreen={setScreen} settings={settings} setSummary={setSummary} cosmetic={activeCosmetic} keybinds={keybinds} awardCoins={(amount) => {
        if (!user?.id) return;
        const session = updateUserEconomy(user, (current) => ({ ...current, coins: normalizeEconomy(current).coins + amount }));
        setUser(session);
      }} />}
      {screen === "auth" && <AuthScreen onAuth={(session) => { setUser(session); setScreen("menu"); }} />}
      {screen === "menu" && <MainMenu user={user} onLogout={logout} setScreen={setScreen} setLevelIndex={(i) => { setCustomLevel(null); setLevelIndex(i); }} />}
      {screen === "profile" && <ProfileScreen user={user} setUser={setUser} setScreen={setScreen} />}
      {screen === "shop" && <ShopScreen user={user} setUser={setUser} setScreen={setScreen} />}
      {screen === "briefing" && <Briefing setScreen={setScreen} />}
      {screen === "settings" && <SettingsDrawer settings={settings} setSettings={setSettings} setScreen={setScreen} />}
      {screen === "controls" && <Controls setScreen={setScreen} keybinds={keybinds} setKeybinds={setKeybinds} />}
      {screen === "paused" && <PauseMenu setScreen={setScreen} retryLevel={retryLevel} />}
      {screen === "summary" && <Summary summary={summary} setScreen={setScreen} next={next} user={user} setUser={setUser} />}
      {screen === "community" && <CommunityLevels setScreen={setScreen} playLevel={playCommunityLevel} />}
      {screen === "editor" && <Editor user={user} setScreen={setScreen} setCustomLevel={setCustomLevel} />}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);




