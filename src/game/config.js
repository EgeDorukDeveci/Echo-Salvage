const W = 1280;
const H = 720;
const ECHO_MS = 8000;
const ECHO_FRAME_MS = 50;
const MAX_ECHOES = 3;
const CELL = 40;
const PLAYER_MARGIN = 80;
const CARGO_MARGIN = 64;
const MAX_ENERGY = 120;
const ECHO_COST = 14;
const ECHO_COLORS = ["#00f0d2", "#ffd52d", "#b78cff"];
const ECHO_FILLS = ["rgba(0,240,210,.28)", "rgba(255,213,45,.24)", "rgba(183,140,255,.25)"];
const ABILITY_DEFAULT = "dash";
const DIFFICULTY_TUNING = {
  Easy: {
    maxEnergy: 150,
    damageTaken: 0.75,
    hostileCooldown: 1.22,
    hostileSpeed: 0.9,
    laserDamage: 0.78,
    missileDamage: 40,
    hostileHpBonus: 0
  },
  Standard: {
    maxEnergy: 120,
    damageTaken: 1,
    hostileCooldown: 1,
    hostileSpeed: 1,
    laserDamage: 1,
    missileDamage: 50,
    hostileHpBonus: 0
  },
  Hard: {
    maxEnergy: 95,
    damageTaken: 1.22,
    hostileCooldown: 0.78,
    hostileSpeed: 1.13,
    laserDamage: 1.18,
    missileDamage: 60,
    hostileHpBonus: 1
  }
};

const defaultSettings = {
  volume: 0.7,
  music: false,
  shake: true,
  reduced: false,
  difficulty: "Standard",
  mouseSensitivity: 1,
  uiTheme: "station"
};
const KEYBINDS_KEY = "echo-salvage-keybinds";
const defaultKeybinds = {
  moveUp: "KeyW",
  moveDown: "KeyS",
  moveLeft: "KeyA",
  moveRight: "KeyD",
  shoot: "Space",
  dash: "ShiftLeft",
  ability: "KeyF",
  reload: "KeyT",
  interact: "KeyE",
  echo: "KeyQ"
};
const controlPresets = {
  classic: { moveUp: "KeyW", moveDown: "KeyS", moveLeft: "KeyA", moveRight: "KeyD", shoot: "Space", dash: "ShiftLeft", ability: "KeyF", reload: "KeyT", interact: "KeyE", echo: "KeyQ" },
  arrows: { moveUp: "ArrowUp", moveDown: "ArrowDown", moveLeft: "ArrowLeft", moveRight: "ArrowRight", shoot: "ControlRight", dash: "ShiftRight", ability: "Numpad0", reload: "Numpad1", interact: "Numpad2", echo: "Numpad3" },
  compact: { moveUp: "KeyI", moveDown: "KeyK", moveLeft: "KeyJ", moveRight: "KeyL", shoot: "KeyP", dash: "KeyO", ability: "Semicolon", reload: "BracketLeft", interact: "KeyU", echo: "KeyY" }
};
const keybindActions = [
  { id: "moveUp", label: "Move Up" },
  { id: "moveDown", label: "Move Down" },
  { id: "moveLeft", label: "Move Left" },
  { id: "moveRight", label: "Move Right" },
  { id: "shoot", label: "Shoot" },
  { id: "dash", label: "Use Ability" },
  { id: "ability", label: "Use Ability (Alt)" },
  { id: "reload", label: "Reload" },
  { id: "interact", label: "Interact" },
  { id: "echo", label: "Spawn Echo" }
];

