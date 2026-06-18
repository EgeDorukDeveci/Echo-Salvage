import { rooms, EXPEDITION_UPGRADES, EXPEDITION_UPGRADE_BY_ID, SALVAGE_MODS, SALVAGE_MOD_BY_ID, STATION_NODE_BY_ID } from "../../game/config.js";
import { getStarsForRoom } from "../../services/profile-store.js";
import { getCommunityLevel, listCommunityLevels, toggleCommunityLike } from "../../services/server-api.js";
import { Button } from "../ui.jsx";
import { BookOpen, ChevronLeft, ChevronRight, DoorOpen, Gamepad2, Globe2, Heart, Play, Radio, RotateCcw, Search, Settings, Wrench, X } from "lucide-react";
import { useEffect, useState } from "react";

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
  const isTrial = Boolean(summary.isTrial);
  const stationNode = STATION_NODE_BY_ID.get(summary.stationNode);
  const atFinalRoom = isCustomRun || summary.levelIndex >= rooms.length - 1;
  return (
    <div className="overlay">
      <section className="panel modal expedition-summary">
        <span className="badge">Run Summary</span>
        <h1 className="title" style={{ fontSize: 58 }}>{summary.result}</h1>
        <p className="lead">{summary.room} | {Math.round(summary.time)}s | Scrap recovered: {Math.round(summary.scrap)} | Hull {Math.round(summary.hull ?? 0)}%{isStationExpedition ? ` | Energy ${Math.round(summary.energy ?? 0)} | Corruption ${Math.round(summary.corruption ?? 0)}%` : ""}</p>
        {!isStationExpedition && !isTrial && <div className="summary-stars">{"★".repeat(earnedStars)}{"☆".repeat(3 - earnedStars)}</div>}
        {isTrial && summary.result === "Extracted" && <div className="campaign-summary-guide"><strong>Pilot calibration complete</strong><span>You used a terminal, cleared a threat, moved cargo, deployed your recorded past, and extracted. The campaign now combines those ideas.</span></div>}
        {!isCustomRun && !isStationExpedition && summary.result === "Extracted" && <div className="campaign-summary-guide"><strong>{earnedStars} stars secured</strong><span>Stars unlock later campaign rooms. Faster clears, stronger remaining hull, and completed objectives improve the result.</span></div>}
        {!isCustomRun && !isStationExpedition && summary.contract && (
          <div className="summary-contract" data-complete={summary.contractCompleted}>
            <span>Optional salvage contract</span>
            <strong>{summary.contract.label}</strong>
            <p>{summary.contractProgress}</p>
            <small>{summary.contractFirstClear ? `Completed · +${summary.contractReward} coins secured` : summary.contractAlreadyClaimed ? "Completed · reward previously claimed" : summary.contractCompleted ? "Completed" : "Contract incomplete"}</small>
          </div>
        )}
        {summary.secretRecovered && summary.secret && <div className="summary-secret" data-milestone={Boolean(summary.secretRecovery?.milestone)}>
          <span>{summary.secretRecovery?.milestone ? "Archive milestone restored" : "Station secret recovered"}</span>
          <strong>{summary.secretRecovery?.milestone?.title || summary.secret.title}</strong>
          <p>{summary.secret.text}</p>
          <small>
            {summary.secretRecovery?.milestone
              ? `${summary.secretRecovery.milestone.protocol}${summary.secretRecovery.milestone.unlock ? ` · ${summary.secretRecovery.milestone.unlock.label} unlocked` : ""}`
              : "Recorder fragment restored · Archive Relic milestone advanced"}
          </small>
        </div>}
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
          <Button primary onClick={next}><DoorOpen /> {isStationExpedition ? "Station Map" : isTrial && summary.result === "Extracted" ? "Begin Campaign" : isCustomRun ? "Return To Menu" : atFinalRoom ? "Return To Menu" : "Next Room"}</Button>
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

function CommunityLevels({ returnToMenu, playLevel }) {
  const [levels, setLevels] = useState([]);
  const [status, setStatus] = useState("Loading community relay...");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("new");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [playingId, setPlayingId] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let alive = true;
    setStatus("Loading community relay...");
    const timer = setTimeout(() => listCommunityLevels({ page, limit: 10, query, sort })
      .then((result) => {
        if (!alive) return;
        setLevels(result.levels || []);
        setPagination(result.pagination || { page: 1, pages: 1, total: result.levels?.length || 0 });
        setStatus(result.levels?.length ? "" : "No community levels match this search.");
      })
      .catch(() => {
        if (!alive) return;
        setStatus("Community server is offline. Start it with npm run server.");
      }), 180);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [page, query, sort]);

  const openLevel = async (entry) => {
    try {
      setPlayingId(entry.id);
      setNotice("");
      const result = await getCommunityLevel(entry.id);
      playLevel?.(result.level?.level);
    } catch (error) {
      setNotice(error.message || "This community map could not be loaded.");
      setPlayingId("");
    }
  };

  const toggleLike = async (entry) => {
    try {
      setNotice("");
      const result = await toggleCommunityLike(entry.id);
      setLevels((current) => current.map((level) => level.id === entry.id ? { ...level, liked: result.liked, likes: result.likes } : level));
    } catch (error) {
      setNotice(error.message || "Sign in to like community maps.");
    }
  };

  return (
    <div className="overlay">
      <section className="panel community-panel">
        <div className="drawer-head">
          <div>
            <span className="badge">Community Relay</span>
            <h2>Community Levels</h2>
            <p className="small-copy">Validated player-made rooms stored by the Echo Salvage community server.</p>
          </div>
          <div className="community-actions">
            <Button onClick={returnToMenu}>Menu</Button>
          </div>
        </div>
        <div className="community-toolbar">
          <label><Search size={16} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search maps or authors" /></label>
          <div>
            {[["new", "Newest"], ["popular", "Most Played"], ["liked", "Most Liked"]].map(([id, label]) => (
              <button key={id} data-active={sort === id} onClick={() => { setSort(id); setPage(1); }}>{label}</button>
            ))}
          </div>
          <span>{pagination.total} published maps</span>
        </div>
        <p className="community-notice" data-visible={Boolean(notice)} role="status">{notice || "Community relay ready."}</p>
        <div className="community-list">
          {status && <div className="community-empty construction-empty">
            <Globe2 size={38} />
            <h3>{status}</h3>
            <p>The editor can still make/import level codes locally while the server is offline.</p>
          </div>}
          {levels.map((entry) => (
            <article className="community-card" key={entry.id}>
              <div>
                <span>{entry.author || "Anonymous"} · {entry.plays} plays</span>
                <strong>{entry.title}</strong>
                <p>{entry.description || "No description provided."}</p>
                <div className="community-map-stats">
                  <small>{entry.stats?.hostiles || 0} hostiles</small>
                  <small>{entry.stats?.puzzles || 0} puzzle pieces</small>
                  <small>{entry.stats?.hazards || 0} hazards</small>
                  {entry.stats?.hasBoss && <small>Boss room</small>}
                </div>
                <small>{new Date(entry.createdAt).toLocaleString()}</small>
              </div>
              <div className="community-card-actions">
                <button className="community-like" data-liked={entry.liked} onClick={() => toggleLike(entry)} aria-label={entry.liked ? "Unlike map" : "Like map"}><Heart size={17} fill={entry.liked ? "currentColor" : "none"} /><span>{entry.likes}</span></button>
                <Button primary onClick={() => openLevel(entry)} disabled={playingId === entry.id}><Play size={18} /> {playingId === entry.id ? "Loading" : "Play"}</Button>
              </div>
            </article>
          ))}
        </div>
        {pagination.pages > 1 && <div className="community-pagination">
          <button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={16} /> Previous</button>
          <span>Page {pagination.page} of {pagination.pages}</span>
          <button disabled={page >= pagination.pages} onClick={() => setPage((value) => Math.min(pagination.pages, value + 1))}>Next <ChevronRight size={16} /></button>
        </div>}
      </section>
    </div>
  );
}

export { createInitialSummaryState, PauseMenu, Summary, SalvageWorkshop, CommunityLevels };
