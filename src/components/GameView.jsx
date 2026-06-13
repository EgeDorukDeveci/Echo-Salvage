import { W, H, MAX_ECHOES, MAX_ENERGY, rooms, STATION_MUTATION_BY_ID } from "../game/config.js";
import { clamp } from "../game/geometry.js";
import { getRoomMechanicHint, getObjectiveText } from "../game/rules.js";
import { useGame } from "../hooks/useGame.js";
import { keyName } from "../services/profile-store.js";
import { useEffect, useState } from "react";
import { Crosshair, Gauge, Radio, Shield, Sparkles, Zap } from "lucide-react";

function GameView({ levelIndex, customLevel, screen, setScreen, settings, setSummary, onRunComplete, cosmetic, awardCoins, keybinds, expedition }) {
  const { canvas, game, spawnEcho, mobileAction, setMobileMove, setMobileAim, setMobileShooting } = useGame({ levelIndex, customLevel, screen, setScreen, settings, setSummary, onRunComplete, cosmetic, awardCoins, keybinds, expedition });
  const [, refreshHud] = useState(0);
  const [controlMode, setControlMode] = useState(() => localStorage.getItem("echo-salvage-control-mode") || "pc");
  const [leftStick, setLeftStick] = useState({ x: 0, y: 0 });
  const [rightStick, setRightStick] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const id = setInterval(() => refreshHud((value) => value + 1), 120);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    localStorage.setItem("echo-salvage-control-mode", controlMode);
  }, [controlMode]);
  const g = game.current;
  const isMobile = controlMode === "mobile";
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
    <div
      className={`game-shell ${isMobile ? "mobile-layout" : ""} ${(g?.player.corruption ?? 0) >= 45 ? "corruption-active" : ""} ${(g?.player.corruption ?? 0) >= 80 ? "corruption-critical" : ""}`}
      style={{ "--corruption-strength": `${Math.min(1, (g?.player.corruption ?? 0) / 100)}` }}
    >
      <canvas ref={canvas} className="game-canvas" width={W} height={H} />
      <div className="hud">
        <div className="hud-cluster vitals-card">
          <div className="hud-title">
            <span>{g?.level.name ?? "Training Bay"}</span>
            <strong>{g?.expedition?.active ? "Expedition Sector" : `Deck ${levelIndex + 1}/${rooms.length}`}</strong>
          </div>
          {g?.expedition?.mutation && <div className="expedition-hud-line"><span>{g.expedition.active ? `Power ${g.expedition.power} · Alert ${g.expedition.alert}` : "Mutation"}</span><strong>{STATION_MUTATION_BY_ID.get(g.expedition.mutation)?.label}</strong></div>}
          <Meter label="Hull" value={g?.player.hp ?? 100} color="#ffd52d" />
          <Meter label="Energy" value={g?.player.energy ?? MAX_ENERGY} max={g?.player.maxEnergy ?? MAX_ENERGY} color="#ffd52d" />
          {(g?.player.maxShield ?? 0) > 0 && <Meter label="Shield" value={g?.player.shield ?? 0} max={g?.player.maxShield ?? 1} color="#00f0d2" />}
          {((g?.level.echoCorruptionZones?.length ?? 0) > 0 || g?.expedition?.active) && <Meter label="Corruption" value={g?.player.corruption ?? 0} color="#ff6ec7" />}
        </div>
        <div className="hud-card objective-card">
          <strong>Objective</strong>
          <span>{getObjectiveText(g?.level)}</span>
          <small>{getRoomMechanicHint(g?.level)}</small>
        </div>
        <div className="hud-cluster stat-grid">
          <div className="stat-tile"><Shield size={16} /><span>Scrap</span><strong>{g?.player.scrap ?? 0}</strong></div>
          <div className="stat-tile"><Sparkles size={16} /><span>Coins</span><strong>{g?.player.coinsEarned ?? 0}</strong></div>
          <button className="stat-tile" onClick={spawnEcho}><Radio size={16} /><span>Echo</span><strong>{g?.echoes.length ?? 0}/{MAX_ECHOES}</strong></button>
          <div className="stat-tile"><Crosshair size={16} /><span>Ammo</span><strong>{g?.player.isReloading ? "..." : `${g?.player.ammo ?? 0}/${g?.player.ammoMax ?? 0}`}</strong></div>
          <div className="stat-tile"><Gauge size={16} /><span>Weapon</span><strong>{getWeaponById(g?.player.weaponId).label.split(" ")[0]}</strong></div>
          <div className="stat-tile"><Zap size={16} /><span>{getAbilityById(g?.player.abilityId).label}</span><strong>{Math.max(0, Math.ceil(((g?.player.abilityReadyAt ?? 0) - performance.now()) / 1000)) || "READY"}</strong></div>
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
            <button className="mobile-action mobile-action-dash" onClick={() => mobileAction("dash")}>{getAbilityById(g?.player.abilityId).label}</button>
            <button className="mobile-action mobile-action-echo" onClick={() => mobileAction("echo")}>Echo</button>
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

export { GameView };
