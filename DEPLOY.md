# Echo Salvage Global Level Publishing

This project includes a small Node.js community server for published maps.

## Local test

Run the game:

```bash
npm run dev
```

Run the community server:

```bash
npm run community
```

The local API is:

```text
http://localhost:8787
```

## Deploy the community server on Render

1. Push this folder to GitHub.
2. Open Render and create a new Blueprint from the repo.
3. Render will read `render.yaml`.
4. It creates a Node web service named `echo-salvage-community`.
5. It also creates a persistent disk at `/var/data`, where published maps are saved.

After deploy, Render gives you a URL like:

```text
https://echo-salvage-community.onrender.com
```

## Connect the game to the deployed server

Create `.env.local` while developing:

```env
VITE_LEVEL_API_URL=https://echo-salvage-community.onrender.com
```

Then rebuild or run dev:

```bash
npm run build
npm run dev
```

For a hosted frontend, set the same `VITE_LEVEL_API_URL` environment variable in the frontend host before building.
