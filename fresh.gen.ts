// DO NOT EDIT. This file is generated by Fresh.
// This file SHOULD be checked into source version control.
// This file is automatically updated during development when running `dev.ts`.

import * as $_404 from "./routes/_404.tsx";
import * as $_app from "./routes/_app.tsx";
import * as $api_play from "./routes/api/play.ts";
import * as $index from "./routes/index.tsx";
import * as $Scene from "./islands/Scene.tsx";
import type { Manifest } from "$fresh/server.ts";

const manifest = {
  routes: {
    "./routes/_404.tsx": $_404,
    "./routes/_app.tsx": $_app,
    "./routes/api/play.ts": $api_play,
    "./routes/index.tsx": $index,
  },
  islands: {
    "./islands/Scene.tsx": $Scene,
  },
  baseUrl: import.meta.url,
} satisfies Manifest;

export default manifest;
