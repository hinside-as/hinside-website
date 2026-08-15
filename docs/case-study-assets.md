# Adding a new case study — asset naming & template

A working reference for dropping a new portfolio case into the site: where files go, what to name them, and a copy-pasteable content JSON skeleton. See `CLAUDE.md`'s "Media pipeline" and "Content model" sections for the underlying architecture this is built on — this doc is the practical checklist version.

## Do you need separate desktop and mobile images?

**Only if the same crop genuinely fails on one of the two shapes.** A case study's full-bleed section slide renders in two very different boxes: a wide ~75vw × 100dvh column on desktop, a narrow full-width × 100dvh column on mobile. `object-fit: cover` fills whichever box it's in by cropping the other axis — for a well-centered subject, one file still works fine at both. For a wide/landscape composition (a product line-up, an environment shot) forced into a tall mobile frame, or the reverse, no amount of `object-position` tweaking saves it; the crop needs to be a genuinely different image, not a resized version of the same one.

For that case, a section's `"image"` media (and a `"gallery"` item — not `"carousel"`, whose items are small inline tiles regardless of viewport) accepts an optional `mobileSrc`, resolved through the same `astro:assets` pipeline at `width: 1080` (see "Recommended source specs" below) and served via a `<picture>`/`<source media="(max-width: 720px)">` swap in `CaseStudyExperience.tsx`'s `Media` component — no JS, pure CSS media-query selection. Leave it out and the single `src` is used at every width, same as before; there's no obligation to provide a mobile crop for every image, only the ones that actually need it.

One real limitation: `alt` isn't swapped alongside `mobileSrc` — a `<source>` has no `alt` of its own, so the accessible name always comes from the fallback `<img>`'s `alt`. Write `alt` text that describes the subject in a way that holds up for both crops.

## Where files go

Three locations, not interchangeable (see CLAUDE.md for the full reasoning):

| What | Location | Why |
|---|---|---|
| Raster photos/mockups (`.png`/`.jpg`/`.webp`) used as `"image"` or `"gallery"` section media, or as `cover`/video posters | `src/assets/media/projects/<slug>/...` | Goes through `astro:assets` (`getMediaImage()` + `getImage()`) for optimization/resizing. Referenced in JSON with a **relative path, no leading slash**. |
| SVGs (icons, illustrations, portraits) used as `"carousel"` items, and video files | `public/media/projects/<slug>/...` | Served as-is, not processed by `astro:assets` — vector art doesn't benefit from raster optimization, and video files aren't run through it either. Referenced in JSON with a **leading `/media/...` path**. |
| Original/pre-export source files (Figma exports, PSDs, raw footage) | `media-archive/` (gitignored) | Reference only — never read at build or runtime. Keep it there so the source is recoverable, but don't point any JSON `src` at it. |

The page templates decide which pipeline to use by checking the string itself: a `src` starting with `/` is served straight from `public/`; anything else is treated as a relative path into `src/assets/media/` and optimized. This is why the leading slash matters — it's not cosmetic.

## Folder & file naming convention

Based on the two existing case studies (`grieg-connect`, `samspill`) — match this shape for a new one:

```
src/assets/media/projects/<slug>/
  cover.png                                    — homepage & work-carousel cover (schema: cover)
  video-posters/<name>[-desktop|-mobile].jpg   — poster frame(s) for a video (schema: heroVideo.poster / .mobilePoster)
  sections/<name>[-desktop|-mobile].png        — one file (or desktop/mobile pair) per "image"/"gallery" section (schema: sections[].media.src / .mobileSrc)

public/media/projects/<slug>/
  video/<name>[-desktop|-mobile].mp4     — heroVideo.src/.mobileSrc and any in-body "video" section media
  icons/icon-01.svg, icon-02.svg, ...    — "carousel" items with shape: "icon"
  illustrations/illustration-01.svg, ... — "carousel" items with shape: "square"
  portraits/portrait-01.svg, ...         — "carousel" items with shape: "circle"
```

Rules:

