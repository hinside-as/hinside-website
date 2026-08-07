import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://hinside.as",
  integrations: [react(), sitemap()],
  i18n: {
    locales: ["no", "en"],
    defaultLocale: "no",
    // "manual" hands routing to our own single dynamic [locale] pages
    // instead of requiring duplicated per-locale page files.
    routing: "manual",
  },
});
