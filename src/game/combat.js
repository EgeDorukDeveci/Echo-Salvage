import { clamp } from "./geometry.js";

function getBossPhase(boss) {
  const ratio = clamp((boss?.hp || 0) / (boss?.maxHp || boss?.baseHp || boss?.hp || 1), 0, 1);
  return ratio > 0.66 ? 1 : ratio > 0.33 ? 2 : 3;
}

function getBossPalette(kind) {
  if (kind === "warden") return { color: "#00f0d2", core: "#efffff", dark: "#071c21", projectile: "#7ffff0" };
  if (kind === "furnace") return { color: "#ff8a00", core: "#fff0a4", dark: "#25130e", projectile: "#ffb52e" };
  if (kind === "overseer") return { color: "#58e07a", core: "#f3ff91", dark: "#102915", projectile: "#9dff67" };
  return { color: "#b78cff", core: "#ff6ec7", dark: "#010105", projectile: "#cf9cff" };
}

function damageBoss(boss, amount) {
  if (!boss || boss.hp <= 0) return 0;
  if (boss.execution > 0) return 0;
  const phase = getBossPhase(boss);
  const armor = phase === 1 ? 0.42 : phase === 2 ? 0.68 : 1;
  const dealt = amount * armor;
  boss.hp = Math.max(0.001, boss.hp - dealt);
  boss.hitFlash = 160;
  if (boss.hp <= 0.001) {
    boss.execution = 1450;
    boss.executionMax = 1450;
  }
  return dealt;
}

function spawnBossProjectile(game, boss, angle, speed, damage, extras = {}) {
  const palette = getBossPalette(boss.kind);
  game.bullets.push({
    x: boss.x,
    y: boss.y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: extras.life || 2600,
    owner: "enemy",
    damage,
    color: palette.projectile,
    bossKind: boss.kind,
    radius: extras.radius || 5,
    projectile: extras.projectile || "orb",
    homing: extras.homing || 0,
    turnRate: extras.turnRate || 0.035
  });
}

function spawnEnemyProjectile(game, source, angle, speed, damage, extras = {}) {
  game.bullets.push({
    x: source.x,
    y: source.y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: extras.life ?? 1800,
    owner: "enemy",
    damage,
    color: extras.color ?? source.miniColor,
    projectile: extras.projectile,
    radius: extras.radius ?? 5,
    homing: extras.homing ?? 0,
    turnRate: extras.turnRate ?? 0.035
  });
}

function spawnEnemySpread(game, source, baseAngle, offsets, speed, damage, extras) {
  offsets.forEach((offset) => spawnEnemyProjectile(game, source, baseAngle + offset, speed, damage, extras));
}

function spawnEnemyRadial(game, source, count, rotation, speed, damage, extras) {
  for (let shot = 0; shot < count; shot += 1) {
    spawnEnemyProjectile(game, source, shot * Math.PI * 2 / count + rotation, speed, damage, extras);
  }
}

export {
  getBossPhase,
  getBossPalette,
  damageBoss,
  spawnBossProjectile,
  spawnEnemyProjectile,
  spawnEnemySpread,
  spawnEnemyRadial
};
