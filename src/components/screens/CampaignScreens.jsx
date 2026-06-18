import { rooms, CAMPAIGN_SECTIONS, getCampaignRoutePoints, getCampaignRoutePath, SALVAGE_MOD_BY_ID, STATION_EXPEDITION_NODES, CAMPAIGN_SECTION_BY_ID, STATION_MUTATION_BY_ID, STATION_EVENT_BY_ID, STATION_NODE_BY_ID } from "../../game/config.js";
import { makeLevel } from "../../game/levels.js";
import { clamp, countLevelHostiles } from "../../game/geometry.js";
import { getRoomContract } from "../../game/contracts.js";
import { STATION_SECRETS, SECRET_MILESTONES, getNextSecretMilestone } from "../../game/secrets.js";
import { getStationNode, getStationMutationForNode, getStationEventForNode, getCampaignSection, getRoomMechanicHint, getObjectiveText } from "../../game/rules.js";
import { getNextCampaignRoomIndex, isRoomUnlocked, getCurrentSectionIndex, normalizeProgress, getTotalStars } from "../../services/profile-store.js";
import { AvatarBadge, Button } from "../ui.jsx";
import { useMemo, useState } from "react";
import { BookOpen, Boxes, Crosshair, DoorOpen, Gamepad2, Globe2, Lock, LogOut, Play, Radio, Settings, Shield, Sparkles, UserRound, Wand2, Wrench, X, Zap } from "lucide-react";

