import { KEYBINDS_KEY, defaultKeybinds, controlPresets, keybindActions } from "../../game/config.js";
import { writeStoredJson, keyName } from "../../services/profile-store.js";
import { Button } from "../ui.jsx";
import { useEffect, useState } from "react";
import { RotateCcw, X } from "lucide-react";

function SettingsDrawer({ settings, setSettings, setScreen, returnScreen = "menu" }) {
  const updateSetting = (key, value) => setSettings((current) => ({ ...current, [key]: value }));
  return (
    <div className="drawer">
      <div className="drawer-head">
        <div><h2>Station Settings</h2><p className="small-copy">Adjust run feel and accessibility preferences.</p></div>
        <button className="btn" onClick={() => setScreen(returnScreen)} aria-label="Close settings"><X /></button>
      </div>
      <div className="setting"><label>Volume {Math.round(settings.volume * 100)}%</label><input type="range" min="0" max="1" step="0.01" value={settings.volume} onChange={(e) => updateSetting("volume", Number(e.target.value))} /></div>
      <Toggle title="Adaptive Station Score" text="A restrained procedural soundtrack that crossfades as you move between station decks." value={settings.music} onChange={(music) => updateSetting("music", music)} />
      <Toggle title="Screen Shake" text="Impact feedback from hits, lasers, and Echo deployment." value={settings.shake} onChange={(shake) => updateSetting("shake", shake)} />
      <Toggle title="Reduced Motion" text="Softens camera jitter and heavy pulses." value={settings.reduced} onChange={(reduced) => updateSetting("reduced", reduced)} />
      <div className="setting">
        <label>Mouse Sensitivity {settings.mouseSensitivity.toFixed(2)}x</label>
        <input type="range" min="0.25" max="2.5" step="0.05" value={settings.mouseSensitivity} onChange={(e) => updateSetting("mouseSensitivity", Number(e.target.value))} />
      </div>
      <div className="setting">
        <label>Difficulty</label>
        <select value={settings.difficulty} onChange={(e) => updateSetting("difficulty", e.target.value)}>
          <option>Easy</option>
          <option>Standard</option>
          <option>Hard</option>
        </select>
        <p className="small-copy">Applies to custom levels and editor tests. The stock campaign now ramps pressure automatically as you climb deeper into the station.</p>
      </div>
    </div>
  );
}

function Toggle({ title, text, value, onChange }) {
  return <div className="setting switch"><div><label>{title}</label><p className="small-copy">{text}</p></div><button className="toggle" data-on={value} onClick={() => onChange(!value)}><span /></button></div>;
}

function Controls({ setScreen, keybinds, setKeybinds, returnScreen = "menu" }) {
  const [listening, setListening] = useState(null);
  const setBind = (action, code) => {
    const next = { ...keybinds, [action]: code };
    setKeybinds(next);
    writeStoredJson(KEYBINDS_KEY, next);
    setListening(null);
  };
  const resetBinds = () => {
    setKeybinds(defaultKeybinds);
    localStorage.removeItem(KEYBINDS_KEY);
    setListening(null);
  };
  const applyPreset = (id) => {
    const preset = controlPresets[id];
    if (!preset) return;
    const next = { ...preset };
    setKeybinds(next);
    writeStoredJson(KEYBINDS_KEY, next);
    setListening(null);
  };
  useEffect(() => {
    if (!listening) return undefined;
    const onKey = (e) => {
      e.preventDefault();
      if (e.code === "Escape") {
        setListening(null);
        return;
      }
      setBind(listening, e.code);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [listening, keybinds]);
  return (
    <div className="overlay">
      <section className="panel modal">
        <div className="drawer-head">
          <div><h2>Controls</h2><p className="small-copy">{listening ? "Press a key to bind it. Escape cancels." : "Click an action, then press the key you want."}</p></div>
          <Button onClick={() => setScreen(returnScreen)}><X /></Button>
        </div>
        <div className="controls-grid">
          {keybindActions.map((action) => (
            <button className="control-card control-bind" data-listening={listening === action.id} key={action.id} onClick={() => setListening(action.id)}>
              <span>{action.label}</span>
              <strong>{listening === action.id ? "Press key..." : keyName(keybinds[action.id])}</strong>
            </button>
          ))}
          <div className="control-card">Aim: Mouse</div>
          <div className="control-card">Shoot also works with Left Click</div>
          <div className="control-card">Arrow keys always move as backup</div>
        </div>
        <div className="controls-grid">
          <button className="control-card control-bind" onClick={() => applyPreset("classic")}><span>Preset: Classic</span><strong>WASD</strong></button>
          <button className="control-card control-bind" onClick={() => applyPreset("arrows")}><span>Preset: Arrow Pilot</span><strong>Arrows</strong></button>
          <button className="control-card control-bind" onClick={() => applyPreset("compact")}><span>Preset: Compact</span><strong>IJKL</strong></button>
        </div>
        <div className="profile-actions controls-actions">
          <Button onClick={resetBinds}><RotateCcw /> Reset Defaults</Button>
          <Button primary onClick={() => setScreen(returnScreen)}>{returnScreen === "paused" ? "Back To Pause" : "Back To Menu"}</Button>
        </div>
      </section>
    </div>
  );
}

export { SettingsDrawer, Controls };
