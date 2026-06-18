import { ABILITY_DEFAULT, KEYBINDS_KEY, defaultKeybinds, rooms, CAMPAIGN_SECTIONS, WEAPON_DEFAULT, COSMETIC_DEFAULTS, ABILITIES } from "../game/config.js";
import { STATION_SECRET_IDS, SECRET_MILESTONES } from "../game/secrets.js";
import { syncServerProfile } from "./server-api.js";

const AUTH_USERS_KEY = "echo-salvage-users";
const AUTH_SESSION_KEY = "echo-salvage-session";
const AUTH_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const PASSWORD_HASH_ITERATIONS = 120000;
const DEV_LOGIN = { nickname: "developer", password: "developer" };
const DEV_COINS = 999999;

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
  relics: ["none"],
  dashes: ["streak"],
  abilityStyles: ["signal"],
  weapons: [WEAPON_DEFAULT],
  abilities: [ABILITY_DEFAULT]
};
const VALID_ABILITY_IDS = new Set(ABILITIES.map((ability) => ability.id));
const LEGACY_ABILITY_IDS = { emp: "teleport", shield: "cloak", phase: "grapple", overdrive: "blastDash" };

const textEncoder = new TextEncoder();
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const mergeOwned = (saved, defaults) => [...new Set([...(saved || []), ...defaults])];

