import { W, H, ECHO_MS, ECHO_FRAME_MS, MAX_ECHOES, PLAYER_MARGIN, CARGO_MARGIN, MAX_ENERGY, ECHO_COST, ECHO_COLORS, ECHO_FILLS, DIFFICULTY_TUNING, COSMETIC_DEFAULTS, WEAPONS, ABILITIES, WEAPON_BY_ID, ABILITY_BY_ID, SECTION_MINIBOSSES, MINIBOSS_SPREADS, createMiniboss, CAMPAIGN_SECTION_BY_ID } from "../game/config.js";
import { makeLevel, makeExpeditionLevel } from "../game/levels.js";
import { rectsTouch, dist, clamp, playerRect, getSolidBlocks, SPECIAL_HOSTILE_KEYS, getLevelHostiles, areLevelHostilesDefeated, nudgeOutOfBlocks, finalizeCustomLevel, hasLineOfSight, pointToSegmentDistance } from "../game/geometry.js";
import { getBossPhase, damageBoss, spawnBossProjectile, spawnEnemyProjectile, spawnEnemySpread, spawnEnemyRadial } from "../game/combat.js";
import { drawLevel } from "../game/rendering.js";
import { getCampaignSection, getCampaignTuning, isRoomObjectiveComplete } from "../game/rules.js";

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
      return { abilityCooldownMultiplier: 0.78 };
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
  return WEAPON_BY_ID.get(id) || WEAPONS[0];
}

function getAbilityById(id) {
  return ABILITY_BY_ID.get(id) || ABILITIES[0];
}

function getDifficultyTuning(difficulty = "Standard") {
  return DIFFICULTY_TUNING[difficulty] || DIFFICULTY_TUNING.Standard;
}

function getRunTuning(levelIndex, customLevel, settings) {
  if (customLevel) return getDifficultyTuning(settings.difficulty);
  return getCampaignTuning(levelIndex);
}

function createRunLevel(levelIndex, customLevel, expedition) {
  if (customLevel) return finalizeCustomLevel(structuredClone(customLevel));
  if (expedition?.active) return makeExpeditionLevel(expedition.currentNode);
  return makeLevel(levelIndex);
}

function applyRunLevelModifiers(level, levelIndex, customLevel, expedition) {
  const mutation = customLevel ? null : expedition?.mutation;
  const event = customLevel ? null : expedition?.event;
  if (mutation === "corruptionBloom") {
    level.echoCorruptionZones.forEach((zone) => {
      zone.r = Math.round(zone.r * 1.28);
    });
  }
  if (mutation === "unstableHull") {
    if (!level.movingWalls.length) {
      level.movingWalls.push({
        x: W / 2 - 70,
        y: H / 2 - 18,
        w: 140,
        h: 36,
        axis: levelIndex % 2 ? "x" : "y",
        range: 130,
        speed: 0.00115,
        phase: 0
      });
    }
    level.movingWalls.forEach((movingWall) => {
      movingWall.speed = (movingWall.speed || 0.0007) * 1.55;
    });
  }
  if (event === "lockdown" && !level.boss) {
    const spec = SECTION_MINIBOSSES[getCampaignSection(levelIndex).id];
    level.drones.push(createMiniboss(spec, W - 170, H / 2));
  }
  return { mutation, event };
}

function prepareRunLevel(level, hostileHpBonus = 0) {
  const tuneHostileHp = (hostile, fallback = 2) => {
    hostile.baseHp = hostile.baseHp || hostile.maxHp || hostile.hp || fallback;
    hostile.maxHp = hostile.baseHp + hostileHpBonus;
    hostile.hp = Math.min(hostile.maxHp, (hostile.hp || hostile.baseHp) + hostileHpBonus);
  };

  level.coinCrates = level.coinCrates || [];
  level.turrets.forEach((turret) => tuneHostileHp(turret, 2));
  level.drones?.forEach((drone) => tuneHostileHp(drone, 2));
  level.missileSentries?.forEach((sentry) => {
    tuneHostileHp(sentry, 3);
    sentry.cooldown = sentry.cooldown ?? 2400;
    sentry.lockMs = sentry.lockMs || 0;
  });
  SPECIAL_HOSTILE_KEYS.forEach((key) => {
    level[key] = level[key] || [];
    level[key].forEach((hostile) => {
      tuneHostileHp(hostile, 3);
      hostile.cooldown = hostile.cooldown ?? 900;
    });
  });
  level.movingWalls = level.movingWalls || [];
  level.echoCorruptionZones = level.echoCorruptionZones || [];
  if (level.boss) tuneHostileHp(level.boss, level.boss.hp || 14);
  level.movingWalls.forEach((movingWall) => {
    movingWall.originX = movingWall.originX ?? movingWall.x;
    movingWall.originY = movingWall.originY ?? movingWall.y;
    movingWall.motion = movingWall.motion || 0;
  });
}

