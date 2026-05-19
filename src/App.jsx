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

const defaultSettings = {
  volume: 0.7,
  music: false,
  shake: true,
  reduced: false,
  difficulty: "Standard"
};

const rooms = [
  "Training Bay",
  "Pressure Lock",
  "Laser Spine",
  "Turret Gallery",
  "Reactor Seed",
  "Forklift Lab",
  "Dual Relay",
  "Drone Hangar",
  "Mirror Plate",
  "Signal Storm",
  "Laser Cage",
  "Memory Dock",
  "Capraza Fire",
  "Phase Lock",
  "Archive Core",
  "Cargo Chapel",
  "Relay Atrium",
  "Scanner Chapel",
  "Echo Nursery",
  "Locked Orchard",
  "Vacuum Gallery",
  "Hunter Drone Nest",
  "Pressure Foundry",
  "Split Circuit",
  "Amber Causeway",
  "Blind Turret Row",
  "Scrap Conservatory",
  "Twin Echo Vault",
  "Switchyard Delta",
  "Pulse Corridor",
  "Drone Kennel",
  "Reactor Cloister",
  "Glass Spine",
  "Memory Switchback",
  "Redline Transit",
  "Coin Cache Depot",
  "Tri-Plate Annex",
  "Echo Bait Lab",
  "Sentry Choir",
  "Forked Laser Hall",
  "Null Dock",
  "Cargo Switch Maze",
  "Drone Refueling Bay",
  "Golden Pressure Court",
  "Lockstep Furnace",
  "Archive Sluice",
  "Signal Cathedral",
  "Broken Gatehouse",
  "Turret Blindspot",
  "Phase Loom",
  "Scrapline Arcade",
  "Mirror Relay Stack",
  "Hunter Drone Chapel",
  "Reactor Halo",
  "Long Echo Crossing",
  "Laser Bloom",
  "Cinder Switchyard",
  "Plate Orchestra",
  "Silent Hangar",
  "Coin Cache Promenade",
  "Red Archive",
  "Echo Gauntlet",
  "Final Relay",
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
const COSMETIC_DEFAULTS = { body: "#dfe9e8", accent: "#ffd52d", trail: "#00f0d2", frame: "arrow", pet: "none", dashStyle: "streak" };
const BODY_COLORS = ["#dfe9e8", "#ffd52d", "#00f0d2", "#58e07a", "#ff4e41", "#ffb000"];
const TRAIL_COLORS = ["#00f0d2", "#ffd52d", "#58e07a", "#ff4e41", "#e7f0ef", "#ff8a00"];
const DRONE_FRAMES = [
  { id: "arrow", label: "Arrow" },
  { id: "split", label: "Split Wing" },
  { id: "needle", label: "Needle" }
];
const PETS = [
  { id: "none", label: "No Pet", color: "#6f858a", price: 0 },
  { id: "spark", label: "Spark Bit", color: "#ffd52d", price: 35 },
  { id: "wisp", label: "Echo Wisp", color: "#00f0d2", price: 45 },
  { id: "ember", label: "Ember Dot", color: "#ff4e41", price: 55 },
  { id: "moss", label: "Moss Byte", color: "#58e07a", price: 55 },
  { id: "orbit", label: "Orbit Pup", color: "#e7f0ef", price: 70 },
  { id: "bolt", label: "Bolt Mite", color: "#ffb000", price: 80 },
  { id: "lumen", label: "Lumen Eye", color: "#b2fff6", price: 95 },
  { id: "nova", label: "Nova Seed", color: "#ff8a00", price: 110 },
  { id: "royal", label: "Royal Core", color: "#b78cff", price: 140 },
  { id: "void", label: "Void Fleck", color: "#8aa0ff", price: 160 }
];
const DASH_STYLES = [
  { id: "streak", label: "Streak", price: 0 },
  { id: "ring", label: "Pulse Ring", price: 60 },
  { id: "spark", label: "Spark Spray", price: 90 },
  { id: "comet", label: "Comet Tail", price: 130 }
];
const DEFAULT_OWNED = {
  bodies: ["#dfe9e8"],
  trails: ["#00f0d2"],
  frames: ["arrow"],
  pets: ["none"],
  dashes: ["streak"]
};
const BODY_PRICES = { "#ffd52d": 35, "#00f0d2": 45, "#58e07a": 55, "#ff4e41": 70, "#ffb000": 100 };
const TRAIL_PRICES = { "#ffd52d": 35, "#58e07a": 50, "#ff4e41": 65, "#e7f0ef": 80, "#ff8a00": 95 };
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
      pets: [...new Set([...(data.owned?.pets || []), ...DEFAULT_OWNED.pets])],
      dashes: [...new Set([...(data.owned?.dashes || []), ...DEFAULT_OWNED.dashes])]
    },
    cosmetic: { ...COSMETIC_DEFAULTS, ...(data.cosmetic || {}) }
  };
}

