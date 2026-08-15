# Text length limits per slide

Every homepage and case-study section renders as one full-viewport, scroll-snapped slide (see CLAUDE.md's "Case-study scroll experience" section). That means text length is a real layout constraint, not just an editorial preference — write too much for a given field and it either pushes a slide taller than one screen (usually fine, just breaks the "one slide, one screen" feel) or, in one specific spot, gets **silently clipped with no visual warning** (not fine at all).

Numbers below come from measuring real rendered geometry at two reference viewports — **1440×900 desktop** and **390×844 mobile** (iPhone-14-ish) — using this codebase's actual fonts, current type-scale tokens, and current copy, not an abstract estimate. They already account for real word-wrap being less efficient than raw character-per-line math (words break at spaces, not at the theoretical column edge), so treat them as genuine practical ceilings, not a target to write up to.

## The one hard limit: case-study slide text (read this one first)

`.cse__text-box-body` (the heading + paragraph(s) that appear alongside a case-study slide's image/video) has `max-height: 40rem; overflow: hidden`. Content beyond that height doesn't wrap the slide taller, scroll, or fade — **it's just gone, with nothing on screen to indicate it was cut.** This is the one field on the whole site where going over the limit is a silent content bug, not a cosmetic one.

- **Hard technical ceiling**: ~650 characters (heading + all body paragraphs combined), measured at the mobile width (295px content column) where wrapping is tightest.
- **Recommended practical max**: ~450 characters (~70 words) — leaves headroom below the hard ceiling for a wordier translation (Norwegian and English body copy don't always match length) or a slightly longer heading.
- **Current real content**: existing case studies (`grieg-connect.json`, `samspill.json`) run 365–474 characters per section body — already comfortably inside this range. Use that as your actual reference point, not the technical ceiling.

If a chapter genuinely needs more than this, split it into two sections/slides rather than writing a longer paragraph — that's already the pattern `built-for-every-format`/`from-information-to-atmosphere`-style multi-image chapters use.

## Homepage slides

| Field | Recommended max | Current copy | Notes |
|---|---|---|---|
| Hero headline (`heroHeadline`) | **~85 characters** (~12–14 words) | 85 chars, 12 words — right at the limit | Desktop is the binding constraint here (not mobile): the display font only shrinks to 60px on mobile vs 144px on desktop, so mobile has much more relative line budget. Go longer and the slide grows past one desktop screen — not broken, just no longer "almost fills the screen." |
| Hero dek (`heroDek`) | **~250 characters** (~40 words) | 275 chars, 42 words — ~10% over | Mobile is the binding constraint (fixed 33.6px/24.3px font, doesn't shrink as aggressively as the display headline). The current dek measured 27px taller than one mobile screen — minor, but if you're revising it anyway, trimming to ~250 characters removes the overflow entirely. |
| Studio paragraph (`studioParagraph`) | No strict one-screen ceiling — this slide is allowed to run taller (see CLAUDE.md's `.hs__step` `min-height` reasoning) | ~700–800 characters | Still keep it to one solid paragraph for scannability; current length (matching the existing "Studio" copy) is a reasonable editorial upper bound even though the layout would tolerate more. |
| Clients intro (`clientsIntro`) | **~180 characters** (~28 words) | 138 chars, 20 words | Shares its slide with the client-logo carousel (grid layout, heading row + carousel row) — keep this short on principle; it's a caption, not a paragraph. |
| Testimonial quote | **~330 characters** (~50 words) | 397 chars, 57 words — over the mobile ceiling | The current quote already makes its slide ~32px taller than one mobile screen. Non-critical (carousel slides tolerate this fine), but a new testimonial should aim under 330 characters if you want a clean one-screen fit on mobile. |

## Case-study slides

| Field | Recommended max | Notes |
|---|---|---|
| Section body (`sections[].body`) | **~450 characters / ~70 words** (hard ceiling ~650) | See above — the one field where going over actually breaks, not just looks different. |
| Section heading (`sections[].heading`) | ~1 short line, ~25 characters | Existing chapter names ("Kontekst", "Built for every format") are all well under this — no reason to go longer. |
| Sidebar title (`meta.title`) | ~30 characters | Project name — the sidebar column is narrow (280–342px); a long title wraps to 2–3 lines, which is fine, but a 4th line starts crowding the credits list below it. |
| Sidebar dek (`meta.dek`) | ~140 characters (~2 lines) | One sentence, matches the existing "Grieg Connect"/"Samspill" deks. |

## Why these numbers, briefly

Both fonts behave predictably enough to compute this directly rather than guess:

- **JetBrains Mono** (body text: dek, paragraphs, testimonials) is genuinely monospace — `1ch` = exactly `0.6em`, confirmed by direct measurement. Characters-per-line is just container-width ÷ (0.6 × font-size).
- **Playfair Display** (headings: hero headline, section headings) is proportional, but averages ~0.464em per character across a realistic mixed-case Norwegian/English sentence — close enough to `ch` to use the same math with a bit more caution.

Combine that with each field's real container width and available vertical space (viewport height minus the slide's own padding) at both breakpoints, take the tighter of desktop/mobile, and shave off ~15% for real word-wrap inefficiency (words don't break exactly at the theoretical column edge) — that's where every number above comes from. If the type scale, a slide's padding, or a container's max-width ever changes, these numbers should be re-measured rather than assumed to still hold.
