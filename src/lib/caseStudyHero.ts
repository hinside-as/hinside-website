import type { CollectionEntry } from "astro:content";
import type { Locale } from "../i18n/utils";

/**
 * Whichever image a case study's own page actually opens on — matching
 * work/[slug].astro's own priority (heroVideo, if present, replaces slide
 * 0's media entirely; otherwise it's whatever the first section with an
 * image supplies). The homepage's portfolio card needs this exact image
 * (not the separately-curated `cover` field) so the View Transition it
 * declares (see src/lib/viewTransitions.ts) morphs into the same photo
 * rather than cross-fading into an unrelated one. Falls back to `cover`
 * (and its own alt text) only when a case study has neither yet.
 */
export function resolveCaseStudyHeroImage(
  entry: CollectionEntry<"case-studies">,
  locale: Locale,
): { src: string; alt: string } {
  const firstImageSection = entry.data.sections.find((section) => section.media?.type === "image");
  if (entry.data.heroVideo?.poster) {
    // No dedicated alt for a video's poster frame in the schema — the
    // section image's own alt (if one exists further down) or the cover's
    // is the closest available description.
    return {
      src: entry.data.heroVideo.poster,
      alt: firstImageSection?.media?.type === "image" ? firstImageSection.media.alt[locale] : entry.data.coverAlt[locale],
    };
  }
  if (firstImageSection?.media?.type === "image") {
    return { src: firstImageSection.media.src, alt: firstImageSection.media.alt[locale] };
  }
  return { src: entry.data.cover, alt: entry.data.coverAlt[locale] };
}
