# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

hinside.as design studio site, rebuilt from scratch in Astro 7 + React 19 islands, replacing a prior Figma Sites + embedded TSX build. Bilingual (Norwegian/English), dark-by-default editorial design system built on JetBrains Mono Variable.

## Commands

- `npm run dev` — start the Astro dev server
- `npm run build` — type-check (`astro check`) then build; **this is the only script that type-checks**, so run it before considering any change done
- `npm run preview` — preview the static build

There is no test suite and no lint script configured.

## Content & Style
- Brand copy and page content: see CONTENT.md
- Visual style guide (colors, type, spacing, motion): see STYLE.md
Always check both before building or editing any page.

## Architecture

### Routing / i18n

`astro.config.mjs` sets `i18n.routing: "manual"`. There are **no per-locale duplicated page files** — instead `src/pages/[locale]/index.astro` and `src/pages/[locale]/work/[slug].astro` are single dynamic routes that read `Astro.params.locale`, and `src/middleware.ts` wires up Astro's built-in i18n middleware (`prefixDefaultLocale: true`, `fallbackType: "redirect"`) to resolve locale prefixes. `src/pages/index.astro` just redirects `/` to `/${defaultLocale}/`. All UI strings live in `src/i18n/ui.ts` (a flat key → `{no, en}` dictionary) accessed via `useTranslations(locale)` from `src/i18n/utils.ts`. When adding a page or string, extend this dictionary rather than branching per-locale in component logic.

### Content model

Case studies and testimonials are Astro content collections (`src/content.config.ts`) loaded from JSON files in `src/content/case-studies/` and `src/content/testimonials/`, not Markdown. Every user-facing string field is `{no, en}` (`localized`/`localizedParagraphs` Zod helpers) — content files carry both languages together rather than being split per-locale. A case study is a `title`/`dek`/`cover`/optional `heroVideo` plus an ordered `sections[]` array; each section has an optional `media` block that is a discriminated union on `type`: `"image"` (single), `"gallery"` (static 2-4 image grid), `"carousel"` (drag carousel, with a `shape: "square" | "circle" | "icon"` that selects the visual treatment), or `"video"`. When adding a new case study, match this shape rather than inventing new section fields.

### Media pipeline (three distinct locations, not interchangeable)

- `media-archive/` — gitignored, original/pre-migration source files kept for reference only, never read at build or runtime.
- `public/media/` — SVGs and videos served as-is by static reference (`/media/...` URLs); not processed by `astro:assets`.
- `src/assets/media/` — raster images that go through `astro:assets`. Content-collection JSON references these by a relative path string (e.g. `"projects/grieg/hero.jpg"`); `src/lib/media.ts`'s `getMediaImage()` resolves that string to an `ImageMetadata` via an eager `import.meta.glob` over `src/assets/media/**/*.{png,jpg,jpeg,webp,avif}` for use with `<Image>`/`getImage()`.

`legacy/` (gitignored) holds the original pre-Astro TSX components from the old build. It is a fidelity reference, not dead code to ignore: carousel/interaction components rebuilt from a `legacy/` predecessor need the **full** source file read (sizes, cursor behavior, lightbox, hover states), not a keyword grep — grepping only for filter/color patterns previously missed an entire lightbox feature, wrong card sizes, and a distinct cursor system, each catchable only by reading the whole file.

### Carousel architecture

Four carousel "skins" share two primitives instead of being independent implementations:

- `src/hooks/useDragCarousel.ts` — momentum drag physics, wheel support, click-suppression (via `onClickCapture`) so a drag doesn't fire a click.
- `src/components/carousel/EyeCursorItem.tsx` — the blinking-eye custom cursor + glint overlay used per-item in most carousels; takes `bare` (transparent shell, no raised bg/shadow) and `radius` props so one component serves square/circle/icon shapes.
- `GalleryCarousel.tsx` — shape-variant carousel (`square`/`circle`/`icon`) driven by content-collection `media.shape`, opens `Lightbox.tsx` on click.
- `PortfolioCarousel.tsx` — homepage case-study cards, fixed square image frame (`.pc-image-frame { aspect-ratio: 1/1 }` wrapping the image) rather than relying on the image's intrinsic aspect ratio to propagate through ancestors.
- `LogoCarousel.tsx` — client logos; **does not** use `EyeCursorItem`. It has its own single viewport-level growing-arrow cursor (`cursor-frames.ts` short/long/longest SVG frames) with an idle "reminder" animation sequence, matching the legacy logo carousel exactly.
- `Lightbox.tsx` — full-screen viewer (hit-zone prev/center-close/next, keyboard nav, idle-fade UI); has a `pixelGrid` variant for icon shapes (pointer-tracked spotlight mask). Its stage needs `pointer-events: auto` explicitly since the wrapping content layer is `pointer-events: none`.

