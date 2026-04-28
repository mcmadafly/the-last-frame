import { defineConfig } from "astro/config";
import fullReload from "vite-plugin-full-reload";

// Static site + Pages Functions (`functions/`) → deploy with `npm run pages:deploy`.
// Local full stack: `npm run pages:dev` (copy `.dev.vars.example` → `.dev.vars` for Resend).
// Add `@astrojs/cloudflare` when you need Astro SSR on Workers.
export default defineConfig({
  output: "static",
  vite: {
    plugins: [
      fullReload(
        [
          "src/**/*.{html,astro,css,js,ts,tsx,json}",
          "src/partials/**",
          "public/**/*",
        ],
        { delay: 120, log: false }
      ),
    ],
  },
});
