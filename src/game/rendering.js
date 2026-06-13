import { W, H, CELL, COSMETIC_DEFAULTS, PET_BY_ID, STATION_EVENT_BY_ID } from "./config.js";
import { clamp } from "./geometry.js";
import { getBossPhase, getBossPalette } from "./combat.js";
import { lerp } from "./rules.js";

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

const SECTION_VISUALS = {
  "training-deck": { id: "training-deck", void: "#020b12", floor: ["#09262d", "#07171d", "#102328"], grid: "rgba(0,240,210,.12)", edge: "#66d7d2", wall: "#19353b" },
  "breach-deck": { id: "breach-deck", void: "#100704", floor: ["#33170d", "#17100d", "#3a1d0b"], grid: "rgba(255,170,86,.16)", edge: "#ff9d3c", wall: "#4a2715" },
  "reactor-deck": { id: "reactor-deck", void: "#041008", floor: ["#102b19", "#09170f", "#173522"], grid: "rgba(112,245,152,.14)", edge: "#79e49a", wall: "#183c27" },
  "singularity-deck": { id: "singularity-deck", void: "#05040f", floor: ["#17152b", "#090b18", "#231637"], grid: "rgba(167,188,255,.13)", edge: "#a7b8ff", wall: "#252a4d" }
};

function getSectionVisual(game, uiTheme) {
  const id = game?.campaignSection?.id || {
    station: "training-deck",
    hazard: "breach-deck",
    reactor: "reactor-deck",
    midnight: "singularity-deck"
  }[uiTheme] || "training-deck";
  return SECTION_VISUALS[id] || SECTION_VISUALS["training-deck"];
}

function drawSpaceBackdrop(ctx, visual, now) {
  ctx.fillStyle = visual.void;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 95; i += 1) {
    const x = (i * 137 + 31) % W;
    const y = (i * 83 + 17) % H;
    const pulse = 0.45 + Math.sin(now / 900 + i) * 0.25;
    ctx.fillStyle = `rgba(205,232,242,${Math.max(0.12, pulse)})`;
    ctx.fillRect(x, y, i % 11 === 0 ? 2 : 1, i % 11 === 0 ? 2 : 1);
  }
  ctx.strokeStyle = "rgba(135, 184, 202, 0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(1120, 95, 118, 0, Math.PI * 2);
  ctx.arc(1120, 95, 151, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = visual.id === "breach-deck" ? "rgba(255, 100, 30, 0.12)" : visual.id === "reactor-deck" ? "rgba(70, 220, 120, 0.1)" : "rgba(100, 150, 255, 0.09)";
  ctx.beginPath();
  ctx.arc(1120, 95, 66, 0, Math.PI * 2);
  ctx.fill();
}

