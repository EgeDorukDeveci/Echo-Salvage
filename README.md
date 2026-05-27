# Echo Salvage

Echo Salvage is a top-down browser action-puzzle game set inside abandoned orbital stations. You pilot a salvage drone, solve locked rooms, fight hostile station systems, collect scrap and coins, and use your main power: an **Echo** that replays your recent actions.

The Echo records an eight-second window of movement, shooting, dashing, and interactions. When released, it replays that window and keeps following the next recorded action sequence, letting you coordinate with your own past and future movement patterns.

## Current Features

- Canvas-based 2D station gameplay
- Handmade 21-room campaign ordered by difficulty
- Echo replay puzzles with plates, switches, doors, lasers, cargo, and timing
- Hostiles: turrets, chase drones, missile sentries, gravity nodes, echo jammers, laser sweepers, shield drones, repair bots, and blink hunters
- Dash, abilities, weapons, ammo, reloads, health, shield, energy, scrap, and coins
- Coin crates and a coin-based shop for cosmetics, pets, weapons, abilities, and dash effects
- Character customization with live previews
- Local sign up/login with nickname, password, and optional email
- Customizable controls, mouse sensitivity, visual themes, and mobile/PC control options
- Level creator with import/export and testing
- Procedural ambient background music generated in the browser

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
