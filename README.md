# h5p-client

React + Vite + TypeScript frontend for the H5P Mini app. Renders
`<H5PEditorUI>` and `<H5PPlayerUI>` from [`@lumieducation/h5p-react`](https://www.npmjs.com/package/@lumieducation/h5p-react)
and talks to an H5P backend over HTTP at `/h5p/*`.

## Requirements

- Node.js 18+
- A running H5P backend on `http://localhost:3000` that serves the `/h5p/*`
  endpoints used below (see [Backend contract](#backend-contract)).
  Source: [AungPyaePhyo-Dev/h5p-server](https://github.com/AungPyaePhyo-Dev/h5p-server).

## Run

```bash
npm install
npm run dev       # http://localhost:5173
```

The Vite dev server proxies `/h5p/*` to `http://localhost:3000`
(see [vite.config.ts](vite.config.ts)).

## Scripts

| Script            | What it does                              |
| ----------------- | ----------------------------------------- |
| `npm run dev`     | Start Vite dev server on :5173            |
| `npm run build`   | Type-check (`tsc`) then produce `dist/`   |
| `npm run preview` | Serve the built `dist/` locally           |

## Project layout

- [index.html](index.html) — Vite entry
- [src/main.tsx](src/main.tsx) — React root
- [src/App.tsx](src/App.tsx) — list / edit / play views and backend calls
- [vite.config.ts](vite.config.ts) — dev server + `/h5p` proxy

## Using the app

1. Click **+ Create new content**.
2. Pick a content type in the H5P Hub picker (e.g. `H5P.MultiChoice`).
   The backend installs it on first use.
3. Fill in the fields and click **Save**.
4. The saved item appears in the list with **Play**, **Edit**, and
   **Download .h5p** actions.

## Backend contract

The frontend expects these endpoints (all relative to the proxy target):

| Method | Path                         | Used for                                   |
| ------ | ---------------------------- | ------------------------------------------ |
| GET    | `/h5p/content`               | List saved content                         |
| GET    | `/h5p/editor-model/:id`      | Load editor model (use `new` for create)   |
| POST   | `/h5p/content` / `:id`       | Create or update content                   |
| GET    | `/h5p/player-model/:id`      | Load player model                          |
| GET    | `/h5p/download/:id`          | Download `.h5p` package                    |

To point at a different backend, change the `proxy` target in
[vite.config.ts](vite.config.ts).