A recurring root cause across sizing bugs in this codebase: an element in the width/height chain from a sized ancestor down to the actual `<img>` is missing an explicit `width: 100%; height: 100%`, so a percentage height doesn't resolve and CSS falls back to `auto` (renders at the image's intrinsic pixel size instead of filling the tile). When a carousel image renders at the wrong size, check every ancestor in that chain rather than assuming it's a `.filter`/`object-fit` problem.

### Design tokens

`src/styles/tokens.css` defines the greyscale palette (dark by default; light theme via `data-theme="light"` override), fluid `clamp()` type scale, `--weight-*` tokens for the variable font, and a `--space-*` scale (`--space-10` is the largest section-break spacing). `src/styles/global.css` sets base element styles, including heading weights. Design direction favors lighter weights (`--weight-regular`/`--weight-medium`) even at large display sizes, and generous `--space-*` gaps between sections in place of visible divider lines — see [docs/design-direction.md](docs/design-direction.md) for the full brand/aesthetic brief and the reasoning behind spacing/weight judgment calls.

### Contact form

`src/components/ContactForm.tsx` posts to `src/pages/api/contact.ts`, an Astro API route (`export const prerender = false`) that sends via the Resend API (`FROM_ADDRESS` is a verified `updates.hinside.as` sending subdomain) and includes a honeypot field for spam. The site builds via `@astrojs/netlify` (`astro.config.mjs`), which prerenders every page except this route to static HTML and bundles the route itself as a Netlify Function — no separate build step or CLI needed to test it, `npm run dev` runs it directly. Requires a `RESEND_API_KEY` environment variable set in the Netlify site's dashboard (Site configuration → Environment variables); it's read via `import.meta.env.RESEND_API_KEY`, typed in `src/env.d.ts`.

## Hosting

Deployed on Netlify (migrated from an earlier Cloudflare Pages plan — Cloudflare Pages didn't work out for a sister project, so Netlify is now the standard for Hinside sites). DNS for hinside.as stays on Cloudflare; only hosting/build/deploy runs through Netlify. Connect the Netlify site to this repo's GitHub remote for auto-deploys on push; `netlify.toml` sets the build command and publish directory.

## Collaboration

Don't simply execute requests.

If a stronger solution exists, explain why and propose it.

Challenge assumptions respectfully.

Treat discussions as design critiques rather than implementation tasks.

The objective is the strongest possible outcome, not blind agreement.

## Default lenses

Unless told otherwise, bring all five of these to every task on this project — most changes touch more than one:

- **UI Design** — apply [docs/design-direction.md](docs/design-direction.md) by default: Swiss-inspired grid, sharp/mechanical geometry, hairline borders over shadows, confidence through scale rather than weight, monochrome-plus-one-accent.
- **Frontend Development** — follow the architecture above (shared carousel primitives, the three-tier media pipeline, the i18n dictionary pattern) rather than one-off implementations; run `npm run build` before calling anything done.
- **Brand Design** — apply [docs/brand-philosophy.md](docs/brand-philosophy.md)'s core belief: reveal what's already distinctive rather than inventing decoration. Default to restraint on graphic devices unless they carry real information.
- **UX Design** — optimise for the hierarchy in design-direction.md: curiosity, then understanding, then trust. Hover/interaction states should feel correct rather than noticeable.
- **Writing** — match the tone already established in `src/content/` and `src/i18n/ui.ts`: precise, confident, no corporate fluff. Extend the i18n dictionary rather than hardcoding one-off copy.

**Figma** is not a project skill to add — it's already connected as an MCP integration (`mcp__claude_ai_Figma__*` tools, e.g. `get_design_context`, `get_screenshot`), with its own real skills (`/figma-use`, `/figma-design-to-code`) that load automatically when needed. Use it to cross-reference real designs when fidelity questions come up.