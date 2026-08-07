import { defineMiddleware } from "astro:middleware";
import { middleware } from "astro:i18n";

export const onRequest = defineMiddleware(middleware({
  prefixDefaultLocale: true,
  redirectToDefaultLocale: false,
  fallbackType: "redirect",
}));
