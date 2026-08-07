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
});

const sectionMedia = z.discriminatedUnion("type", [
  z.object({ type: z.literal("image"), src: z.string(), alt: localized }),
  // "gallery" is a small, static side-by-side set (2-4 images).
  z.object({ type: z.literal("gallery"), items: z.array(galleryImage) }),
  // "carousel" is for larger sets that warrant the drag/momentum carousel treatment.
  z.object({
    type: z.literal("carousel"),
    items: z.array(galleryImage),
    shape: z.enum(["square", "circle", "icon"]).default("square"),
  }),
  z.object({ type: z.literal("video"), src: z.string() }),
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
    dek: localized,
    client: z.string(),
    year: z.number(),
    accent: z.string().optional(),
    cover: z.string(),
    coverAlt: localized,
    heroVideo: z
      .object({
        src: z.string(),
        poster: z.string(),
      })
      .optional(),
    sections: z.array(section).default([]),
    credits: z
      .array(
        z.object({
          role: localized,
          name: z.string(),
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
