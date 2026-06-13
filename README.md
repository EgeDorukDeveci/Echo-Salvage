# Echo Salvage

Echo Salvage is a top-down browser action-puzzle game set inside abandoned orbital stations. You pilot a salvage drone, solve locked rooms, fight hostile station systems, collect scrap and coins, and use your main power: an **Echo** that replays your recent actions.

The Echo continuously records the latest eight seconds of movement, shooting, and interactions. Every deployment snapshots that complete rolling window. Each Echo replays its own snapshot, then remains at its final position so multiple Echoes can hold different jobs.

## Current Features

- Canvas-based 2D station gameplay
- Handmade 59-room campaign ordered by difficulty
- Optional room-specific Salvage Contracts with one-time coin rewards
- Twelve hidden Station Secrets with proximity interference, one-time rewards, and a persistent Recorder Archive
- Echo replay puzzles with plates, switches, doors, lasers, cargo, and timing
- Hostiles: turrets, chase drones, missile sentries, gravity nodes, echo jammers, laser sweepers, shield drones, repair bots, and blink hunters
- Four visually specialized orbital biomes with unique floors, walls, landmarks, cores, turrets, and section-native hostile variants such as Death Plants, Magma Vents, and Black Holes
- A single equipped-ability system: starter Phase Dash plus Long Jump, Blast Dash, Invisibility Cloak, and Grappling Hook
- Coin crates and a coin-based Customization Bay for skins, parts, pets, weapons, abilities, dash effects, and universal colors
- Character customization with a larger live preview and buy/equip flow on one screen
- Universal color unlocks: buy a color once, then use it across drone paint, glow, trail, and engine-style effects
- Four-deck campaign board with automatic visual/theme escalation and sequential room unlocking
- Local sign up/login with nickname, password, and optional email, using PBKDF2 password hashing plus expiring session records
- Customizable controls, mouse sensitivity, visual themes, and mobile/PC control options
- Campaign difficulty that ramps automatically by deck, while custom levels still respect the manual difficulty setting
- Level creator with a compact Geometry Dash-inspired editor, right-click object editing, import/export, and instant testing
- Procedural ambient background music generated in the browser

## Campaign Structure

The campaign is split into four themed station decks:

- **Training Deck** teaches movement, cargo, pressure plates, and the first enemy reads.
- **Breach Deck** starts leaning on missiles, gravity pulls, and wider lock chains.
- **Reactor Deck** mixes support hostiles and denser route-planning.
- **Corruption Site** pushes the longest Echo chains and the harshest combinations.

Rooms unlock sequentially. Clearing a room opens the next one, so stars are now performance ratings instead of skip currency.

Every campaign room also offers one optional **Salvage Contract**. Contracts reward careful play such as recovering every salvage shard, limiting Echo deployments, preserving hull or energy, or extracting within a generous timer. Contract rewards are paid once per room and never block campaign progression.

Twelve selected campaign rooms conceal optional **Station Secrets**. Their encrypted recorder fragments only become visible at close range, can be recovered with the interact control, and reveal station lore in the Systems Manual's Recorder Archive. Secrets grant a one-time coin reward and never affect extraction.

## Difficulty

Campaign difficulty now ramps automatically as you move deeper into the station. Room layouts still stay fixed so puzzles remain learnable and fair.

