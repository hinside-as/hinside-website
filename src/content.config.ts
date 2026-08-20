import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const localized = z.object({
  no: z.string(),
  en: z.string(),
});

const localizedParagraphs = z.object({
  no: z.array(z.string()),
  en: z.array(z.string()),
});

const galleryImage = z.object({
  src: z.string(),
  alt: z.string(),
  // Only meaningful for "gallery" items — those render as full-bleed
  // slides (see the flattening in [slug].astro) and hit the same
  // desktop/mobile crop mismatch a section's own "image" media does.
  // "carousel" items stay small inline tiles regardless of viewport, so
  // this is simply unused there.
  mobileSrc: z.string().optional(),
  // Opts this gallery item out of the default edge-to-edge object-fit:
  // cover treatment — for a screenshot/mockup where the whole frame matters
  // (nothing meant to bleed off-screen), cropping it full-bleed loses
  // content. Renders inset with the slide's own background showing as a
  // margin instead. Unset by default so this stays a one-off per-image
  // choice, not a new universal behavior.
  padded: z.boolean().optional(),
  // Overrides the slide's own --color-bg-raised for the margin a "padded"
  // image leaves around itself — a hex string matching the image's own
  // background (e.g. a UI mockup's own page color) so the inset reads as
  // part of the same surface instead of a visible seam between two
  // different greys. Only meaningful alongside padded: true.
  background: z.string().optional(),
});

// Same fields as sectionMedia's standalone "video" entry (see its own
// comments below for the reasoning on each) — factored out so
// "videoGallery" items carry the exact same capabilities as a single
// section video, not a stripped-down subset.
const galleryVideo = z.object({
  src: z.string(),
  mobileSrc: z.string().optional(),
  poster: z.string().optional(),
  mobilePoster: z.string().optional(),
  allowUnmute: z.boolean().optional(),
});

const sectionMedia = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("image"),
    src: z.string(),
    alt: localized,
    // Optional art-directed crop for narrow viewports — a genuinely
    // different source image, not a resized variant of the same one. See
    // CaseStudySlideMedia's own comment in CaseStudyExperience.tsx for why
    // there's no separate mobileAlt.
    mobileSrc: z.string().optional(),
  }),
  // "gallery" is a small, static side-by-side set (2-4 images).
  z.object({ type: z.literal("gallery"), items: z.array(galleryImage) }),
  // "carousel" is for larger sets that warrant the drag/momentum carousel treatment.
  z.object({
    type: z.literal("carousel"),
    items: z.array(galleryImage),
    shape: z.enum(["square", "circle", "icon"]).default("square"),
    // Every shape desaturates at rest and reveals full colour on hover by
    // default (the site-wide carousel convention) — this opts a specific
    // carousel out of that entirely, e.g. product renders where the colour
    // itself is the point (different bottle variants), not something to
    // reward hovering for.
    colorful: z.boolean().optional(),
    // One extra full-bleed slide after the carousel, same chapter — for a
    // single follow-up image (e.g. the portrait system applied to a real
    // artifact) that doesn't belong in the carousel's own item set but
    // still reads as part of that chapter rather than starting a new one.
    trailingImage: galleryImage.optional(),
  }),
  z.object({
    type: z.literal("video"),
    src: z.string(),
    // Same art-directed-crop idea as "image"'s mobileSrc, and for the same
    // reason a wide desktop composition can fail completely reframed tall
    // — a distinct file, not a resized variant of the same one. Public/
    // video isn't run through astro:assets, so this is used as-is, no
    // width parameter to pick.
    mobileSrc: z.string().optional(),
    // Opts this specific video into a mute/unmute toggle button — most
    // autoplaying background video on this site has no audio worth
    // surfacing controls for, so this defaults off rather than adding a
    // button to every video regardless of whether it has anything to say.
    allowUnmute: z.boolean().optional(),
  }),
  // Same idea as "gallery" (images), but for a small set of video clips
  // that all belong to one chapter — the flattening in [slug].astro turns
  // each item into its own full-bleed "video" slide (only the first
  // carries the chapter's heading/body, same convention "gallery" already
  // uses), so CaseStudyExperience never needs to know a multi-video
  // section existed; it just sees N ordinary video slides in a row.
  z.object({ type: z.literal("videoGallery"), items: z.array(galleryVideo) }),
]);

const section = z.object({
  id: z.string(),
  heading: localized,
  body: localizedParagraphs,
  media: sectionMedia.optional(),
});

const caseStudies = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/case-studies" }),
  schema: z.object({
    title: localized,
    // Short descriptive one-liner, not a full summary — see
    // docs/case-study-assets.md's naming/metadata section for the
    // title/description/client-studio-categories hierarchy this feeds.
    description: localized,
    client: z.string(),
    // Only set for legacy agency work where a separate studio produced
    // the project (e.g. "Creuna Norway") — omitted entirely for
    // Hinside-led projects rather than set to "Hinside", per that same
    // doc's authorship-transparency rule.
    studio: z.string().optional(),
    // Design disciplines shown in the client/studio/categories metadata
    // line — restrained to 1-3 of the *most meaningful* disciplines, not
    // every service involved. Not localized: these are fixed category
    // names (see the list in docs/case-study-assets.md), not prose.
    categories: z.array(z.string()).min(1).max(3),
    accent: z.string().optional(),
    cover: z.string(),
    coverAlt: localized,
    heroVideo: z
      .object({
        src: z.string(),
        poster: z.string().optional(),
        // See sectionMedia's "video" mobileSrc comment — same idea, same
        // reasoning, applied to the opening hero loop.
        mobileSrc: z.string().optional(),
        // <video poster> has no per-<source> equivalent — unlike src,
        // which a media-query <source> can swap declaratively, the poster
        // frame is an attribute of <video> itself. Falls back to the
        // desktop poster if omitted.
        mobilePoster: z.string().optional(),
      })
      .optional(),
    sections: z.array(section).default([]),
    // Awards/press mentions — rendered as its own slide (second-to-last,
    // right before credits), not per-locale: award/jury names are proper
    // nouns that don't get translated (see docs/case-study-assets.md).
    recognition: z
      .array(
        z.object({
          name: z.string(),
          award: z.string().optional(),
          year: z.number(),
        }),
      )
      .optional(),
    credits: z
      .array(
        z.object({
          role: localized,
          // Almost always a plain proper noun (a person's name, not
          // translated — see recognition's own comment on the same idea).
          // Localized only for the rare studio-credit line that legitimately
          // reads differently per language (e.g. "now" vs. "nå" in a former-
          // name aside), not for people.
          name: z.union([z.string(), localized]),
        }),
      )
      .optional(),
    featured: z.boolean().default(false),
  }),
});

const testimonials = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/testimonials" }),
  schema: z.object({
    quote: localized,
    name: z.string(),
    role: z.string(),
  }),
});

export const collections = {
  "case-studies": caseStudies,
  testimonials,
};
