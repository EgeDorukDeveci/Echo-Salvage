import { rooms, EXPEDITION_UPGRADES, EXPEDITION_UPGRADE_BY_ID, SALVAGE_MODS, SALVAGE_MOD_BY_ID, STATION_NODE_BY_ID } from "../../game/config.js";
import { getStarsForRoom } from "../../services/profile-store.js";
import { Button } from "../ui.jsx";
import { BookOpen, DoorOpen, Gamepad2, Globe2, Play, Radio, RotateCcw, Settings, Wrench, X } from "lucide-react";

function createInitialSummaryState() {
  return { result: "Extracted", scrap: 0, hull: 100, time: 0, room: rooms[0], levelIndex: 0, isCustom: false };
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

function Summary({ summary, next, returnToMenu }) {
  const earnedStars = getStarsForRoom(summary);
  const isCustomRun = Boolean(summary.isCustom);
  const isStationExpedition = Boolean(summary.stationExpedition);
  const stationNode = STATION_NODE_BY_ID.get(summary.stationNode);
  const atFinalRoom = isCustomRun || summary.levelIndex >= rooms.length - 1;
  return (
    <div className="overlay">
      <section className="panel modal expedition-summary">
        <span className="badge">Run Summary</span>
        <h1 className="title" style={{ fontSize: 58 }}>{summary.result}</h1>
        <p className="lead">{summary.room} | {Math.round(summary.time)}s | Scrap recovered: {Math.round(summary.scrap)} | Hull {Math.round(summary.hull ?? 0)}%{isStationExpedition ? ` | Energy ${Math.round(summary.energy ?? 0)} | Corruption ${Math.round(summary.corruption ?? 0)}%` : ""}</p>
        {!isStationExpedition && <div className="summary-stars">{"★".repeat(earnedStars)}{"☆".repeat(3 - earnedStars)}</div>}
        {!isCustomRun && !isStationExpedition && summary.result === "Extracted" && <div className="campaign-summary-guide"><strong>{earnedStars} stars secured</strong><span>Stars unlock later campaign rooms. Faster clears, stronger remaining hull, and completed objectives improve the result.</span></div>}
        {!isCustomRun && !isStationExpedition && summary.contract && (
          <div className="summary-contract" data-complete={summary.contractCompleted}>
            <span>Optional salvage contract</span>
            <strong>{summary.contract.label}</strong>
            <p>{summary.contractProgress}</p>
            <small>{summary.contractFirstClear ? `Completed · +${summary.contractReward} coins secured` : summary.contractAlreadyClaimed ? "Completed · reward previously claimed" : summary.contractCompleted ? "Completed" : "Contract incomplete"}</small>
          </div>
        )}
        {summary.secretRecovered && summary.secret && <div className="summary-secret"><span>Station secret recovered</span><strong>{summary.secret.title}</strong><p>{summary.secret.text}</p><small>Recorder Archive updated</small></div>}
        {isStationExpedition && (
          <div className="station-debrief">
            <div className="station-debrief-result" data-success={summary.result === "Extracted"}>
              <span>{summary.result === "Extracted" ? "Sector secured" : "Emergency recovery"}</span>
              <strong>{stationNode?.label || summary.room}</strong>
              <small>{summary.result === "Extracted" ? summary.stationFirstClear ? stationNode?.rewardLabel : "Previously secured sector revisited" : "The docking spine recovered your drone. Alert and corruption increased."}</small>
            </div>
            <div className="station-debrief-telemetry">
              <div><span>Hull remaining</span><strong>{Math.round(summary.hull ?? 0)}%</strong></div>
              <div><span>Energy remaining</span><strong>{Math.round(summary.energy ?? 0)}</strong></div>
              <div><span>Signal corruption</span><strong>{Math.round(summary.corruption ?? 0)}%</strong></div>
              <div><span>Scrap recovered</span><strong>{Math.round(summary.scrap ?? 0)}</strong></div>
            </div>
            <p>{summary.result === "Extracted" ? "Return to the schematic to choose a connected route. The workshop is the only place to install recovered modifications." : "The expedition continues, but the failed approach has made the station more dangerous."}</p>
          </div>
        )}
        <div className="button-grid">
          <Button primary onClick={next}><DoorOpen /> {isStationExpedition ? "Station Map" : isCustomRun ? "Return To Menu" : atFinalRoom ? "Return To Menu" : "Next Room"}</Button>
          <Button onClick={returnToMenu}><BookOpen /> Main Menu</Button>
        </div>
      </section>
    </div>
  );
}

function SalvageWorkshop({ expedition, craftMod, installUpgrade, setScreen, returnScreen = "menu" }) {
  return (
    <div className="overlay">
      <section className="panel dedicated-workshop">
        <div className="drawer-head">
          <div>
            <span className="badge">Salvage Engineering</span>
            <h2>Salvage Workshop</h2>
            <p className="small-copy">{expedition.active ? "Spend recovered parts on run-only systems. Everything installed here lasts until this expedition ends." : "Workshop systems are installed during Station Expeditions using parts recovered in that run."}</p>
          </div>
          <Button onClick={() => setScreen(returnScreen)}><X /></Button>
        </div>
        <div className="workshop-balance"><Wrench size={24} /><span>Available Parts</span><strong>{expedition.salvage}</strong></div>
        <div className="workshop-system-explainer">
          <div><Radio size={18} /><strong>Recorder upgrades</strong><span>Change what your Echoes can do.</span></div>
          <div><Wrench size={18} /><strong>Hardware modifications</strong><span>Improve the physical drone and weapon systems.</span></div>
        </div>
        <div className="workshop-section-head"><span>Flight recorder upgrades</span><small>Run-only Echo strategy</small></div>
        <div className="workshop-blueprints workshop-recorder-blueprints">
          {EXPEDITION_UPGRADES.map((upgrade, index) => (
            <button key={upgrade.id} style={{ "--upgrade-color": upgrade.color }} data-owned={expedition.upgrades.includes(upgrade.id)} disabled={!expedition.active || expedition.upgrades.includes(upgrade.id) || expedition.salvage < upgrade.cost} onClick={() => installUpgrade(upgrade)}>
              <span>Recorder 0{index + 1} · {upgrade.icon}</span>
              <strong>{upgrade.label}</strong>
              <p>{upgrade.detail}</p>
              <small>{expedition.upgrades.includes(upgrade.id) ? "Installed" : `${upgrade.cost} parts required`}</small>
            </button>
          ))}
        </div>
        <div className="workshop-section-head"><span>Drone hardware</span><small>Run-only physical systems</small></div>
        <div className="workshop-blueprints">
          {SALVAGE_MODS.map((mod, index) => (
            <button key={mod.id} data-owned={expedition.mods.includes(mod.id)} disabled={!expedition.active || expedition.mods.includes(mod.id) || expedition.salvage < mod.cost} onClick={() => craftMod(mod)}>
              <span>Hardware 0{index + 1}</span>
              <strong>{mod.label}</strong>
              <p>{mod.detail}</p>
              <small>{expedition.mods.includes(mod.id) ? "Installed" : `${mod.cost} parts required`}</small>
            </button>
          ))}
        </div>
        <div className="installed-mods">
          <span>Installed for this expedition</span>
          <strong>{[...expedition.upgrades.map((id) => EXPEDITION_UPGRADE_BY_ID.get(id)?.label), ...expedition.mods.map((id) => SALVAGE_MOD_BY_ID.get(id)?.label)].filter(Boolean).join(" · ") || "No run systems installed"}</strong>
        </div>
      </section>
    </div>
  );
}

function CommunityLevels({ returnToMenu }) {
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

export { createInitialSummaryState, PauseMenu, Summary, SalvageWorkshop, CommunityLevels };
