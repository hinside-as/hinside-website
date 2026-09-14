import type { CollectionEntry } from "astro:content";
import type { Locale } from "../i18n/utils";

/**
 * Whichever image a case study's own page actually opens on — matching
 * work/[slug].astro's own priority (heroImage, if present, replaces slide
 * 0's media entirely; otherwise it's whatever the first section with an
 * image supplies). The homepage's portfolio card needs this exact image
 * (not the separately-curated `cover` field) so the View Transition it
 * declares (see src/lib/viewTransitions.ts) morphs into the same photo
 * rather than cross-fading into an unrelated one. Falls back to `cover`
 * (and its own alt text) only when a case study has none of the above yet.
 */
export function resolveCaseStudyHeroImage(
  entry: CollectionEntry<"case-studies">,
  locale: Locale,
): { src: string; alt: string } {
  if (entry.data.heroImage) {
    return { src: entry.data.heroImage.src, alt: entry.data.heroImage.alt[locale] };
  }
  const firstImageSection = entry.data.sections.find((section) => section.media?.type === "image");
  if (firstImageSection?.media?.type === "image") {
    return { src: firstImageSection.media.src, alt: firstImageSection.media.alt[locale] };
  }
  return { src: entry.data.cover, alt: entry.data.coverAlt[locale] };
}