const rooms = [
  "Echo Plate Training",
  "Cargo Pressure Chapel",
  "Laser Switch Spine",
  "First Turret Gallery",
  "Drone Chase Hangar",
  "Split Echo Circuit",
  "Forklift Cargo Lab",
  "Relay Turret Yard",
  "Memory Laser Switchback",
  "Locked Drone Orchard",
  "Twin Echo Nursery",
  "Pressure Cargo Foundry",
  "Scrap Turret Conservatory",
  "Dual Drone Relay",
  "Missile Dash Range",
  "Gravity Node Primer",
  "Jammer Mirror Lock",
  "Sweeper Lock Bay",
  "Shield Drone Gauntlet",
  "Blink Hunter Furnace",
  "Echo Core Finale",
  "Cargo Jammer Vestibule",
  "Shield Turret Atrium",
  "Gravity Cargo Carousel",
  "Repair Bot Dock",
  "Blink Switch Arcade",
  "Missile Cargo Runway",
  "Sweeper Plate Loom",
  "Drone Shield Orchard",
  "Jammer Drone Canal",
  "Gravity Missile Gallery",
  "Repair Sweeper Foundry",
  "Blink Jammer Chapel",
  "Shielded Reactor Relay",
  "Shield Repair Lockchain",
  "Salvage Singularity Core",
  "Cargo Switch Observatory",
  "Turret Crossfire Library",
  "Drone Fork Hangar",
  "Missile Dash Parabola",
  "Gravity Plate Crucible",
  "Verdant Maw Cloister",
  "Sweeper Corruption Weave",
  "Shield Drone Bastion",
  "Repair Turret Depot",
  "Drifting Blink Labyrinth",
  "Gravity Missile Canal",
  "Corrupted Jammer Switchyard",
  "Sweeper Shield Gallery",
  "Repair Drone Orchard",
  "Drifting Core Furnace",
  "Blink Missile Reliquary",
  "Gravity Shield Foundry",
  "Corruption Repair Cathedral",
  "Corrupted Shift Garden",
  "Crown Corruption Gauntlet",
  "Corrupted Echo Causeway",
  "Drifting Station Spine",
  "Null Shift Convergence"
];

const CAMPAIGN_SECTIONS = [
  {
    id: "training-deck",
    label: "Training Deck",
    shortLabel: "Training",
    range: [0, 13],
    theme: "station",
    accent: "#00f0d2",
    sector: "OS-01 / CALIBRATION RING",
    condition: "Stable",
    directive: "Recover the flight recorder",
    blurb: "Movement, pressure plates, cargo discipline, and first-contact combat."
  },
  {
    id: "breach-deck",
    label: "Breach Deck",
    shortLabel: "Breach",
    range: [14, 27],
    theme: "hazard",
    accent: "#ffd52d",
    sector: "OS-02 / FRACTURE YARD",
    condition: "Hull breach",
    directive: "Cross the exposed forge",
    blurb: "Missiles, gravity pulls, and denser lock chains start testing timing."
  },
  {
    id: "reactor-deck",
    label: "Reactor Deck",
    shortLabel: "Reactor",
    range: [28, 41],
    theme: "reactor",
    accent: "#58e07a",
    sector: "OS-03 / VERDANT CORE",
    condition: "Biohazard",
    directive: "Restore coolant circulation",
    blurb: "Support enemies, split routes, and harsher pressure management."
  },
  {
    id: "singularity-deck",
    label: "Corruption Site",
    shortLabel: "Corruption",
    range: [42, 58],
    theme: "midnight",
    accent: "#b78cff",
    sector: "OS-04 / NULL ARCHIVE",
    condition: "Echo corruption",
    directive: "Stabilize the drifting station",
    blurb: "Corruption spreads through Echo routes while the station tears loose and shifts around you."
  }
];

const CAMPAIGN_SECTION_ROUTES = {
  "training-deck": [
    [8, 70], [15, 59], [23, 49], [32, 41], [41, 36], [51, 35], [60, 39],
    [69, 47], [77, 57], [85, 67], [91, 56], [87, 43], [81, 31], [90, 21]
  ],
  "breach-deck": [
    [8, 66], [17, 66], [26, 66], [35, 66], [38, 54], [38, 42], [43, 30],
    [53, 27], [63, 27], [68, 39], [68, 52], [75, 64], [85, 58], [89, 42]
  ],
  "reactor-deck": [
    [8, 70], [17, 58], [27, 48], [38, 39], [50, 34], [62, 38], [73, 47],
    [82, 58], [90, 69], [80, 74], [68, 68], [58, 58], [68, 47], [84, 35]
  ],
  "singularity-deck": [
    [8, 70], [20, 70], [32, 70], [45, 70], [58, 70], [72, 70], [86, 64],
    [89, 50], [86, 35], [75, 23], [61, 16], [46, 17], [32, 24], [22, 36],
    [26, 50], [42, 49], [62, 45]
  ]
};
const CAMPAIGN_ROUTE_POINTS = CAMPAIGN_SECTION_ROUTES["singularity-deck"];
const getCampaignRoutePoints = (sectionId, count) => (CAMPAIGN_SECTION_ROUTES[sectionId] || CAMPAIGN_SECTION_ROUTES["training-deck"]).slice(0, count);
const getCampaignRoutePath = (sectionId, count) => getCampaignRoutePoints(sectionId, count)
  .slice(0, count)
  .map(([x, y], index) => `${index ? "L" : "M"} ${x} ${y}`)
  .join(" ");

