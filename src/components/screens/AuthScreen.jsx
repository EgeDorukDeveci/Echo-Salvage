import { COSMETIC_DEFAULTS, BODY_COLORS, TRAIL_COLORS, UNIVERSAL_COLORS, DRONE_FRAMES, COCKPITS, ENGINES, DECALS, ARMORS, PETS, DASH_STYLES, WEAPONS, ABILITIES } from "../../game/config.js";
import { AUTH_SESSION_TTL_MS, DEV_LOGIN, DEV_COINS, DEFAULT_OWNED, makeRandomHex, createPasswordRecord, verifyStoredPassword, getStoredUsers, saveStoredUsers, storeSession, updateStoredUserProfile } from "../../services/profile-store.js";
import { Button } from "../ui.jsx";
import { useState } from "react";
import { Lock, Mail, Shield, UserRound, UserPlus } from "lucide-react";

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("signup");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const cleanNick = nickname.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    if (cleanNick.length < 2) {
      setMessage("Nickname needs at least 2 characters.");
      return;
    }
    if (cleanPassword.length < 4) {
      setMessage("Password needs at least 4 characters.");
      return;
    }
    setBusy(true);
    if (cleanNick.toLowerCase() === DEV_LOGIN.nickname && cleanPassword === DEV_LOGIN.password) {
      try {
        const users = getStoredUsers();
        const existing = users.find((u) => u.nickname.toLowerCase() === DEV_LOGIN.nickname);
        const passwordRecord = await createPasswordRecord(DEV_LOGIN.password);
        const devUser = {
          ...(existing || {}),
          id: existing?.id || "dev-local-profile",
          nickname: DEV_LOGIN.nickname,
          email: existing?.email || "",
          avatar: existing?.avatar || "gold",
          cosmetic: existing?.cosmetic || COSMETIC_DEFAULTS,
          coins: DEV_COINS,
          owned: {
            colors: UNIVERSAL_COLORS,
            bodies: BODY_COLORS,
            trails: TRAIL_COLORS,
            frames: DRONE_FRAMES.map((frame) => frame.id),
            cockpits: COCKPITS.map((cockpit) => cockpit.id),
            engines: ENGINES.map((engine) => engine.id),
            decals: DECALS.map((decal) => decal.id),
            armors: ARMORS.map((armor) => armor.id),
            pets: PETS.map((pet) => pet.id),
            dashes: DASH_STYLES.map((dash) => dash.id),
            weapons: WEAPONS.map((weapon) => weapon.id),
            abilities: ABILITIES.map((ability) => ability.id)
          },
          devMode: true,
          sessionNonce: makeRandomHex(16),
          sessionExpiresAt: Date.now() + AUTH_SESSION_TTL_MS,
          createdAt: existing?.createdAt || new Date().toISOString(),
          ...passwordRecord
        };
        delete devUser.password;
        saveStoredUsers([devUser, ...users.filter((u) => u.id !== devUser.id && u.nickname.toLowerCase() !== DEV_LOGIN.nickname)]);
        const session = storeSession(devUser);
        onAuth(session);
        setBusy(false);
        return;
      } catch {
        setMessage("Login storage failed. Try again.");
        setBusy(false);
        return;
      }
    }
    try {
      const users = getStoredUsers();
      const found = users.find((u) => u.nickname.toLowerCase() === cleanNick.toLowerCase());
      if (mode === "signup") {
        if (found) {
          setMessage("That nickname is already registered.");
          setBusy(false);
          return;
        }
        const passwordRecord = await createPasswordRecord(cleanPassword);
        const sessionNonce = makeRandomHex(16);
        const sessionExpiresAt = Date.now() + AUTH_SESSION_TTL_MS;
        const user = {
          id: crypto.randomUUID?.() || `${Date.now()}`,
          nickname: cleanNick,
          email: cleanEmail,
          avatar: "yellow",
          cosmetic: COSMETIC_DEFAULTS,
          coins: 25,
          owned: DEFAULT_OWNED,
          createdAt: new Date().toISOString(),
          sessionNonce,
          sessionExpiresAt,
          ...passwordRecord
        };
        saveStoredUsers([...users, user]);
        const session = storeSession(user);
        onAuth(session);
        setBusy(false);
        return;
      }
      if (!found || !(await verifyStoredPassword(found, cleanPassword))) {
        setMessage("Nickname or password is incorrect.");
        setBusy(false);
        return;
      }
      let updated = { ...found };
      if (!updated.passwordHash || !updated.passwordSalt) {
        const passwordRecord = await createPasswordRecord(cleanPassword);
        updated = { ...updated, ...passwordRecord };
        delete updated.password;
      }
      updated.sessionNonce = makeRandomHex(16);
      updated.sessionExpiresAt = Date.now() + AUTH_SESSION_TTL_MS;
      const session = updateStoredUserProfile(updated);
      onAuth(session);
    } catch {
      setMessage("Login storage failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overlay auth-overlay">
      <div className="auth-grid">
        <section className="panel auth-panel">
          <div className="panel-header">
            <span className="badge">Crew Access</span>
            <span className="status-pill">Local Save</span>
          </div>
          <h1 className="title auth-title">Echo Salvage</h1>
          <p className="lead">Create a station profile or return with your nickname and password. Email is optional.</p>
          <div className="auth-tabs" role="tablist" aria-label="Account mode">
            <button data-active={mode === "signup"} onClick={() => { setMode("signup"); setMessage(""); }} type="button"><UserPlus size={18} /> Sign Up</button>
            <button data-active={mode === "login"} onClick={() => { setMode("login"); setMessage(""); }} type="button"><Lock size={18} /> Login</button>
          </div>
          <form className="auth-form" onSubmit={submit}>
            <label>
              <span><UserRound size={16} /> Nickname</span>
              <input value={nickname} onChange={(e) => setNickname(e.target.value)} autoComplete="username" placeholder="salvage-pilot" />
            </label>
            {mode === "signup" && (
              <label>
                <span><Mail size={16} /> Email optional</span>
                <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" placeholder="pilot@example.com" />
              </label>
            )}
            <label>
              <span><Lock size={16} /> Password</span>
              <input value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} type="password" placeholder="4+ characters" />
            </label>
            {message && <p className="auth-message">{message}</p>}
            <Button primary className="auth-submit" type="submit">{busy ? "Securing Access..." : mode === "signup" ? "Create Profile" : "Enter Station"}</Button>
          </form>
        </section>
        <section className="panel auth-brief">
          <Brief icon={<UserRound />} title="Nickname Required" text="Your callsign appears on this browser profile and can be used to login later." />
          <Brief icon={<Mail />} title="Email Optional" text="Leave email blank if you want. Nickname and password are enough for this local build." />
          <Brief icon={<Shield />} title="Prototype Storage" text="Accounts are saved locally in this browser for testing the flow." />
        </section>
      </div>
    </div>
  );
}

function Brief({ icon, title, text }) {
  return <div className="brief-card"><div className="brief-icon">{icon}</div><div><h3>{title}</h3><p>{text}</p></div></div>;
}

export { AuthScreen };
