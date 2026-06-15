import { ABILITY_DEFAULT, AVATARS, WEAPON_DEFAULT, COSMETIC_DEFAULTS, UNIVERSAL_COLORS, DRONE_FRAMES, COCKPITS, ENGINES, DECALS, ARMORS, PETS, PET_BY_ID, DASH_STYLES, DASH_STYLE_BY_ID, WEAPONS, ABILITIES, WEAPON_BY_ID, ABILITY_BY_ID } from "../../game/config.js";
import { drawDashBurst, drawAbilityBurst, drawDrone, drawPet } from "../../game/rendering.js";
import { normalizeEconomy, getStoredUsers, updateStoredUserProfile, updateUserEconomy } from "../../services/profile-store.js";
import { AvatarBadge, Button } from "../ui.jsx";
import { useEffect, useRef, useState } from "react";
import { Sparkles, UserRound, X } from "lucide-react";

const BODY_PRICES = { "#ffd52d": 35, "#00f0d2": 45, "#58e07a": 55, "#ff4e41": 70, "#ffb000": 100, "#ff8a00": 80, "#b78cff": 120, "#8aa0ff": 125, "#ff6ec7": 130, "#9df6a3": 110, "#7ef9ff": 115, "#f5f7ff": 135, "#ff9f7f": 90, "#c9ff45": 105, "#4de0ff": 95, "#f4dd74": 98, "#f77d9d": 112, "#8cffda": 118, "#7a91ff": 128, "#f0a6ff": 138, "#7ef0b6": 108, "#ffcf6b": 102, "#e3ffe7": 116, "#fbe7ff": 124, "#9fb8ff": 132 };
const TRAIL_PRICES = { "#ffd52d": 35, "#58e07a": 50, "#ff4e41": 65, "#e7f0ef": 80, "#ff8a00": 95, "#b78cff": 110, "#8aa0ff": 115, "#ff6ec7": 120, "#9df6a3": 90, "#7ef9ff": 100, "#f5f7ff": 125, "#f77d9d": 105, "#c9ff45": 92, "#4de0ff": 96, "#ffcf6b": 99, "#f0a6ff": 130, "#8cffda": 108 };
const COLOR_PRICES = Object.fromEntries(UNIVERSAL_COLORS.map((color, index) => [color, BODY_PRICES[color] || TRAIL_PRICES[color] || 55 + index * 4]));
const FRAME_PRICES = { split: 80, needle: 120 };
const getWeaponById = (id) => WEAPON_BY_ID.get(id) || WEAPONS[0];
const getAbilityById = (id) => ABILITY_BY_ID.get(id) || ABILITIES[0];
const COLOR_EQUIP_SLOTS = [
  { label: "Body Paint", slot: "body" },
  { label: "Glow Accent", slot: "accent" },
  { label: "Dash / Trail Color", slot: "trail" }
];
const COSMETIC_EQUIP_GROUPS = [
  { label: "Drone Frame", slot: "frame", bucket: "frames", items: DRONE_FRAMES, noun: "frame" },
  { label: "Cockpit", slot: "cockpit", bucket: "cockpits", items: COCKPITS, noun: "cockpit" },
  { label: "Engine", slot: "engine", bucket: "engines", items: ENGINES, noun: "engine" },
  { label: "Armor Kit", slot: "armor", bucket: "armors", items: ARMORS, noun: "armor kit" },
  { label: "Decal", slot: "decal", bucket: "decals", items: DECALS, noun: "decal" },
  { label: "Dash Animation", slot: "dashStyle", bucket: "dashes", items: DASH_STYLES, noun: "dash animation" },
  { label: "Pet", slot: "pet", bucket: "pets", items: PETS, noun: "pet" },
  { label: "Weapon Style", slot: "weapon", bucket: "weapons", items: WEAPONS, noun: "weapon" },
  { label: "Ability", slot: "ability", bucket: "abilities", items: ABILITIES, noun: "ability" }
];
const COSMETIC_SHOP_GROUPS = [
  { title: "Drone Frames", slot: "frame", bucket: "frames", items: DRONE_FRAMES.filter((item) => item.id !== COSMETIC_DEFAULTS.frame), price: (item) => FRAME_PRICES[item.id] || 80 },
  { title: "Cockpits", slot: "cockpit", bucket: "cockpits", items: COCKPITS.filter((item) => item.id !== COSMETIC_DEFAULTS.cockpit) },
  { title: "Engines", slot: "engine", bucket: "engines", items: ENGINES.filter((item) => item.id !== COSMETIC_DEFAULTS.engine) },
  { title: "Armor Kits", slot: "armor", bucket: "armors", items: ARMORS.filter((item) => item.id !== COSMETIC_DEFAULTS.armor) },
  { title: "Decals", slot: "decal", bucket: "decals", items: DECALS.filter((item) => item.id !== COSMETIC_DEFAULTS.decal) },
  { title: "Dash Animations", slot: "dashStyle", bucket: "dashes", items: DASH_STYLES.filter((item) => item.id !== COSMETIC_DEFAULTS.dashStyle) },
  { title: "Pets", slot: "pet", bucket: "pets", items: PETS.filter((item) => item.id !== "none") },
  { title: "Weapon Styles", slot: "weapon", bucket: "weapons", items: WEAPONS.filter((item) => item.id !== WEAPON_DEFAULT) },
  { title: "Abilities", slot: "ability", bucket: "abilities", items: ABILITIES.filter((item) => item.id !== ABILITY_DEFAULT) }
];