- `<slug>` is the case study's URL slug — must match the JSON file's own filename in `src/content/case-studies/<slug>.json` (that filename is the collection entry's `id`, which `[slug].astro` uses to build the route).
- `<name>` (for covers, posters, section images/videos) is kebab-case and describes the image's **content**, not its position (`sampils-bottle.png`, not `section-2.png`) — this keeps filenames meaningful even if sections get reordered.
- **Desktop/mobile pair** (only when the image or video has a genuinely different crop per breakpoint — see "Do you need separate desktop and mobile images?" above): same `<name>`, with a literal `-desktop` / `-mobile` suffix appended right before the extension. No suffix at all when there's just one file shared at every width.
  - Single: `hero-loop.mp4`
  - Pair: `hero-loop-desktop.mp4` + `hero-loop-mobile.mp4`
  - Same pattern for posters: `hero-poster.jpg`, or `hero-poster-desktop.jpg` + `hero-poster-mobile.jpg`
- Extension must match the file's actual format — don't rename a PNG to `.jpg` (or vice versa) just to match a neighboring file; `sips -g pixelWidth <file>` or `file <file>` will tell you what a file actually is if its extension looks suspect.
- Numbered SVG sets (`icon-01.svg`...) use **zero-padded two-digit** numbers in a flat sequence, matching `GalleryCarousel`'s shape prop (`icon` / `square` / `illustration` naming / `circle` / `portrait` naming — see `src/content.config.ts`'s `sectionMedia` union for the three allowed `shape` values).
- Client logos are shared across all case studies, not per-project — they live in `public/media/shared/client-logos/` and are wired up in `src/data/clients.ts`, not in a case study's own JSON.

## Recommended source specs

- **Cover** (`cover.png`): **1600×1600px, square.** The homepage work-carousel and cross-promo cards render it in a fixed square frame (`getImage({ width: 800 })`, then `object-fit: cover`) — 1600 is exactly 2x the requested display size, which is what keeps it sharp on retina/high-DPI screens. Export square (or crop to square) with the subject centered; a tall/narrow source loses content off the sides once cropped.
- **Section images / video posters**: **at least 2400px on the long edge.** These are requested at `width: 1920` for full-bleed slides, so this one file has to hold up at full-bleed on the largest screens too. Astro can only downsample, never sharpen a source back up, so 2400px+ leaves real headroom instead of cutting it exactly at what's requested. Orientation doesn't change the target — "long edge" means whichever dimension is bigger; `object-fit: cover` crops the other one to fill the frame regardless. Astro re-encodes to `.webp` automatically; you don't need to pre-convert.
- **Optional `mobileSrc` crop**: **at least 1080px wide** (requested at `width: 1080`, see "Do you need separate desktop and mobile images?" above) — a genuinely different composition for the tall mobile frame, not just a smaller export of the desktop file.
- **Video**: `.mp4`, muted/loop/autoplay-safe (no audio dependency — see `heroVideo` handling in `CaseStudyExperience.tsx`, which always renders `muted loop playsInline`). Keep an eye on file size; these aren't compressed by the build pipeline the way images are.
- **Icons/illustrations/portraits**: flat SVG, single-color where possible to match the site's monochrome-plus-accent system (see `docs/design-direction.md` if present, or the "Default lenses" section of `CLAUDE.md`) — these render through `GalleryCarousel`'s own grayscale-by-default treatment, so an SVG with lots of internal color won't read as intended until hovered.

## Content JSON skeleton

Copy this into `src/content/case-studies/<slug>.json` and fill in every `REPLACE_...` placeholder. It matches the live schema in `src/content.config.ts` — run `npm run build` (which runs `astro check`) after filling it in to catch anything missing or misspelled.

Before writing the actual `body` copy, check [`docs/text-length-limits.md`](./text-length-limits.md) — `sections[].body` has a real, silent-clipping ceiling (~650 characters), not just a soft recommendation.

