import { defineConfig } from "astro/config";

// Static site — deploy `dist/` to Cloudflare Pages (`wrangler pages deploy dist`).
// Add `@astrojs/cloudflare` when you need SSR, D1, or Workers routes.
export default defineConfig({
  output: "static",
});