function makeSession(user) {
  const economy = normalizeEconomy(user);
  return { id: user.id, nickname: user.nickname, email: user.email, avatar: user.avatar || "yellow", devMode: Boolean(user.devMode), ...economy };
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
    lasers: [{ x1: 455, y1: 110, x2: 455, y2: 610, id: "L1", disabledBy: "A" }],
    scrap: [
      { x: 470, y: 180, taken: false },
      { x: 710, y: 560, taken: false },
      { x: 980, y: 520, taken: false }
    ],
    core: { x: 1030, y: 190, hp: 4, alive: true }
  };

  const set = (patch) => Object.assign(base, patch);
  if (index === 0) {
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
  } else if (index === 1) {
    set({
      walls: [...shell, { x: 300, y: 95, w: 42, h: 230 }, { x: 300, y: 395, w: 42, h: 230 }, { x: 710, y: 95, w: 42, h: 530 }],
      plates: [{ x: 230, y: 190, r: 34, id: "A" }, { x: 230, y: 525, r: 34, id: "B" }],
      switches: [{ x: 560, y: 360, r: 25, id: "C", on: false }],
      doors: [{ x: 1080, y: 305, w: 58, h: 112, requires: ["A", "B", "C"], open: false }],
      turrets: [],
      lasers: [],
      crates: [{ x: 500, y: 180, w: 42, h: 42 }, { x: 500, y: 515, w: 42, h: 42 }]
    });
  } else if (index === 2) {
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
      crates: [{ x: 245, y: 515, w: 42, h: 42 }]
    });
  } else if (index === 3) {
    set({
      walls: [...shell, { x: 390, y: 120, w: 420, h: 42 }, { x: 390, y: 558, w: 420, h: 42 }, { x: 610, y: 270, w: 42, h: 180 }],
      turrets: [{ x: 510, y: 245, hp: 2, cooldown: 0 }, { x: 790, y: 475, hp: 2, cooldown: 350 }, { x: 980, y: 210, hp: 3, cooldown: 700 }],
      plates: [{ x: 235, y: 360, r: 34, id: "A" }],
      switches: [{ x: 940, y: 535, r: 25, id: "B", on: false }],
      doors: [{ x: 1080, y: 305, w: 58, h: 112, requires: ["A", "B"], open: false }],
      lasers: []
    });
  } else if (index === 4) {
    set({
      walls: [...shell, { x: 280, y: 110, w: 42, h: 500 }, { x: 930, y: 110, w: 42, h: 500 }, { x: 430, y: 200, w: 390, h: 42 }, { x: 430, y: 480, w: 390, h: 42 }],
      core: { x: 650, y: 360, hp: 6, alive: true },
      plates: [{ x: 225, y: 160, r: 34, id: "A" }, { x: 225, y: 560, r: 34, id: "B" }],
      switches: [{ x: 1030, y: 360, r: 25, id: "C", on: false }],
      doors: [{ x: 1080, y: 305, w: 58, h: 112, requires: ["A", "B", "C"], open: false }],
      turrets: [{ x: 835, y: 360, hp: 2, cooldown: 200 }],
      lasers: [{ x1: 380, y1: 100, x2: 380, y2: 620, id: "L1", disabledBy: "A" }]
    });
  } else if (index === 5) {
    set({
      walls: [...shell, { x: 285, y: 170, w: 210, h: 42 }, { x: 285, y: 500, w: 210, h: 42 }, { x: 735, y: 170, w: 42, h: 370 }],
      crates: [{ x: 410, y: 330, w: 62, h: 62 }, { x: 580, y: 165, w: 42, h: 42 }, { x: 580, y: 515, w: 42, h: 42 }],
      plates: [{ x: 255, y: 360, r: 34, id: "A" }, { x: 665, y: 360, r: 34, id: "B" }],
      switches: [{ x: 1015, y: 360, r: 25, id: "C", on: false }],
      doors: [{ x: 1080, y: 305, w: 58, h: 112, requires: ["A", "B", "C"], open: false }],
      turrets: [],
      lasers: []
    });
  } else if (index === 6) {
    set({
      walls: [...shell, { x: 360, y: 90, w: 42, h: 245 }, { x: 360, y: 385, w: 42, h: 245 }, { x: 760, y: 90, w: 42, h: 245 }, { x: 760, y: 385, w: 42, h: 245 }],
      plates: [{ x: 235, y: 205, r: 34, id: "A" }, { x: 235, y: 520, r: 34, id: "B" }],
      switches: [{ x: 585, y: 205, r: 25, id: "C", on: false }, { x: 940, y: 520, r: 25, id: "D", on: false }],
      doors: [{ x: 1080, y: 305, w: 58, h: 112, requires: ["A", "B", "C", "D"], open: false }],
      turrets: [],
      lasers: [{ x1: 610, y1: 90, x2: 610, y2: 630, id: "L1", disabledBy: "C" }]
    });
  } else if (index === 7 || name.toLowerCase().includes("drone")) {
    set({
      walls: [...shell, { x: 300, y: 140, w: 42, h: 440 }, { x: 610, y: 80, w: 42, h: 220 }, { x: 610, y: 420, w: 42, h: 220 }, { x: 880, y: 180, w: 210, h: 42 }, { x: 880, y: 500, w: 210, h: 42 }],
      drones: [{ x: 520, y: 180, hp: 2, cooldown: 400 }, { x: 820, y: 520, hp: 2, cooldown: 800 }, { x: 990, y: 350, hp: 3, cooldown: 1200 }],
      plates: [{ x: 240, y: 360, r: 34, id: "A" }],
      switches: [{ x: 760, y: 360, r: 25, id: "B", on: false }],
      doors: [{ x: 1080, y: 305, w: 58, h: 112, requires: ["A", "B"], open: false }],
      turrets: [],
      lasers: [{ x1: 690, y1: 100, x2: 690, y2: 620, id: "L1", disabledBy: "B" }]
    });
  } else if (index === 8) {
    set({
      walls: [...shell, { x: 310, y: 130, w: 42, h: 180 }, { x: 310, y: 410, w: 42, h: 180 }, { x: 610, y: 130, w: 42, h: 180 }, { x: 610, y: 410, w: 42, h: 180 }, { x: 910, y: 130, w: 42, h: 180 }, { x: 910, y: 410, w: 42, h: 180 }],
      plates: [{ x: 235, y: 205, r: 34, id: "A" }, { x: 235, y: 515, r: 34, id: "B" }, { x: 740, y: 360, r: 34, id: "C" }],
      switches: [{ x: 520, y: 205, r: 25, id: "D", on: false }],
      doors: [{ x: 1080, y: 305, w: 58, h: 112, requires: ["A", "B", "C", "D"], open: false }],
      turrets: [{ x: 1030, y: 190, hp: 2, cooldown: 300 }],
      lasers: [],
      crates: [{ x: 520, y: 500, w: 42, h: 42 }, { x: 740, y: 205, w: 42, h: 42 }]
    });
  } else if (index === 9) {
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
      turrets: []
    });
  } else if (index === 10) {
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
      crates: [{ x: 385, y: 205, w: 42, h: 42 }, { x: 385, y: 515, w: 42, h: 42 }]
    });
  } else if (index === 11) {
    set({
      walls: [...shell, { x: 310, y: 150, w: 42, h: 420 }, { x: 470, y: 150, w: 280, h: 42 }, { x: 470, y: 528, w: 280, h: 42 }, { x: 880, y: 150, w: 42, h: 420 }],
      plates: [{ x: 230, y: 360, r: 34, id: "A" }, { x: 610, y: 360, r: 34, id: "B" }],
      switches: [{ x: 1015, y: 360, r: 25, id: "C", on: false }],
      doors: [{ x: 1080, y: 305, w: 58, h: 112, requires: ["A", "B", "C"], open: false }],
      lasers: [{ x1: 455, y1: 150, x2: 455, y2: 570, id: "L1", disabledBy: "A" }, { x1: 765, y1: 150, x2: 765, y2: 570, id: "L2", disabledBy: "B" }],
      turrets: [],
      scrap: [{ x: 520, y: 250, taken: false }, { x: 520, y: 470, taken: false }, { x: 990, y: 180, taken: false }, { x: 990, y: 540, taken: false }]
    });
  } else if (index === 12) {
    set({
      walls: [...shell, { x: 260, y: 95, w: 42, h: 240 }, { x: 260, y: 385, w: 42, h: 240 }, { x: 505, y: 230, w: 300, h: 42 }, { x: 505, y: 450, w: 300, h: 42 }, { x: 930, y: 95, w: 42, h: 530 }],
      plates: [{ x: 220, y: 360, r: 34, id: "A" }],
      switches: [{ x: 620, y: 360, r: 25, id: "B", on: false }],
      doors: [{ x: 1080, y: 305, w: 58, h: 112, requires: ["A", "B"], open: false }],
      turrets: [{ x: 505, y: 150, hp: 2, cooldown: 0 }, { x: 805, y: 570, hp: 2, cooldown: 500 }],
      drones: [{ x: 1010, y: 205, hp: 2, cooldown: 900 }],
      lasers: [{ x1: 380, y1: 100, x2: 880, y2: 620, id: "L1", disabledBy: "B" }]
    });
  } else if (index === 13) {
    set({
      walls: [...shell, { x: 325, y: 110, w: 42, h: 190 }, { x: 325, y: 420, w: 42, h: 190 }, { x: 535, y: 260, w: 250, h: 42 }, { x: 535, y: 420, w: 250, h: 42 }, { x: 950, y: 110, w: 42, h: 500 }],
      plates: [{ x: 235, y: 205, r: 34, id: "A" }, { x: 235, y: 515, r: 34, id: "B" }],
      switches: [{ x: 660, y: 340, r: 25, id: "C", on: false }],
      doors: [{ x: 1080, y: 305, w: 58, h: 112, requires: ["A", "B", "C"], open: false }],
      lasers: [
        { x1: 440, y1: 105, x2: 440, y2: 615, id: "L1", disabledBy: "A" },
        { x1: 835, y1: 105, x2: 835, y2: 615, id: "L2", disabledBy: "B" }
      ],
      turrets: [{ x: 1010, y: 360, hp: 3, cooldown: 350 }]
    });
  } else if (index === 14) {
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
    const offset = (index % 4) * 80;
    base.walls = [
      ...shell,
      { x: 270 + offset, y: 95, w: 42, h: 260 },
      { x: 470, y: 420, w: 340, h: 42 },
      { x: 850 - offset / 2, y: 125, w: 42, h: 390 }
    ];
    base.plates.push({ x: 650, y: 550, r: 34, id: "C" });
    base.doors[0].requires.push("C");
    base.turrets.push({ x: 985, y: 560, hp: 2, cooldown: 500 });
    if (index % 2 === 0) base.lasers.push({ x1: 720, y1: 110, x2: 1070, y2: 110, id: "L2", disabledBy: "C" });
  }
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
          pets: PETS.map((pet) => pet.id),
          dashes: DASH_STYLES.map((dash) => dash.id)
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

