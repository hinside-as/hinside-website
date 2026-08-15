# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

hinside.as design studio site, rebuilt from scratch in Astro 7 + React 19 islands, replacing a prior Figma Sites + embedded TSX build. Bilingual (Norwegian/English), dark-by-default editorial design system built on JetBrains Mono Variable.

## Commands

- `npm run dev` — start the Astro dev server
- `npm run build` — type-check (`astro check`) then build; **this is the only script that type-checks**, so run it before considering any change done
- `npm run preview` — preview the static build
- `npm run preview:cf` — build, then serve `./dist` through `wrangler pages dev` (use this to test `functions/api/contact.ts` locally, since Pages Functions don't run under plain `astro dev`)

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

### Case-study scroll experience

`src/pages/[locale]/work/[slug].astro` + `src/components/CaseStudyExperience.tsx` render each case study as a sidebar (title/dek/back link/chapter TOC/credits) alongside a column of full-bleed `100dvh` slides (`src/hooks/useActiveSection.ts` is a read-only `IntersectionObserver` that tracks which slide is centered, for the TOC highlight/progress bar and the text-box's content — it never influences scroll).

**Slide navigation is native scrolling with CSS scroll-snap, never JS gesture interception.** An earlier version hijacked wheel/touch/keyboard events to advance slides itself; it was rebuilt from scratch to rely entirely on the browser's own scroll physics after repeated real-hardware testing showed the custom version couldn't match native trackpad momentum, touch physics, or keyboard paging. The current rule for this template: never call `preventDefault()` on a scroll gesture, never translate wheel delta into "next/previous slide," no custom inertia/debounce/velocity thresholds. `BaseLayout`'s `scrollSnap` prop sets `data-scroll-snap="true"` on `<html>`, scoping `scroll-snap-type` (see `global.css`) to case-study pages only.

- **`scroll-snap-type: y mandatory`, not `proximity`.** `proximity` was tried first (reasoning: `mandatory` can make a low-resolution mouse wheel feel "stuck," since it corrects back to the nearest point after each small, isolated wheel event) but real MacBook trackpad testing showed `proximity` regularly leaves the page resting between two slides — a worse, more visibly broken outcome for a template whose entire premise is a series of *distinct* full-bleed slides. `mandatory` is the accepted trade-off: continuous input (trackpad momentum, touch, a modern high-DPI mouse, a fast flick) always carries enough distance to cross the snap threshold and behaves natively; only a slow, discrete, low-resolution wheel click can occasionally need a second scroll input to fully commit past the halfway point. Don't "fix" this with JS — it's a documented, deliberate choice, not a bug.
- **Header is visible only on the first slide**, hidden for every slide after it (`headerScrollControlsVisibility={false}` + `headerSolidBackground` on `BaseLayout`; `CaseStudyExperience` sets the header's own `data-hidden` directly). It's driven by `activeIndex !== 0` — the same `useActiveSection` observer state driving the TOC and progress bar — not a separate scroll-position threshold. That choice matters: `activeIndex` only flips once a slide crosses the viewport's *center* (roughly halfway through a slide's height), by which point the sticky sidebar (`top: 0`, behind the header via z-index, revealed as the header hides) has long since finished its own "slide up to y:0" transition — that completes within the first `--header-height` of scroll, a small fraction of one slide's height. A much earlier version drove `data-hidden` off a raw `scrollY` threshold instead; tying it to slide identity gives a far bigger safety margin against any gap ever reappearing between the two.
- **Header, sidebar, and footer all share the same flat `var(--color-bg)` (pure black) background, with no border/shadow between them** — they're meant to read as one continuous surface, distinct from the slides' own `--color-bg-raised`. `Header`'s `data-solid="true"` override (wins over its usual scrolled-transparent-blur state, including its `box-shadow` — see `Header.astro`) and `Footer`'s `noBorder` prop (drops its usual `border-top`) both exist only for this. Don't reuse `--color-bg-raised` here; that's what caused a visible seam between them previously.
- **The last slide (the cross-promo carousel) intentionally isn't a full `100dvh`** (`.cse__promo` overrides `.cse__step`'s height to `auto`, and shrinks `PortfolioCarousel`'s own `--card-size`) so the footer starts immediately below it instead of requiring a further full-viewport scroll. Getting this right needs both: enough combined (promo + footer) height that the browser can actually scroll far enough for `scroll-snap-align: start` to align the promo's top flush with the viewport (if the document doesn't extend at least one more viewport past the promo's own start, that snap point is physically unreachable and you're stuck a little short of it — a general truism for the *last* snap point in any document), and not so much more than one viewport that the footer gets pushed back below the fold.
- **`.cse__text-box-anchor` needs `margin-bottom: calc(-100dvh + var(--header-height))`.** This element (the sticky flex trick behind the show/hide-text box — see the component's own comments for why a naive `position: fixed`/`position: sticky; bottom:` didn't work) is a normal block child stacked inside `.cse__slides` alongside every `.cse__step`, not a flex sibling like the sidebar. Its own height (needed for the sticky-from-the-top + flex-bottom-align trick to work) was silently adding a whole extra viewport's worth of *real, scrollable* height before slide 0 even started — pushing every slide, and the footer, down by that amount, including hiding slide 0's own media on first load. The negative margin cancels that contribution back to zero without breaking the sticky/flex behavior that needs the height in the first place. If this component is ever restructured, re-verify slide 0's media is visible immediately on page load — that symptom is the tell.
- **The show/hide-text control** (`.cse__text-box`) resizes between a compact "Show text" pill and the full heading+body card. Collapsed width is `fit-content`, not a fixed value, and the label is always left-aligned, never centered — both matter for the same reason: the label's own left edge must never move between states. A fixed pill width wider than the label reads as unequal padding; centering the label makes it jump sideways when the box resizes. `.cse__text-box-body` additionally needs `width: 0` (not just `max-height: 0`) while collapsed — `overflow: hidden` alone still lets the invisible paragraph text contribute its own preferred width to the parent's `fit-content` calculation, silently keeping the "collapsed" box at its expanded width. The expand/collapse itself has **no size/opacity animation** — an earlier attempt animating width+height together read as an uncontrolled bounce no easing curve fixed, so the state change is instant; the only remaining motion is the toggle's own text-color hover.

### Native-first interaction

Prefer native browser behavior over custom JavaScript interaction systems for scrolling, swiping, dragging, momentum/inertia, and touch/trackpad input — this is the same principle behind the case-study/homepage scroll-snap work above, stated once here so it applies project-wide rather than being re-derived per feature.

- **Prefer**: normal document scrolling, CSS `scroll-snap`, `position: sticky`, native `overflow` scrolling, native pointer/touch behavior, CSS transitions/animations, `IntersectionObserver` for visibility/state changes, and `requestAnimationFrame` only when a JS-driven animation is genuinely necessary.
- **Avoid**: intercepting `wheel`/`touchmove`/`pointermove`/scroll events unnecessarily; manually calculating scroll velocity, momentum, or acceleration; converting wheel/trackpad delta directly into `nextSlide()`/`previousSlide()` calls; disabling native scrolling to simulate it with transforms instead; separate gesture-physics implementations per input device.
- **Principle**: the user's physical input should control a real scrollable surface whenever possible. For slide-like sections, let the browser do the scrolling and use snapping, sticky positioning, or observation to build the presentation effect on top — JS may react to scroll state but shouldn't replace the browser's scrolling engine. This also means any chrome that reacts to scroll state (e.g. a header hide/reveal, a sidebar's padding) should change in the same frame as the scroll state it's tied to, not on its own separate CSS-transition timer — a timed transition triggered by a one-off state flip can finish well after a fast scroll-snap fling has already settled, which reads as that chrome lagging/bouncing into place rather than being physically attached to the page.
- Preserve native trackpad precision/momentum, mouse-wheel behavior, touch inertia, keyboard navigation, accessibility, `prefers-reduced-motion`, and other platform-specific interaction behavior. Treat JS as an enhancement layer around native interaction, not a replacement for it — when a custom interaction and a slightly simpler native one are both on the table, default to native unless the custom behavior earns its keep in real user value. Rule of thumb: don't simulate physics the browser already provides.

### Design tokens

`src/styles/tokens.css` defines the greyscale palette (dark by default; light theme via `data-theme="light"` override), fluid `clamp()` type scale, `--weight-*` tokens for the variable font, and a `--space-*` scale (`--space-10` is the largest section-break spacing). `src/styles/global.css` sets base element styles, including heading weights. Design direction favors lighter weights (`--weight-regular`/`--weight-medium`) even at large display sizes, and generous `--space-*` gaps between sections in place of visible divider lines — see [docs/design-direction.md](docs/design-direction.md) for the full brand/aesthetic brief and the reasoning behind spacing/weight judgment calls.

### Contact form

`src/components/ContactForm.tsx` posts to `functions/api/contact.ts`, a Cloudflare Pages Function that sends via the Resend API (`FROM_ADDRESS` is a verified `updates.hinside.as` sending subdomain) and includes a honeypot field for spam. Requires a `RESEND_API_KEY` secret in the Cloudflare Pages project; test it locally with `npm run preview:cf`, not `npm run dev`.

## Current gaps (as of this file's creation)

Nothing in this repository has been committed to git yet, there is no Cloudflare Pages project or deployment, and there is no CI. Don't assume any part of the site is live or backed up beyond the local working tree.

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