```json
{
  "title": { "no": "REPLACE_TITLE_NO", "en": "REPLACE_TITLE_EN" },
  "dek": { "no": "REPLACE_ONE_SENTENCE_DEK_NO", "en": "REPLACE_ONE_SENTENCE_DEK_EN" },
  "client": "REPLACE_CLIENT_NAME",
  "year": 2026,
  "accent": "#RRGGBB",
  "cover": "projects/REPLACE_SLUG/cover.png",
  "coverAlt": { "no": "REPLACE_ALT_TEXT_NO", "en": "REPLACE_ALT_TEXT_EN" },
  "heroVideo": {
    "src": "/media/projects/REPLACE_SLUG/video/hero-loop.mp4",
    "poster": "projects/REPLACE_SLUG/video-posters/hero-poster.jpg"
  },
  "sections": [
    {
      "id": "context",
      "heading": { "no": "Utfordring", "en": "Problem/Challenge" },
      "body": { "no": ["REPLACE_PARAGRAPH_NO"], "en": ["REPLACE_PARAGRAPH_EN"] },
      "media": {
        "type": "image",
        "src": "projects/REPLACE_SLUG/sections/REPLACE_DESCRIPTIVE_NAME.png",
        "alt": { "no": "REPLACE_ALT_NO", "en": "REPLACE_ALT_EN" }
      }
    },
    {
      "id": "strategy",
      "heading": { "no": "Strategi", "en": "Strategy" },
      "body": { "no": ["REPLACE_PARAGRAPH_NO"], "en": ["REPLACE_PARAGRAPH_EN"] },
      "media": {
        "type": "image",
        "src": "projects/REPLACE_SLUG/sections/REPLACE_DESCRIPTIVE_NAME.png",
        "alt": { "no": "REPLACE_ALT_NO", "en": "REPLACE_ALT_EN" }
      }
    },
    {
      "id": "result",
      "heading": { "no": "Løsning", "en": "Solution" },
      "body": { "no": ["REPLACE_PARAGRAPH_NO"], "en": ["REPLACE_PARAGRAPH_EN"] },
      "media": {
        "type": "gallery",
        "items": [
          { "src": "projects/REPLACE_SLUG/sections/REPLACE_NAME_1.png", "alt": "REPLACE_PLAIN_ALT_1" },
          { "src": "projects/REPLACE_SLUG/sections/REPLACE_NAME_2.png", "alt": "REPLACE_PLAIN_ALT_2" }
        ]
      }
    }
  ],
  "credits": [
    { "role": { "no": "REPLACE_ROLE_NO", "en": "REPLACE_ROLE_EN" }, "name": "REPLACE_NAME" }
  ],
  "featured": true
}
```

Notes on things that are easy to get wrong (both mismatches below fail `npm run build`'s type check, so they won't ship silently):

- `sections[].media.alt` (for `"image"` type) is **localized** (`{ no, en }`) — but `"gallery"`/`"carousel"` items' own `alt` is a **plain string**, no locale split. This is a real, easy-to-miss inconsistency in the schema — copy from the skeleton above rather than from memory.
- A `"gallery"`/`"carousel"` item's `src` needs the leading `/media/...` slash only if it's an SVG living in `public/`; a raster image living in `src/assets/media/` stays relative (no leading slash), same rule as the top-level `cover`/section `src`.
- Chapter headings for the first and last sections are conventionally "Utfordring"/"Problem/Challenge" and "Løsning"/"Solution" (matching the `[slug].astro` template's presentation structure — see `CONTENT.md`'s "Work / Portfolio" section), but `id` values are free-form strings used only to key chapters/slides together — they don't need to match `context`/`strategy`/`result` exactly, name them for whatever chapters the specific project actually has.
- `featured: true` is what makes a case study appear in the homepage's work carousel (`src/pages/[locale]/index.astro` filters on it) — a case study with `featured: false` (or omitted) still gets its own `/work/<slug>/` page, it just won't surface there.

## Checklist

1. Pick `<slug>` (kebab-case, matches the client/project name).
2. Export assets into `src/assets/media/projects/<slug>/` (raster) and `public/media/projects/<slug>/` (SVG/video) following the naming convention above.
3. Duplicate the JSON skeleton to `src/content/case-studies/<slug>.json`, fill in every field.
4. Add the client's logo to `src/data/clients.ts` if it isn't already there (separate from this case study's own assets).
5. Run `npm run build` — fixes any schema mismatches (missing fields, wrong `alt` shape, etc.) before they'd otherwise only show up visually.
6. Check the page at `/no/work/<slug>/` and `/en/work/<slug>/` in the dev server, and confirm it shows up in the homepage work carousel if `featured: true`.