- **Campaign rooms** change hostile pressure, cooldowns, damage, and energy capacity by deck and depth.
- **Custom levels / editor tests** still use the manual `Easy`, `Standard`, and `Hard` setting from the Settings screen.

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
22. Cargo Jammer Vestibule
23. Shield Turret Atrium
24. Gravity Cargo Carousel
25. Repair Bot Dock
26. Blink Switch Arcade
27. Missile Cargo Runway
28. Sweeper Plate Loom
29. Drone Shield Orchard
30. Jammer Drone Canal
31. Gravity Missile Gallery
32. Repair Sweeper Foundry
33. Blink Jammer Chapel
34. Shielded Reactor Relay
35. Shield Repair Lockchain
36. Salvage Singularity Core
37. Cargo Switch Observatory
38. Turret Crossfire Library
39. Drone Fork Hangar
40. Missile Dash Parabola
41. Gravity Plate Crucible
42. Verdant Maw Cloister
43. Sweeper Corruption Weave
44. Shield Drone Bastion
45. Repair Turret Depot
46. Drifting Blink Labyrinth
47. Gravity Missile Canal
48. Corrupted Jammer Switchyard
49. Sweeper Shield Gallery
50. Repair Drone Orchard
51. Drifting Core Furnace
52. Blink Missile Reliquary
53. Gravity Shield Foundry
54. Corruption Repair Cathedral
55. Corrupted Shift Garden
56. Crown Corruption Gauntlet
57. Corrupted Echo Causeway
58. Drifting Station Spine
59. Null Shift Convergence

Rooms 22-59 are hand-authored advanced rooms. They spread the hostile types across the set instead of putting every enemy into every room; shield drones and repair bots are placed close to other hostiles so they function as support units. Rooms 37-59 add more varied exit positions, cargo routes, Echo plate chains, and late-game hostile combinations.

## Controls

- Move: `WASD` or arrow keys
- Aim: mouse
- Shoot: left click or `Space`
- Use equipped ability: `Shift` or `F`
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

## Local Auth Note

This build now stores normal user passwords as PBKDF2 hashes with per-user salts and uses expiring local session tokens containing only an id, nonce, and expiry. Profile, progress, and economy data are loaded from the matching user record instead of trusting session snapshots. This is more trustworthy than the old plain-text browser storage, but it is still a local browser auth flow, not a public production auth backend.

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

Run the stock-room sanity audit:

```bash
npm run audit:levels
```

This checks the handmade campaign rooms for structural issues like bad spawns, unused lock ids, over-capacity pressure plate counts, isolated support bots, missing cargo roles, weak reward density, exit collisions, entities embedded in walls or doors, and early hostile introductions that would break the campaign teaching curve.

Run the local verification bundle:

```bash
npm run verify
```

That runs gameplay reliability tests, the room audit, and the production build.

Print the campaign pressure report:

```bash
npm run report:difficulty
```

This gives a quick weighted readout of room pressure so we can spot suspicious spikes or dips before changing the campaign by hand.

## Community Levels

The Community Levels tab is currently marked **In Construction**.

For now, the level creator is focused on local building, testing, importing, and exporting. Global publishing was intentionally paused while the core game and campaign are being improved.

## Notes

- Real-money purchases are not active.
- The game is a Vite/React app with the gameplay rendered on HTML canvas.
- The background music is original procedural Web Audio, not an imported copyrighted song.

## Source Architecture

- `src/App.jsx` owns top-level navigation and screen composition.
- `src/game/config.js` contains immutable balance data, catalogs, campaign metadata, and expedition definitions.
- `src/game/levels.js` contains the authored campaign and expedition rooms.
- `src/game/geometry.js` contains level normalization, collision, and spatial helpers.
- `src/game/combat.js` contains shared boss and enemy-projectile helpers.
- `src/game/rendering.js` contains canvas drawing only.
- `src/game/rules.js` contains campaign, objective, tuning, and expedition progression rules.
- `src/game/simulation.js` contains tested Echo, cargo, phase-movement, and extraction rules shared by the live game loop.
- `src/hooks/useGame.js` owns the live gameplay simulation and input loop.
- `src/hooks/useAmbient.js` owns the procedural ambient audio lifecycle.
- `src/components/GameView.jsx` renders the canvas HUD and mobile controls.
- `src/components/screens/` contains the independent auth, campaign, customization, settings, run, and editor screens.
- `src/services/profile-store.js` owns local authentication, progress, economy, keybinds, and level-code conversion.
- `scripts/audit-levels.js` and `scripts/report-difficulty.js` import the real level modules directly.
