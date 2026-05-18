# Echo Salvage

Echo Salvage is a top-down browser game about solving space-station puzzles with copies of your recent past.

You pilot a salvage drone through abandoned orbital rooms, collecting scrap, dodging lasers, fighting turrets and hunter drones, opening locked exits, and using **Echoes**: ghost drones that replay your last 8 seconds of movement, shooting, and interactions.

## Features

- Canvas-based 2D action-puzzle gameplay
- Echo replay mechanic with recorded movement, shooting, and interaction
- Distinct station rooms with plates, switches, doors, lasers, turrets, drones, scrap, and reactor cores
- Dash movement with energy cost
- Local sign up/login flow with nickname, password, and optional email
- Level creator with import/export
- Community level publishing API with local fallback
- Procedural ambient background music generated in-browser

## Controls

- Move: `WASD` or arrow keys
- Aim: mouse
- Shoot: left click or `Space`
- Dash: `Shift`
- Interact: `E`
- Spawn Echo: `Q`
- Pause: `Esc`
- Retry room: `R` or Pause menu > Retry Level

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

## Community Level Server

Start the local publishing server:

```bash
npm run community
```

The local API runs at:

```text
http://localhost:8787
```

The game uses `VITE_LEVEL_API_URL` when set. Without it, it falls back to the local server and then to local browser storage.

Example `.env.local`:

```env
VITE_LEVEL_API_URL=http://localhost:8787
```

## Deploy Global Publishing

The project includes `render.yaml` for deploying the community server on Render.

1. Push this project to GitHub.
2. In Render, create a new Blueprint from the repo.
3. Render will use `npm run community`.
4. Published maps are saved to the configured persistent disk.
5. Set the frontend `VITE_LEVEL_API_URL` to the deployed server URL.

More details are in `DEPLOY.md`.