function StationMap({ expedition, enterNode, abandon }) {
  const [selectedId, setSelectedId] = useState(expedition.currentNode);
  const current = getStationNode(expedition.currentNode);
  const selected = STATION_NODE_BY_ID.get(selectedId) || current;
  const maxEnergy = 120 + (expedition.mods.includes("capacitorMesh") ? 20 : 0) + expedition.power * 8;
  const cleared = new Set(expedition.cleared || []);
  const securedSectors = Math.max(0, cleared.size - 1);
  const bossReady = securedSectors >= 4;
  const stationConquered = cleared.has("core");
  const isAdjacent = current.links.includes(selected.id);
  const canEnter = selected.id !== current.id && isAdjacent && (selected.type !== "boss" || bossReady);
  const selectedMutation = selected.id === current.id ? STATION_MUTATION_BY_ID.get(expedition.mutation) : getStationMutationForNode(selected);
  const selectedEvent = selected.id === current.id ? STATION_EVENT_BY_ID.get(expedition.event) : getStationEventForNode(selected, expedition.alert);
  const routeState = selected.id === current.id
    ? "Current position"
    : selected.type === "boss" && !bossReady
      ? "Finale locked"
      : isAdjacent
        ? "Route available"
        : "No direct conduit";
  const typeLabel = {
    start: "Insertion",
    salvage: "Salvage",
    power: "Power",
    workshop: "Workshop",
    security: "Security",
    reactor: "Reactor",
    corruption: "Null Zone",
    boss: "Finale"
  };
  const nodeIcon = (node) => {
    if (node.type === "boss") return !bossReady ? <Lock size={18} /> : <Crosshair size={18} />;
    if (node.type === "workshop") return <Wrench size={18} />;
    if (node.type === "power") return <Zap size={18} />;
    if (node.type === "security") return <Shield size={18} />;
    if (node.type === "salvage") return <Boxes size={18} />;
    if (node.type === "reactor") return <Sparkles size={18} />;
    if (node.type === "corruption") return <Radio size={18} />;
    return <DoorOpen size={18} />;
  };
  const systemReadouts = [
    { id: "hull", label: "Hull integrity", value: expedition.hull, max: 100, display: `${Math.round(expedition.hull)}%`, detail: expedition.hull < 35 ? "Critical" : expedition.hull < 70 ? "Damaged" : "Nominal" },
    { id: "energy", label: "Reserve energy", value: expedition.energy, max: maxEnergy, display: `${Math.round(expedition.energy)}/${maxEnergy}`, detail: expedition.energy < 35 ? "Route carefully" : "Systems online" },
    { id: "corruption", label: "Signal corruption", value: expedition.corruption, max: 100, display: `${Math.round(expedition.corruption)}%`, detail: expedition.corruption > 65 ? "Signal unstable" : "Contained" },
    { id: "alert", label: "Station alert", value: expedition.alert, max: 5, display: `${expedition.alert}/5`, detail: expedition.alert > 3 ? "Hostiles overclocked" : "Tracking limited" }
  ];
  return (
    <div className="overlay station-expedition-overlay">
      <section className="panel station-expedition-map">
        <header className="station-map-header">
          <div className="station-title-lockup">
            <span className="station-kicker">{stationConquered ? "Expedition Complete" : "Live Station Schematic"} · KHEPRI-7</span>
            <h1>Derelict Khepri</h1>
            <p>{stationConquered ? "Command Singularity defeated. Remaining sectors are open for recovery." : "Pick one connected sector. Everything you spend or suffer follows you deeper."}</p>
          </div>
          <div className="station-run-progress">
            <span>Sector control</span>
            <strong>{securedSectors}<small>/6</small></strong>
            <div className="station-progress-track"><i style={{ width: `${clamp((securedSectors / 6) * 100, 0, 100)}%` }} /></div>
            <em>{bossReady ? "Final approach open" : `${Math.max(0, 4 - securedSectors)} more for finale`}</em>
          </div>
          <Button className="station-abandon" danger onClick={abandon}><X size={18} /> Abandon run</Button>
        </header>
        <div className="station-map-body">
          <aside className="station-systems">
            <div className="station-rail-head">
              <span>Drone telemetry</span>
              <strong>Persistent systems</strong>
            </div>
            {systemReadouts.map((system) => (
              <div className="station-system-readout" data-system={system.id} key={system.id}>
                <span>{system.label}</span>
                <strong>{system.display}</strong>
                <div><i style={{ width: `${clamp((system.value / system.max) * 100, 0, 100)}%` }} /></div>
                <small>{system.detail}</small>
              </div>
            ))}
            <div className="station-inventory">
              <span>Recovered resources</span>
              <div><Wrench size={15} /><strong>{expedition.salvage}</strong><small>parts</small></div>
              <div><Zap size={15} /><strong>{expedition.power}</strong><small>power relays</small></div>
            </div>
            <div className="station-installed">
              <span>Installed systems</span>
              <strong>{expedition.mods.length ? expedition.mods.map((id) => SALVAGE_MOD_BY_ID.get(id)?.label).join(" · ") : "No workshop modifications"}</strong>
            </div>
          </aside>
          <div className="station-route">
            <div className="station-field-label station-field-label-top"><span>Forward array</span><i /></div>
            <div className="station-field-label station-field-label-bottom"><span>Reactor keel</span><i /></div>
            <div className="station-hull-silhouette" aria-hidden="true">
              <i /><i /><i /><i />
            </div>
            <svg className="station-route-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {STATION_EXPEDITION_NODES.flatMap((node) => node.links
                .filter((link) => node.id < link)
                .map((link) => {
                  const target = STATION_NODE_BY_ID.get(link);
                  const active = node.id === current.id || target.id === current.id;
                  const complete = cleared.has(node.id) && cleared.has(target.id);
                  return <g key={`${node.id}-${link}`}><line className="station-route-shadow" x1={node.x} y1={node.y} x2={target.x} y2={target.y} /><line x1={node.x} y1={node.y} x2={target.x} y2={target.y} data-active={active} data-complete={complete} /></g>;
                }))}
            </svg>
            {STATION_EXPEDITION_NODES.map((node) => {
              const available = current.links.includes(node.id) && (node.type !== "boss" || bossReady);
              return (
                <button
                  key={node.id}
                  className="station-node"
                  data-type={node.type}
                  data-current={node.id === current.id}
                  data-selected={node.id === selected.id}
                  data-cleared={cleared.has(node.id)}
                  data-available={available}
                  aria-pressed={node.id === selected.id}
                  style={{ "--node-x": `${node.x}%`, "--node-y": `${node.y}%`, "--node-accent": node.accent }}
                  onClick={() => setSelectedId(node.id)}
                >
                  <span className="station-node-core">{nodeIcon(node)}<i /></span>
                  <span className="station-node-copy"><small>{node.deck} · {cleared.has(node.id) ? "Secured" : typeLabel[node.type]}</small><strong>{node.label}</strong></span>
                </button>
              );
            })}
            <div className="station-route-legend"><span><i data-kind="current" /> Current</span><span><i data-kind="open" /> Open route</span><span><i data-kind="secure" /> Secured</span></div>
          </div>
          <aside className="station-route-brief">
            <div className="station-brief-head">
              <span>{selected.deck} · {typeLabel[selected.type]}</span>
              <strong data-open={canEnter || selected.id === current.id}>{routeState}</strong>
            </div>
            <div className="station-brief-title" style={{ "--brief-accent": selected.accent }}>
              <span>{nodeIcon(selected)}</span>
              <h2>{selected.label}</h2>
            </div>
            <p>{selected.detail}</p>
            <div className="station-threat">
              <span>Threat estimate</span>
              <div>{[1, 2, 3, 4, 5].map((value) => <i key={value} data-live={value <= selected.threat} />)}</div>
              <strong>{selected.threat === 0 ? "Safe" : selected.threat <= 2 ? "Guarded" : selected.threat <= 4 ? "Severe" : "Command-class"}</strong>
            </div>
            {selected.encounter && <div className="station-reward"><span>Unique encounter</span><strong>{selected.encounter}</strong></div>}
            <div className="station-reward">
              <span>First-clear recovery</span>
              <strong>{cleared.has(selected.id) ? "Recovery claimed" : selected.rewardLabel}</strong>
            </div>
            {selected.type === "boss" && <div className="station-finale-lock"><strong>{securedSectors}/4 sectors secured</strong><small>{bossReady ? "Command Singularity route unlocked." : "Secure more station sectors before the final assault."}</small></div>}
            {selected.id === current.id ? (
              <Button disabled>Current Position</Button>
            ) : (
              <Button primary disabled={!canEnter} onClick={() => enterNode(selected)}>{selected.type === "workshop" ? <Wrench size={18} /> : <DoorOpen size={18} />} {selected.type === "workshop" ? "Enter Workshop" : cleared.has(selected.id) ? "Re-enter Sector" : "Commit To Route"}</Button>
            )}
            <div className="station-route-status">
              <strong>Predicted conditions</strong>
              <p><b>Mutation</b> changes a room rule. <b>Event</b> adds one temporary incident.</p>
              <span style={{ "--condition-color": selectedMutation.color }}><i /><em>Mutation · {selectedMutation.label}</em><small>{selectedMutation.detail}</small></span>
              <span style={{ "--condition-color": selectedEvent.color }}><i /><em>Event · {selectedEvent.label}</em><small>{selectedEvent.detail}</small></span>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function MainMenu({ startTrial, startRoom, startStationExpedition, setScreen, user, onLogout, openSettings, openControls }) {
  const safeProgress = normalizeProgress(user?.progress);
  const totalStars = getTotalStars(safeProgress);
  const isNewPilot = totalStars === 0;
  const currentSection = CAMPAIGN_SECTIONS[getCurrentSectionIndex(user)];
  const nextRoomIndex = getNextCampaignRoomIndex(safeProgress);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [selectedRoomIndex, setSelectedRoomIndex] = useState(nextRoomIndex);
  const selectedSection = CAMPAIGN_SECTION_BY_ID.get(selectedSectionId);
  const selectedRoomLevel = useMemo(() => makeLevel(selectedRoomIndex), [selectedRoomIndex]);
  const selectedRoomContract = useMemo(() => getRoomContract(selectedRoomLevel, selectedRoomIndex), [selectedRoomLevel, selectedRoomIndex]);
  const selectedRoomUnlocked = isRoomUnlocked(selectedRoomIndex, user);
  const selectedRoomStars = safeProgress[selectedRoomIndex] || 0;
  const selectedRoomSection = getCampaignSection(selectedRoomIndex);
  const selectSection = (section) => {
    const [start, end] = section.range;
    const nextInSection = clamp(nextRoomIndex, start, end);
    setSelectedRoomIndex(nextInSection);
    setSelectedSectionId(section.id);
  };
  return (
    <div className="overlay">
      <div className="menu-grid">
        <section className="panel command-panel">
          <div className="panel-header">
            <span className="badge">Orbital Salvage Run</span>
            <button className="profile-pill" onClick={() => setScreen("profile")}>
              <AvatarBadge avatar={user?.avatar} />
              <span>{user?.devMode ? "Dev" : "Pilot"} {user?.nickname}</span>
            </button>
          </div>
          <h1 className="title">Echo Salvage</h1>
          <p className="lead">Record eight seconds of movement and actions, then deploy an Echo that repeats them. Coordinate with your own past to open the station.</p>
          <div className="main-mode-launches">
            <button className="mode-launch mode-launch-campaign" onClick={isNewPilot ? startTrial : () => startRoom(nextRoomIndex)}>
              <span><Play size={19} /> {isNewPilot ? "Playable introduction" : "Guided campaign"}</span>
              <strong>{isNewPilot ? "Pilot Trial" : "Continue campaign"}</strong>
              <small>{isNewPilot ? "One short mission teaches movement, combat, cargo, Echoes, and extraction." : "Continue from your next unlocked station room."}</small>
            </button>
            <button className="mode-launch mode-launch-expedition" onClick={startStationExpedition}>
              <span><Radio size={19} /> Advanced run</span>
              <strong>Station Expedition</strong>
              <small>Branching routes, persistent damage, mutations, events, and run-only upgrades.</small>
            </button>
          </div>
          <div className="campaign-status" style={{ "--section-accent": currentSection.accent }}>
            <span>{currentSection.label}</span>
            <strong>{totalStars} stars banked</strong>
            <small>{currentSection.blurb}</small>
          </div>
          <div className="button-grid">
            <Button onClick={() => setScreen("editor")}><Wand2 size={20} /> Level Creator</Button>
            <Button onClick={() => setScreen("community")}><Globe2 size={20} /> Community Levels</Button>
            <Button onClick={() => setScreen("profile")}><UserRound size={20} /> Customization Bay</Button>
            <Button onClick={startTrial}><Play size={20} /> Replay Pilot Trial</Button>
            <Button onClick={() => setScreen("archive")}><BookOpen size={20} /> Recorder Archive</Button>
            <Button onClick={openSettings}><Settings size={20} /> Settings</Button>
            <Button onClick={openControls}><Gamepad2 size={20} /> Controls</Button>
            <Button danger onClick={onLogout}><LogOut size={20} /> Logout</Button>
          </div>
        </section>
        <section className="panel campaign-panel">
          <div className="campaign-map-head">
            <div>
              <span className="badge">{selectedSection ? selectedSection.shortLabel : "Station Atlas"}</span>
              <h2>{selectedSection ? selectedSection.label : "Orbital World Map"}</h2>
              <p>{selectedSection ? selectedSection.blurb : "Choose one of the station's four major destinations, then follow its salvage route room by room."}</p>
            </div>
            <div className="campaign-map-stats">
              <span><Sparkles size={15} /> {totalStars} stars</span>
              {selectedSection ? (
                <Button onClick={() => setSelectedSectionId(null)}>World Map</Button>
              ) : (
                <>
                  <strong>{nextRoomIndex + 1}<small> / {rooms.length}</small></strong>
                  <em>Next room</em>
                </>
              )}
            </div>
          </div>
          {!selectedSection ? (
            <div className="world-overview">
              <div className="world-route world-route-a" />
              <div className="world-route world-route-b" />
              {CAMPAIGN_SECTIONS.map((section) => {
                const [start, end] = section.range;
                const sectionRooms = rooms.slice(start, end + 1);
                const cleared = sectionRooms.filter((_, offset) => (safeProgress[start + offset] || 0) > 0).length;
                const active = currentSection.id === section.id;
                return (
                  <button
                    className="world-destination"
                    data-deck={section.id}
                    data-active={active}
                    key={section.id}
                    style={{ "--section-accent": section.accent }}
                    onClick={() => selectSection(section)}
                  >
                    <span className="world-destination-art" aria-hidden="true"><i /><i /><i /></span>
                    <span className="world-destination-copy">
                      <small>{section.sector}</small>
                      <strong>{section.label}</strong>
                      <em>{cleared}/{sectionRooms.length} rooms · {section.condition}</em>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="section-map-view">
              {CAMPAIGN_SECTIONS.filter((section) => section.id === selectedSection.id).map((section) => {
              const [start, end] = section.range;
              const sectionRooms = rooms.slice(start, end + 1);
              const cleared = sectionRooms.filter((_, offset) => (safeProgress[start + offset] || 0) > 0).length;
              const active = currentSection.id === section.id;
              return (
                <div className="section-route-layout" key={section.id}>
                <section className="deck-map" data-active={active} data-deck={section.id} style={{ "--section-accent": section.accent }}>
                  <div className="deck-map-head">
                    <div>
                      <small>{section.sector}</small>
                      <h3>{section.label}</h3>
                      <em>{section.condition} · {section.directive}</em>
                    </div>
                    <span>{cleared}/{sectionRooms.length}</span>
                  </div>
                  <div className="map-route">
                    <div className="deck-map-note deck-map-note-a" aria-hidden="true">
                      <small>Deck condition</small>
                      <strong>{section.condition}</strong>
                    </div>
                    <div className="deck-map-note deck-map-note-b" aria-hidden="true">
                      <small>Salvage directive</small>
                      <strong>{section.directive}</strong>
                    </div>
                    <div className="route-chapter route-chapter-a"><span>01</span><strong>Learn</strong></div>
                    <div className="route-chapter route-chapter-b"><span>02</span><strong>Combine</strong></div>
                    <div className="route-chapter route-chapter-c"><span>03</span><strong>Prove</strong></div>
                    <svg className="map-route-line" viewBox="0 0 100 82" preserveAspectRatio="none" aria-hidden="true">
                      <path d={getCampaignRoutePath(section.id, sectionRooms.length)} />
                    </svg>
                    {sectionRooms.map((r, offset) => {
                      const i = start + offset;
                      const unlocked = isRoomUnlocked(i, user);
                      const roomStars = safeProgress[i] || 0;
                      const [routeX, routeY] = getCampaignRoutePoints(section.id, sectionRooms.length)[offset];
                      const milestone = offset === 0 || offset === 4 || offset === 8 || offset === sectionRooms.length - 1;
                      return (
                        <button
                          className="map-node"
                          data-locked={!unlocked}
                          data-cleared={roomStars > 0}
                          data-current={i === nextRoomIndex}
                          data-selected={i === selectedRoomIndex}
                          data-milestone={milestone}
                          disabled={!unlocked}
                          key={r}
                          style={{ "--map-x": `${routeX}%`, "--map-y": `${routeY}%` }}
                          title={`${i + 1}. ${r}${unlocked ? ` | ${roomStars}/3 stars` : " | Locked"}`}
                          aria-label={`${i + 1}. ${r}${unlocked ? `, ${roomStars} stars` : ", locked"}`}
                          onClick={() => { if (!unlocked) return; setSelectedRoomIndex(i); }}
                        >
                          <span className="map-node-core">{i + 1}</span>
                          <span className="map-node-label">{r}</span>
                          <span className="map-node-stars">{unlocked ? `${"★".repeat(roomStars)}${"☆".repeat(3 - roomStars)}` : "LOCKED"}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
                <aside className="campaign-room-brief" style={{ "--section-accent": selectedRoomSection.accent }}>
                  <div className="room-brief-index">
                    <span>Room {selectedRoomIndex + 1}</span>
                    <strong>{selectedRoomStars}/3 stars</strong>
                  </div>
                  <h3>{rooms[selectedRoomIndex]}</h3>
                  <p>{getObjectiveText(selectedRoomLevel)}</p>
                  <div className="room-brief-lesson">
                    <span>Primary lesson</span>
                    <strong>{getRoomMechanicHint(selectedRoomLevel)}</strong>
                  </div>
                  <div className="room-contract" data-claimed={Boolean(user?.contracts?.[selectedRoomIndex])}>
                    <span>Optional salvage contract</span>
                    <strong>{selectedRoomContract.label}</strong>
                    <p>{selectedRoomContract.detail}</p>
                    <small>{user?.contracts?.[selectedRoomIndex] ? "Reward claimed" : `First clear reward · +${selectedRoomContract.reward} coins`}</small>
                  </div>
                  <div className="room-brief-stats">
                    <div><span>Chapter</span><strong>{selectedRoomIndex - section.range[0] < 4 ? "Learn" : selectedRoomIndex - section.range[0] < 8 ? "Combine" : "Prove"}</strong></div>
                    <div><span>Hostiles</span><strong>{countLevelHostiles(selectedRoomLevel)}</strong></div>
                    <div><span>Echo pressure</span><strong>{(selectedRoomLevel.plates || []).length + (selectedRoomLevel.switches || []).length}</strong></div>
                  </div>
                  <div className="room-brief-stars"><span>Room result</span><strong>{selectedRoomStars ? `${"★".repeat(selectedRoomStars)}${"☆".repeat(3 - selectedRoomStars)}` : "Uncleared"}</strong><small>Recover 2 scrap and finish above 55% hull for all three stars.</small></div>
                  <Button primary disabled={!selectedRoomUnlocked} onClick={() => startRoom(selectedRoomIndex)}><Play size={18} /> {selectedRoomIndex === nextRoomIndex ? "Continue Campaign" : selectedRoomStars ? "Replay Room" : "Enter Room"}</Button>
                </aside>
                </div>
              );
            })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function RecorderArchive({ user, setScreen }) {
  const recoveredSecrets = user?.secrets || {};
  const recoveredCount = STATION_SECRETS.filter((secret) => recoveredSecrets[secret.id]).length;
  const nextSecretMilestone = getNextSecretMilestone(recoveredCount);
  return (
    <div className="overlay manual-overlay">
      <section className="panel systems-manual">
        <header className="drawer-head">
          <div><span className="badge">Recorder Archive</span><h2>Recovered Station Secrets</h2><p className="small-copy">Fragments reveal Khepri's history and restore secret-only accessories with unique powers.</p></div>
          <Button onClick={() => setScreen("menu")} aria-label="Close recorder archive"><X /></Button>
        </header>
        <div className="secret-archive-head">
          <div><span className="badge">Station Secrets</span><h3>Archive Relics</h3><p>Restore all three fragments on a deck to recover a visible Archive Relic. Relics cannot be purchased.</p></div>
          <strong>{recoveredCount}/{STATION_SECRETS.length} recovered</strong>
        </div>
        <div className="secret-milestones">
          {SECRET_MILESTONES.map((milestone) => (
            <article key={milestone.count} data-complete={recoveredCount >= milestone.count}>
              <span>{milestone.count} fragments</span>
              <strong>{milestone.title}</strong>
              <small>{milestone.protocol}{milestone.unlock ? ` · ${milestone.unlock.label}` : ""}</small>
            </article>
          ))}
        </div>
        {nextSecretMilestone && <p className="secret-next-reward">{nextSecretMilestone.count - recoveredCount} more fragment{nextSecretMilestone.count - recoveredCount === 1 ? "" : "s"} until <strong>{nextSecretMilestone.title}</strong>.</p>}
        <div className="secret-archive-grid">
          {STATION_SECRETS.map((secret, index) => {
            const recovered = Boolean(recoveredSecrets[secret.id]);
            return (
              <article key={secret.id} data-recovered={recovered}>
                <span>{String(index + 1).padStart(2, "0")} · {secret.deck}</span>
                <h4>{recovered ? secret.title : "Encrypted Fragment"}</h4>
                <p>{recovered ? secret.text : "Signal contents unavailable."}</p>
                <small>{recovered ? "Fragment restored · archive milestone progress secured" : `Hidden in room ${secret.roomIndex + 1} · advances Archive Relic restoration`}</small>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export { StationMap, MainMenu, RecorderArchive };
