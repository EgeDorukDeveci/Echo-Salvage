import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./main.css";

import { defaultSettings, rooms, COSMETIC_DEFAULTS } from "./game/config.js";
import { getStationNode, getStationMutationForNode, getStationEventForNode, createStationExpedition, createInactiveExpedition, resolveExpeditionRun, getCampaignTheme } from "./game/rules.js";
import { useAmbient } from "./hooks/useAmbient.js";
import { AUTH_SESSION_KEY, getNextCampaignRoomIndex, normalizeEconomy, getStarsForRoom, getStoredKeybinds, getStoredUsers, getStoredSession, updateStoredUserProfile, updateUserEconomy } from "./services/profile-store.js";
import { GameView } from "./components/GameView.jsx";
import { AuthScreen } from "./components/screens/AuthScreen.jsx";
import { StationMap, MainMenu, RecorderArchive } from "./components/screens/CampaignScreens.jsx";
import { ProfileScreen, ShopScreen } from "./components/screens/CustomizationBay.jsx";
import { SettingsDrawer, Controls } from "./components/screens/SettingsScreens.jsx";
import { createInitialSummaryState, PauseMenu, Summary, SalvageWorkshop, CommunityLevels } from "./components/screens/RunScreens.jsx";
import { Editor } from "./components/screens/Editor.jsx";
import { getSecretMilestone } from "./game/secrets.js";
import { makeTrialLevel } from "./game/trial.js";