const AVATARS = [
  { id: "yellow", label: "Signal Drone", colors: ["#ffd52d", "#061012"] },
  { id: "cyan", label: "Echo Wing", colors: ["#00f0d2", "#062125"] },
  { id: "red", label: "Hazard Skiff", colors: ["#ff4e41", "#2b0b0a"] },
  { id: "green", label: "Repair Unit", colors: ["#58e07a", "#071b10"] },
  { id: "white", label: "Archive Glider", colors: ["#e7f0ef", "#19272d"] },
  { id: "gold", label: "Salvage Ace", colors: ["#ffb000", "#221706"] }
];
const AVATAR_BY_ID = new Map(AVATARS.map((avatar) => [avatar.id, avatar]));
const WEAPON_DEFAULT = "pulse";
const COSMETIC_DEFAULTS = { body: "#dfe9e8", accent: "#ffd52d", trail: "#00f0d2", frame: "arrow", cockpit: "slit", engine: "twin", decal: "none", armor: "clean", pet: "none", dashStyle: "streak", weapon: WEAPON_DEFAULT, ability: ABILITY_DEFAULT };
const BODY_COLORS = ["#dfe9e8", "#ffd52d", "#00f0d2", "#58e07a", "#ff4e41", "#ffb000", "#b78cff", "#8aa0ff"];
const TRAIL_COLORS = ["#00f0d2", "#ffd52d", "#58e07a", "#ff4e41", "#e7f0ef", "#ff8a00", "#b78cff", "#8aa0ff"];
const UNIVERSAL_COLORS = [...new Set([
  COSMETIC_DEFAULTS.body,
  COSMETIC_DEFAULTS.accent,
  COSMETIC_DEFAULTS.trail,
  ...BODY_COLORS,
  ...TRAIL_COLORS,
  "#ff6ec7",
  "#9df6a3",
  "#7ef9ff",
  "#f5f7ff",
  "#ff9f7f",
  "#c9ff45",
  "#4de0ff",
  "#f4dd74",
  "#f77d9d",
  "#8cffda",
  "#7a91ff",
  "#f0a6ff",
  "#7ef0b6",
  "#ffcf6b"
])];
const DRONE_FRAMES = [
  { id: "arrow", label: "Arrow" },
  { id: "split", label: "Split Wing" },
  { id: "needle", label: "Needle" },
  { id: "heavy", label: "Heavy Barge" },
  { id: "halo", label: "Halo Skiff" },
  { id: "fang", label: "Fang Runner" },
  { id: "box", label: "Cargo Box" },
  { id: "kite", label: "Kite Wing" },
  { id: "fork", label: "Fork Nose" },
  { id: "moon", label: "Moon Glider" }
];
const COCKPITS = [
  { id: "slit", label: "Signal Slit", price: 0 },
  { id: "bubble", label: "Bubble Canopy", price: 65 },
  { id: "visor", label: "Wide Visor", price: 80 },
  { id: "core", label: "Core Eye", price: 95 },
  { id: "split", label: "Twin Lenses", price: 115 },
  { id: "crown", label: "Crown Glass", price: 135 }
];
const ENGINES = [
  { id: "twin", label: "Twin Jets", price: 0 },
  { id: "ring", label: "Ring Drive", price: 75 },
  { id: "fins", label: "Stabilizer Fins", price: 85 },
  { id: "core", label: "Core Thruster", price: 105 },
  { id: "sidepods", label: "Side Pods", price: 125 },
  { id: "afterburn", label: "Afterburn Rails", price: 150 }
];
const DECALS = [
  { id: "none", label: "No Decal", price: 0 },
  { id: "stripe", label: "Hazard Stripe", price: 45 },
  { id: "star", label: "Salvage Star", price: 70 },
  { id: "chevron", label: "Chevron Mark", price: 85 },
  { id: "circuit", label: "Circuit Trace", price: 105 },
  { id: "crown", label: "Ace Crown", price: 140 }
];
const ARMORS = [
  { id: "clean", label: "Clean Shell", price: 0 },
  { id: "plated", label: "Plated Hull", price: 90 },
  { id: "spiked", label: "Spike Guards", price: 115 },
  { id: "scanner", label: "Scanner Rails", price: 130 },
  { id: "cargo", label: "Cargo Clamps", price: 145 },
  { id: "reactor", label: "Reactor Braces", price: 170 }
];
const PETS = [
  { id: "none", label: "No Pet", color: "#6f858a", price: 0, perk: "No perk" },
  { id: "spark", label: "Spark Bit", color: "#ffd52d", price: 35, perk: "Very slowly refills energy" },
  { id: "wisp", label: "Echo Wisp", color: "#00f0d2", price: 45, perk: "Echo costs less energy" },
  { id: "ember", label: "Ember Dot", color: "#ff4e41", price: 55, perk: "Bullets hit harder" },
  { id: "moss", label: "Moss Byte", color: "#58e07a", price: 55, perk: "Slow hull repair" },
  { id: "orbit", label: "Orbit Pup", color: "#e7f0ef", price: 70, perk: "Small shield bar" },
  { id: "bolt", label: "Bolt Mite", color: "#ffb000", price: 80, perk: "Equipped ability cooldown is shorter" },
  { id: "lumen", label: "Lumen Eye", color: "#b2fff6", price: 95, perk: "Stronger shield recharge" },
  { id: "nova", label: "Nova Seed", color: "#ff8a00", price: 110, perk: "Bigger coin cache rewards" },
  { id: "royal", label: "Royal Core", color: "#b78cff", price: 140, perk: "Energy and hull trickle" },
  { id: "void", label: "Void Fleck", color: "#8aa0ff", price: 160, perk: "Lasers hurt less" }
];
const PET_BY_ID = new Map(PETS.map((pet) => [pet.id, pet]));
const DASH_STYLES = [
  { id: "streak", label: "Streak", price: 0 },
  { id: "ring", label: "Pulse Ring", price: 60 },
  { id: "spark", label: "Spark Spray", price: 90 },
  { id: "comet", label: "Comet Tail", price: 130 }
];
const DASH_STYLE_BY_ID = new Map(DASH_STYLES.map((dash) => [dash.id, dash]));
const WEAPONS = [
  { id: "pulse", label: "Pulse Carbine", price: 0, ammoMax: 18, reloadMs: 1050, fireDelay: 210, bulletSpeed: 620, damage: 1, spread: 0, shotsPerTrigger: 1, burstGap: 0, maxRange: 560, perk: "Balanced starter: stable aim and decent ammo." },
  { id: "pump", label: "Pump Scatter", price: 95, ammoMax: 8, reloadMs: 1450, fireDelay: 520, bulletSpeed: 560, damage: 1, spread: 0.24, shotsPerTrigger: 6, burstGap: 0, maxRange: 170, perk: "Huge close-range burst, but slow fire and small magazine." },
  { id: "burst", label: "Tri-Burst", price: 135, ammoMax: 24, reloadMs: 1300, fireDelay: 460, bulletSpeed: 650, damage: 1, spread: 0.04, shotsPerTrigger: 3, burstGap: 85, maxRange: 600, perk: "Great mid-range pressure with disciplined 3-round bursts." },
  { id: "needle", label: "Needle Rail", price: 175, ammoMax: 10, reloadMs: 1350, fireDelay: 340, bulletSpeed: 860, damage: 2, spread: 0.01, shotsPerTrigger: 1, burstGap: 0, maxRange: 880, perk: "High precision and damage, but low magazine size." },
  { id: "storm", label: "Storm Vector", price: 230, ammoMax: 34, reloadMs: 1600, fireDelay: 105, bulletSpeed: 600, damage: 1, spread: 0.11, shotsPerTrigger: 1, burstGap: 0, maxRange: 390, perk: "Very high DPS, but burns ammo fast and kicks wide." }
];
const ABILITIES = [
  { id: "dash", label: "Phase Dash", price: 0, energyCost: 10, cooldownMs: 1800, perk: "Free starter. Phase quickly through danger in your movement direction." },
  { id: "teleport", label: "Long Jump", price: 115, energyCost: 26, cooldownMs: 8500, perk: "Mark your aimed destination, then teleport there after a 2-second charge." },
  { id: "blastDash", label: "Blast Dash", price: 155, energyCost: 24, cooldownMs: 6500, perk: "Launch forward and send a damaging shockwave through enemies in your path." },
  { id: "cloak", label: "Invisibility Cloak", price: 185, energyCost: 28, cooldownMs: 10000, perk: "Become invisible to enemy targeting for 5 seconds." },
  { id: "grapple", label: "Grappling Hook", price: 210, energyCost: 18, cooldownMs: 4800, perk: "Pull yourself rapidly toward the aimed point, stopping at solid walls." }
];
const WEAPON_BY_ID = new Map(WEAPONS.map((weapon) => [weapon.id, weapon]));
const ABILITY_BY_ID = new Map(ABILITIES.map((ability) => [ability.id, ability]));
const EXPEDITION_UPGRADES = [
  { id: "echoArsenal", label: "Echo Arsenal", icon: "ECHO", cost: 4, detail: "Echoes fire stronger copies of your equipped weapon.", color: "#00f0d2" },
  { id: "echoConvergence", label: "Echo Convergence", icon: "SYNC", cost: 5, detail: "Your newest Echo fuses with the signal lattice and becomes a stronger combat Echo.", color: "#7ef9ff" },
  { id: "phaseWake", label: "Phase Wake", icon: "DASH", cost: 4, detail: "Dashes and grapples leave a damaging energy wake.", color: "#ffd52d" },
  { id: "volatileRounds", label: "Volatile Rounds", icon: "AMMO", cost: 5, detail: "Player rounds deal extra damage and travel farther.", color: "#ff8a00" },
  { id: "corruptionDrive", label: "Corruption Drive", icon: "NULL", cost: 4, detail: "High corruption increases damage instead of only weakening you.", color: "#ff6ec7" },
  { id: "salvageHeart", label: "Salvage Heart", icon: "CORE", cost: 3, detail: "Scrap restores additional hull, energy, and shield.", color: "#58e07a" }
];
const EXPEDITION_UPGRADE_BY_ID = new Map(EXPEDITION_UPGRADES.map((upgrade) => [upgrade.id, upgrade]));
const STATION_MUTATIONS = [
  { id: "blackout", label: "Emergency Blackout", detail: "The station dims. Hostiles become harder to read, but their attacks glow.", color: "#8aa0ff" },
  { id: "corruptionBloom", label: "Corruption Bloom", detail: "Corruption zones expand and recovery slows.", color: "#ff6ec7" },
  { id: "overclocked", label: "Hostile Overclock", detail: "Enemies move and attack faster.", color: "#ff4e41" },
  { id: "unstableHull", label: "Unstable Hull", detail: "Moving station rails accelerate.", color: "#ffd52d" },
  { id: "echoRevenants", label: "Echo Revenants", detail: "Destroyed hunter drones leave a final hostile signal burst.", color: "#b78cff" }
];
const STATION_EVENTS = [
  { id: "quiet", label: "Quiet Orbit", detail: "Systems remain nominal.", color: "#00f0d2" },
  { id: "hullBreach", label: "Hull Breach", detail: "Loose pressure currents drag the drone toward the breach.", color: "#8aa0ff" },
  { id: "reactorSurge", label: "Reactor Surge", detail: "Energy recharges, but laser systems hit harder.", color: "#ffd52d" },
  { id: "lockdown", label: "Security Lockdown", detail: "A roaming Pursuer has entered the room.", color: "#ff4e41" }
];
const SECTION_MINIBOSSES = {
  "training-deck": { name: "Mirror Marshal", kind: "mirror", color: "#00f0d2", hp: 10, cooldown: 980, chaseSpeed: 108, desiredRange: 205, projectileDamage: 10 },
  "breach-deck": { name: "Forge Ram", kind: "ram", color: "#ff8a00", hp: 14, cooldown: 1250, chaseSpeed: 160, desiredRange: 80, contactDamage: 0.072 },
  "reactor-deck": { name: "Thorn Stalker", kind: "thorn", color: "#58e07a", hp: 18, cooldown: 1380, chaseSpeed: 82, desiredRange: 250, projectileDamage: 12 },
  "singularity-deck": { name: "Null Harrier", kind: "harrier", color: "#b78cff", hp: 17, cooldown: 1180, chaseSpeed: 108, desiredRange: 225, projectileDamage: 13, blinkDistance: 235 }
};
const EXPEDITION_MINIBOSSES = {
  reclaimer: { name: "Cargo Reclaimer", kind: "reclaimer", color: "#e4b84a", hp: 12, cooldown: 1320, chaseSpeed: 78, desiredRange: 265, projectileDamage: 9 },
  lancer: { name: "Arc Lancer", kind: "lancer", color: "#63c9e8", hp: 14, cooldown: 1080, chaseSpeed: 122, desiredRange: 235, projectileDamage: 11 },
  bastion: { name: "Bastion Auditor", kind: "bastion", color: "#ef765f", hp: 17, cooldown: 1450, chaseSpeed: 62, desiredRange: 285, projectileDamage: 12 },
  spore: { name: "Spore Matriarch", kind: "spore", color: "#75d26c", hp: 19, cooldown: 1380, chaseSpeed: 72, desiredRange: 250, projectileDamage: 11 },
  archivist: { name: "Null Archivist", kind: "archivist", color: "#d67bcc", hp: 20, cooldown: 1260, chaseSpeed: 88, desiredRange: 260, projectileDamage: 13 }
};
const MINIBOSS_SPREADS = {
  mirror: [-0.26, -0.13, 0, 0.13, 0.26],
  harrier: [-0.08, 0.08],
  lancer: [-0.12, 0, 0.12]
};
const createMiniboss = (spec, x, y) => ({
  x,
  y,
  hp: spec.hp,
  cooldown: spec.cooldown,
  attackCooldown: spec.cooldown,
  pursuer: true,
  miniKind: spec.kind,
  miniName: spec.name,
  miniColor: spec.color,
  chaseSpeed: spec.chaseSpeed,
  desiredRange: spec.desiredRange,
  contactDamage: spec.contactDamage,
  projectileDamage: spec.projectileDamage,
  blinkDistance: spec.blinkDistance,
  angle: 0,
  pulse: 0
});
const SALVAGE_MODS = [
  { id: "piercingCoil", label: "Piercing Coil", cost: 4, detail: "Weapons deal +1 damage." },
  { id: "capacitorMesh", label: "Capacitor Mesh", cost: 3, detail: "Maximum energy increases by 20." },
  { id: "echoLens", label: "Echo Lens", cost: 5, detail: "Echo weapon damage is doubled." }
];
const SALVAGE_MOD_BY_ID = new Map(SALVAGE_MODS.map((mod) => [mod.id, mod]));
const STATION_EXPEDITION_NODES = [
  { id: "dock", label: "Docking Spine", deck: "D-01", type: "start", x: 9, y: 50, links: ["salvage", "power"], detail: "Your tether to open space. Every deeper route begins here.", rewardLabel: "Safe insertion", threat: 0, accent: "#8aa0ad" },
  { id: "salvage", label: "Cargo Reliquary", deck: "C-12", type: "salvage", x: 27, y: 24, levelIndex: 11, encounter: "Cargo Reclaimer", links: ["dock", "workshop", "security"], detail: "A collapsed freight cathedral. Stabilize its unique cargo lattice while the Cargo Reclaimer fans scrap across the lanes.", reward: "parts", rewardLabel: "+5 parts", threat: 2, accent: "#e4b84a" },
  { id: "power", label: "Power Relay", deck: "P-17", type: "power", x: 27, y: 76, levelIndex: 16, encounter: "Arc Lancer", links: ["dock", "security", "reactor"], detail: "Bring a dormant relay online inside a shifting capacitor causeway guarded by the precision-firing Arc Lancer.", reward: "power", rewardLabel: "+1 power, +28 energy", threat: 2, accent: "#63c9e8" },
  { id: "workshop", label: "Machine Chapel", deck: "W-03", type: "workshop", x: 49, y: 12, links: ["salvage", "security"], detail: "A quiet fabrication bay where recovered parts become persistent expedition modifications.", rewardLabel: "Install modifications", threat: 0, accent: "#f0d35b" },
  { id: "security", label: "Security Nexus", deck: "S-28", type: "security", x: 51, y: 50, levelIndex: 27, encounter: "Bastion Auditor", links: ["salvage", "power", "workshop", "reactor", "archive"], detail: "Cut the nexus sightlines through an authored crossfire chamber. The Bastion Auditor controls support drones and rotating volleys.", reward: "alert", rewardLabel: "-3 alert", threat: 3, accent: "#ef765f" },
  { id: "reactor", label: "Verdant Reactor", deck: "R-42", type: "reactor", x: 74, y: 76, levelIndex: 41, encounter: "Spore Matriarch", links: ["power", "security", "archive", "core"], detail: "A living heatwell where seeking spores protect the reactor core. Drawing from it also feeds the corruption.", reward: "energy", rewardLabel: "+55 energy, +18 corruption", threat: 4, accent: "#75d26c" },
  { id: "archive", label: "Null Archive", deck: "N-55", type: "corruption", x: 74, y: 24, levelIndex: 54, encounter: "Null Archivist", links: ["security", "reactor", "core"], detail: "A broken recorder index built around moving shelves and split corruption fields. Its Archivist sends rotating signal waves.", reward: "purge", rewardLabel: "-48 corruption", threat: 4, accent: "#d67bcc" },
  { id: "core", label: "Command Singularity", deck: "K-59", type: "boss", x: 93, y: 50, levelIndex: 58, encounter: "Khepri Sovereign", links: ["reactor", "archive"], detail: "The final guardian waits in a dedicated command vault. Four sectors must be secured before approach.", rewardLabel: "Conquer station", threat: 5, accent: "#ff665a" }
];
const CAMPAIGN_SECTION_BY_ID = new Map(CAMPAIGN_SECTIONS.map((section) => [section.id, section]));
const STATION_MUTATION_BY_ID = new Map(STATION_MUTATIONS.map((mutation) => [mutation.id, mutation]));
const STATION_EVENT_BY_ID = new Map(STATION_EVENTS.map((event) => [event.id, event]));
const STATION_NODE_BY_ID = new Map(STATION_EXPEDITION_NODES.map((node) => [node.id, node]));