function CosmeticOptionGroup({ group, cosmetic, owned, equipCosmetic, setMessage }) {
  return (
    <div>
      <label>{group.label}</label>
      <div className="frame-row">
        {group.items.map((item) => {
          const unlocked = owned[group.bucket].includes(item.id);
          return (
            <button
              key={item.id}
              data-active={cosmetic[group.slot] === item.id}
              data-locked={!unlocked}
              onClick={() => unlocked ? equipCosmetic(group.slot, item.id) : setMessage(`Unlock this ${group.noun} in the shop first.`)}
            >
              {item.perk ? <><span>{item.label}</span><small>{item.perk}</small></> : item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProfileScreen({ user, setUser, setScreen }) {
  const [avatar, setAvatar] = useState(user?.avatar || "yellow");
  const [cosmetic, setCosmetic] = useState(() => ({ ...COSMETIC_DEFAULTS, ...normalizeEconomy(user).cosmetic }));
  const [message, setMessage] = useState("");
  const [bayView, setBayView] = useState("customize");
  const economy = normalizeEconomy(user);
  const owned = economy.owned;
  const ownedColors = owned.colors || [];
  const previewRef = useRef(null);

  const equipCosmetic = (slot, value) => {
    setCosmetic((current) => ({ ...current, [slot]: value }));
  };

  const buy = (bucket, id, price, label, afterUnlock) => {
    const latestUser = getStoredUsers().find((u) => u.id === user?.id) || user;
    const latestEconomy = normalizeEconomy(latestUser);
    if (latestEconomy.owned[bucket]?.includes(id)) {
      setMessage(`${label} is already unlocked.`);
      return;
    }
    if (latestEconomy.coins < price) {
      setMessage(`Need ${Math.max(0, Math.ceil(price - latestEconomy.coins))} more coins for ${label}.`);
      return;
    }
    const session = updateUserEconomy(latestUser, (current) => {
      const normalized = normalizeEconomy(current);
      return {
        ...current,
        coins: normalized.coins - price,
        owned: {
          ...normalized.owned,
          [bucket]: [...(normalized.owned[bucket] || []), id]
        }
      };
    });
    setUser(session);
    afterUnlock?.();
    setMessage(`Unlocked ${label}.`);
  };

  const chooseColor = (slot, color) => {
    if (!ownedColors.includes(color)) {
      setMessage("Unlock this color once, then use it anywhere.");
      return;
    }
    equipCosmetic(slot, color);
  };

  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    let raf = 0;
    const weapon = getWeaponById(cosmetic.weapon);
    const ability = getAbilityById(cosmetic.ability);

    const render = (now) => {
      const t = now / 1000;
      const burstPhase = (t % 2.6) / 2.6;
      const burstLife = burstPhase < 0.55 ? 1 - burstPhase / 0.55 : 0;
      const previewPlayer = {
        x: 66,
        y: 62,
        angle: 0,
        dashTrail: (ability.id === "dash" || ability.id === "blastDash") && burstPhase < 0.18 ? 160 : 0,
        cloakUntil: ability.id === "cloak" && burstPhase < 0.55 ? now + 100 : 0
      };

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#041014";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "rgba(0, 240, 210, 0.08)";
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      if (burstLife > 0 && (ability.id === "dash" || ability.id === "blastDash")) {
        drawDashBurst(ctx, { x: 48, y: 62, angle: 0, life: burstLife * 260, maxLife: 260 }, cosmetic);
      }

      drawDrone(ctx, previewPlayer, false, cosmetic);
      drawPet(ctx, previewPlayer, cosmetic, now);

      const bulletCount = Math.min(weapon.shotsPerTrigger, 6);
      const bulletSpread = weapon.spread || 0;
      const bulletTravel = ((t * (weapon.id === "storm" ? 2.2 : 1.2)) % 1) * 64;
      for (let i = 0; i < bulletCount; i += 1) {
        const spreadOffset = bulletCount === 1 ? 0 : (i - (bulletCount - 1) / 2) * Math.max(6, bulletSpread * 70);
        const bx = 112 + bulletTravel;
        const by = 62 + spreadOffset;
        ctx.save();
        ctx.shadowColor = cosmetic.trail;
        ctx.shadowBlur = 10;
        ctx.fillStyle = weapon.damage > 1 ? "#ffb000" : "#ffd52d";
        ctx.beginPath();
        ctx.arc(bx, by, weapon.damage > 1 ? 4.5 : 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.fillStyle = "#dbe8e7";
      ctx.font = "900 13px Rajdhani, Bahnschrift, sans-serif";
      ctx.fillText(weapon.label, 12, 16);
      ctx.fillStyle = "#91a9ac";
      ctx.font = "700 11px Rajdhani, Bahnschrift, sans-serif";
      if (((t * 1000) % ability.cooldownMs) < 900) {
        drawAbilityBurst(ctx, { x: 66, y: 62, type: ability.id, life: 360, maxLife: 520 });
      }
      ctx.fillText(`Trail: ${DASH_STYLE_BY_ID.get(cosmetic.dashStyle)?.label || "Streak"}`, 12, 90);
      ctx.fillText(`Pet: ${PET_BY_ID.get(cosmetic.pet)?.label || "No Pet"}`, 12, 104);
      ctx.fillText(`Ability: ${ability.label}`, 12, 118);

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [cosmetic, bayView]);

  const save = () => {
    const current = getStoredUsers().find((u) => u.id === user?.id) || user;
    if (!current) {
      setMessage("Profile not found. Log in again.");
      return;
    }
    const currentOwned = normalizeEconomy(current).owned;
    const currentColors = currentOwned.colors || [];
    const nextCosmetic = {
      ...cosmetic,
      body: currentColors.includes(cosmetic.body) ? cosmetic.body : COSMETIC_DEFAULTS.body,
      trail: currentColors.includes(cosmetic.trail) ? cosmetic.trail : COSMETIC_DEFAULTS.trail,
      accent: currentColors.includes(cosmetic.accent) ? cosmetic.accent : COSMETIC_DEFAULTS.accent,
      frame: currentOwned.frames.includes(cosmetic.frame) ? cosmetic.frame : COSMETIC_DEFAULTS.frame,
      cockpit: currentOwned.cockpits.includes(cosmetic.cockpit) ? cosmetic.cockpit : COSMETIC_DEFAULTS.cockpit,
      engine: currentOwned.engines.includes(cosmetic.engine) ? cosmetic.engine : COSMETIC_DEFAULTS.engine,
      decal: currentOwned.decals.includes(cosmetic.decal) ? cosmetic.decal : COSMETIC_DEFAULTS.decal,
      armor: currentOwned.armors.includes(cosmetic.armor) ? cosmetic.armor : COSMETIC_DEFAULTS.armor,
      pet: currentOwned.pets.includes(cosmetic.pet) ? cosmetic.pet : "none",
      dashStyle: currentOwned.dashes.includes(cosmetic.dashStyle) ? cosmetic.dashStyle : "streak",
      weapon: currentOwned.weapons.includes(cosmetic.weapon) ? cosmetic.weapon : WEAPON_DEFAULT,
      ability: currentOwned.abilities.includes(cosmetic.ability) ? cosmetic.ability : ABILITY_DEFAULT
    };
    const session = updateStoredUserProfile({ ...current, avatar, cosmetic: nextCosmetic });
    setUser(session);
    setMessage("Customization saved.");
  };

  return (
    <div className="overlay">
      <section className="panel profile-panel" data-view={bayView}>
        <div className="drawer-head">
          <div>
            <span className="badge">Customization Bay</span>
            <h2>{user?.nickname} | {economy.coins} Coins</h2>
            <p className="small-copy">Buy parts and colors here, then equip them immediately in the same bay.</p>
          </div>
          <div className="profile-head-actions">
            <AvatarBadge avatar={avatar} size="lg" />
            <Button onClick={() => setScreen("menu")} aria-label="Close profile"><X /></Button>
          </div>
        </div>
        <p className="auth-message profile-message" data-visible={Boolean(message)} aria-live="polite">{message || "Customization ready."}</p>
        <div className="bay-view-tabs">
          <button data-active={bayView === "customize"} onClick={() => setBayView("customize")}><UserRound size={18} /><span><strong>Customize</strong><small>Equip owned items</small></span></button>
          <button data-active={bayView === "shop"} onClick={() => setBayView("shop")}><Sparkles size={18} /><span><strong>Shop</strong><small>Browse permanent unlocks</small></span><em>{economy.coins} coins</em></button>
        </div>
        {bayView === "customize" && <div className="bay-system-guide">
          <div><span>Gameplay equipment</span><strong>Weapon · Ability · Pet</strong><small>These change combat, movement, or passive stats.</small></div>
          <div><span>Visual cosmetics</span><strong>Paint · Frame · Engine · Armor · Decal · Trail</strong><small>These only change how your drone looks.</small></div>
          <div><span>How purchases work</span><strong>Coins unlock permanently</strong><small>Save after equipping. Expedition workshop parts are a separate run-only currency.</small></div>
        </div>}
        {bayView === "customize" && <div className="profile-preview">
          <canvas width="360" height="206" ref={previewRef} />
          <div className="profile-preview-copy">
            <strong>Live Preview</strong>
            <span>Colors are universal. Buy one color and apply it to paint, glow, trail, and engine-style effects.</span>
          </div>
        </div>}
        <div className="profile-scroll" data-view={bayView}>
          {bayView === "customize" ? <>
          <div className="avatar-grid">
            {AVATARS.map((item) => (
              <button className="avatar-choice" data-active={avatar === item.id} key={item.id} onClick={() => setAvatar(item.id)}>
                <AvatarBadge avatar={item.id} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
          <div className="customizer-grid">
            {COLOR_EQUIP_SLOTS.map(({ label, slot }) => (
              <div key={slot}>
                <label>{label}</label>
                <div className="swatch-row">
                  {UNIVERSAL_COLORS.map((color) => <button key={color} className="swatch" data-active={cosmetic[slot] === color} data-locked={!ownedColors.includes(color)} style={{ background: color }} onClick={() => chooseColor(slot, color)} />)}
                </div>
              </div>
            ))}
            {COSMETIC_EQUIP_GROUPS.map((group) => <CosmeticOptionGroup key={group.slot} group={group} cosmetic={cosmetic} owned={owned} equipCosmetic={equipCosmetic} setMessage={setMessage} />)}
          </div>
          </> : <div className="bay-shop">
            <div className="bay-shop-head">
              <div>
                <span className="badge">Permanent Unlocks</span>
                <h3>Salvage Exchange</h3>
              </div>
              <p className="small-copy">Spend coins once, then equip the item whenever you want. Gameplay equipment changes your loadout; cosmetic parts only change appearance.</p>
            </div>
            <ShopSection title="Universal Colors">
              {UNIVERSAL_COLORS.map((color) => (
                <ShopItem key={color} colorCard owned={ownedColors.includes(color)} label={color.toUpperCase()} price={COLOR_PRICES[color] || 60} color={color} onBuy={() => buy("colors", color, COLOR_PRICES[color] || 60, "color", () => equipCosmetic("body", color))} />
              ))}
            </ShopSection>
            {COSMETIC_SHOP_GROUPS.map((group) => (
              <ShopSection key={group.bucket} title={group.title}>
                {group.items.map((item) => {
                  const price = group.price ? group.price(item) : item.price;
                  return <ShopItem key={item.id} owned={owned[group.bucket].includes(item.id)} label={item.label} detail={item.perk} price={price} color={item.color} onBuy={() => buy(group.bucket, item.id, price, item.label, () => equipCosmetic(group.slot, item.id))} />;
                })}
              </ShopSection>
            ))}
          </div>}
        </div>
        <div className="profile-actions">
          <Button primary onClick={bayView === "shop" ? () => setBayView("customize") : save}>{bayView === "shop" ? <><UserRound /> Equip Purchased Items</> : <><UserRound /> Save Character</>}</Button>
          <Button onClick={() => setScreen("menu")}>Back To Menu</Button>
        </div>
      </section>
    </div>
  );
}

function ShopScreen({ user, setUser, setScreen }) {
  return <ProfileScreen user={user} setUser={setUser} setScreen={setScreen} />;
}

function ShopSection({ title, children }) {
  return <div className="shop-section"><h3>{title}</h3><div className="shop-grid">{children}</div></div>;
}

function ShopItem({ label, detail, price, owned, color, colorCard = false, onBuy }) {
  const handleClick = () => {
    if (owned) return;
    onBuy?.();
  };

  return (
    <button className="shop-item" data-owned={owned} data-color-card={colorCard} type="button" aria-disabled={owned} onClick={handleClick}>
      {color && <span className="shop-swatch" style={{ background: color }} />}
      <strong>{label}</strong>
      {detail && <small>{detail}</small>}
      <span className="shop-price">{owned ? "Unlocked" : `${price} coins`}</span>
    </button>
  );
}

export { ProfileScreen, ShopScreen };
