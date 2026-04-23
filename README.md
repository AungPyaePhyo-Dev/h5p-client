# h5p-client

React + Vite frontend for the H5P Mini app. Hosts `<H5PEditorUI>` and
`<H5PPlayerUI>` and talks to the [h5p-server](../h5p-server) NestJS backend.

## Run

Both projects must be running.

### 1) Backend (one-time setup + start)

```bash
cd ../h5p-server
npm install
npm run h5p:fetch       # downloads H5P core + editor static assets (~30MB). Run once.
npm run prisma:generate
npm run prisma:migrate  # requires a running Postgres (see .env)
npm run start:dev       # listens on :3000
```

### 2) Frontend

```bash
npm install
npm run dev             # listens on :5173, proxies /h5p/* to :3000
```

Open http://localhost:5173.

## Creating H5P content

1. Click **+ Create new content**.
2. Use the H5P Hub picker inside the editor to choose a content type
   (e.g. H5P.MultiChoice). The backend installs it from the H5P Hub on first use.
3. Fill in the fields, click **Save**.
4. The saved content appears in the list with **Play**, **Edit**, and
   **Download .h5p** buttons.