function drawSectionDecor(ctx, visual, now) {
  ctx.save();
  if (visual.id === "training-deck") {
    ctx.strokeStyle = "rgba(0,240,210,.18)";
    ctx.setLineDash([7, 10]);
    [240, 640, 1040].forEach((x, i) => {
      ctx.beginPath();
      ctx.arc(x, 360, 70 + i * 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeRect(x - 24, 336, 48, 48);
    });
    ctx.setLineDash([]);
  } else if (visual.id === "breach-deck") {
    [[185, 150], [1045, 565], [965, 160]].forEach(([x, y], i) => {
      const pulse = 8 + Math.sin(now / 420 + i) * 4;
      ctx.fillStyle = "rgba(255,74,20,.14)";
      ctx.beginPath();
      ctx.arc(x, y, 36 + pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,160,54,.35)";
      ctx.beginPath();
      ctx.moveTo(x - 30, y + 20);
      ctx.lineTo(x - 10, y - 20);
      ctx.lineTo(x + 6, y + 5);
      ctx.lineTo(x + 24, y - 14);
      ctx.stroke();
    });
  } else if (visual.id === "reactor-deck") {
    [[150, 145], [1110, 160], [180, 570], [1080, 555], [640, 105]].forEach(([x, y], i) => {
      ctx.strokeStyle = "rgba(88,224,122,.3)";
      ctx.lineWidth = 2;
      for (let branch = 0; branch < 4; branch += 1) {
        const a = branch * 1.7 + i;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + Math.cos(a) * 25, y + Math.sin(a) * 35, x + Math.cos(a) * 52, y + Math.sin(a) * 52);
        ctx.stroke();
        ctx.fillStyle = "rgba(134,255,158,.22)";
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(a) * 42, y + Math.sin(a) * 42, 9, 4, a, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  } else {
    const pulse = 1 + Math.sin(now / 700) * 0.08;
    ctx.translate(1090, 125);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = "#010106";
    ctx.shadowColor = "#9c72ff";
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(0, 0, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(183,140,255,.5)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 0, 78, 24, -0.35, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSectionWall(ctx, wall, visual) {
  glowRect(ctx, wall.x, wall.y, wall.w, wall.h, visual.edge, visual.wall, 12, 2);
  ctx.save();
  if (visual.id === "training-deck") {
    ctx.strokeStyle = "rgba(190,255,250,.24)";
    ctx.strokeRect(wall.x + 7, wall.y + 7, Math.max(1, wall.w - 14), Math.max(1, wall.h - 14));
  } else if (visual.id === "breach-deck") {
    ctx.strokeStyle = "rgba(255,196,80,.44)";
    ctx.lineWidth = 4;
    for (let x = wall.x + 6; x < wall.x + wall.w - 4; x += 18) {
      ctx.beginPath();
      ctx.moveTo(x, wall.y + wall.h - 5);
      ctx.lineTo(x + 10, wall.y + 5);
      ctx.stroke();
    }
  } else if (visual.id === "reactor-deck") {
    ctx.strokeStyle = "rgba(100,255,145,.34)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(wall.x + 4, wall.y + 5);
    ctx.bezierCurveTo(wall.x + wall.w * .3, wall.y + wall.h, wall.x + wall.w * .65, wall.y - 8, wall.x + wall.w - 4, wall.y + wall.h - 5);
    ctx.stroke();
    ctx.fillStyle = "rgba(135,255,155,.24)";
    ctx.beginPath();
    ctx.arc(wall.x + wall.w * .7, wall.y + 7, 4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = "rgba(190,170,255,.32)";
    ctx.setLineDash([9, 7]);
    ctx.strokeRect(wall.x + 6, wall.y + 6, Math.max(1, wall.w - 12), Math.max(1, wall.h - 12));
    ctx.setLineDash([]);
  }
  ctx.restore();
}

function drawCorruptionGlitch(ctx, amount, now) {
  const strength = clamp(amount / 100, 0, 1);
  if (strength < 0.08) return;
  const tearCount = Math.floor(2 + strength * 8);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < tearCount; i += 1) {
    const seed = Math.sin(now * 0.009 + i * 41.73) * 43758.5453;
    const random = seed - Math.floor(seed);
    const y = Math.floor(random * H);
    const height = 2 + Math.floor(((i * 17) % 13) * strength);
    const offset = (i % 2 ? 1 : -1) * (3 + strength * 20) * Math.sin(now * 0.018 + i);
    ctx.globalAlpha = 0.04 + strength * 0.11;
    ctx.drawImage(ctx.canvas, 0, y, W, height, offset, y, W, height);
    ctx.fillStyle = i % 3 === 0 ? "#ff3dba" : i % 3 === 1 ? "#8a7dff" : "#00f0d2";
    ctx.globalAlpha = 0.025 + strength * 0.075;
    ctx.fillRect(0, y, W, Math.max(1, height * 0.35));
  }
  ctx.globalAlpha = 0.035 + strength * 0.07;
  ctx.fillStyle = "#ff3dba";
  for (let y = Math.floor((now * 0.08) % 7); y < H; y += 7) ctx.fillRect(0, y, W, 1);
  if (strength > 0.55) {
    const blockCount = Math.floor((strength - 0.45) * 15);
    for (let i = 0; i < blockCount; i += 1) {
      const x = Math.abs(Math.sin(now * 0.004 + i * 9.1)) * W;
      const y = Math.abs(Math.cos(now * 0.006 + i * 4.7)) * H;
      ctx.globalAlpha = 0.035 + strength * 0.08;
      ctx.fillStyle = i % 2 ? "#ff3dba" : "#8d73ff";
      ctx.fillRect(x, y, 18 + (i % 4) * 17, 2 + (i % 3) * 3);
    }
  }
  ctx.restore();
}

function drawLevel(ctx, level, game, shake = 0, cosmetic = COSMETIC_DEFAULTS, uiTheme = "station") {
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  if (shake) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  const now = performance.now();
  const visual = getSectionVisual(game, uiTheme);
  drawSpaceBackdrop(ctx, visual, now);
  if (game.expedition?.event === "blackout" || game.expedition?.mutation === "blackout") {
    ctx.fillStyle = "rgba(0,0,8,.42)";
    ctx.fillRect(0, 0, W, H);
  }
  const globalTheme = {
    station: { grid: "rgba(0,240,210,.09)", wallEdge: "rgba(131, 176, 185, 0.72)", wallFill: "rgba(24, 42, 47, 0.9)", laser: "#ff4e41", laserGlow: "#ff4e41" },
    hazard: { grid: "rgba(255,170,86,.14)", wallEdge: "rgba(255, 184, 94, 0.82)", wallFill: "rgba(54, 32, 14, 0.9)", laser: "#ff6b34", laserGlow: "#ff8a00" },
    reactor: { grid: "rgba(112,245,152,.12)", wallEdge: "rgba(125, 232, 160, 0.8)", wallFill: "rgba(18, 45, 29, 0.9)", laser: "#7bffd3", laserGlow: "#58e07a" },
    midnight: { grid: "rgba(167,188,255,.11)", wallEdge: "rgba(156, 176, 255, 0.8)", wallFill: "rgba(28, 34, 56, 0.92)", laser: "#9aa8ff", laserGlow: "#8aa0ff" }
  }[uiTheme] || { grid: "rgba(0,240,210,.09)", wallEdge: "rgba(131, 176, 185, 0.72)", wallFill: "rgba(24, 42, 47, 0.9)", laser: "#ff4e41", laserGlow: "#ff4e41" };
  const floor = ctx.createLinearGradient(0, 0, W, 0);
  floor.addColorStop(0, visual.floor[0]);
  floor.addColorStop(0.46, visual.floor[1]);
  floor.addColorStop(1, visual.floor[2]);
  ctx.fillStyle = floor;
  ctx.fillRect(70, 50, W - 140, H - 100);
  ctx.strokeStyle = visual.grid;
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
  drawSectionDecor(ctx, visual, now);
  if (game.expedition?.event && game.expedition.event !== "quiet") {
    const event = STATION_EVENT_BY_ID.get(game.expedition.event);
    drawLabel(ctx, `STATION EVENT · ${event?.label || game.expedition.event}`, 72, H - 52, event?.color || "#ffd52d");
  }

  level.echoCorruptionZones?.forEach((zone) => {
    const pulse = 0.5 + Math.sin(now * 0.006 + zone.x) * 0.5;
    ctx.save();
    const field = ctx.createRadialGradient(zone.x, zone.y, 12, zone.x, zone.y, zone.r);
    field.addColorStop(0, `rgba(255,78,150,${0.1 + pulse * 0.06})`);
    field.addColorStop(0.7, "rgba(183,140,255,.08)");
    field.addColorStop(1, "rgba(183,140,255,0)");
    ctx.fillStyle = field;
    ctx.beginPath();
    ctx.arc(zone.x, zone.y, zone.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,110,199,${0.35 + pulse * 0.3})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 9]);
    ctx.beginPath();
    ctx.arc(zone.x, zone.y, zone.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.2 + pulse * 0.2;
    ctx.strokeStyle = "#00f0d2";
    ctx.lineWidth = 1;
    for (let slice = -2; slice <= 2; slice += 1) {
      const sliceY = zone.y + slice * zone.r * 0.24;
      const halfWidth = Math.sqrt(Math.max(0, zone.r ** 2 - (sliceY - zone.y) ** 2));
      const offset = Math.sin(now * 0.012 + slice * 2.4) * (5 + pulse * 8);
      ctx.beginPath();
      ctx.moveTo(zone.x - halfWidth + offset, sliceY);
      ctx.lineTo(zone.x + halfWidth + offset, sliceY);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    drawLabel(ctx, "ECHO CORRUPTION", zone.x - 58, zone.y - zone.r - 13, "#ff6ec7");
    ctx.restore();
  });

  level.walls.forEach((w) => {
    drawSectionWall(ctx, w, visual);
  });
  level.movingWalls?.forEach((wall) => {
    drawSectionWall(ctx, wall, { ...visual, edge: "#ffd52d", wall: "rgba(62,48,16,.94)" });
    const axis = wall.axis === "y" ? "VERTICAL SHIFT" : "HORIZONTAL SHIFT";
    drawLabel(ctx, axis, wall.x, wall.y - 10, "#ffd52d");
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

  if (game.secret && !game.secret.recovered) {
    const gap = Math.hypot(game.player.x - game.secret.x, game.player.y - game.secret.y);
    if (gap < 230) {
      const strength = clamp(1 - gap / 230, 0.08, 1);
      const pulse = 1 + Math.sin(now * 0.01) * 0.12;
      ctx.save();
      ctx.globalAlpha = 0.18 + strength * 0.72;
      ctx.translate(game.secret.x, game.secret.y);
      ctx.scale(pulse, pulse);
      ctx.rotate(Math.PI / 4);
      ctx.shadowColor = "#b59cff";
      ctx.shadowBlur = 10 + strength * 22;
      ctx.fillStyle = "rgba(45, 31, 78, 0.78)";
      ctx.strokeStyle = "#b59cff";
      ctx.lineWidth = 2;
      ctx.fillRect(-12, -12, 24, 24);
      ctx.strokeRect(-12, -12, 24, 24);
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = "#efeaff";
      ctx.font = "900 13px Rajdhani, Bahnschrift, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("?", 0, 5);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = strength * 0.38;
      ctx.strokeStyle = "#b59cff";
      ctx.setLineDash([3, 7]);
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.arc(game.secret.x, game.secret.y, 30 + i * 13 + Math.sin(now * 0.006 + i) * 4, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      if (gap < 72) drawLabel(ctx, "ENCRYPTED RECORD · PRESS E", game.secret.x - 86, game.secret.y - 34, "#b59cff");
    }
  }

  const active = game.activeIds;
  level.plates.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = active.has(p.id) ? "rgba(88,224,122,.35)" : `${visual.edge}22`;
    ctx.strokeStyle = active.has(p.id) ? "#58e07a" : visual.edge;
    ctx.shadowColor = active.has(p.id) ? "#58e07a" : visual.edge;
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
    if (visual.id === "singularity-deck") drawBlackHoleHostile(ctx, h);
    else drawSpecialHostile(ctx, h, "GRAVITY NODE", "#8aa0ff", "diamond");
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
    if (visual.id === "breach-deck") drawMagmaVentHostile(ctx, h);
    else drawSpecialHostile(ctx, h, "LASER SWEEPER", "#ff4e41", "circle");
  });
  level.blinkHunters?.forEach((h) => {
    if (h.hp <= 0) return;
    if (visual.id === "reactor-deck") drawDeathPlantHostile(ctx, h);
    else drawSpecialHostile(ctx, h, "BLINK HUNTER", "#ff6ec7", "diamond");
  });
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

  if (level.boss?.hp > 0) {
    drawBoss(ctx, level.boss);
  }

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
    const turretLabel = visual.id === "training-deck" ? "SENTRY SIM" : visual.id === "reactor-deck" ? "THORN TURRET" : visual.id === "singularity-deck" ? "VOID TURRET" : "FORGE TURRET";
    const turretColor = visual.id === "reactor-deck" ? "#9dff8f" : visual.id === "singularity-deck" ? "#b78cff" : visual.id === "training-deck" ? "#00f0d2" : "#ff6b34";
    drawLabel(ctx, t.seesPlayer ? `${turretLabel} LOCK` : turretLabel, t.x - 34, t.y - 38, t.seesPlayer ? "#ff4e41" : turretColor);
    drawHealthBar(ctx, t.x, t.y - 50, t.hp, t.maxHp || 3, turretColor);
    ctx.fillStyle = visual.wall;
    ctx.strokeStyle = t.seesPlayer ? "#ff4e41" : turretColor;
    ctx.shadowColor = t.seesPlayer ? "#ff4e41" : turretColor;
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
    const coreColor = visual.id === "reactor-deck" ? "#9dff8f" : visual.id === "singularity-deck" ? "#c2a0ff" : visual.id === "breach-deck" ? "#ff8a22" : "#ffd52d";
    ctx.fillStyle = `${coreColor}28`;
    ctx.strokeStyle = coreColor;
    ctx.shadowColor = coreColor;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(level.core.x, level.core.y, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = coreColor;
    ctx.fillText(visual.id === "singularity-deck" ? "CROWN" : visual.id === "reactor-deck" ? "SEED" : "CORE", level.core.x - 17, level.core.y + 5);
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
  drawGrapple(ctx, game.grapple, game.player);
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
    if (e.corrupted) {
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.sin(now * 0.025 + e.id) * 0.18;
      ctx.translate((Math.random() - 0.5) * 5, 0);
    }
    drawDrone(ctx, e, true, cosmetic);
    drawLabel(ctx, e.corrupted ? `ECHO ${e.slot + 1} CORRUPTED` : `ECHO ${e.slot + 1}`, e.x - 26, e.y + 38, e.corrupted ? "#ff6ec7" : e.echoColor || "#00f0d2");
    if (e.corrupted) ctx.restore();
  });
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
    const bulletColor = b.color || (b.owner === "enemy" ? "#ff4e41" : "#ffd52d");
    const radius = b.radius || 4;
    ctx.save();
    ctx.fillStyle = bulletColor;
    ctx.strokeStyle = bulletColor;
    ctx.shadowColor = bulletColor;
    ctx.shadowBlur = b.bossKind ? 13 : 0;
    ctx.beginPath();
    if (b.projectile === "thorn") {
      const angle = Math.atan2(b.vy, b.vx);
      ctx.translate(b.x, b.y);
      ctx.rotate(angle);
      ctx.moveTo(radius * 2.2, 0);
      ctx.lineTo(-radius, -radius * 0.75);
      ctx.lineTo(-radius * 0.45, 0);
      ctx.lineTo(-radius, radius * 0.75);
      ctx.closePath();
    } else {
      ctx.arc(b.x, b.y, radius, 0, Math.PI * 2);
    }
    ctx.fill();
    if (b.projectile === "magma") {
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.x, b.y, radius + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
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
  if ((game.player?.corruption || 0) > 0) {
    const corruption = game.player.corruption;
    const chroma = clamp(corruption / 100, 0, 1) * 8;
    ctx.save();
    ctx.globalAlpha = 0.08 + corruption / 900;
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = "#ff3dba";
    ctx.beginPath();
    ctx.arc(game.player.x - chroma, game.player.y, 19, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#00f0d2";
    ctx.beginPath();
    ctx.arc(game.player.x + chroma, game.player.y, 19, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawCorruptionGlitch(ctx, corruption, now);
  }
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
    burst.type === "teleport" ? "#b78cff" :
      burst.type === "blastDash" ? "#ff8a00" :
        burst.type === "cloak" ? "#8aa0ff" :
          burst.type === "grapple" ? "#ffd52d" :
            "#00f0d2";
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawGrapple(ctx, grapple, player) {
  if (!grapple) return;
  const launchProgress = clamp(grapple.age / grapple.launchMs, 0, 1);
  const hookX = lerp(grapple.startX, grapple.targetX, launchProgress);
  const hookY = lerp(grapple.startY, grapple.targetY, launchProgress);
  const cableEndX = grapple.age < grapple.launchMs ? hookX : grapple.targetX;
  const cableEndY = grapple.age < grapple.launchMs ? hookY : grapple.targetY;
  const angle = Math.atan2(grapple.targetY - grapple.startY, grapple.targetX - grapple.startX);
  const fade = clamp(grapple.life / 180, 0, 1);
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.strokeStyle = "#ffd52d";
  ctx.shadowColor = "#ffd52d";
  ctx.shadowBlur = 14;
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 5]);
  ctx.lineDashOffset = -grapple.age * 0.08;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(cableEndX, cableEndY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = "#fff1a3";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(cableEndX, cableEndY);
  ctx.stroke();
  ctx.translate(cableEndX, cableEndY);
  ctx.rotate(angle);
  ctx.fillStyle = "#ffd52d";
  ctx.strokeStyle = "#fff1a3";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(-4, -7);
  ctx.lineTo(-1, 0);
  ctx.lineTo(-4, 7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (grapple.age >= grapple.launchMs) {
    ctx.globalAlpha = 0.35 * fade;
    ctx.beginPath();
    ctx.arc(0, 0, 15 + Math.sin(grapple.age * 0.025) * 4, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHostileDrone(ctx, d) {
  ctx.save();
  ctx.translate(d.x, d.y);
  ctx.rotate(d.angle || 0);
  const color = d.miniColor || (d.pursuer ? "#ff6ec7" : "#ff4e41");
  ctx.shadowColor = color;
  ctx.shadowBlur = d.pursuer ? 28 : 16;
  ctx.fillStyle = d.pursuer ? "rgba(42, 10, 38, 0.96)" : "rgba(58, 23, 24, 0.92)";
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (d.miniKind === "reclaimer") {
    ctx.moveTo(30, 0);
    ctx.lineTo(12, -21);
    ctx.lineTo(-12, -25);
    ctx.lineTo(-29, -11);
    ctx.lineTo(-20, 0);
    ctx.lineTo(-29, 11);
    ctx.lineTo(-12, 25);
    ctx.lineTo(12, 21);
    ctx.closePath();
  } else if (d.miniKind === "lancer") {
    ctx.moveTo(39, 0);
    ctx.lineTo(4, -13);
    ctx.lineTo(-28, -8);
    ctx.lineTo(-12, 0);
    ctx.lineTo(-28, 8);
    ctx.lineTo(4, 13);
    ctx.closePath();
  } else if (d.miniKind === "bastion") {
    for (let i = 0; i < 8; i += 1) {
      const angle = Math.PI / 8 + i * Math.PI / 4;
      const x = Math.cos(angle) * 27;
      const y = Math.sin(angle) * 27;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  } else if (d.miniKind === "spore") {
    for (let i = 0; i < 10; i += 1) {
      const angle = i * Math.PI / 5;
      const radius = i % 2 ? 21 : 33;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  } else if (d.miniKind === "archivist") {
    ctx.moveTo(0, -32);
    ctx.lineTo(26, -14);
    ctx.lineTo(34, 0);
    ctx.lineTo(26, 14);
    ctx.lineTo(0, 32);
    ctx.lineTo(-26, 14);
    ctx.lineTo(-34, 0);
    ctx.lineTo(-26, -14);
    ctx.closePath();
  } else {
    ctx.moveTo(18, 0);
    ctx.lineTo(2, -16);
    ctx.lineTo(-19, -10);
    ctx.lineTo(-12, 0);
    ctx.lineTo(-19, 10);
    ctx.lineTo(2, 16);
    ctx.closePath();
  }
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffd52d";
  if (d.miniKind === "bastion" || d.miniKind === "spore" || d.miniKind === "archivist") {
    ctx.beginPath();
    ctx.arc(0, 0, d.miniKind === "bastion" ? 10 : 8, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillRect(0, -4, 10, 8);
  }
  if (d.pursuer) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    if (d.miniKind === "ram") {
      ctx.beginPath();
      ctx.moveTo(24, 0);
      ctx.lineTo(42, -13);
      ctx.lineTo(35, 0);
      ctx.lineTo(42, 13);
      ctx.closePath();
      ctx.stroke();
    } else if (d.miniKind === "thorn") {
      for (let i = 0; i < 6; i += 1) {
        const a = i * Math.PI / 3;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 18, Math.sin(a) * 18);
        ctx.lineTo(Math.cos(a) * 36, Math.sin(a) * 36);
        ctx.stroke();
      }
    } else if (d.miniKind === "reclaimer") {
      for (const y of [-17, 17]) {
        ctx.strokeRect(-15, y - 4, 24, 8);
        ctx.beginPath();
        ctx.moveTo(-20, y);
        ctx.lineTo(-37, y * 1.25);
        ctx.stroke();
      }
    } else if (d.miniKind === "lancer") {
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(48, 0);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, -18);
      ctx.lineTo(15, -10);
      ctx.moveTo(-10, 18);
      ctx.lineTo(15, 10);
      ctx.stroke();
    } else if (d.miniKind === "bastion") {
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, 38, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (d.miniKind === "spore") {
      for (let i = 0; i < 5; i += 1) {
        const a = i * Math.PI * 2 / 5 + (d.pulse || 0) * 0.001;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 42, Math.sin(a) * 42, 5, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (d.miniKind === "archivist") {
      ctx.setLineDash([8, 5]);
      ctx.beginPath();
      ctx.ellipse(0, 0, 46, 20, Math.PI / 4, 0, Math.PI * 2);
      ctx.ellipse(0, 0, 46, 20, -Math.PI / 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.beginPath();
      ctx.arc(-5, 0, d.miniKind === "harrier" ? 35 : 29, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
  drawLabel(ctx, d.pursuer ? d.miniName || "ROAMING PURSUER" : "HUNTER DRONE", d.x - (d.pursuer ? 54 : 38), d.y - 34, d.pursuer ? color : "#ff7c72");
  if (d.pursuer) drawHealthBar(ctx, d.x, d.y - 48, d.hp, d.maxHp || d.baseHp || d.hp, color);
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

function drawDeathPlantHostile(ctx, h) {
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.rotate((h.angle || 0) + Math.PI / 2);
  ctx.shadowColor = "#76ff87";
  ctx.shadowBlur = 18;
  for (let i = 0; i < 6; i += 1) {
    ctx.rotate(Math.PI / 3);
    ctx.fillStyle = i % 2 ? "#2d7a43" : "#4dac55";
    ctx.strokeStyle = "#9dff8f";
    ctx.beginPath();
    ctx.ellipse(0, -15, 8, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = "#291317";
  ctx.strokeStyle = "#ff7080";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffe8a3";
  for (let i = 0; i < 5; i += 1) {
    const a = i * Math.PI * 2 / 5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 7, Math.sin(a) * 7);
    ctx.lineTo(Math.cos(a + .18) * 13, Math.sin(a + .18) * 13);
    ctx.lineTo(Math.cos(a - .18) * 13, Math.sin(a - .18) * 13);
    ctx.fill();
  }
  ctx.restore();
  drawLabel(ctx, "DEATH PLANT", h.x - 42, h.y - 42, "#9dff8f");
  drawHealthBar(ctx, h.x, h.y - 54, h.hp, h.maxHp || 3, "#58e07a");
}

function drawBlackHoleHostile(ctx, h) {
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.rotate((h.pulse || 0) * 0.001);
  ctx.shadowColor = "#b78cff";
  ctx.shadowBlur = 28;
  ctx.strokeStyle = "#c2a0ff";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(0, 0, 30, 11, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(115,145,255,.65)";
  ctx.beginPath();
  ctx.ellipse(0, 0, 41, 16, Math.PI / 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#010106";
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawLabel(ctx, "BLACK HOLE", h.x - 40, h.y - 42, "#c2a0ff");
  drawHealthBar(ctx, h.x, h.y - 54, h.hp, h.maxHp || 4, "#b78cff");
}

function drawMagmaVentHostile(ctx, h) {
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.shadowColor = "#ff4e20";
  ctx.shadowBlur = 22;
  ctx.fillStyle = "#24100b";
  ctx.strokeStyle = "#ff8a22";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-22, 18);
  ctx.lineTo(-14, -10);
  ctx.lineTo(-5, -20);
  ctx.lineTo(5, -12);
  ctx.lineTo(14, -24);
  ctx.lineTo(24, 18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffcf45";
  ctx.beginPath();
  ctx.arc(0, 4, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawLabel(ctx, "MAGMA VENT", h.x - 42, h.y - 42, "#ff9d3c");
  drawHealthBar(ctx, h.x, h.y - 54, h.hp, h.maxHp || 4, "#ff6b34");
}

function drawBoss(ctx, boss) {
  const phase = getBossPhase(boss);
  const spin = (boss.pulse || 0) * (phase === 3 ? 0.0021 : 0.00125);
  const palette = getBossPalette(boss.kind);
  const { color, core } = palette;
  const hit = (boss.hitFlash || 0) > 0;
  ctx.save();
  ctx.translate(boss.x, boss.y);
  ctx.shadowColor = color;
  ctx.shadowBlur = hit ? 42 : 24 + phase * 4;
  if ((boss.execution || 0) > 0) {
    const executionProgress = 1 - boss.execution / (boss.executionMax || 1450);
    ctx.globalAlpha = 1 - executionProgress * 0.55;
    ctx.rotate(Math.sin(boss.pulse * 0.02) * executionProgress * 0.18);
    ctx.scale(1 + executionProgress * 0.22, 1 - executionProgress * 0.14);
  }

  if (boss.kind === "warden") {
    ctx.rotate(spin);
    for (let i = 0; i < 4; i += 1) {
      ctx.save();
      ctx.rotate(i * Math.PI / 2);
      ctx.fillStyle = i % 2 ? "#143f45" : "#1c5960";
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(18, -14);
      ctx.lineTo(67, -9);
      ctx.lineTo(78, 0);
      ctx.lineTo(67, 9);
      ctx.lineTo(18, 14);
      ctx.lineTo(30, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = core;
      ctx.fillRect(50, -3, 17, 6);
      ctx.restore();
    }
    ctx.rotate(-spin * 1.8);
    ctx.strokeStyle = "#a8fff5";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#071c21";
    ctx.beginPath();
    ctx.arc(0, 0, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = core;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-15, 0);
    ctx.lineTo(15, 0);
    ctx.moveTo(0, -15);
    ctx.lineTo(0, 15);
    ctx.stroke();
  } else if (boss.kind === "furnace") {
    ctx.rotate(Math.sin(spin) * 0.035);
    ctx.fillStyle = "#25130e";
    ctx.strokeStyle = "#ffbd42";
    ctx.lineWidth = 4;
    ctx.fillRect(-58, -45, 116, 90);
    ctx.strokeRect(-58, -45, 116, 90);
    for (const side of [-1, 1]) {
      ctx.fillStyle = "#4a2314";
      ctx.strokeStyle = color;
      ctx.fillRect(side * 58 - (side < 0 ? 20 : 0), -31, 20, 62);
      ctx.strokeRect(side * 58 - (side < 0 ? 20 : 0), -31, 20, 62);
      for (let i = -1; i <= 1; i += 1) {
        ctx.strokeStyle = "#ffcf5e";
        ctx.beginPath();
        ctx.moveTo(side * 62, i * 16 - 5);
        ctx.lineTo(side * 77, i * 16);
        ctx.stroke();
      }
    }
    ctx.fillStyle = "#080605";
    ctx.strokeStyle = "#ffdf73";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 29, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, 14 + Math.sin(spin * 8) * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#6c3219";
    ctx.lineWidth = 6;
    for (let i = 0; i < 4; i += 1) {
      const a = i * Math.PI / 2 + spin;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 31, Math.sin(a) * 31);
      ctx.lineTo(Math.cos(a) * 48, Math.sin(a) * 48);
      ctx.stroke();
    }
  } else if (boss.kind === "overseer") {
    const bite = 0.12 + (Math.sin(spin * 8) + 1) * 0.08 + ((boss.charge || boss.meleeWindup) > 0 ? 0.14 : 0);
    ctx.strokeStyle = "#2d9b4e";
    ctx.lineCap = "round";
    for (let i = 0; i < 5; i += 1) {
      const a = -1.9 + i * 0.95 + Math.sin(spin * 3 + i) * 0.12;
      const length = i === 2 ? 62 : 82;
      ctx.lineWidth = i === 2 ? 14 : 8;
      ctx.beginPath();
      ctx.moveTo(0, 36);
      ctx.bezierCurveTo(Math.cos(a) * 24, 54, Math.cos(a) * length * 0.7, Math.sin(a) * length * 0.55, Math.cos(a) * length, Math.sin(a) * length);
      ctx.stroke();
      if (i !== 2) {
        const lx = Math.cos(a) * length * 0.7;
        const ly = Math.sin(a) * length * 0.7;
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(a + Math.PI / 2);
        ctx.fillStyle = i % 2 ? "#35a64b" : "#55c95f";
        ctx.strokeStyle = "#9dff76";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 9, 22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.fillStyle = "#1e6d36";
    ctx.strokeStyle = "#8cff72";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 30, 43, 33, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    for (let i = 0; i < 9; i += 1) {
      ctx.save();
      ctx.rotate(-1.15 + i * Math.PI * 2 / 9);
      ctx.translate(0, -43);
      ctx.fillStyle = i % 2 ? "#3eae4e" : "#64d360";
      ctx.strokeStyle = "#aaff79";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-8, 9);
      ctx.lineTo(0, -18);
      ctx.lineTo(9, 9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = "#51bd57";
    ctx.strokeStyle = "#b9ff7b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, -16, 45, Math.PI + bite, Math.PI * 2 - bite);
    ctx.quadraticCurveTo(54, -7, 42, 11);
    ctx.quadraticCurveTo(0, 29, -42, 11);
    ctx.quadraticCurveTo(-54, -7, -45, -16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#e86285";
    ctx.beginPath();
    ctx.ellipse(0, 7, 35, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f8ef9b";
    for (let i = -3; i <= 3; i += 1) {
      const tx = i * 9;
      ctx.beginPath();
      ctx.moveTo(tx - 4, -2);
      ctx.lineTo(tx, 11 + (Math.abs(i) % 2) * 5);
      ctx.lineTo(tx + 4, -2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "#071d0d";
    ctx.beginPath();
    ctx.arc(-18, -25, 6, 0, Math.PI * 2);
    ctx.arc(18, -25, 6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.rotate(spin);
    for (let ring = 0; ring < 3; ring += 1) {
      ctx.save();
      ctx.rotate(ring * Math.PI / 3 + spin * (ring % 2 ? -1 : 1));
      ctx.strokeStyle = ring === 1 ? "#ff6ec7" : "#a88cff";
      ctx.lineWidth = 5 - ring;
      ctx.setLineDash([26 - ring * 4, 10 + ring * 5]);
      ctx.beginPath();
      ctx.ellipse(0, 0, 72 - ring * 13, 28 + ring * 8, ring * 0.7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.setLineDash([]);
    ctx.fillStyle = "#010105";
    ctx.strokeStyle = "#f1c6ff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 27, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    for (let i = 0; i < 6; i += 1) {
      const a = spin * -2 + i * Math.PI / 3;
      ctx.fillStyle = i % 2 ? "#ff6ec7" : "#b78cff";
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 52, Math.sin(a) * 52);
      ctx.lineTo(Math.cos(a + 0.13) * 67, Math.sin(a + 0.13) * 67);
      ctx.lineTo(Math.cos(a - 0.13) * 67, Math.sin(a - 0.13) * 67);
      ctx.closePath();
      ctx.fill();
    }
  }

  if (phase > 1) {
    ctx.strokeStyle = palette.projectile;
    ctx.globalAlpha = 0.35 + Math.sin(spin * 12) * 0.12;
    ctx.lineWidth = phase === 3 ? 4 : 2;
    ctx.setLineDash(phase === 3 ? [7, 7] : [16, 10]);
    ctx.beginPath();
    ctx.arc(0, 0, 87 + Math.sin(spin * 9) * 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if ((boss.charge || 0) > 0) {
    ctx.globalAlpha = 1;
    const chargeRatio = 1 - clamp(boss.charge / (boss.chargeMax || 850), 0, 1);
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = palette.projectile;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 102, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * chargeRatio);
    ctx.stroke();
  }
  if ((boss.meleeWindup || 0) > 0) {
    const windupRatio = 1 - clamp(boss.meleeWindup / (boss.meleeWindupMax || 720), 0, 1);
    const angle = boss.meleeAngle || 0;
    ctx.globalAlpha = 0.35 + windupRatio * 0.45;
    ctx.strokeStyle = palette.projectile;
    ctx.fillStyle = "rgba(88,224,122,.12)";
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 165, angle - 0.72, angle + 0.72);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    for (const offset of [-0.55, 0, 0.55]) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(Math.cos(angle + offset * 0.45) * 80, Math.sin(angle + offset * 0.45) * 80, Math.cos(angle + offset) * 155 * windupRatio, Math.sin(angle + offset) * 155 * windupRatio);
      ctx.stroke();
    }
  }
  if ((boss.execution || 0) > 0) {
    const progress = 1 - boss.execution / (boss.executionMax || 1450);
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i += 1) {
      const a = i * Math.PI / 4 + boss.pulse * 0.006;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 28, Math.sin(a) * 28);
      ctx.lineTo(Math.cos(a) * (55 + progress * 90), Math.sin(a) * (55 + progress * 90));
      ctx.stroke();
    }
  }
  ctx.restore();
  drawLabel(ctx, `${boss.name.toUpperCase()} · PHASE ${phase}`, boss.x - 68, boss.y - 96, color);
  drawHealthBar(ctx, boss.x, boss.y - 110, boss.hp, boss.maxHp || boss.baseHp || boss.hp, color);
}

function drawDrone(ctx, p, echo, cosmetic = COSMETIC_DEFAULTS) {
  const echoColor = p.echoColor || "#00f0d2";
  const skin = echo ? { ...COSMETIC_DEFAULTS, body: p.echoFill || "rgba(0,240,210,.28)", accent: echoColor, trail: echoColor, frame: cosmetic.frame } : { ...COSMETIC_DEFAULTS, ...cosmetic };
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle || 0);
  if (p.fused) ctx.scale(1.28, 1.28);
  ctx.globalAlpha = echo ? 0.48 : p.cloakUntil > performance.now() ? 0.22 : 1;
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
  ctx.shadowBlur = p.fused ? 32 : echo ? 16 : p.dashTrail ? 22 : 12;
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
  const pet = PET_BY_ID.get(cosmetic.pet);
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

export {
  drawLevel,
  drawDashBurst,
  drawAbilityBurst,
  drawDrone,
  drawPet
};