export {
  W,
  H,
  ECHO_MS,
  ECHO_FRAME_MS,
  MAX_ECHOES,
  CELL,
  PLAYER_MARGIN,
  CARGO_MARGIN,
  MAX_ENERGY,
  ECHO_COST,
  ECHO_COLORS,
  ECHO_FILLS,
  ABILITY_DEFAULT,
  DIFFICULTY_TUNING,
  defaultSettings,
  KEYBINDS_KEY,
  defaultKeybinds,
  controlPresets,
  keybindActions,
  rooms,
  CAMPAIGN_SECTIONS,
  CAMPAIGN_ROUTE_POINTS,
  getCampaignRoutePoints,
  getCampaignRoutePath,
  AVATARS,
  AVATAR_BY_ID,
  WEAPON_DEFAULT,
  COSMETIC_DEFAULTS,
  BODY_COLORS,
  TRAIL_COLORS,
  UNIVERSAL_COLORS,
  DRONE_FRAMES,
  COCKPITS,
  ENGINES,
  DECALS,
  ARMORS,
  PETS,
  PET_BY_ID,
  DASH_STYLES,
  DASH_STYLE_BY_ID,
  WEAPONS,
  ABILITIES,
  WEAPON_BY_ID,
  ABILITY_BY_ID,
  EXPEDITION_UPGRADES,
  EXPEDITION_UPGRADE_BY_ID,
  STATION_MUTATIONS,
  STATION_EVENTS,
  SECTION_MINIBOSSES,
  EXPEDITION_MINIBOSSES,
  MINIBOSS_SPREADS,
  createMiniboss,
  SALVAGE_MODS,
  SALVAGE_MOD_BY_ID,
  STATION_EXPEDITION_NODES,
  CAMPAIGN_SECTION_BY_ID,
  STATION_MUTATION_BY_ID,
  STATION_EVENT_BY_ID,
  STATION_NODE_BY_ID
};