function drawLevel(ctx, level, game, shake = 0, cosmetic = COSMETIC_DEFAULTS) {
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
  const floor = ctx.createLinearGradient(0, 0, W, 0);
  floor.addColorStop(0, theme[0]);
  floor.addColorStop(0.46, theme[1]);
  floor.addColorStop(1, theme[2]);
  ctx.fillStyle = floor;
  ctx.fillRect(70, 50, W - 140, H - 100);
  ctx.strokeStyle = "rgba(0,240,210,.09)";
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
    glowRect(ctx, w.x, w.y, w.w, w.h, "rgba(131, 176, 185, 0.72)", "rgba(24, 42, 47, 0.9)", 10, 2);
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
    ctx.strokeStyle = "#ff4e41";
    ctx.lineWidth = 5;
    ctx.shadowColor = "#ff4e41";
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
  game.echoes.forEach((e) => drawDrone(ctx, e, true, cosmetic));
  drawDrone(ctx, game.player, false, cosmetic);
  drawPet(ctx, game.player, cosmetic, performance.now());

  game.bullets.forEach((b) => {
    ctx.fillStyle = b.owner === "enemy" ? "#ff4e41" : "#ffd52d";
    ctx.beginPath();
    ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
    ctx.fill();
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
  const skin = echo ? { body: "rgba(0,240,210,.28)", accent: "#00f0d2", trail: "#00f0d2", frame: cosmetic.frame } : { ...COSMETIC_DEFAULTS, ...cosmetic };
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
  } else {
    ctx.moveTo(23, 0);
    ctx.lineTo(-16, -15);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-16, 15);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = echo ? "#00f0d2" : "#061012";
  ctx.fillRect(-2, -4, 12, 8);
  ctx.fillStyle = echo ? "rgba(0,240,210,.55)" : skin.accent;
  ctx.fillRect(-18, -3, 7, 6);
  ctx.restore();
}

function drawPet(ctx, player, cosmetic = COSMETIC_DEFAULTS, now = 0) {
  if (!cosmetic.pet || cosmetic.pet === "none") return;
  const pet = PETS.find((item) => item.id === cosmetic.pet);
  if (!pet) return;
  const bob = Math.sin(now / 260) * 5;
  const px = player.x - Math.cos(player.angle || 0) * 46;
  const py = player.y - Math.sin(player.angle || 0) * 46 + bob;
  ctx.save();
  ctx.translate(px, py);
  ctx.shadowColor = pet.color;
  ctx.shadowBlur = 14;
  ctx.fillStyle = pet.color;
  ctx.strokeStyle = "rgba(5, 13, 16, 0.9)";
  ctx.lineWidth = 3;
  if (cosmetic.pet === "orbit" || cosmetic.pet === "royal") {
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = pet.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 7, now / 600, 0, Math.PI * 2);
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
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(5, 13, 16, 0.85)";
    ctx.fillRect(-3, -2, 6, 4);
  }
  ctx.restore();
}