function App() {
  const [bootState] = useState(() => {
    const session = getStoredSession();
    return {
      user: session,
      screen: session ? "menu" : "auth"
    };
  });
  const [user, setUser] = useState(bootState.user);
  const [screen, setScreen] = useState(bootState.screen);
  const [levelIndex, setLevelIndex] = useState(0);
  const [runSeed, setRunSeed] = useState(0);
  const [customLevel, setCustomLevel] = useState(null);
  const [settings, setSettings] = useState(defaultSettings);
  const [keybinds, setKeybinds] = useState(() => getStoredKeybinds());
  const [overlayReturnScreen, setOverlayReturnScreen] = useState("menu");
  const [summary, setSummary] = useState(createInitialSummaryState);
  const [expedition, setExpedition] = useState(createInactiveExpedition);
  const activeCosmetic = useMemo(() => ({ ...COSMETIC_DEFAULTS, ...normalizeEconomy(user).cosmetic }), [user]);
  const deckTheme = customLevel ? settings.uiTheme : getCampaignTheme(levelIndex);
  const menuTheme = getCampaignTheme(getNextCampaignRoomIndex(user?.progress));
  const appTheme = screen === "playing" || screen === "paused" || screen === "summary" ? deckTheme : menuTheme;
  useAmbient(settings, appTheme, screen);
  const returnToMenu = () => {
    setCustomLevel(null);
    setExpedition((current) => ({ ...current, active: false }));
    setOverlayReturnScreen("menu");
    setScreen("menu");
  };
  const startTrial = () => {
    setCustomLevel(makeTrialLevel());
    setLevelIndex(0);
    setExpedition(createInactiveExpedition());
    setRunSeed((value) => value + 1);
    setScreen("playing");
  };
  const startCampaignRoom = (index = 0) => {
    setCustomLevel(null);
    setLevelIndex(index);
    setExpedition(createInactiveExpedition());
    setScreen("playing");
  };
  const startStationExpedition = () => {
    setCustomLevel(null);
    setExpedition(createStationExpedition());
    setScreen("stationMap");
  };
  const enterStationNode = (node) => {
    const currentNode = getStationNode(expedition.currentNode);
    const bossReady = Math.max(0, new Set(expedition.cleared || []).size - 1) >= 4;
    if (!currentNode.links.includes(node.id) || (node.type === "boss" && !bossReady)) return;
    setExpedition((current) => ({
      ...current,
      currentNode: node.id,
      mutation: getStationMutationForNode(node).id,
      event: getStationEventForNode(node, current.alert).id
    }));
    if (node.type === "workshop") {
      setScreen("workshop");
      return;
    }
    setCustomLevel(null);
    setLevelIndex(node.levelIndex);
    setRunSeed((value) => value + 1);
    setScreen("playing");
  };
  const next = () => {
    if (summary.stationExpedition) {
      setScreen("stationMap");
      return;
    }
    if (summary.isTrial && summary.result === "Extracted") {
      startCampaignRoom(0);
      return;
    }
    if (summary.isCustom || levelIndex >= rooms.length - 1) {
      returnToMenu();
      return;
    }
    setCustomLevel(null);
    setLevelIndex((v) => Math.min(v + 1, rooms.length - 1));
    setScreen("playing");
  };
  const chooseUpgrade = (upgrade) => setExpedition((current) => !current.active || current.upgrades.includes(upgrade.id) || current.salvage < upgrade.cost ? current : { ...current, salvage: current.salvage - upgrade.cost, upgrades: [...current.upgrades, upgrade.id] });
  const craftMod = (mod) => setExpedition((current) => current.mods.includes(mod.id) || current.salvage < mod.cost ? current : { ...current, salvage: current.salvage - mod.cost, mods: [...current.mods, mod.id] });
  const retryLevel = () => {
    setRunSeed((v) => v + 1);
    setScreen("playing");
  };
  const playCommunityLevel = (level) => {
    setCustomLevel(level);
    setExpedition(createInactiveExpedition());
    setRunSeed((value) => value + 1);
    setScreen("playing");
  };
  const logout = () => {
    localStorage.removeItem(AUTH_SESSION_KEY);
    setCustomLevel(null);
    setLevelIndex(0);
    setRunSeed(0);
    setOverlayReturnScreen("menu");
    setSummary(createInitialSummaryState());
    setUser(null);
    setScreen("auth");
  };
  const openSettingsFrom = (origin) => {
    setOverlayReturnScreen(origin);
    setScreen("settings");
  };
  const openControlsFrom = (origin) => {
    setOverlayReturnScreen(origin);
    setScreen("controls");
  };
  const recordCampaignProgress = (resolvedSummary) => {
    if (resolvedSummary.stationExpedition) {
      setExpedition((current) => resolveExpeditionRun(current, resolvedSummary));
      return resolvedSummary;
    }
    if (resolvedSummary.result !== "Extracted" || resolvedSummary.isCustom || user?.devMode || !user?.id) return resolvedSummary;
    const current = getStoredUsers().find((entry) => entry.id === user.id) || user;
    const earnedStars = getStarsForRoom(resolvedSummary);
    const progress = { ...(current.progress || {}) };
    const contracts = { ...(current.contracts || {}) };
    const contractKey = String(resolvedSummary.levelIndex);
    const contractFirstClear = Boolean(resolvedSummary.contractCompleted && !contracts[contractKey]);
    if (earnedStars > (progress[resolvedSummary.levelIndex] || 0)) progress[resolvedSummary.levelIndex] = earnedStars;
    if (contractFirstClear) contracts[contractKey] = true;
    const contractReward = contractFirstClear ? resolvedSummary.contract.reward : 0;
    setUser(updateStoredUserProfile({ ...current, progress, contracts, coins: normalizeEconomy(current).coins + contractReward }));
    return {
      ...resolvedSummary,
      contractFirstClear,
      contractReward,
      contractAlreadyClaimed: Boolean(resolvedSummary.contractCompleted && !contractFirstClear)
    };
  };
  const discoverStationSecret = (secret) => {
    if (!secret || !user?.id) return false;
    const current = getStoredUsers().find((entry) => entry.id === user.id) || user;
    if (current.secrets?.[secret.id]) return false;
    const secrets = { ...(current.secrets || {}), [secret.id]: true };
    const recoveredCount = Object.values(secrets).filter(Boolean).length;
    const milestone = getSecretMilestone(recoveredCount);
    const economy = normalizeEconomy(current);
    const owned = { ...economy.owned };
    if (milestone?.unlock) {
      const currentItems = owned[milestone.unlock.bucket] || [];
      owned[milestone.unlock.bucket] = [...new Set([...currentItems, milestone.unlock.id])];
    }
    setUser(updateStoredUserProfile({ ...current, secrets, owned, coins: economy.coins }));
    return { recoveredCount, milestone };
  };
  return (
    <div className="app" data-theme={appTheme}>
      <div className="frame" />
      {(screen === "playing" || screen === "paused" || screen === "summary") && <GameView key={`${levelIndex}-${runSeed}-${customLevel ? "custom" : "stock"}`} levelIndex={levelIndex} customLevel={customLevel} screen={screen === "playing" ? "playing" : "idle"} setScreen={setScreen} settings={settings} setSummary={setSummary} onRunComplete={recordCampaignProgress} cosmetic={activeCosmetic} keybinds={keybinds} expedition={expedition} discoveredSecrets={user?.secrets} onDiscoverSecret={discoverStationSecret} awardCoins={(amount) => {
        if (!user?.id) return;
        const session = updateUserEconomy(user, (current) => ({ ...current, coins: normalizeEconomy(current).coins + amount }));
        setUser(session);
      }} />}
      <div className="interface-scale" data-visible={screen === "auth" || screen === "menu"}>
        {screen === "auth" && <AuthScreen onAuth={(session) => { setUser(session); setScreen("menu"); }} />}
        {screen === "menu" && <MainMenu user={user} onLogout={logout} setScreen={setScreen} startTrial={startTrial} startRoom={startCampaignRoom} startStationExpedition={startStationExpedition} openSettings={() => openSettingsFrom("menu")} openControls={() => openControlsFrom("menu")} />}
      </div>
      {screen === "stationMap" && <StationMap expedition={expedition} enterNode={enterStationNode} abandon={returnToMenu} />}
      {screen === "profile" && <ProfileScreen user={user} setUser={setUser} setScreen={setScreen} />}
      {screen === "shop" && <ShopScreen user={user} setUser={setUser} setScreen={setScreen} />}
      {screen === "workshop" && <SalvageWorkshop expedition={expedition} craftMod={craftMod} installUpgrade={chooseUpgrade} setScreen={setScreen} returnScreen={expedition.active ? "stationMap" : "menu"} />}
      {screen === "archive" && <RecorderArchive user={user} setScreen={setScreen} />}
      {screen === "settings" && <SettingsDrawer settings={settings} setSettings={setSettings} setScreen={setScreen} returnScreen={overlayReturnScreen} />}
      {screen === "controls" && <Controls setScreen={setScreen} keybinds={keybinds} setKeybinds={setKeybinds} returnScreen={overlayReturnScreen} />}
      {screen === "paused" && <PauseMenu setScreen={setScreen} retryLevel={retryLevel} abandonRun={returnToMenu} openSettings={() => openSettingsFrom("paused")} openControls={() => openControlsFrom("paused")} />}
      {screen === "summary" && <Summary summary={summary} next={next} returnToMenu={returnToMenu} />}
      {screen === "community" && <CommunityLevels returnToMenu={returnToMenu} playLevel={playCommunityLevel} />}
      {screen === "editor" && <Editor returnToMenu={returnToMenu} setScreen={setScreen} setCustomLevel={setCustomLevel} user={user} settings={settings} />}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