function useGame({ levelIndex, customLevel, screen, setScreen, settings, setSummary, onRunComplete, cosmetic, awardCoins, keybinds, expedition }) {
  const canvas = useRef(null);
  const game = useRef(null);
  const runInstance = useRef(0);
  const keys = useRef(new Set());
  const mouse = useRef({ x: 0, y: 0, down: false });
  const aim = useRef({ x: W / 2, y: H / 2 });
  const abilityQueued = useRef(false);
  const interactQueued = useRef(false);
  const touch = useRef({ up: false, down: false, left: false, right: false, shoot: false, interact: false });
  const mobileMove = useRef({ x: 0, y: 0 });
  const mobileAim = useRef({ x: 0, y: 0, active: false, shooting: false });
  const clearInputState = () => {
    keys.current.clear();
    mouse.current.down = false;
    abilityQueued.current = false;
    interactQueued.current = false;
    touch.current = { up: false, down: false, left: false, right: false, shoot: false, interact: false };
    mobileMove.current = { x: 0, y: 0 };
    mobileAim.current = { x: 0, y: 0, active: false, shooting: false };
  };

  const reset = () => {
    runInstance.current += 1;
    const level = createRunLevel(levelIndex, customLevel, expedition);
    const perks = getPetPerks(cosmetic);
    const weapon = getWeaponById(cosmetic.weapon);
    const ability = getAbilityById(cosmetic.ability);
    const tuning = getRunTuning(levelIndex, customLevel, settings);
    const upgrades = new Set(expedition?.upgrades || []);
    const mods = new Set(expedition?.mods || []);
    const { mutation, event } = applyRunLevelModifiers(level, levelIndex, customLevel, expedition);
    const maxShield = perks.maxShield || 0;
    const hostileHpBonus = tuning.hostileHpBonus || 0;
    prepareRunLevel(level, hostileHpBonus);
    const expeditionPowerBonus = expedition?.active ? (expedition.power || 0) * 8 : 0;
    const maxEnergy = tuning.maxEnergy + (mods.has("capacitorMesh") ? 20 : 0) + expeditionPowerBonus;
    game.current = {
      level,
      activeIds: new Set(),
      player: {
        x: level.player.x,
        y: level.player.y,
        angle: 0,
        hp: expedition?.active ? clamp(expedition.hull ?? 100, 1, 100) : 100,
        energy: expedition?.active ? clamp(expedition.energy ?? maxEnergy, 0, maxEnergy) : maxEnergy,
        maxEnergy,
        shield: maxShield,
        maxShield,
        corruption: expedition?.active ? clamp(expedition.corruption || 0, 0, 100) : 0,
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
        cloakUntil: 0,
        pendingTeleport: null,
        phaseVector: { x: 0, y: 0 }
      },
      echoes: [],
      bullets: [],
      missiles: [],
      dashBursts: [],
      railBeams: [],
      cargoTether: null,
      grapple: null,
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
      campaignSection: level.sectionId ? CAMPAIGN_SECTION_BY_ID.get(level.sectionId) : getCampaignSection(levelIndex),
      tuning,
      expedition: { upgrades, mods, mutation, event, active: Boolean(expedition?.active), alert: expedition?.alert || 0, power: expedition?.power || 0 }
    };
  };

  useEffect(reset, [levelIndex, customLevel, settings.difficulty, expedition]);

  useEffect(() => {
    if (screen !== "playing") clearInputState();
  }, [screen]);

  useEffect(() => {
    const down = (e) => {
      const boundCodes = new Set([...Object.values(keybinds), "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
      if (boundCodes.has(e.code)) e.preventDefault();
      if (screen !== "playing") return;
      const firstPress = !keys.current.has(e.code);
      if ((e.code === keybinds.dash || e.code === keybinds.ability) && firstPress) abilityQueued.current = true;
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
  }, [keybinds, screen]);

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
    if (g.player.energy < echoCost) {
      blockEcho(`Need ${Math.ceil(echoCost - g.player.energy)} energy`);
      return;
    }
    const usedSlots = new Set(g.echoes.map((echo) => echo.slot));
    const slot = Array.from({ length: MAX_ECHOES }, (_, i) => i).find((i) => !usedSlots.has(i)) ?? 0;
    const replayFrames = ECHO_MS / ECHO_FRAME_MS;
    if (g.recording.length < replayFrames) {
      const remainingSeconds = Math.ceil((replayFrames - g.recording.length) * ECHO_FRAME_MS / 1000);
      blockEcho(`Recording ${remainingSeconds}s more history`);
      return;
    }
    g.player.energy -= echoCost;
    const frames = g.recording.slice(-replayFrames).map((frame) => ({ ...frame }));
    const id = g.nextEchoId ?? 0;
    g.nextEchoId = id + 1;
    const echo = {
      id,
      slot,
      frames,
      age: 0,
      x: frames[0].x,
      y: frames[0].y,
      angle: 0,
      fired: 0,
      echoColor: ECHO_COLORS[slot] || ECHO_COLORS[0],
      echoFill: ECHO_FILLS[slot] || ECHO_FILLS[0]
    };
    if (g.expedition?.upgrades?.has("echoConvergence") && g.echoes.length > 0) {
      echo.fused = true;
      echo.echoColor = "#f4ffff";
      echo.echoFill = "rgba(126,249,255,.38)";
    }
    g.echoes.push(echo);
    g.echoStatus = `Echo ${slot + 1} captured · replaying last 8s`;
    g.echoStatusUntil = performance.now() + 1100;
    if (settings.shake && !settings.reduced) g.shake = 8;
  }

  function isShielded(level, target) {
    if (level.shieldDrones?.includes(target)) return false;
    return level.shieldDrones?.some((shield) => shield.hp > 0 && dist(shield, target) < 110 && dist(shield, target) > 18);
  }

  function shoot(from, owner = "player") {
    const g = game.current;
    const angle = from.angle || 0;
    const perks = owner === "player" ? getPetPerks(cosmetic) : {};
    const weapon = owner === "player" || owner === "echo" ? getWeaponById(g.player.weaponId || cosmetic.weapon) : null;
    const level = g.level;
    const speed = weapon?.bulletSpeed || 620;
    const upgrades = g.expedition?.upgrades || new Set();
    const mods = g.expedition?.mods || new Set();
    const echoMultiplier = owner === "echo" ? (from.fused ? 2.25 : mods.has("echoLens") ? 2 : upgrades.has("echoArsenal") ? 1.5 : 1) : 1;
    const corruptionBonus = owner === "player" && upgrades.has("corruptionDrive") ? Math.floor((g.player.corruption || 0) / 34) : 0;
    const convergenceBonus = owner === "player" && upgrades.has("echoConvergence") ? Math.min(2, g.echoes.length * 0.35) : 0;
    const damage = ((weapon?.damage || 1) + (perks.bulletDamage || 0) + (mods.has("piercingCoil") ? 1 : 0) + (upgrades.has("volatileRounds") ? 0.75 : 0) + corruptionBonus + convergenceBonus) * echoMultiplier;
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
        if (t.hp > 0 && !isShielded(level, t) && pointToSegmentDistance({ x: t.x, y: t.y }, line, end) < 24 && hasLineOfSight(line, t, blockers)) t.hp -= damage;
      });
      level.drones?.forEach((d) => {
        if (d.hp > 0 && !isShielded(level, d) && pointToSegmentDistance({ x: d.x, y: d.y }, line, end) < 22 && hasLineOfSight(line, d, blockers)) d.hp -= damage;
      });
      level.missileSentries?.forEach((m) => {
        if (m.hp > 0 && !isShielded(level, m) && pointToSegmentDistance({ x: m.x, y: m.y }, line, end) < 23 && hasLineOfSight(line, m, blockers)) m.hp -= damage;
      });
      SPECIAL_HOSTILE_KEYS.forEach((key) => {
        level[key]?.forEach((h) => {
          if (h.hp > 0 && !isShielded(level, h) && pointToSegmentDistance({ x: h.x, y: h.y }, line, end) < 24 && hasLineOfSight(line, h, blockers)) h.hp -= damage;
        });
      });
      if (level.core?.alive && pointToSegmentDistance(level.core, line, end) < 32 && hasLineOfSight(line, level.core, blockers)) {
        level.core.hp -= damage;
        if (level.core.hp <= 0) level.core.alive = false;
      }
      if (level.boss?.hp > 0 && pointToSegmentDistance(level.boss, line, end) < 48 && hasLineOfSight(line, level.boss, blockers)) {
        damageBoss(level.boss, damage);
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
      maxRange: (weapon?.maxRange || 9999) * (upgrades.has("volatileRounds") ? 1.25 : 1),
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
    const perks = getPetPerks(cosmetic);
    if (now < g.player.abilityReadyAt || g.player.energy < ability.energyCost) return;
    const movementX =
      (keys.current.has(keybinds.moveRight) || keys.current.has("ArrowRight") || touch.current.right ? 1 : 0) -
      (keys.current.has(keybinds.moveLeft) || keys.current.has("ArrowLeft") || touch.current.left ? 1 : 0) +
      mobileMove.current.x;
    const movementY =
      (keys.current.has(keybinds.moveDown) || keys.current.has("ArrowDown") || touch.current.down ? 1 : 0) -
      (keys.current.has(keybinds.moveUp) || keys.current.has("ArrowUp") || touch.current.up ? 1 : 0) +
      mobileMove.current.y;
    const directionAngle = movementX || movementY ? Math.atan2(movementY, movementX) : g.player.angle;
    const nx = Math.cos(directionAngle);
    const ny = Math.sin(directionAngle);
    const aimedTarget = mobileAim.current.active
      ? {
          x: clamp(g.player.x + mobileAim.current.x * 430, PLAYER_MARGIN, W - PLAYER_MARGIN),
          y: clamp(g.player.y + mobileAim.current.y * 430, PLAYER_MARGIN, H - PLAYER_MARGIN)
        }
      : {
          x: clamp(mouse.current.x, PLAYER_MARGIN, W - PLAYER_MARGIN),
          y: clamp(mouse.current.y, PLAYER_MARGIN, H - PLAYER_MARGIN)
        };
    g.player.energy -= ability.energyCost;
    g.player.abilityReadyAt = now + ability.cooldownMs * (perks.abilityCooldownMultiplier || 1);
    g.abilityBursts.push({ x: g.player.x, y: g.player.y, type: ability.id, life: 520, maxLife: 520 });
    if (ability.id === "dash") {
      g.dashBursts.push({ x: g.player.x, y: g.player.y, angle: directionAngle, life: 260, maxLife: 260 });
      phaseMove(g.player, nx * 132, ny * 132);
      if (g.expedition?.upgrades?.has("phaseWake")) {
        getLevelHostiles(g.level).forEach((target) => {
          if (target.hp > 0 && dist(target, g.player) < 92 && !isShielded(g.level, target)) target.hp -= 2;
        });
        if (g.level.boss?.hp > 0 && dist(g.level.boss, g.player) < 110) damageBoss(g.level.boss, 2);
        g.abilityBursts.push({ x: g.player.x, y: g.player.y, type: "blastDash", life: 520, maxLife: 520 });
      }
      g.player.dashTrail = 190;
      g.player.phaseUntil = now + 320;
      g.player.phaseVector = { x: nx, y: ny };
    } else if (ability.id === "teleport") {
      const targetX = aimedTarget.x;
      const targetY = aimedTarget.y;
      g.player.pendingTeleport = { x: targetX, y: targetY, executeAt: now + 2000 };
      g.abilityBursts.push({ x: targetX, y: targetY, type: ability.id, life: 2000, maxLife: 2000 });
    } else if (ability.id === "blastDash") {
      const start = { x: g.player.x, y: g.player.y };
      phaseMove(g.player, nx * 205, ny * 205);
      g.player.phaseUntil = now + 360;
      g.player.phaseVector = { x: nx, y: ny };
      resolvePlayerAfterPhase(g.player, g.level);
      const end = { x: g.player.x, y: g.player.y };
      getLevelHostiles(g.level).forEach((target) => {
        if (target.hp > 0 && pointToSegmentDistance(target, start, end) < 72) target.hp -= isShielded(g.level, target) ? 0 : 3;
      });
      if (g.level.boss?.hp > 0 && pointToSegmentDistance(g.level.boss, start, end) < 90) damageBoss(g.level.boss, 3);
      if (g.level.core?.alive && pointToSegmentDistance(g.level.core, start, end) < 78) {
        g.level.core.hp -= 3;
        if (g.level.core.hp <= 0) g.level.core.alive = false;
      }
      g.abilityBursts.push({ x: g.player.x, y: g.player.y, type: ability.id, life: 720, maxLife: 720 });
    } else if (ability.id === "cloak") {
      g.player.cloakUntil = now + 5000;
    } else if (ability.id === "grapple") {
      const targetX = aimedTarget.x;
      const targetY = aimedTarget.y;
      const dx = targetX - g.player.x;
      const dy = targetY - g.player.y;
      const gap = Math.hypot(dx, dy) || 1;
      const pull = Math.min(390, gap);
      g.grapple = {
        startX: g.player.x,
        startY: g.player.y,
        targetX: g.player.x + (dx / gap) * pull,
        targetY: g.player.y + (dy / gap) * pull,
        launchMs: 190,
        pullMs: 360,
        age: 0,
        life: 700
      };
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
    g.player.nextShotAt = now + weapon.fireDelay;
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
      const hostileSpeed = (tuning.hostileSpeed || 1) * (g.expedition?.mutation === "overclocked" ? 1.28 : 1) * (1 + (g.expedition?.alert || 0) * 0.055);
      const maxShield = perks.maxShield || 0;
      g.player.maxShield = maxShield;
      g.player.shield = clamp(g.player.shield || 0, 0, maxShield);
      level.movingWalls?.forEach((wall, wallIndex) => {
        wall.motion = (wall.motion || 0) + dt;
        const offset = Math.sin(wall.motion * (wall.speed || 0.0007) + (wall.phase || 0)) * (wall.range || 100);
        const candidate = {
          ...wall,
          x: wall.axis === "x" ? wall.originX + offset : wall.originX,
          y: wall.axis === "y" ? wall.originY + offset : wall.originY
        };
        const blockers = [
          ...level.walls,
          ...level.doors.filter((door) => !door.open),
          ...level.crates,
          ...level.movingWalls.filter((_, index) => index !== wallIndex),
          playerRect(g.player)
        ];
        if (!blockers.some((block) => rectsTouch(candidate, block))) {
          wall.x = candidate.x;
          wall.y = candidate.y;
        }
      });
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
      const grapplePulling = g.grapple && g.grapple.age >= g.grapple.launchMs;
      if ((mx || my) && !grapplePulling) {
        const len = Math.hypot(mx, my);
        const nx = mx / len;
        const ny = my / len;
        const dashBoost = g.player.dashTrail > 0 ? 1.35 : 1;
        const moveX = nx * speed * dashBoost * dt / 1000;
        const moveY = ny * speed * dashBoost * dt / 1000;
        if (g.player.dashTrail > 0) {
          phaseMove(g.player, moveX, moveY);
        } else {
          tryMove(g.player, moveX, moveY, level, true);
        }
      }
      if (g.expedition?.event === "hullBreach") tryMove(g.player, -42 * dt / 1000, Math.sin(now * 0.004) * 16 * dt / 1000, level, false);
      if (abilityQueued.current) {
        useAbility(now);
        abilityQueued.current = false;
      }
      if (g.player.pendingTeleport && now >= g.player.pendingTeleport.executeAt) {
        const target = g.player.pendingTeleport;
        g.player.phaseVector = { x: target.x - g.player.x, y: target.y - g.player.y };
        phaseMove(g.player, target.x - g.player.x, target.y - g.player.y);
        resolvePlayerAfterPhase(g.player, level);
        g.abilityBursts.push({ x: g.player.x, y: g.player.y, type: "teleport", life: 620, maxLife: 620 });
        g.player.pendingTeleport = null;
      }
      if (g.grapple) {
        const grapple = g.grapple;
        grapple.age += dt;
        grapple.life -= dt;
        if (grapple.age >= grapple.launchMs && grapple.life > 0) {
          const dx = grapple.targetX - g.player.x;
          const dy = grapple.targetY - g.player.y;
          const gap = Math.hypot(dx, dy);
          if (gap > 8) {
            const pullSpeed = 760;
            const step = Math.min(gap, pullSpeed * dt / 1000);
            tryMove(g.player, (dx / gap) * step, (dy / gap) * step, level, false);
            g.player.angle = Math.atan2(dy, dx);
          } else {
            grapple.life = Math.min(grapple.life, 160);
          }
        }
        if (grapple.life <= 0) g.grapple = null;
      }
      const playerHidden = now < (g.player.cloakUntil || 0);
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
        const frameIndex = Math.floor(e.age / ECHO_FRAME_MS);
        const replaying = frameIndex < e.frames.length;
        const frame = e.frames[Math.min(frameIndex, e.frames.length - 1)];
        if (!frame) return;
        e.x = frame.x;
        e.y = frame.y;
        e.angle = frame.angle;
        e.corrupted = level.echoCorruptionZones?.some((zone) => dist(e, zone) < zone.r) || false;
        if (replaying && !e.corrupted && frame.interact) interact(e);
        if (replaying && !e.corrupted && frame.fire && e.age - e.fired > 210) {
          e.fired = e.age;
          shoot(e, "echo");
        }
      });
      updateCargoTether(g, dt);

      const bodies = [g.player, ...g.echoes.filter((echo) => !echo.corrupted), ...level.crates.map((c) => ({ x: c.x + c.w / 2, y: c.y + c.h / 2 }))];
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
          const salvageHeart = g.expedition?.upgrades?.has("salvageHeart");
          g.player.energy = clamp(g.player.energy + (salvageHeart ? 38 : 24), 0, g.player.maxEnergy || MAX_ENERGY);
          if (salvageHeart) {
            g.player.hp = clamp(g.player.hp + 9, 0, 100);
            g.player.shield = clamp((g.player.shield || 0) + 8, 0, g.player.maxShield || 0);
          }
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
        if (playerHidden) return;
        const a = Math.atan2(g.player.y - d.y, g.player.x - d.x);
        d.angle = a;
        const gap = dist(d, g.player);
        const chaseSpeed = d.chaseSpeed || (d.miniKind === "ram" ? 165 : d.miniKind === "thorn" ? 88 : d.miniKind === "harrier" ? 112 : 115);
        const desiredRange = d.desiredRange || (d.miniKind === "thorn" ? 240 : d.miniKind === "mirror" ? 205 : 155);
        if (gap > desiredRange) {
          d.x = clamp(d.x + Math.cos(a) * chaseSpeed * hostileSpeed * dt / 1000, 58, W - 58);
          d.y = clamp(d.y + Math.sin(a) * chaseSpeed * hostileSpeed * dt / 1000, 58, H - 58);
        }
        if (gap < 34) {
          damagePlayer(g, dt * (d.contactDamage || (d.miniKind === "ram" ? 0.072 : 0.035)));
          if (settings.shake && !settings.reduced) g.shake = Math.max(g.shake, 4);
        }
        d.cooldown -= dt;
        if (d.cooldown <= 0 && gap < 520) {
          const projectileDamage = d.projectileDamage || 12;
          if (d.miniKind === "thorn") {
            spawnEnemyRadial(g, d, 10, d.pulse * 0.001, 235 * hostileSpeed, projectileDamage, { life: 2600, projectile: "thorn", radius: 6 });
          } else if (d.miniKind === "mirror") {
            spawnEnemySpread(g, d, a, MINIBOSS_SPREADS.mirror, 380 * hostileSpeed, projectileDamage, { life: 1700, radius: 5 });
          } else if (d.miniKind === "harrier") {
            const blinkAngle = a + Math.PI + Math.sin(now * 0.003) * 0.7;
            const blinkDistance = d.blinkDistance || 225;
            d.x = clamp(g.player.x + Math.cos(blinkAngle) * blinkDistance, 70, W - 70);
            d.y = clamp(g.player.y + Math.sin(blinkAngle) * blinkDistance, 70, H - 70);
            const blinkAim = Math.atan2(g.player.y - d.y, g.player.x - d.x);
            spawnEnemySpread(g, d, blinkAim, MINIBOSS_SPREADS.harrier, 395 * hostileSpeed, projectileDamage, { life: 1500, projectile: "thorn", radius: 6 });
          } else if (d.miniKind === "reclaimer") {
            for (let shot = -3; shot <= 3; shot += 1) {
              const angle = a + shot * 0.22;
              spawnEnemyProjectile(g, d, angle, (245 + Math.abs(shot) * 12) * hostileSpeed, projectileDamage, { life: 2300, radius: 7 });
            }
          } else if (d.miniKind === "lancer") {
            spawnEnemySpread(g, d, a, MINIBOSS_SPREADS.lancer, 470 * hostileSpeed, projectileDamage, { life: 1450, radius: 4 });
          } else if (d.miniKind === "bastion") {
            d.attackCycle = (d.attackCycle || 0) + 1;
            spawnEnemyRadial(g, d, 8, d.attackCycle * Math.PI / 8, 255 * hostileSpeed, projectileDamage, { life: 2600, radius: 7 });
          } else if (d.miniKind === "spore") {
            spawnEnemyRadial(g, d, 6, d.pulse * 0.0008, 215 * hostileSpeed, projectileDamage, { life: 3000, projectile: "thorn", radius: 7, homing: 950, turnRate: 0.018 });
          } else if (d.miniKind === "archivist") {
            d.attackCycle = (d.attackCycle || 0) + 1;
            spawnEnemyRadial(g, d, 6, d.attackCycle * Math.PI / 6, 290 * hostileSpeed, projectileDamage, { life: 2300, projectile: "thorn", radius: 5 });
          } else if (d.miniKind !== "ram") {
            g.bullets.push({ x: d.x + Math.cos(a) * 20, y: d.y + Math.sin(a) * 20, vx: Math.cos(a) * 360 * hostileSpeed, vy: Math.sin(a) * 360 * hostileSpeed, life: 1500, owner: "enemy" });
          }
          d.cooldown = (d.attackCooldown || (d.miniKind === "harrier" ? 1180 : d.miniKind === "thorn" ? 1380 : d.miniKind === "mirror" ? 980 : 1050)) * (tuning.hostileCooldown || 1);
        }
        d.pulse = (d.pulse || 0) + dt;
      });
      level.missileSentries?.forEach((m) => {
        if (m.hp <= 0) return;
        const gap = dist(m, g.player);
        const blockers = getSolidBlocks(level);
        const seesPlayer = !playerHidden && hasLineOfSight(m, g.player, blockers) && gap < 720;
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
        if (playerHidden) return;
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
      if (level.boss?.hp > 0) {
        const boss = level.boss;
        boss.pulse = (boss.pulse || 0) + dt;
        boss.hitFlash = Math.max(0, (boss.hitFlash || 0) - dt);
        if (boss.execution > 0) {
          boss.execution -= dt;
          g.shake = Math.max(g.shake, settings.reduced ? 0 : 8);
          if (boss.execution <= 0) {
            boss.hp = 0;
            g.abilityBursts.push({ x: boss.x, y: boss.y, type: "blastDash", life: 1000, maxLife: 1000 });
          }
        }
        if (boss.execution > 0) {
          const ctx = canvas.current?.getContext("2d");
          if (ctx) drawLevel(ctx, level, g, g.shake, cosmetic, settings.uiTheme);
          raf = requestAnimationFrame(loop);
          return;
        }
        boss.cooldown -= dt;
        boss.originX = boss.originX ?? boss.x;
        boss.originY = boss.originY ?? boss.y;
        const phase = getBossPhase(boss);
        const movementScale = boss.kind === "warden" ? 5 : boss.kind === "furnace" ? 8 : boss.kind === "overseer" ? 18 : 32;
        boss.x = boss.originX + Math.sin(boss.pulse * (boss.kind === "crown" ? 0.0012 : 0.00065)) * movementScale;
        boss.y = boss.originY + Math.cos(boss.pulse * (boss.kind === "overseer" ? 0.0011 : 0.0008)) * movementScale * 0.55;
        const gap = dist(boss, g.player);
        boss.meleeCooldown = Math.max(0, (boss.meleeCooldown || 0) - dt);
        if (boss.kind === "overseer" && !playerHidden && gap < 205 && boss.meleeCooldown <= 0 && !boss.meleeWindup) {
          boss.meleeWindupMax = phase === 3 ? 520 : 720;
          boss.meleeWindup = boss.meleeWindupMax;
          boss.meleeAngle = Math.atan2(g.player.y - boss.y, g.player.x - boss.x);
          boss.charge = 0;
        }
        const wasMeleeWinding = boss.meleeWindup > 0;
        if (wasMeleeWinding) boss.meleeWindup -= dt;
        if (wasMeleeWinding && boss.meleeWindup <= 0) {
          boss.meleeWindup = 0;
          const playerAngle = Math.atan2(g.player.y - boss.y, g.player.x - boss.x);
          let delta = playerAngle - boss.meleeAngle;
          while (delta > Math.PI) delta -= Math.PI * 2;
          while (delta < -Math.PI) delta += Math.PI * 2;
          if (dist(boss, g.player) < 172 && Math.abs(delta) < 0.78) {
            damagePlayer(g, 22 + phase * 8);
            tryMove(g.player, Math.cos(boss.meleeAngle) * 82, Math.sin(boss.meleeAngle) * 82, level, false);
          }
          boss.meleeCooldown = (phase === 3 ? 900 : 1350) * (tuning.hostileCooldown || 1);
          boss.cooldown = Math.max(boss.cooldown, 650);
          if (settings.shake && !settings.reduced) g.shake = Math.max(g.shake, 12);
        }
        const allowsRangedAttack = boss.kind !== "overseer" || gap >= 175;
        if (!playerHidden && allowsRangedAttack && boss.cooldown <= 0 && gap < 760 && !boss.charge && !boss.meleeWindup) {
          boss.chargeMax = boss.kind === "warden" ? 920 : boss.kind === "furnace" ? 800 : boss.kind === "overseer" ? 720 : 580;
          if (phase === 3) boss.chargeMax *= 0.82;
          boss.charge = boss.chargeMax;
        }
        const wasCharging = boss.charge > 0;
        if (wasCharging) boss.charge -= dt;
        if (wasCharging && boss.charge <= 0) {
          boss.charge = 0;
          const baseAngle = Math.atan2(g.player.y - boss.y, g.player.x - boss.x);
          if (boss.kind === "warden") {
            const count = 3 + phase * 2;
            for (let shot = 0; shot < count; shot += 1) {
              const a = baseAngle + (shot - (count - 1) / 2) * 0.15;
              spawnBossProjectile(g, boss, a, (300 + phase * 24) * hostileSpeed, 10 + phase * 2);
            }
            if (phase === 3) {
              for (let shot = 0; shot < 8; shot += 1) spawnBossProjectile(g, boss, shot * Math.PI / 4 + boss.pulse * 0.001, 245 * hostileSpeed, 11);
            }
          } else if (boss.kind === "furnace") {
            const count = 5 + phase * 2;
            for (let shot = 0; shot < count; shot += 1) {
              const a = baseAngle + (shot - (count - 1) / 2) * 0.2;
              spawnBossProjectile(g, boss, a, (245 + phase * 18) * hostileSpeed, 13 + phase * 2, { radius: 7, projectile: "magma", life: 3200 });
            }
            for (const side of [-1, 1]) spawnBossProjectile(g, boss, baseAngle + side * 0.65, 175 * hostileSpeed, 22, { radius: 11, projectile: "magma", life: 3900 });
          } else if (boss.kind === "overseer") {
            const count = 8 + phase * 2;
            for (let shot = 0; shot < count; shot += 1) {
              const a = shot * Math.PI * 2 / count + boss.pulse * 0.0007;
              spawnBossProjectile(g, boss, a, (210 + phase * 18) * hostileSpeed, 12 + phase * 2, { projectile: "thorn", radius: 6, homing: phase >= 2 ? 900 + phase * 300 : 0, turnRate: 0.024 });
            }
            for (let shot = -1; shot <= 1; shot += 1) spawnBossProjectile(g, boss, baseAngle + shot * 0.18, 355 * hostileSpeed, 18 + phase * 2, { projectile: "thorn", radius: 7 });
          } else {
            const count = 12 + phase * 4;
            for (let shot = 0; shot < count; shot += 1) {
              const a = shot * Math.PI * 2 / count + boss.pulse * 0.0013;
              spawnBossProjectile(g, boss, a, (235 + phase * 20) * hostileSpeed, 14 + phase * 2, { radius: 5, homing: phase === 3 ? 800 : 0, turnRate: 0.017 });
            }
            for (let shot = -2; shot <= 2; shot += 1) spawnBossProjectile(g, boss, baseAngle + shot * 0.09, 420 * hostileSpeed, 18 + phase * 3, { projectile: "thorn", radius: 6 });
          }
          boss.cooldown = (boss.kind === "warden" ? 1320 : boss.kind === "furnace" ? 1080 : boss.kind === "overseer" ? 880 : 660) * (tuning.hostileCooldown || 1);
          if (settings.shake && !settings.reduced) g.shake = Math.max(g.shake, phase === 3 ? 10 : 6);
        }
      }
      level.repairBots?.forEach((h) => {
        if (h.hp <= 0) return;
        h.cooldown -= dt;
        if (h.cooldown <= 0) {
          const repairables = getLevelHostiles(level)
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
        const seesPlayer = !playerHidden && hasLineOfSight(t, g.player, blockers);
        t.seesPlayer = seesPlayer;
        if (t.cooldown <= 0 && seesPlayer) {
          const a = Math.atan2(g.player.y - t.y, g.player.x - t.x);
          g.bullets.push({ x: t.x, y: t.y, vx: Math.cos(a) * 310 * hostileSpeed, vy: Math.sin(a) * 310 * hostileSpeed, life: 1800, owner: "enemy" });
          t.cooldown = 1350 * (tuning.hostileCooldown || 1);
        }
      });

      g.bullets.forEach((b) => {
        if (b.homing > 0 && b.owner === "enemy" && !playerHidden) {
          b.homing -= dt;
          const speed = Math.hypot(b.vx, b.vy);
          const current = Math.atan2(b.vy, b.vx);
          const target = Math.atan2(g.player.y - b.y, g.player.x - b.x);
          let delta = target - current;
          while (delta > Math.PI) delta -= Math.PI * 2;
          while (delta < -Math.PI) delta += Math.PI * 2;
          const next = current + clamp(delta, -(b.turnRate || 0.035), b.turnRate || 0.035);
          b.vx = Math.cos(next) * speed;
          b.vy = Math.sin(next) * speed;
        }
        const dx = b.vx * dt / 1000;
        const dy = b.vy * dt / 1000;
        b.x += dx;
        b.y += dy;
        b.traveled = (b.traveled || 0) + Math.hypot(dx, dy);
        b.life -= dt;
        if (b.traveled > (b.maxRange || 9999)) b.life = 0;
        const bulletRadius = b.radius || 3;
        if (getSolidBlocks(level).some((w) => rectsTouch({ x: b.x - bulletRadius, y: b.y - bulletRadius, w: bulletRadius * 2, h: bulletRadius * 2 }, w))) b.life = 0;
        level.turrets.forEach((t) => {
          if (b.owner !== "enemy" && t.hp > 0 && dist(b, t) < 25) {
            t.hp -= isShielded(level, t) ? 0 : b.damage || 1;
            b.life = 0;
          }
        });
        level.drones?.forEach((d) => {
          if (b.owner !== "enemy" && d.hp > 0 && dist(b, d) < 24) {
            d.hp -= isShielded(level, d) ? 0 : b.damage || 1;
            b.life = 0;
            if (d.hp <= 0) {
              g.player.energy = clamp(g.player.energy + 12, 0, g.player.maxEnergy || MAX_ENERGY);
              if (g.expedition?.mutation === "echoRevenants" && !d.revenantBurst) {
                d.revenantBurst = true;
                for (let shot = 0; shot < 8; shot += 1) {
                  const angle = shot * Math.PI / 4;
                  g.bullets.push({ x: d.x, y: d.y, vx: Math.cos(angle) * 270, vy: Math.sin(angle) * 270, life: 1800, owner: "enemy", damage: 13, color: "#b78cff", radius: 5 });
                }
              }
            }
          }
        });
        level.missileSentries?.forEach((m) => {
          if (b.owner !== "enemy" && m.hp > 0 && dist(b, m) < 25) {
            m.hp -= isShielded(level, m) ? 0 : b.damage || 1;
            b.life = 0;
          }
        });
        SPECIAL_HOSTILE_KEYS.forEach((key) => {
          level[key]?.forEach((h) => {
            if (b.owner !== "enemy" && h.hp > 0 && dist(b, h) < 25) {
              h.hp -= isShielded(level, h) ? 0 : b.damage || 1;
              b.life = 0;
            }
          });
        });
        if (b.owner !== "enemy" && level.core?.alive && dist(b, level.core) < 32) {
          level.core.hp -= b.damage || 1;
          b.life = 0;
          if (level.core.hp <= 0) level.core.alive = false;
        }
        if (b.owner !== "enemy" && level.boss?.hp > 0 && dist(b, level.boss) < 48) {
          damageBoss(level.boss, b.damage || 1);
          b.life = 0;
        }
        if (b.owner === "enemy" && dist(b, g.player) < 14 + (b.radius || 4)) {
          damagePlayer(g, b.damage || 10);
          b.life = 0;
          if (settings.shake && !settings.reduced) g.shake = 7;
        }
      });
      g.bullets = g.bullets.filter((b) => b.life > 0 && b.x > 0 && b.x < W && b.y > 0 && b.y < H);
      g.missiles.forEach((missile) => {
        missile.life -= dt;
        const current = Math.atan2(missile.vy || 0.001, missile.vx || 0.001);
        const target = playerHidden ? current : Math.atan2(g.player.y - missile.y, g.player.x - missile.x);
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
        if (near) damagePlayer(g, dt * 0.018 * (perks.laserResist || 1) * (tuning.laserDamage || 1) * (g.expedition?.event === "reactorSurge" ? 1.55 : 1));
      });

      const insideCorruption = level.echoCorruptionZones?.some((zone) => dist(g.player, zone) < zone.r);
      const corruptionRecovery = g.expedition?.mutation === "corruptionBloom" ? 0.0025 : 0.006;
      g.player.corruption = clamp((g.player.corruption || 0) + (insideCorruption ? dt * 0.036 : -dt * corruptionRecovery), 0, 100);
      if (g.player.corruption > 65) {
        g.player.energy = clamp(g.player.energy - dt * 0.0045, 0, g.player.maxEnergy || MAX_ENERGY);
      }
      if (g.player.corruption >= 100) damagePlayer(g, dt * 0.012);

      const eventEnergy = g.expedition?.event === "reactorSurge" ? 3.2 : 0;
      g.player.energy = clamp(g.player.energy + ((perks.energyRegen || 0) + eventEnergy) * dt / 1000, 0, g.player.maxEnergy || MAX_ENERGY);
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
      }
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

      const finishRun = (result) => {
        if (g.status !== "playing") return;
        g.status = "resolved";
        const resolvedSummary = {
          result,
          scrap: g.player.scrap,
          hull: Math.max(0, Math.round(g.player.hp)),
          energy: Math.max(0, Math.round(g.player.energy)),
          corruption: Math.max(0, Math.round(g.player.corruption || 0)),
          time: Math.round((now - g.started) / 1000),
          room: level.name,
          levelIndex,
          isCustom: Boolean(customLevel),
          stationExpedition: Boolean(expedition?.active),
          stationNode: expedition?.currentNode || null,
          stationFirstClear: Boolean(expedition?.active && expedition?.currentNode && !(expedition.cleared || []).includes(expedition.currentNode))
        };
        onRunComplete?.(resolvedSummary);
        setSummary(resolvedSummary);
        setScreen("summary");
      };

      if (g.player.hp <= 0) {
        finishRun("Signal Lost");
      }
      const roomSecured =
        (!level.core || !level.core.alive || levelIndex < 4) &&
        (!level.boss || level.boss.hp <= 0) &&
        areLevelHostilesDefeated(level);
      if (rectsTouch(playerRect(g.player), level.exit) && level.doors.every((d) => d.open) && roomSecured && isRoomObjectiveComplete(level)) {
        finishRun("Extracted");
      }

      const ctx = canvas.current?.getContext("2d");
      if (ctx) drawLevel(ctx, level, g, g.shake, cosmetic, settings.uiTheme);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [screen, settings, levelIndex, cosmetic, keybinds]);

  function mobileAction(action) {
    if (action === "dash") useAbility(performance.now());
    else if (action === "echo") spawnEcho();
    else if (action === "pause" && game.current?.status === "playing") setScreen("paused");
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
  return { canvas, game, spawnEcho, mobileAction, setMobileMove, setMobileAim, setMobileShooting };
}

export { useGame };