function useGame({ levelIndex, customLevel, screen, setScreen, settings, setSummary, cosmetic, awardCoins }) {
  const canvas = useRef(null);
  const game = useRef(null);
  const keys = useRef(new Set());
  const mouse = useRef({ x: 0, y: 0, down: false });
  const fireLatch = useRef(0);
  const dashQueued = useRef(false);

  const reset = () => {
    const level = customLevel ? structuredClone(customLevel) : makeLevel(levelIndex);
    level.coinCrates = level.coinCrates || [];
    level.turrets.forEach((t) => {
      t.maxHp = t.maxHp || t.hp || 2;
    });
    level.drones?.forEach((d) => {
      d.maxHp = d.maxHp || d.hp || 2;
    });
    game.current = {
      level,
      activeIds: new Set(),
      player: { x: level.player.x, y: level.player.y, angle: 0, hp: 100, energy: MAX_ENERGY, dash: 100, scrap: 0, coinsEarned: 0 },
      echoes: [],
      bullets: [],
      dashBursts: [],
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
      if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowLeft", "ArrowRight", "ArrowDown", "ShiftLeft", "ShiftRight", "Space", "KeyE", "KeyQ"].includes(e.code)) e.preventDefault();
      if ((e.code === "ShiftLeft" || e.code === "ShiftRight") && !keys.current.has(e.code)) dashQueued.current = true;
      keys.current.add(e.code);
      if (e.code === "KeyQ") spawnEcho();
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
  }, []);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const move = (e) => {
      const r = c.getBoundingClientRect();
      mouse.current.x = ((e.clientX - r.left) / r.width) * W;
      mouse.current.y = ((e.clientY - r.top) / r.height) * H;
    };
    c.addEventListener("mousemove", move);
    c.addEventListener("mousedown", () => (mouse.current.down = true));
    window.addEventListener("mouseup", () => (mouse.current.down = false));
    return () => {
      c.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", () => (mouse.current.down = false));
    };
  }, []);

  function spawnEcho() {
    const g = game.current;
    if (!g || g.recording.length < 8 || g.player.energy < ECHO_COST) return;
    g.player.energy -= ECHO_COST;
    g.echoes.push({ frames: g.recording.slice(), age: 0, x: g.recording[0].x, y: g.recording[0].y, angle: 0, fired: 0 });
    if (settings.shake && !settings.reduced) g.shake = 8;
  }

  function shoot(from, owner = "player") {
    const g = game.current;
    const angle = from.angle || 0;
    g.bullets.push({ x: from.x + Math.cos(angle) * 24, y: from.y + Math.sin(angle) * 24, vx: Math.cos(angle) * 620, vy: Math.sin(angle) * 620, life: 900, owner });
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
      const speed = 170;
      let mx = 0;
      let my = 0;
      if (keys.current.has("KeyW") || keys.current.has("ArrowUp")) my -= 1;
      if (keys.current.has("KeyS") || keys.current.has("ArrowDown")) my += 1;
      if (keys.current.has("KeyA") || keys.current.has("ArrowLeft")) mx -= 1;
      if (keys.current.has("KeyD") || keys.current.has("ArrowRight")) mx += 1;
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
        const dashBoost = g.player.dashTrail > 0 ? 1.35 : 1;
        tryMove(g.player, nx * speed * dashBoost * dt / 1000, ny * speed * dashBoost * dt / 1000, level);
      } else if (dashQueued.current) {
        dashQueued.current = false;
      }
      g.player.angle = Math.atan2(mouse.current.y - g.player.y, mouse.current.x - g.player.x);
      if ((mouse.current.down || keys.current.has("Space")) && now - fireLatch.current > 210) {
        fireLatch.current = now;
        shoot(g.player);
      }
      if (keys.current.has("KeyE")) interact(g.player);

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
          const amount = c.value || 10;
          g.player.coinsEarned += amount;
          awardCoins?.(amount);
        }
      });

      level.drones?.forEach((d) => {
        if (d.hp <= 0) return;
        const a = Math.atan2(g.player.y - d.y, g.player.x - d.x);
        d.angle = a;
        const gap = dist(d, g.player);
        if (gap > 155) tryMove(d, Math.cos(a) * 115 * dt / 1000, Math.sin(a) * 115 * dt / 1000, level);
        if (gap < 34) {
          g.player.hp -= dt * 0.035;
          if (settings.shake && !settings.reduced) g.shake = Math.max(g.shake, 4);
        }
        d.cooldown -= dt;
        if (d.cooldown <= 0 && gap < 520) {
          g.bullets.push({ x: d.x + Math.cos(a) * 20, y: d.y + Math.sin(a) * 20, vx: Math.cos(a) * 360, vy: Math.sin(a) * 360, life: 1500, owner: "enemy" });
          d.cooldown = settings.difficulty === "Hard" ? 760 : 1050;
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
        b.x += b.vx * dt / 1000;
        b.y += b.vy * dt / 1000;
        b.life -= dt;
        if (getSolidBlocks(level).some((w) => rectsTouch({ x: b.x - 3, y: b.y - 3, w: 6, h: 6 }, w))) b.life = 0;
        level.turrets.forEach((t) => {
          if (b.owner !== "enemy" && t.hp > 0 && dist(b, t) < 25) {
            t.hp -= 1;
            b.life = 0;
          }
        });
        level.drones?.forEach((d) => {
          if (b.owner !== "enemy" && d.hp > 0 && dist(b, d) < 24) {
            d.hp -= 1;
            b.life = 0;
            if (d.hp <= 0) {
              g.player.energy = clamp(g.player.energy + 12, 0, MAX_ENERGY);
            }
          }
        });
        if (b.owner !== "enemy" && level.core?.alive && dist(b, level.core) < 32) {
          level.core.hp -= 1;
          b.life = 0;
          if (level.core.hp <= 0) level.core.alive = false;
        }
        if (b.owner === "enemy" && dist(b, g.player) < 18) {
          g.player.hp -= settings.difficulty === "Easy" ? 7 : 11;
          b.life = 0;
          if (settings.shake && !settings.reduced) g.shake = 7;
        }
      });
      g.bullets = g.bullets.filter((b) => b.life > 0 && b.x > 0 && b.x < W && b.y > 0 && b.y < H);

      level.lasers.forEach((l) => {
        if (g.activeIds.has(l.disabledBy)) return;
        const vertical = Math.abs(l.x1 - l.x2) < 2;
        const near = vertical ? Math.abs(g.player.x - l.x1) < 14 && g.player.y > Math.min(l.y1, l.y2) && g.player.y < Math.max(l.y1, l.y2) : Math.abs(g.player.y - l.y1) < 14 && g.player.x > Math.min(l.x1, l.x2) && g.player.x < Math.max(l.x1, l.x2);
        if (near) g.player.hp -= dt * 0.018;
      });

      const didFire = mouse.current.down || keys.current.has("Space");
      g.recording.push({ x: g.player.x, y: g.player.y, angle: g.player.angle, fire: didFire, interact: keys.current.has("KeyE") });
      while (g.recording.length > ECHO_MS / 50) g.recording.shift();
      g.player.dash = clamp(g.player.dash + dt * 0.055, 0, 100);
      g.player.dashTrail = Math.max(0, (g.player.dashTrail || 0) - dt);
      g.dashBursts.forEach((burst) => burst.life -= dt);
      g.dashBursts = g.dashBursts.filter((burst) => burst.life > 0);
      g.shake = Math.max(0, g.shake - dt * 0.03);

      if (g.player.hp <= 0) {
        setSummary({ result: "Signal Lost", scrap: g.player.scrap, time: Math.round((now - g.started) / 1000), room: level.name });
        setScreen("summary");
      }
      const roomSecured =
        (!level.core || !level.core.alive || levelIndex < 4) &&
        level.turrets.every((t) => t.hp <= 0) &&
        (level.drones || []).every((d) => d.hp <= 0);
      if (rectsTouch(playerRect(g.player), level.exit) && level.doors.every((d) => d.open) && roomSecured) {
        setSummary({ result: "Extracted", scrap: g.player.scrap, time: Math.round((now - g.started) / 1000), room: level.name });
        setScreen("summary");
      }

      const ctx = canvas.current?.getContext("2d");
      if (ctx) drawLevel(ctx, level, g, g.shake, cosmetic);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [screen, settings, levelIndex]);

  return { canvas, game, reset, spawnEcho };
}

