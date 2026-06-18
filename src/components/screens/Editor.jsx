import { W, H, CELL, defaultSettings, COSMETIC_DEFAULTS, SECTION_MINIBOSSES, EXPEDITION_MINIBOSSES, createMiniboss } from "../../game/config.js";
import { makeLevel } from "../../game/levels.js";
import { rectsTouch, clamp, SPECIAL_HOSTILE_KEYS, ensureLevelArrays, finalizeCustomLevel } from "../../game/geometry.js";
import { drawLevel } from "../../game/rendering.js";
import { encodeLevelCode, decodeLevelCode } from "../../services/profile-store.js";
import { publishCommunityLevel } from "../../services/server-api.js";
import { Button } from "../ui.jsx";
import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";

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
  const editorKeys = ["walls", "movingWalls", "echoCorruptionZones", "crates", "coinCrates", "plates", "switches", "turrets", "drones", "missileSentries", ...SPECIAL_HOSTILE_KEYS, "scrap"];
  const tools = [
    { id: "wall", label: "Wall", hint: "Solid station structure" },
    { id: "movingWall", label: "Shift Wall", hint: "Moves vertically on a predictable rail" },
    { id: "echoCorruption", label: "Echo Corruption", hint: "Disables Echo actions and plate weight inside its field" },
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
    { id: "miniMirror", label: "Mirror Marshal", hint: "Training miniboss with precision spread volleys" },
    { id: "miniRam", label: "Forge Ram", hint: "Breach miniboss with aggressive melee charges" },
    { id: "miniThorn", label: "Thorn Stalker", hint: "Reactor miniboss with radial thorn attacks" },
    { id: "miniHarrier", label: "Null Harrier", hint: "Corruption miniboss with readable blink volleys" },
    { id: "miniReclaimer", label: "Cargo Reclaimer", hint: "Wide scrap-fan expedition miniboss" },
    { id: "miniLancer", label: "Arc Lancer", hint: "Fast precision expedition miniboss" },
    { id: "miniBastion", label: "Bastion Auditor", hint: "Slow armored radial-fire miniboss" },
    { id: "miniSpore", label: "Spore Matriarch", hint: "Living miniboss that launches seeking spores" },
    { id: "miniArchivist", label: "Null Archivist", hint: "Rotating signal-wave expedition miniboss" },
    { id: "bossWarden", label: "Calibration Warden", hint: "Training section boss" },
    { id: "bossFurnace", label: "Breach Furnace", hint: "Breach section boss" },
    { id: "bossMaw", label: "Verdant Maw", hint: "Reactor melee section boss" },
    { id: "bossCrown", label: "Null Crown", hint: "Corruption section boss" },
    { id: "scrap", label: "Scrap", hint: "Restores energy" },
    { id: "exit", label: "Exit Gate", hint: "Extraction target" },
  ];
  const activeTool = tools.find((item) => item.id === tool) || tools[0];
  const selectedObject = selected?.key === "exit" ? level.exit : selected?.key === "boss" ? level.boss : selected ? level[selected.key]?.[selected.index] : null;

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
    if (source.boss && rectsTouch(cursor, getObjectRect(source.boss, "boss"))) return { key: "boss", index: 0 };
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
    const next = ensureLevelArrays(structuredClone(level));
    if (toolId === "wall") next.walls.push({ x, y, w: CELL, h: CELL });
    if (toolId === "movingWall") next.movingWalls.push({ x, y, w: CELL * 3, h: CELL, axis: "y", range: CELL * 2, speed: 0.0007, phase: 0 });
    if (toolId === "echoCorruption") next.echoCorruptionZones.push({ x: x + 20, y: y + 20, r: 100 });
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
    const miniToolMap = {
      miniMirror: SECTION_MINIBOSSES["training-deck"],
      miniRam: SECTION_MINIBOSSES["breach-deck"],
      miniThorn: SECTION_MINIBOSSES["reactor-deck"],
      miniHarrier: SECTION_MINIBOSSES["singularity-deck"],
      miniReclaimer: EXPEDITION_MINIBOSSES.reclaimer,
      miniLancer: EXPEDITION_MINIBOSSES.lancer,
      miniBastion: EXPEDITION_MINIBOSSES.bastion,
      miniSpore: EXPEDITION_MINIBOSSES.spore,
      miniArchivist: EXPEDITION_MINIBOSSES.archivist
    };
    if (miniToolMap[toolId]) {
      const spec = miniToolMap[toolId];
      next.drones.push(createMiniboss(spec, x + 20, y + 20));
    }
    const bossToolMap = {
      bossWarden: { name: "Calibration Warden", kind: "warden", hp: 16, cooldown: 900 },
      bossFurnace: { name: "Breach Furnace", kind: "furnace", hp: 25, cooldown: 760 },
      bossMaw: { name: "Verdant Maw", kind: "overseer", hp: 37, cooldown: 680, meleeCooldown: 900 },
      bossCrown: { name: "Null Crown", kind: "crown", hp: 52, cooldown: 560 }
    };
    if (bossToolMap[toolId]) {
      next.boss = { ...bossToolMap[toolId], x: x + 20, y: y + 20, pulse: 0 };
      next.objective = { type: "boss" };
    }
    if (toolId === "scrap") next.scrap.push({ x: x + 20, y: y + 20, taken: false });
    if (toolId === "exit") next.exit = { x, y, w: 58, h: 114 };
    setLevel(next);
  };

  const removeSelection = (target = selected) => {
    if (!target) return;
    if (target.key === "exit") return;
    if (target.key === "boss") {
      setLevel((current) => ({ ...structuredClone(current), boss: null, objective: { type: "secure" } }));
      setSelected(null);
      return;
    }
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
      const obj = selected.key === "exit" ? next.exit : selected.key === "boss" ? next.boss : next[selected.key]?.[selected.index];
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

  const exportCode = () => {
    setCode(encodeLevelCode(level));
    setPublishStatus("Level code generated.");
  };

  const importCode = () => {
    try {
      setLevel(finalizeCustomLevel(decodeLevelCode(code)));
      setSelected(null);
      setPublishStatus("Level code imported.");
    } catch {
      setPublishStatus("Invalid level code.");
    }
  };

  const publish = async () => {
    const cleanName = publishName.trim();
    if (cleanName.length < 3) {
      setPublishStatus("Give the map a title first.");
      return;
    }
    try {
      setPublishStatus("Publishing to community server...");
      const publishedLevel = { ...finalizeCustomLevel(structuredClone(level)), name: cleanName };
      const levelCode = encodeLevelCode(publishedLevel);
      const result = await publishCommunityLevel({
        title: cleanName,
        description: publishNote.trim(),
        author: user?.nickname || "Anonymous",
        level: publishedLevel,
        code: levelCode
      });
      setCode(result.level?.code || levelCode);
      setPublishStatus("Published to the community server.");
    } catch (error) {
      setPublishStatus(error.message || "Community server is offline.");
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
          <Button primary onClick={() => { setCustomLevel(finalizeCustomLevel(structuredClone(level))); setScreen("playing"); }}><Play /> Test</Button>
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
          <summary><span className="badge">Community</span> Codes and Publish</summary>
          <div className="publish-grid">
            <p className="small-copy">Publish sends this room to the local Echo Salvage server. Level codes still work for manual sharing.</p>
            <label>Map Title</label>
            <input value={publishName} onChange={(e) => setPublishName(e.target.value)} />
            <label>Description</label>
            <textarea rows="3" value={publishNote} onChange={(e) => setPublishNote(e.target.value)} placeholder="What makes this room interesting?" />
            <Button primary onClick={publish}>Publish Community Map</Button>
            <label>Level Code</label>
            <textarea rows="4" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Local level codes appear here." />
            {publishStatus && <p className="small-copy">{publishStatus}</p>}
          </div>
        </details>
      </aside>
    </div>
  );
}

export { Editor };
