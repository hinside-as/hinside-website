import { defaultLocale, locales, ui, type Locale, type UiKey } from "./ui";

export { locales, defaultLocale };
export type { Locale };

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function useTranslations(locale: Locale) {
  return function t(key: UiKey): string {
    return ui[locale][key] ?? ui[defaultLocale][key];
  };
}

export function otherLocale(locale: Locale): Locale {
  return locale === "no" ? "en" : "no";
}

export function localizedPath(locale: Locale, path: string): string {
  const cleanPath = path.replace(/^\/(no|en)(\/|$)/, "/");
  return `/${locale}${cleanPath === "/" ? "" : cleanPath}`;
}
