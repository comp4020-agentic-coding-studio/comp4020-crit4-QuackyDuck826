import { defineConfig } from "astro/config";

// Written by the course stack skill; values derived from this repo's origin
// remote. The dev server serves under the base too, so a path bug reproduces
// locally instead of only on the live URL. build.format "file" keeps
// page.astro building to dist/page.html, so hand-written relative links and
// asset paths keep working; compressHTML true because the default ("jsx")
// strips the space before line-broken inline elements in hand-written prose.
export default defineConfig({
  site: "https://comp4020-agentic-coding-studio.github.io",
  base: "/comp4020-crit4-QuackyDuck826",
  build: { format: "file" },
  compressHTML: true,
  // spec/instrument.test.ts reads only dist/index.html, so main.ts's bundled
  // script (which pulls in scheduler/characters/voices) has to stay inlined
  // rather than emitted as an external hashed _astro/*.js file. Astro inlines
  // a hoisted script under Vite's assetsInlineLimit (default 4kb); this
  // headroom keeps it inlined as the instrument grows.
  vite: { build: { assetsInlineLimit: 65536 } },
});