function GameView({ levelIndex, customLevel, screen, setScreen, settings, setSummary, cosmetic, awardCoins }) {
  const { canvas, game, reset, spawnEcho } = useGame({ levelIndex, customLevel, screen, setScreen, settings, setSummary, cosmetic, awardCoins });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((v) => v + 1), 120);
    return () => clearInterval(id);
  }, []);
  const g = game.current;
  return (
    <>
      <canvas ref={canvas} className="game-canvas" width={W} height={H} />
      <div className="hud">
        <div className="hud-cluster">
          <div className="hud-title">
            <span>{g?.level.name ?? "Training Bay"}</span>
            <strong>Deck {levelIndex + 1}/{rooms.length}</strong>
          </div>
          <Meter label="Hull" value={g?.player.hp ?? 100} color="#ffd52d" />
          <Meter label="Energy" value={g?.player.energy ?? MAX_ENERGY} max={MAX_ENERGY} color="#ffd52d" />
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
          <div className="hud-help">Keyboard recommended. Escape pauses. R restarts room.</div>
        </div>
      </div>
    </>
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
          <div className="rooms">
            {rooms.map((r, i) => (
              <button className="room-card" key={r} onClick={() => { setLevelIndex(i); setScreen("playing"); }}>
                <span className="room-num">{i + 1}</span>
                <span className="room-name">{r}</span>
              </button>
            ))}
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
      pet: owned.pets.includes(cosmetic.pet) ? cosmetic.pet : "none",
      dashStyle: owned.dashes.includes(cosmetic.dashStyle) ? cosmetic.dashStyle : "streak"
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
          <canvas
            width="180"
            height="120"
            ref={(node) => {
              if (!node) return;
              const ctx = node.getContext("2d");
              ctx.clearRect(0, 0, 180, 120);
              drawDrone(ctx, { x: 90, y: 60, angle: 0, dashTrail: 160 }, false, cosmetic);
            }}
          />
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
              <label>Body Color</label>
              <div className="swatch-row">
                {BODY_COLORS.map((color) => <button key={color} className="swatch" data-active={cosmetic.body === color} data-locked={!owned.bodies.includes(color)} style={{ background: color }} onClick={() => owned.bodies.includes(color) ? setCosmetic({ ...cosmetic, body: color }) : setMessage("Unlock this body color in the shop first.")} />)}
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
              <label>Dash Animation</label>
              <div className="frame-row">
                {DASH_STYLES.map((dash) => <button key={dash.id} data-active={cosmetic.dashStyle === dash.id} data-locked={!owned.dashes.includes(dash.id)} onClick={() => owned.dashes.includes(dash.id) ? setCosmetic({ ...cosmetic, dashStyle: dash.id }) : setMessage("Unlock this dash animation in the shop first.")}>{dash.label}</button>)}
              </div>
            </div>
            <div>
              <label>Pet</label>
              <div className="frame-row">
                {PETS.map((pet) => <button key={pet.id} data-active={cosmetic.pet === pet.id} data-locked={!owned.pets.includes(pet.id)} onClick={() => owned.pets.includes(pet.id) ? setCosmetic({ ...cosmetic, pet: pet.id }) : setMessage("Unlock this pet in the shop first.")}>{pet.label}</button>)}
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
            <p className="small-copy">{user?.devMode ? "Developer wallet active for testing." : "Earn coins from orange crates in rooms, then unlock skins, dash effects, and pets."}</p>
          </div>
          <Button onClick={() => setScreen("profile")}>Profile</Button>
        </div>
        {message && <p className="auth-message">{message}</p>}
        <div className="shop-sections">
          <ShopSection title="Body Skins">
            {BODY_COLORS.filter((c) => c !== COSMETIC_DEFAULTS.body).map((color) => (
              <ShopItem key={color} owned={economy.owned.bodies.includes(color)} label={color.toUpperCase()} price={BODY_PRICES[color] || 50} color={color} onBuy={() => buy("bodies", color, BODY_PRICES[color] || 50, "body skin")} />
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
          <ShopSection title="Dash Animations">
            {DASH_STYLES.filter((d) => d.id !== "streak").map((dash) => (
              <ShopItem key={dash.id} owned={economy.owned.dashes.includes(dash.id)} label={dash.label} price={dash.price} onBuy={() => buy("dashes", dash.id, dash.price, dash.label)} />
            ))}
          </ShopSection>
          <ShopSection title="Pets">
            {PETS.filter((p) => p.id !== "none").map((pet) => (
              <ShopItem key={pet.id} owned={economy.owned.pets.includes(pet.id)} label={pet.label} price={pet.price} color={pet.color} onBuy={() => buy("pets", pet.id, pet.price, pet.label)} />
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

function ShopItem({ label, price, owned, color, onBuy }) {
  return (
    <button className="shop-item" data-owned={owned} onClick={onBuy}>
      {color && <span className="shop-swatch" style={{ background: color }} />}
      <strong>{label}</strong>
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
      <div className="setting"><label>Difficulty</label><select value={settings.difficulty} onChange={(e) => setSettings({ ...settings, difficulty: e.target.value })}><option>Easy</option><option>Standard</option><option>Hard</option></select></div>
    </div>
  );
}

function Toggle({ title, text, value, onChange }) {
  return <div className="setting switch"><div><label>{title}</label><p className="small-copy">{text}</p></div><button className="toggle" data-on={value} onClick={() => onChange(!value)}><span /></button></div>;
}

function Controls({ setScreen }) {
  const items = ["Move: WASD / Arrows", "Aim: Mouse", "Shoot: Left Click / Space", "Dash: Shift", "Interact: E at terminals and switches", "Spawn Echo: Q replays your last 8 seconds", "Pressure plates need any body standing on them", "Scanner beams can be blocked by Echo bodies"];
  return (
    <div className="overlay">
      <section className="panel modal">
        <div className="drawer-head"><div><h2>Controls</h2><p className="small-copy">Keyboard recommended on mobile-width screens.</p></div><Button onClick={() => setScreen("menu")}><X /></Button></div>
        <div className="controls-grid">{items.map((i) => <div className="control-card" key={i}>{i}</div>)}</div>
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

function Summary({ summary, setScreen, next }) {
  return (
    <div className="overlay">
      <section className="panel modal">
        <span className="badge">Run Summary</span>
        <h1 className="title" style={{ fontSize: 58 }}>{summary.result}</h1>
        <p className="lead">{summary.room} | {summary.time}s | Scrap recovered: {summary.scrap}</p>
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
    { id: "scrap", label: "Scrap", hint: "Restores energy" },
    { id: "exit", label: "Exit Gate", hint: "Extraction target" },
    { id: "erase", label: "Erase", hint: "Remove editor pieces" }
  ];
  const activeTool = tools.find((item) => item.id === tool) || tools[0];

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx) drawLevel(ctx, level, { player: level.player, echoes: [], bullets: [], activeIds: new Set() });
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
    if (tool === "scrap") next.scrap.push({ x: x + 20, y: y + 20, taken: false });
    if (tool === "exit") next.exit = { x, y, w: 58, h: 114 };
    if (tool === "erase") {
      ["walls", "crates", "coinCrates", "plates", "switches", "turrets", "drones", "scrap"].forEach((k) => {
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
  const [summary, setSummary] = useState({ result: "Extracted", scrap: 0, time: 0, room: rooms[0] });
  useAmbient(settings);
  const next = () => { setCustomLevel(null); setLevelIndex((v) => (v + 1) % rooms.length); setScreen("playing"); };
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
    <div className="app">
      <div className="frame" />
      {(screen === "playing" || screen === "paused" || screen === "summary") && <GameView key={`${levelIndex}-${runSeed}-${customLevel ? "custom" : "stock"}`} levelIndex={levelIndex} customLevel={customLevel} screen={screen === "playing" ? "playing" : "idle"} setScreen={setScreen} settings={settings} setSummary={setSummary} cosmetic={{ ...COSMETIC_DEFAULTS, ...(user?.cosmetic || {}) }} awardCoins={(amount) => {
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
      {screen === "controls" && <Controls setScreen={setScreen} />}
      {screen === "paused" && <PauseMenu setScreen={setScreen} retryLevel={retryLevel} />}
      {screen === "summary" && <Summary summary={summary} setScreen={setScreen} next={next} />}
      {screen === "community" && <CommunityLevels setScreen={setScreen} playLevel={playCommunityLevel} />}
      {screen === "editor" && <Editor user={user} setScreen={setScreen} setCustomLevel={setCustomLevel} />}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