function getHighestClearedRoom(progress = {}) {
  let highest = -1;
  Object.entries(normalizeProgress(progress)).forEach(([rawIndex, stars]) => {
    const index = Number(rawIndex);
    if (stars > 0 && index > highest) highest = index;
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
  data = data || {};
  const devMode = data.devMode || data.nickname?.toLowerCase() === DEV_LOGIN.nickname;
  const migratedAbilities = (data.owned?.abilities || []).map((id) => LEGACY_ABILITY_IDS[id] || id).filter((id) => VALID_ABILITY_IDS.has(id));
  const selectedAbility = LEGACY_ABILITY_IDS[data.cosmetic?.ability] || data.cosmetic?.ability;
  const recoveredSecretCount = Object.entries(data.secrets || {}).filter(([id, recovered]) => recovered && STATION_SECRET_IDS.has(id)).length;
  const recoveredRelics = SECRET_MILESTONES.filter((milestone) => milestone.count <= recoveredSecretCount).map((milestone) => milestone.unlock.id);
  return {
    coins: devMode ? DEV_COINS : Math.max(0, Math.round(Number.isFinite(data.coins) ? data.coins : 25)),
    owned: {
      colors: mergeOwned([...(data.owned?.colors || []), ...(data.owned?.bodies || []), ...(data.owned?.trails || [])], DEFAULT_OWNED.colors),
      bodies: mergeOwned(data.owned?.bodies, DEFAULT_OWNED.bodies),
      trails: mergeOwned(data.owned?.trails, DEFAULT_OWNED.trails),
      frames: mergeOwned(data.owned?.frames, DEFAULT_OWNED.frames),
      cockpits: mergeOwned(data.owned?.cockpits, DEFAULT_OWNED.cockpits),
      engines: mergeOwned(data.owned?.engines, DEFAULT_OWNED.engines),
      decals: mergeOwned(data.owned?.decals, DEFAULT_OWNED.decals),
      armors: mergeOwned(data.owned?.armors, DEFAULT_OWNED.armors),
      pets: mergeOwned(data.owned?.pets, DEFAULT_OWNED.pets),
      relics: mergeOwned([...(data.owned?.relics || []), ...recoveredRelics], DEFAULT_OWNED.relics),
      dashes: mergeOwned(data.owned?.dashes, DEFAULT_OWNED.dashes),
      abilityStyles: mergeOwned(data.owned?.abilityStyles, DEFAULT_OWNED.abilityStyles),
      weapons: mergeOwned(data.owned?.weapons, DEFAULT_OWNED.weapons),
      abilities: mergeOwned(migratedAbilities, DEFAULT_OWNED.abilities)
    },
    cosmetic: { ...COSMETIC_DEFAULTS, weapon: WEAPON_DEFAULT, ...(data.cosmetic || {}), ability: VALID_ABILITY_IDS.has(selectedAbility) ? selectedAbility : ABILITY_DEFAULT }
  };
}

function normalizeProgress(progress = {}) {
  return Object.entries(progress || {}).reduce((safe, [rawIndex, rawStars]) => {
    const index = Number(rawIndex);
    if (!Number.isInteger(index) || index < 0 || index >= rooms.length) return safe;
    const stars = clamp(Math.round(Number(rawStars) || 0), 0, 3);
    if (stars > 0) safe[index] = stars;
    return safe;
  }, {});
}

function normalizeContracts(contracts = {}) {
  return Object.entries(contracts || {}).reduce((safe, [rawIndex, completed]) => {
    const index = Number(rawIndex);
    if (completed && Number.isInteger(index) && index >= 0 && index < rooms.length) safe[index] = true;
    return safe;
  }, {});
}

function normalizeSecrets(secrets = {}) {
  return Object.entries(secrets || {}).reduce((safe, [id, recovered]) => {
    if (recovered && STATION_SECRET_IDS.has(id)) safe[id] = true;
    return safe;
  }, {});
}

function makeSession(user) {
  const economy = normalizeEconomy(user);
  return {
    id: user.id,
    nickname: user.nickname,
    email: user.email,
    avatar: user.avatar || "yellow",
    devMode: Boolean(user.devMode),
    progress: normalizeProgress(user.progress),
    contracts: normalizeContracts(user.contracts),
    secrets: normalizeSecrets(user.secrets),
    sessionNonce: user.sessionNonce,
    sessionExpiresAt: user.sessionExpiresAt,
    serverToken: user.serverToken,
    serverTokenExpiresAt: user.serverTokenExpiresAt,
    ...economy
  };
}

function getStarsForRoom(summary) {
  if (summary.result !== "Extracted") return 0;
  let stars = 1;
  if (summary.scrap >= 2) stars += 1;
  if (summary.hull >= 55) stars += 1;
  return stars;
}

function getTotalStars(progress = {}) {
  return Object.values(normalizeProgress(progress)).reduce((sum, value) => sum + value, 0);
}

function readStoredJson(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored === null ? fallback : JSON.parse(stored);
  } catch {
    return fallback;
  }
}

function writeStoredJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getStoredKeybinds() {
  const stored = readStoredJson(KEYBINDS_KEY, {});
  return { ...defaultKeybinds, ...(stored && typeof stored === "object" ? stored : {}) };
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
  const users = readStoredJson(AUTH_USERS_KEY, []);
  return Array.isArray(users) ? users : [];
}

function saveStoredUsers(users) {
  writeStoredJson(AUTH_USERS_KEY, users);
}

function storeSession(user) {
  const token = {
    id: user.id,
    sessionNonce: user.sessionNonce,
    sessionExpiresAt: user.sessionExpiresAt
  };
  writeStoredJson(AUTH_SESSION_KEY, token);
  return makeSession(user);
}

function getStoredSession() {
  const session = readStoredJson(AUTH_SESSION_KEY, null);
  if (!session?.id) return null;
  const user = getStoredUsers().find((entry) => entry.id === session.id);
  const invalid = (session.sessionExpiresAt && session.sessionExpiresAt < Date.now()) ||
    !user ||
    (user.sessionNonce && session.sessionNonce !== user.sessionNonce);
  if (invalid) {
    localStorage.removeItem(AUTH_SESSION_KEY);
    return null;
  }
  return makeSession(user);
}

function updateStoredUserProfile(updated) {
  const normalized = { ...updated, progress: normalizeProgress(updated.progress), contracts: normalizeContracts(updated.contracts), secrets: normalizeSecrets(updated.secrets), ...normalizeEconomy(updated) };
  const users = getStoredUsers();
  const nextUsers = users.some((user) => user.id === normalized.id)
    ? users.map((user) => (user.id === normalized.id ? { ...user, ...normalized } : user))
    : [...users, normalized];
  saveStoredUsers(nextUsers);
  syncServerProfile(normalized);
  return storeSession(normalized);
}

function updateUserEconomy(user, updater) {
  const current = getStoredUsers().find((u) => u.id === user?.id) || user;
  const next = updater({ ...current, ...normalizeEconomy(current) });
  return updateStoredUserProfile(next);
}

function encodeLevelCode(level) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(level))));
}

function decodeLevelCode(code) {
  return JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
}

export {
  AUTH_SESSION_KEY,
  AUTH_SESSION_TTL_MS,
  DEV_LOGIN,
  DEV_COINS,
  DEFAULT_OWNED,
  getNextCampaignRoomIndex,
  isRoomUnlocked,
  getCurrentSectionIndex,
  makeRandomHex,
  createPasswordRecord,
  verifyStoredPassword,
  normalizeEconomy,
  normalizeProgress,
  getStarsForRoom,
  getTotalStars,
  writeStoredJson,
  getStoredKeybinds,
  keyName,
  getStoredUsers,
  saveStoredUsers,
  storeSession,
  getStoredSession,
  updateStoredUserProfile,
  updateUserEconomy,
  encodeLevelCode,
  decodeLevelCode
};
