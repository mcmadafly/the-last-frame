import { defineConfig } from "astro/config";
import fullReload from "vite-plugin-full-reload";

// Static site — deploy `dist/` to Cloudflare Pages (`wrangler pages deploy dist`).
// Add `@astrojs/cloudflare` when you need SSR, D1, or Workers routes.
export default defineConfig({
  output: "static",
  vite: {
    plugins: [
      fullReload(
        [
          "src/**/*.{html,astro,css,js,ts,tsx,json}",
          "public/**/*",
        ],
        { delay: 120, log: false }
      ),
    ],
  },
});
