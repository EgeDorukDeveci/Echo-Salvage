# Echo Salvage

Echo Salvage is a top-down browser action-puzzle game set inside abandoned orbital stations. You pilot a salvage drone, solve locked rooms, fight hostile station systems, collect scrap and coins, and use your main power: an **Echo** that replays your recent actions.

The Echo records an eight-second window of movement, shooting, dashing, and interactions. When released, it replays that window and keeps following the next recorded action sequence, letting you coordinate with your own past and future movement patterns.

## Current Features

- Canvas-based 2D station gameplay
- Handmade 21-room campaign ordered by difficulty
- Echo replay puzzles with plates, switches, doors, lasers, cargo, and timing
- Hostiles: turrets, chase drones, missile sentries, gravity nodes, echo jammers, laser sweepers, shield drones, repair bots, and blink hunters
- Dash, abilities, weapons, ammo, reloads, health, shield, energy, scrap, and coins
- Coin crates and a coin-based Customization Bay for skins, parts, pets, weapons, abilities, dash effects, and universal colors
- Character customization with a larger live preview and buy/equip flow on one screen
- Universal color unlocks: buy a color once, then use it across drone paint, glow, trail, and engine-style effects
- Local sign up/login with nickname, password, and optional email
- Customizable controls, mouse sensitivity, visual themes, and mobile/PC control options
- Difficulty settings that affect run pressure without changing room shapes
- Level creator with a compact Geometry Dash-inspired editor, right-click object editing, import/export, and instant testing
- Procedural ambient background music generated in the browser

## Difficulty

Difficulty does **not** reshape levels or move puzzle objects. The campaign rooms stay the same so puzzles remain learnable and fair.

- **Easy** gives more max energy, reduces incoming damage, slows hostiles, lengthens enemy cooldowns, and weakens missiles/lasers.
- **Standard** uses the intended baseline balance.
- **Hard** lowers max energy, increases incoming damage, speeds up hostiles, shortens enemy cooldowns, strengthens missiles/lasers, and gives hostiles a small hull boost.

## Campaign Rooms

The campaign is listed from easiest to hardest:

1. Echo Plate Training
2. Cargo Pressure Chapel
3. Laser Switch Spine
4. First Turret Gallery
5. Drone Chase Hangar
6. Split Echo Circuit
7. Forklift Cargo Lab
8. Relay Turret Yard
9. Memory Laser Switchback
10. Locked Drone Orchard
11. Twin Echo Nursery
12. Pressure Cargo Foundry
13. Scrap Turret Conservatory
14. Dual Drone Relay
15. Missile Dash Range
16. Gravity Node Primer
17. Jammer Mirror Lock
18. Sweeper Repair Bay
19. Shield Drone Gauntlet
20. Blink Hunter Furnace
21. Echo Core Finale

## Controls

- Move: `WASD` or arrow keys
- Aim: mouse
- Shoot: left click or `Space`
- Dash: `Shift`
- Interact: `E`
- Spawn Echo: `Q`
- Reload: configured reload key
- Pause: `Esc`
- Retry room: `R` or Pause menu > Retry Level

Controls can be changed in the in-game Controls/Settings screens.

## Customization Bay

The old separate Profile and Shop screens have been merged into the **Customization Bay**. This is where players:

- Choose their avatar/profile icon
- Preview the drone, dash trail, weapon style, ability, and pet
- Buy and equip drone frames, cockpits, engines, armor kits, decals, pets, weapons, abilities, and dash animations
- Unlock universal colors once and reuse them across multiple cosmetic slots

Coins are earned from orange coin crates during rooms. Real-money purchases are currently removed/paused.

## Run Locally

Install dependencies:

```bash
npm install
```

Start the game:

```bash
npm run dev
```

Open the shown localhost URL, usually:

```text
http://localhost:5173/
```

Build the static app:

```bash
npm run build
```

## Community Levels

The Community Levels tab is currently marked **In Construction**.

For now, the level creator is focused on local building, testing, importing, and exporting. Global publishing was intentionally paused while the core game and campaign are being improved.

## Notes

- Real-money purchases are not active.
- The game is a Vite/React app with the gameplay rendered on HTML canvas.
- The background music is original procedural Web Audio, not an imported copyrighted song.
