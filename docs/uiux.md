# UI/UX Makeover Plan — "Blueprint / Engineered"

> Status: **complete on `redesign/blueprint`** — all six phases landed 2026-09-01.
> **§11.2** records what each phase shipped, **§11.1** the three architectural deviations
> that are binding on anything written from here, and **§11.4** the Phase 6 verification
> results, including the two places the measured numbers fall short of §8 and why.
> Owner: Goh Zhong Xuen · Drafted: 2026-09-01
> Selected direction: **D — Blueprint / Engineered** · Motion tier: **Expressive** (retiered from "Confident" on 2026-09-02 — see §3) · All four feature tracks in scope.
>
> **Three deliberate deviations from this plan are already shipped** and are binding on
> everything that follows — read §11.1 before writing code against §3, §4.5 or §4.8.

---

## 0. Hard prerequisites before writing any code

1. **Read the local Next.js docs first.** Per `AGENTS.md`, this repo runs Next 16.2.10, whose APIs differ from training data. Before touching a file, read the relevant guide under `node_modules/next/dist/docs/01-app/`:
    - Route Handlers (for the contact API): `03-api-reference/03-file-conventions/route.md`
    - `next/font`, `next/image`, `<Link>`: `03-api-reference/02-components/`
    - Metadata & viewport: `03-api-reference/04-functions/generate-metadata.md`
    - `use client` / `use server` semantics: `03-api-reference/01-directives/`

    Heed every deprecation notice found there.

2. **Branch off `main`.** `git checkout -b redesign/blueprint`. This touches nearly every visual file; do not do it on `main`.
3. **Capture a baseline.** Run `npm run build` and record the route-size table, plus a Lighthouse run on `/` and on one `/projects/[slug]`. Every phase below is measured against this.
4. **`docs/master-prompt.md` has already been reconciled with this plan** (2026-09-01) — its UI Design, Color Theme, Typography and Animation Philosophy sections now describe the Blueprint direction, so the brief and this plan no longer contradict each other. Treat it as the standing summary and this file as the detailed source. Re-check it at the end of Phase 6 in case implementation diverged (see §9).

---

## 1. Audit — what we are fixing

### 1.1 Visual identity

| Problem                                                                                     | Evidence                                                       |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Palette is stock Tailwind slate/blue — the most common portfolio palette on the web         | `app/globals.css`: `--background:#0F172A`, `--primary:#3B82F6` |
| Three Google font families loaded for a generic pairing                                     | `app/layout.tsx` — Poppins + Inter + JetBrains Mono            |
| No design system: 7 colour tokens, no spacing/radius/elevation/z-index scale, no light mode | `app/globals.css` is 50 lines total                            |
| Timid type scale — hero caps at `text-6xl`, section titles at `text-4xl`                    | `HeroSection.tsx`, `SectionHeading.tsx`                        |

### 1.2 Page rhythm

All seven sections share an identical skeleton — `Container` → `SectionHeading` → `gap-10` → `py-20 md:py-28` → grid. There is no full-bleed break, no density change, no background variation, no crescendo. The page reads as one undifferentiated column.

### 1.3 Motion

- `fadeInUp` (0.4s, easeOut, y:16) is applied to essentially every animated element sitewide.
- `lib/animations.ts` exports 6 variants; `fadeIn`, `fadeInDown`, `slideInLeft`, `slideInRight` and `scaleIn` are effectively unused.
- Card hover is `hover:-translate-y-0.5` — a 2px lift, visually imperceptible (`components/ui/Card.tsx`).
- **No `prefers-reduced-motion` handling anywhere.** Accessibility defect.
- Nothing is scroll-linked: no progress indicator, no scroll-driven reveal.

### 1.4 Projects — weakest section, highest business value

- `ProjectCard` renders **no image**, though `Project.screenshots` exists in `types/project.ts` and `public/images/projects/jobnow-landing.jpg` is present and unused.
- No filter, no search, no sort, no tech facets.
- `featured` only swaps a badge — featured work occupies the same visual footprint as everything else.
- Rich fields (`keyFeatures`, `challenges`, `lessonsLearned`, `futureImprovements`, `testCredentials`) are invisible until a click-through.

### 1.5 Conversion leaks

- `ContactForm` submits with `window.location.href = "mailto:..."`. On any device without a configured mail client this **silently does nothing** — a filled-in form leads nowhere. This is the single biggest defect on the site.
- No validation feedback, no success state, no spam protection.
- Phone is plain text, not a `tel:` link (`ContactSection.tsx`). Email is not copy-to-clipboard.
- Hero presents three buttons of equal weight — no single primary action.
- Hero stats render `{stat.value}+` where value is `projects.length` — it displays "8+" when the true count is exactly 8. Misleading and trivially fixable.

### 1.6 Navigation & accessibility

- Navbar has no active-section indicator and no scroll progress.
- Logo is the string "GZX" at `text-lg` — no mark.
- Mobile menu: no Escape-to-close, no focus trap, no body scroll lock, no exit animation.
- No skip-to-content link. Focus-visible rings exist on `Button` only — not nav links, form inputs, cards, or badges.
- `useSmoothScroll` calls `history.pushState` on every nav click, polluting the back stack with one entry per section.

### 1.7 Missing credibility

- No certifications section (`data/certifications.ts` appears in `project-tree.txt` but no longer exists).
- Experience and Education are stacked cards; the natural timeline shape is unused.
- No availability signal, no GitHub activity, no "currently learning" — nothing indicates the person is active _now_.

---

## 2. The design direction

### 2.1 Concept

A **technical blueprint**: the portfolio presents itself as an engineering drawing of the person. Drafting grid, corner registration ticks, measurement annotations, spec-sheet tables, callout leader-lines, and SVG paths that draw themselves as you scroll. It signals "engineer" instantly, it is uncommon among student portfolios, and unlike brutalism it stays legible to a non-technical recruiter.

**Governing rule:** the blueprint motifs are _chrome_, never _content_. Grid lines, ticks and annotations sit at low contrast behind the information. If a motif ever competes with a project title for attention, remove it.

### 2.2 Colour tokens

```css
/* Dark — primary theme */
--bp-void: #070c14; /* page background, beneath the grid */
--bp-base: #0b1220; /* section background */
--bp-surface: #111c2e; /* cards */
--bp-surface-alt: #16243a; /* nested surfaces, inputs, hover */
--bp-line: #1e3050; /* borders, grid strokes */
--bp-line-strong: #2c446e; /* active/hover borders */
--bp-ink: #e6edf7; /* primary text */
--bp-ink-muted: #7d8ca3; /* secondary text */
--bp-ink-faint: #4e5c72; /* annotations, measure labels — decorative only */
--bp-accent: #38bdf8; /* cyan — links, primary action, active state */
--bp-accent-deep: #0ea5e9; /* accent hover/pressed */
--bp-signal: #f59e0b; /* amber — annotations, "featured", callouts */
--bp-success: #34d399; /* live demo available, form success */
--bp-danger: #f87171; /* form errors */

/* Light — secondary theme ("printed blueprint on vellum") */
--bp-void: #eef2f7;
--bp-base: #f7f9fc;
--bp-surface: #ffffff;
--bp-line: #d3dce8;
--bp-ink: #0b1220;
--bp-ink-muted: #52627a;
--bp-accent: #0369a1; /* darkened for AA on white */
--bp-signal: #b45309;
```

> Every pair above must be measured against **WCAG AA (4.5:1 body text, 3:1 large text and UI borders)** before Phase 1 is signed off — treat the values as proposals until verified, not as pre-cleared. `--bp-ink-faint` is decorative only and must never carry information that isn't also available elsewhere.

### 2.3 Typography

| Role               | Face                                  | Usage                                                     |
| ------------------ | ------------------------------------- | --------------------------------------------------------- |
| Display / headings | **Space Grotesk** (500, 700)          | h1–h3, section numbers, stat figures                      |
| Body               | **Inter** (400, 500) — already loaded | paragraphs, card copy, form labels                        |
| Mono / annotation  | **IBM Plex Mono** (400, 500)          | eyebrows, measure labels, tech tags, code, timestamps, ⌘K |

Drop **Poppins** and **JetBrains Mono**; net font count stays at three, but the pairing becomes technical rather than generic. Fluid scale:

```
display  clamp(2.75rem, 7vw, 6rem)     /* hero name */
h2       clamp(2rem, 4vw, 3.25rem)
h3       1.375rem
body-lg  1.125rem
body     1rem
meta     0.8125rem   /* mono, tracking-wide, uppercase */
```

### 2.4 Signature motifs

1. **Drafting grid** — a fixed, `pointer-events-none` 32px CSS-gradient grid at ~3% opacity over `--bp-void`, with 4th-line emphasis at 128px. Masked to fade out below the fold so it never fights the content.
2. **Corner ticks** — 8px L-shaped registration marks at two opposing corners of every `Card`, drawn with pseudo-elements. On hover they extend to 14px and take `--bp-accent`.
3. **Section numbering** — every section gets a mono label, `/ 01 — ABOUT`, with a hairline rule running to the right edge of the container.
4. **Measure lines** — thin dimension lines with end-caps annotating one key figure per section (the timeline span, the project count). Decorative, `aria-hidden`.
5. **Leader-line callouts** — on the About portrait and the featured project, a hairline connects a mono annotation to the thing it describes.
6. **Spec tables** — project detail pages present metadata as a monospaced spec sheet (`ROLE`, `STACK`, `DURATION`, `STATUS`) rather than prose.

---

## 3. Motion system — "Expressive" _(retiered 2026-09-02)_

This section was written for a "Confident" tier: motion as restrained proof of
craft. It shipped that way, and the result read as static — the entrances were
correct and almost nothing else moved. The tier is now **Expressive**: the site
should feel alive under the cursor and under the scroll. What did _not_ change is
the discipline. Every effect still resolves through the `EASE`/`DUR` tokens, still
animates compositor-friendly properties, still disappears completely under
`prefers-reduced-motion`, and still runs without an animation library. §3.3 and
§3.4 below are updated; the shipped inventory is §11.1 item 4.

### 3.1 Foundations

Rewrite `lib/animations.ts` around a token set instead of six ad-hoc variants:

```ts
export const EASE = {
    out: [0.16, 1, 0.3, 1], // primary — decisive settle
    inOut: [0.65, 0, 0.35, 1],
    spring: { type: "spring", stiffness: 320, damping: 30, mass: 0.9 },
} as const;

export const DUR = { fast: 0.18, base: 0.34, slow: 0.6, draw: 1.1 } as const;
```

Every transition uses these. No inline durations anywhere.

### 3.2 `prefers-reduced-motion` — non-negotiable

- Add a `useReducedMotion()`-driven `MotionProvider` wrapping the app. When reduced, all variants collapse to opacity-only at `DUR.fast`, and all scroll-linked and draw effects are disabled outright.
- Add the CSS backstop in `globals.css`:

```css
@media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
    }
}
```

This also disables the existing `html { scroll-behavior: smooth }`, which is the correct outcome.

### 3.3 Motion inventory

| Element              | Behaviour                                                                                                                                                                                     |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hero**             | Name reveals per-word with a 40ms stagger and a `clip-path` wipe (not a fade). Behind it, an SVG blueprint frame **draws itself** via `pathLength` 0→1 over `DUR.draw`. Fires once, on mount. |
| **Section entry**    | Section number counts in; hairline rule scales from `scaleX(0)` at its left origin; heading and body stagger 60ms.                                                                            |
| **Cards**            | Hover: `y: -6`, border → `--bp-line-strong`, corner ticks extend, a hairline sweeps left→right across the top edge. Spring, not tween.                                                        |
| **Buttons**          | Magnetic — translate up to 4px toward the cursor within a 90px radius, spring back on leave. Disabled under reduced motion and on `pointer: coarse`.                                          |
| **Scroll progress**  | 2px accent bar under the navbar, driven by framer-motion's `scrollYProgress`.                                                                                                                 |
| **Active section**   | Nav item underline animates between items via `layoutId` rather than cutting.                                                                                                                 |
| **Timeline**         | The vertical spine draws downward as the section enters view; each node scales in as it is passed.                                                                                            |
| **Skills**           | On category hover, non-hovered categories drop to 40% opacity. Individual tile hover reveals a mono annotation.                                                                               |
| **Project filter**   | Grid re-flows with framer-motion `layout` + `AnimatePresence`; filtered-out cards scale to 0.96 and fade.                                                                                     |
| **Page transitions** | Route changes fade + 8px rise via `template.tsx`. Verify Next 16's View Transitions support in the local docs before choosing between `template.tsx` and the native API.                      |
| **Counters**         | Hero stats count up from 0 once, on first view only.                                                                                                                                          |

Added at the 2026-09-02 retier:

| Element                | Behaviour                                                                                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Section headings**   | The whole lockup is one reveal root: marker, then the rule drawing out from it, then the h2 pulling in from a blur, then the description. Fires on every section.    |
| **Plate spotlight**    | A soft accent radial follows the cursor across any interactive plate — cards, timeline nodes, skill panels, the NOW block.                                           |
| **Card tilt**          | Project cards lean up to 4.5° toward the cursor. Project cards only; on a smaller plate the same rotation reads as skewed type rather than as depth.                 |
| **Primary buttons**    | A band of light crosses the fill once per hover. Primary variant only.                                                                                               |
| **Directional icons**  | Arrows nudge in the direction their link travels — down for `#projects`, right for "View all".                                                                       |
| **Timeline spine**     | Drawn by scroll position rather than in one shot, so it extends as the reader descends the history. Falls back to the one-shot draw where unsupported.               |
| **Parallax**           | The hero schematic and the project-detail header backdrop drift against the copy beside them. Both boxes are bled by exactly the travel, so no edge is ever exposed. |
| **Drafting grid**      | The fixed backdrop drifts one major grid square against the page as it scrolls, so it stops reading as a sticker on the glass.                                       |
| **Schematic ambience** | Packets travel down the hero schematic's connectors; a survey line passes down the drawing every nine seconds.                                                       |
| **Timeline entry**     | Nodes enter from the side they land on, so the alternation reads as two columns filling in rather than one list sliding up.                                          |
| **Filter results**     | `/projects` remounts on every filter change, so the results grid re-cascades — the feedback a filter should give.                                                    |

### 3.4 Motion budget _(revised 2026-09-02)_

- Nothing exceeds `DUR.slow` except the one-time hero draw and the ambient loops inside
  the hero schematic.
- No animation blocks interaction, and **no scroll-jacking** — the page never takes the
  scroll away from the reader. Scroll-_linked_ motion is encouraged; hijacking the scroll
  to play a sequence is not.
- Looping motion is confined to two places: the hero schematic (travelling packets, one
  survey line) and the ⌘K caret blink. Nothing else may loop.
- Animate `opacity`, `translate`, `scale`, `rotate`, `transform`, `clip-path`, `filter`
  and `stroke-dashoffset` only. Never a property that triggers layout.
  `filter` is the expensive one — it rasterises the element at every step — so it is
  capped at one short-lived element per section (the h2 focus pull).
- Scroll-driven (`animation-timeline`) effects are **progressive enhancement only**.
  They live behind `@supports`, and where unsupported the element must sit at its
  finished resting state. Nothing load-bearing may depend on them.
- Entrances belong to the IntersectionObserver, never to a `view()` timeline. A view
  timeline is scrubbed, so scrolling back up would un-reveal content that had already
  arrived.

---

## 4. Section-by-section redesign

### 4.1 Navbar

- Slim to 56px on scroll; add the 2px scroll-progress bar.
- Replace the "GZX" text with a small SVG monogram inside a corner-ticked box.
- Add an active-section indicator (IntersectionObserver → `layoutId` underline).
- Add an **availability pill**: pulsing `--bp-success` dot + `AVAILABLE FOR INTERNSHIP` in mono, sourced from a new `AUTHOR.availability` field in `lib/constants.ts` so it stays one-line editable.
- Add a `⌘K` affordance button and the theme toggle.
- Fix the mobile menu: `AnimatePresence` exit, focus trap, Escape-to-close, body scroll lock, `aria-controls` pointing at the panel id.

### 4.2 Hero — the biggest change

Two columns on `lg`: content left, an animated **blueprint schematic** right — an SVG that draws a wireframe system diagram of the stack (client → API → database), nodes labelled in mono. It is the visual anchor the page currently lacks, and it is thematically honest: it depicts what he builds.

- Eyebrow becomes mono: `/ SOFTWARE ENGINEERING STUDENT · SELANGOR, MY`.
- `h1` at display scale with the per-word clip wipe.
- **One** primary CTA (`View Projects`), one secondary (`Get in Touch`); demote Resume to a small mono text link with a file-size annotation. Fixes the three-equal-buttons problem.
- Stats become a spec strip separated by measure lines. **Remove the `+` suffix** — render the exact count (`8 PROJECTS`, `21 TECHNOLOGIES`, `3 ROLES`), or add an explicit `plus?: boolean` to the stat objects for any figure that genuinely is a floor.
- Featured skill badges become mono tags on a single row.

### 4.3 About

- Portrait gets a blueprint frame: corner ticks, a hairline measure line down one side, a mono caption. Subtle duotone that resolves to full colour on hover.
- Quick facts become a spec table (`LOCATION`, `EDUCATION`, `LANGUAGES`) in two columns.
- Add a `NOW` block — 2–3 mono lines on what he is currently learning or building, backed by a new `data/now.ts`. Cheap to maintain, strongly signals activity.

### 4.4 Skills

- Replace the flat 20+ tile grid with **category panels**, each a bordered blueprint plate with a mono header and count (`FRAMEWORKS / 04`).
- Tiles keep the icon but gain a hover annotation and a real focus state.
- Add a segmented filter (`ALL / FRONTEND / BACKEND / TOOLS / …`) driven by the existing `SkillCategory` union — zero new data required.
- Featured skills get an amber corner tick rather than a full border change.

### 4.5 Projects — largest engineering effort

- **New `ProjectsExplorer` client component** wrapping the grid, owning filter/search state.
    - Tech chips derived at build time from `[...new Set(projects.flatMap(p => p.technologies))]`.
    - Text search across `title`, `description`, `technologies`.
    - Sort: `Curated (order)` / `Recently updated (lastUpdated)` / `Stars`.
    - State synced to the URL (`?tech=nextjs&q=…`) so a filtered view is shareable — `useSearchParams` + `router.replace` with `scroll: false`, wrapped in `<Suspense>` per the Next 16 docs.
    - Empty state: a blueprint "no results" plate with a clear reset action.
    - Live result count in mono: `SHOWING 03 / 08`.
- **Bento layout** — the first featured project spans 2 columns × 2 rows with a screenshot; the rest are standard cells.
- **`ProjectCard` gains a visual**: render `screenshots[0]` through `next/image` with `fill` in a 16:10 box, blueprint-grid overlay at rest that clears on hover, and a mono `SLUG` annotation. Fall back to a deterministic slug-seeded blueprint pattern when `screenshots` is empty, so cards never look broken. Correct `sizes` to avoid over-fetching.
- Card footer becomes a spec strip: `LANG · ★ STARS · UPDATED`, mono, low contrast.
- `featured` renders an amber corner flag, not a pill.

### 4.6 Project detail page

- Full-bleed screenshot header with a grid overlay and the title over it.
- Left rail becomes a sticky **spec sheet**: `ROLE`, `STACK`, `STATUS`, `REPO`, `LIVE`, `UPDATED`.
- `keyFeatures` / `challenges` / `lessonsLearned` / `futureImprovements` become numbered blueprint callouts (`01`, `02`, …) rather than bullet lists.
- `testCredentials` gets a proper credentials plate with copy-to-clipboard per account — currently it is a paragraph with an inline `<code>`.
- Screenshot gallery with a lightbox: keyboard-navigable, Escape to close, focus returned to the trigger.
- Prev/next project pager at the foot, alongside the existing related-projects grid.

### 4.7 Experience & Education → unified timeline

- Replace the two stacked-card sections with a shared `<Timeline>`: a vertical spine that draws on scroll, dated nodes, alternating sides on `lg`, single column on mobile.
- Each node is a blueprint plate; the current role's node pulses in `--bp-success`.
- Add a **Certifications** strip below education. Recreate `data/certifications.ts` and `types/certification.ts` (both referenced in `project-tree.txt`, both currently missing) — issuer, name, date, credential URL.

### 4.8 Contact — fix the dead end

- **New Route Handler `app/api/contact/route.ts`** using Resend. Read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` before writing it.
    - Server-side validation, honeypot field, a simple in-memory rate limit keyed on IP, and `RESEND_API_KEY` from `.env.local` (never `NEXT_PUBLIC_`).
    - Return typed JSON: `{ ok: true }` / `{ ok: false, error }`.
- **`ContactForm` rewrite**: real submit states (`idle | submitting | success | error`), per-field inline validation on blur, `aria-invalid` + `aria-describedby` on every input, disabled + spinner submit button, blueprint success plate on completion.
- **Keep a mailto fallback link** below the form for anyone who prefers it — as an explicit choice, not the hidden default.
- Contact cards: `tel:` link on the phone, copy-to-clipboard on the email with a mono `COPIED` confirmation, social links with real icons in ticked boxes.

### 4.9 Footer

- Three columns: identity + availability, navigation, elsewhere.
- Mono build stamp: `LAST DEPLOYED · <date>` from `SITE_LAST_MODIFIED`.
- Oversized low-contrast wordmark across the base as a closing note.

---

## 5. Cross-cutting features

### 5.1 ⌘K command palette

`components/ui/CommandPalette.tsx`, opened with `⌘K` / `Ctrl+K` / the navbar button.

- Actions: jump to section, open any project, toggle theme, copy email, download resume, open GitHub/LinkedIn.
- Fuzzy filter over a single flat action list built from `data/navigation.ts` + `data/projects.ts` + `data/socials.ts`.
- Fully keyboard-operable: arrows, Enter, Escape, focus trap, focus restored on close, `role="dialog"` + `aria-modal`.
- Build in-house (~150 lines) rather than pulling `cmdk` — one fewer dependency, and it is itself a demonstrable piece of engineering.

### 5.2 Theme toggle

- `next-themes` or a small in-house provider — either is acceptable; the requirement is **no flash of wrong theme**, so the resolution script must be inlined in `<head>` and run before paint.
- Default `system`; cycle `system → light → dark`.
- Persist to `localStorage`; sync across tabs via the `storage` event.
- Both themes pass the §2.2 contrast check independently.
- Note: `hooks/useTheme.ts` is listed in `project-tree.txt` but does not exist — this is a fresh build, not a restoration.

### 5.3 Accessibility baseline (ships with every phase, not a phase of its own)

- Skip-to-content link, visible on focus, as the first focusable element.
- `:focus-visible` ring on every interactive element sitewide — one token, applied via a shared utility class.
- Mobile menu and palette: focus trap, Escape, scroll lock, focus restoration.
- All decorative blueprint motifs marked `aria-hidden="true"`.
- Semantic landmarks: one `<main>`, `<nav aria-label>` on both navs, `<section aria-labelledby>` bound to each heading id.
- Heading order h1 → h2 → h3 with no skips.
- Test the full page keyboard-only, and once with a screen reader.
- Fix `useSmoothScroll` to use `replaceState` rather than `pushState`, so section jumps stop filling the back button.

### 5.4 Performance guardrails

- Heavy client components below the fold go behind `next/dynamic` (palette, lightbox, explorer).
- The hero SVG is inline and hand-authored — no runtime canvas, no WebGL, no new animation dependency.
- Preload only the display font; `display: swap` on all three.
- All project screenshots via `next/image` with correct `sizes`; `priority` on the hero/bento image only.
- **Budget: the redesigned `/` must not exceed the baseline first-load JS by more than 25 kB gzipped.** Measure at the end of each phase.

---

## 6. Delivery phases

Each phase is independently shippable and ends green (`npm run build` + `npm run lint` clean).

| #     | Phase                                       | Scope                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Est.      |
| ----- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| **1** | **Design tokens & foundation**              | Rewrite `app/globals.css` with the full token set (colour, spacing, radius, elevation, z-index, both themes). Swap fonts in `layout.tsx`. Rewrite `lib/animations.ts` around `EASE`/`DUR`. Add reduced-motion CSS + provider. Add the grid overlay and skip link. Update `Button`/`Card`/`Badge`/`Container`/`SectionHeading` to consume tokens and gain corner ticks + focus rings. **No layout changes yet** — the site still works, just re-skinned. | ~1 day    |
| **2** | **Navbar, hero, footer**                    | Scroll progress, active-section indicator, availability pill, monogram, mobile-menu a11y fixes. New two-column hero with the drawn SVG schematic, CTA hierarchy fix, stat-suffix fix, count-up. New footer.                                                                                                                                                                                                                                             | ~1.5 days |
| **3** | **Projects system**                         | `ProjectsExplorer` (filter/search/sort/URL state), bento layout, `ProjectCard` with imagery + fallback pattern, project detail spec sheet, callouts, credentials plate, gallery lightbox, prev/next pager.                                                                                                                                                                                                                                              | ~2 days   |
| **4** | **About, skills, timeline, certifications** | Framed portrait + `NOW` block + spec table. Skill category panels + filter. Unified `<Timeline>` replacing Experience/Education cards. Recreate `types/certification.ts` + `data/certifications.ts` and the certifications strip.                                                                                                                                                                                                                       | ~1.5 days |
| **5** | **Contact + command palette + theme**       | `app/api/contact/route.ts` with Resend, rewritten `ContactForm` with real states, `tel:`/copy actions, ⌘K palette, theme toggle with no-flash script.                                                                                                                                                                                                                                                                                                   | ~1.5 days |
| **6** | **Polish & verification**                   | Full a11y sweep, contrast audit of both themes, Lighthouse on `/` and a project page, bundle-budget check, cross-browser and real-device pass, reduced-motion pass, re-check `docs/master-prompt.md` against what actually shipped, bump `SITE_LAST_MODIFIED`.                                                                                                                                                                                          | ~1 day    |

Phases 1 → 2 → 3 are the critical path; 4 and 5 can be reordered freely.

---

## 7. File-level change map

**Rewritten**

```
app/globals.css                          tokens, both themes, grid, reduced-motion
app/layout.tsx                           fonts, providers, skip link, theme script
lib/animations.ts                        EASE/DUR tokens, new variants
components/layout/Navbar.tsx             progress, active state, a11y, palette/theme triggers
components/layout/Footer.tsx             three-column, build stamp, wordmark
components/sections/HeroSection.tsx      two-column + SVG schematic
components/sections/SkillsSection.tsx    category panels + filter
components/sections/ProjectsSection.tsx  delegates to ProjectsExplorer
components/sections/ContactSection.tsx   tel:, copy, ticked social boxes
components/cards/ProjectCard.tsx         imagery, spec strip, corner flag
components/forms/ContactForm.tsx         real submission + validation + states
components/ui/{Button,Card,Badge,SectionHeading,Container}.tsx   token-driven
app/projects/[slug]/page.tsx             spec sheet, callouts, gallery, pager
```

**New**

```
app/api/contact/route.ts
app/template.tsx                          page transitions
components/ui/CommandPalette.tsx
components/ui/ThemeToggle.tsx
components/ui/ScrollProgress.tsx
components/ui/BlueprintFrame.tsx          corner ticks + measure lines
components/ui/SectionMarker.tsx           "/ 01 — ABOUT" + rule
components/ui/CopyButton.tsx
components/ui/Timeline.tsx
components/ui/Lightbox.tsx
components/sections/CertificationsSection.tsx
components/projects/ProjectsExplorer.tsx
components/projects/ProjectFilters.tsx
components/hero/BlueprintSchematic.tsx
hooks/useTheme.ts
hooks/useActiveSection.ts
hooks/useCommandPalette.ts
hooks/useCopyToClipboard.ts
hooks/useMagnetic.ts
lib/motion.ts                             MotionProvider + reduced-motion
types/certification.ts
data/certifications.ts
data/now.ts
```

**Deleted / superseded**

```
components/sections/ExperienceSection.tsx   → Timeline
components/sections/EducationSection.tsx    → Timeline
components/cards/ExperienceCard.tsx         → TimelineNode
components/cards/EducationCard.tsx          → TimelineNode
```

**New dependencies** — keep this list short:

- `resend` (contact API)
- `next-themes` _(optional — skip if the in-house provider is used)_

No new animation library. `framer-motion` v12 already covers scroll-linking, `layoutId`, `AnimatePresence` and `pathLength`.

---

## 8. Definition of done

Signed off 2026-09-01; the measurements behind each line are in §11.4.

- [x] `npm run build`, `npm run lint`, `npm run typecheck` and `npm run test` pass clean.
- [~] Lighthouse ≥ 95 Performance / 100 Accessibility / ≥ 95 Best Practices / 100 SEO on `/` and on one project page. **Desktop 99 / 96 / 96 / 100 on both.** Accessibility is three `aria-hidden` decorative motifs axe flags despite WCAG's incidental-text exemption; Best Practices is two Vercel-only scripts 404ing on localhost. Mobile Performance (69 / 83) is not measurable from this machine — Lighthouse warns the host CPU is below its calibration.
- [x] First-load JS on `/` within 25 kB gzipped of the baseline — it is **42.3 kB under** it.
- [x] Every interactive element reachable and operable by keyboard alone, with a visible focus ring. 58 tabbables on `/`, 37 on a project page, zero without a ring.
- [x] Both themes pass WCAG AA contrast (the one exception is documented as decorative); no flash of wrong theme on load.
- [x] `prefers-reduced-motion: reduce` produces a fully static, fully usable site.
- [x] Contact form delivers a real email and shows a real success state; the mailto path is a visible fallback, not the mechanism.
- [x] Project filter/search state survives a page reload via the URL — it is the URL.
- [x] No layout shift on load (CLS < 0.05) — measured 0.000 / 0.001.
- [x] Verified at 360px, 768px, 1280px, 1920px. **Not yet on a real phone** — the only line here that still needs a human.
- [x] No fabricated content anywhere — stats, dates and counts all trace to `data/*.ts`.

---

## 9. Documentation to update at the end

- ~~`docs/master-prompt.md`~~ — **done 2026-09-01, ahead of implementation.** Changes made:
    - _UI Design_, _Color Theme_, _Typography_, _Animation Philosophy_ rewritten to the Blueprint direction and the Confident motion tier; each carries a _(revised 2026-09-01)_ marker and a pointer back to this file.
    - _Future Expansion_ now separates what moved into current scope (light/dark themes, project filtering, search, ⌘K, case studies, contact API) from what remains genuinely future (blog, CMS, admin, i18n).
    - _Website Sections_ gained Certifications and a note that Experience + Education render as one shared timeline.
    - _Technology Stack_ gained Resend and @icons-pack/react-simple-icons, and the "no second animation library" rule.
    - _Database Philosophy_ no longer lists contact submissions as a reason to add a database.
    - _Project Structure_ corrected to the real directory layout (it listed a `styles/` directory that does not exist and omitted `hooks/`, `services/`, `adapters/`, `types/`).
    - _Skills_ category list corrected to match the `SkillCategory` union in `types/skill.ts` — it said "Cloud & Deployment" where the code says "Networking & Cloud".
    - **Still to do at the end of Phase 6:** re-read it against what actually shipped and correct any drift.
- `README.md` — refresh the stack list; document the `RESEND_API_KEY` environment variable.
- `lib/constants.ts` — bump `SITE_LAST_MODIFIED`; add `AUTHOR.availability`.
- `project-tree.txt` — regenerate; it is currently stale (lists files that no longer exist and omits many that do).

---

## 10. Risks

| Risk                                       | Mitigation                                                                                                                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Blueprint motifs become visual noise       | Hard rule: motifs never exceed `--bp-line` contrast, and are always `aria-hidden`. If a motif competes with content, delete it.                                                |
| Grid overlay hurts paint performance       | Pure CSS gradient on a single fixed, `pointer-events-none` layer. No JS, no canvas.                                                                                            |
| Motion tier creeps toward "Showcase"       | The §3.4 budget is binding. Anything scroll-scrubbed or WebGL is out of scope for this plan.                                                                                   |
| Missing screenshots make cards look broken | Deterministic slug-seeded blueprint fallback. Only one project image exists today, so this path is the _default_, not the exception — capture real screenshots during Phase 3. |
| Font swap regresses LCP                    | Preload display font only, `display: swap`, re-measure at the end of Phase 1.                                                                                                  |
| Next 16 API drift                          | Every new file's API surface confirmed against `node_modules/next/dist/docs/` before it is written (§0).                                                                       |

---

## 11. Implementation status — audited 2026-09-01

A full read of `app/`, `components/`, `hooks/`, `lib/`, `data/` and `types/` against
§§1–9 above. Everything below is verified against the tree, not inferred from commit
messages.

### 11.1 Deviations from this plan that are already shipped

These four are binding. They are not drift to be corrected — each was the better call
and each supersedes the section of this document that describes it. Anything written
from here on must follow the shipped architecture, not the original sketch.

1. **framer-motion was removed entirely.** It is not in `package.json`. The entrance
   choreography §3 describes now lives in CSS — the ENTRANCE CHOREOGRAPHY block in
   `app/globals.css` defines `[data-reveal]` variants (`up`, `fade`, `wipe`, `draw`),
   driven by a single IntersectionObserver in `components/motion/Reveal.tsx` with
   per-item delays from `lib/reveal.ts`. Only the observer root is a Client Component,
   which is what kept six section bodies out of the client bundle. `layoutId`,
   `AnimatePresence`, `pathLength` and `scrollYProgress` were each re-solved without it
   (`NavUnderline.tsx`, `ScrollProgress.tsx`, `data-reveal="draw"` + `pathLength="1"`).
   `lib/animations.ts` now exports only the `EASE`/`DUR` tokens plus a JS easing sampler
   for the count-up. **Do not add framer-motion, or any other animation library, back.**
2. **Contact is a Server Action, not a Route Handler.** `app/actions/contact.ts` +
   `lib/contact.ts` + `lib/rateLimit.ts`, consumed through `useActionState` and a real
   `<form action>`, so it submits with JS disabled. It supersedes §4.8's
   `app/api/contact/route.ts`; everything §4.8 actually asked for — server-side
   validation, honeypot, per-IP limit, non-public `RESEND_API_KEY`, visible mailto
   fallback — is present.
3. **Project filtering is server-rendered URL state, not a client explorer.**
   `lib/projectFilters.ts` + `components/projects/TechnologyFilter.tsx` render the facets
   as ordinary links, so every combination is a real crawlable address, the back button
   works for free, and `/projects` stays a Server Component. This supersedes §4.5's
   `ProjectsExplorer` with `useSearchParams`/`router.replace`. Search and sort must be
   added in the same style (see §12, P2), not by porting state into the client.
4. **The motion tier is "Expressive", and the whole system is CSS.** _(2026-09-02.)_
   Deviation 1 removed the library; this one is about what was built in its place, and it
   is more motion than §3 originally specified, not less. Four layers:
    - **Entrance** — `[data-reveal]` in `app/globals.css`, now `up` / `left` / `right` /
      `scale` / `blur` / `rule` / `fade` / `wipe` / `draw`, driven by
      `components/motion/Reveal.tsx`. `SectionHeading` is itself a reveal root, which is
      why every section on the site now announces itself the same way.
    - **Hover** — `.bp-sheen`, `.bp-lift`, `.bp-pop`, `.bp-nudge-x` / `.bp-nudge-y`. Plain
      `:hover` / `:focus-visible`, no script.
    - **Pointer-tracked** — `.bp-spotlight` and `.bp-tilt`, fed by one document-level
      listener in `components/motion/PointerFX.tsx` that writes `--fx-*` properties onto
      the single element under the cursor. Deliberately global, for the same reason
      `hooks/useMagnetic.ts` is: the animated plates stay Server Components and gain an
      attribute instead of a client boundary.
    - **Scroll-driven** — `animation-timeline` behind `@supports`: the timeline spine
      (a _named_ view timeline on the `<svg>`, because an anonymous `view()` cannot
      measure a `<path>`), hero and detail-header parallax, and the drafting-grid drift.
      Any new motion belongs in one of these four layers. Adding a fifth engine — a library,
      a rAF loop, a scroll listener that writes styles — needs a reason that none of the
      four can meet.

### 11.2 Phase status

| #     | Phase                                   | Status          | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----- | --------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | Design tokens & foundation              | ✅ **Complete** | Full token set in `globals.css` (colour, radius, elevation, z-index, motion, rhythm), both themes measured against AA including tinted-plate pairs, `--bp-line-ui` added for control borders, fonts swapped to Space Grotesk / Inter / IBM Plex Mono, `lib/animations.ts` rebuilt on `EASE`/`DUR`, reduced-motion CSS backstop, `bp-grid` / `bp-ticks` / `bp-focus` / `bp-meta` utilities, skip link in `layout.tsx`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **2** | Navbar, hero, footer                    | ✅ **Complete** | `ScrollProgress`, `NavUnderline` + `useActiveSection`, `AvailabilityPill` (from `AUTHOR.availability`), `Monogram`, `ThemeToggle`; mobile menu has focus trap, scroll lock, Escape and `aria-controls`. Two-column hero with `BlueprintSchematic`, one primary CTA + demoted resume link with a real measured file size, exact counts with `CountUp`, spec strip. Three-column footer with build stamp and oversized wordmark.                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **3** | Projects system                         | ✅ **Complete** | `ProjectCard` rebuilt on a 16:10 visual (`ProjectVisual`) with a deterministic slug-seeded `BlueprintPlate` as the default path (only one project has a screenshot), a grid overlay that clears on hover, a mono SLUG annotation, the `LANG · ★ · UPDATED` spec strip, an amber corner flag and ticked icon links in place of the two full-size Buttons. `/projects` gained `?q=` search (a `next/form` GET form that submits with JS off), a `?sort=` link control (curated / updated / stars, undefined last), `buildProjectsHref` preserving all three params, the xl bento cell, the `SHOWING 03 / 09` readout, and an empty state naming whichever control emptied it; `?q=` is `noindex`. Detail page rewritten: full-bleed preloaded header, sticky spec sheet, numbered callouts, credentials plate on `CopyButton` + `useCopyToClipboard`, dynamically-loaded `Lightbox` gallery, prev/next pager. |
| **4** | About, skills, timeline, certifications | ✅ **Complete** | About: `BlueprintFrame` + `MeasureLine` — the latter factored out of `BlueprintSchematic`, which now shares its geometry — duotone portrait resolving on hover, a mono spec table sourced from `data/education.ts` rather than a literal, and a `NOW` block on `data/now.ts` + `types/now.ts`. Skills: one plate per category with a mono count, and a segmented filter built from radio inputs plus generated `:has()` rules — no client JS, and every category stays visible with JS off — with hover annotations and amber ticks on featured tiles. `components/ui/Timeline.tsx` renders Experience and Education from one node shape, with a self-drawing spine and a single-settle current-role node; `ExperienceCard` / `EducationCard` deleted. `types/certification.ts` + `data/certifications.ts` ship with an empty array and `CertificationsStrip` renders nothing rather than placeholders.     |
| **5** | Contact + palette + theme               | ✅ **Complete** | Contact and theme are done and documented in `README.md` / `.env.example`; the pre-paint theme script (`lib/theme.ts`) resolves before first paint with no flash and no hydration mismatch. The ⌘K palette shipped 2026-09-01: `lib/commandPalette.ts` (pure action list + token-wise fuzzy matcher + grouping, unit-tested in `tests/lib/commandPalette.test.ts`), `components/ui/CommandPalette.tsx` (portaled combobox/listbox — `aria-activedescendant`, arrow/Home/End/Enter/Escape, focus trap, scroll lock, `aria-live`) and `components/ui/CommandPaletteTrigger.tsx` (the always-present button plus the ⌘K/Ctrl+K listener, which `next/dynamic`-imports the rest with `ssr: false` — 11.3 kB raw / 4.9 kB gzipped, fetched on first open). Built in-house, no `cmdk`.                                                                                                                            |
| **6** | Polish & verification                   | ✅ **Complete** | `ContactSection` rebuilt on the shared `SocialIcon` map with a `tel:` link (`toTelHref`), a `CopyButton` on the email and ticked icon boxes; the last five legacy `--color-*` consumers migrated and the aliases deleted from `globals.css`; page transitions via `app/template.tsx` + `app/projects/template.tsx`; magnetic primary CTAs (`hooks/useMagnetic.ts`, `components/ui/Magnetic.tsx`). The sweep itself found and fixed four defects — see §11.4.                                                                                                                                                                                                                                                                                                                                                                                                                                                |

### 11.3 Outstanding work, itemised

**Projects (§4.5, §4.6)** — ✅ closed by P1–P3. Card imagery, the slug-seeded fallback,
the grid overlay, the SLUG annotation, the spec strip, the corner flag, the bento cell,
`?q=`, `?sort=`, the full-bleed header, the sticky spec sheet, numbered callouts, the
credentials plate, the lightbox and the pager all shipped.

**About & Skills (§4.3, §4.4)** — ✅ closed by P4. Portrait frame, measure line, duotone
resolve, spec table, `NOW` block + `data/now.ts`, category panels with counts, the
segmented filter, tile annotations and amber ticks all shipped.

**Timeline & Certifications (§4.7)** — ✅ closed by P5. `components/ui/Timeline.tsx`
replaces both card stacks, `ExperienceCard` / `EducationCard` are deleted, and
`types/certification.ts` / `data/certifications.ts` ship empty behind a strip that renders
nothing until they are not.

**Cross-cutting (§4.8, §4.9, §5.3, §5.4)** — ✅ closed by P7. The phone is a real `tel:`
link via `toTelHref`, the email carries a `CopyButton`, and both the contact section and
the footer render their socials through one `components/ui/SocialIcon.tsx` map in ticked
boxes. Page transitions ship as `app/template.tsx` + `app/projects/template.tsx`; magnetic
hover ships as `hooks/useMagnetic.ts` behind a `Magnetic` wrapper, on the two hero CTAs
only.

**Cleanup (§9)** — ✅ closed by P7. The legacy `--color-*` aliases and `--font-heading` are
deleted from `globals.css` and nothing references them; `docs/master-prompt.md` is
reconciled with §11.1 and with the measured palette; `project-tree.txt` is regenerated;
`SITE_LAST_MODIFIED` is `2026-09-01`.

---

### 11.4 Phase 6 verification — measured 2026-09-01

Run against a local production build (`next build` + `next start`), Chrome 152 headless.

**Defects the sweep found and fixed.** These are the reason the phase was worth running
rather than signing off:

1. **`--bp-ink-faint` had drifted into carrying information.** §2.2 designates it
   decorative-only, and it measures **2.30–2.89:1 in the dark theme** — there is no fourth
   text tier available, because `--bp-ink-muted` is already the AA floor there. Phases 3–5
   had nonetheless put spec keys, timeline dates, filter counts, palette group headings,
   form placeholders and the error digest on it. All 24 informational uses moved to
   `--bp-ink-muted`; what still uses it is SVG annotation, measure labels, `aria-hidden`
   separators and captions, hover-only annotations, and inactive chips. The rule and the
   list of permitted uses are now written next to the token.
2. **The LCP element was gated on hydration.** `<Reveal immediate>` set `data-visible`
   from an effect, so the hero copy sat at `opacity: 0` until React hydrated — Lighthouse
   measured LCP a full second behind FCP. It now ships `data-visible="true"` in the server
   HTML and animates from an `@starting-style` entry state, so the choreography is
   unchanged but nothing above the fold waits on JavaScript. FCP 1.8s → 1.2s,
   Speed Index 2.0s → 1.4s on the mobile profile.
3. **`/projects` skipped a heading level** (h1 → the h3 project titles). The results grid
   is now a labelled region with an `sr-only` h2.
4. **`app/projects/loading.tsx` streamed an unnamed `<section>` landmark** into the initial
   HTML of every page under `/projects`. It is a `role="status"` region with a name now.

Smaller: the `⌘K` hint rendered as `CTRLK` under `bp-meta`'s uppercase + letterspacing,
and the spec sheet's REPO row wrapped a full GitHub URL across four lines of a narrow rail
(`shortenUrl` did not do what its own docstring claimed). Both fixed.

**First-load JS, gzipped, against the pre-redesign baseline** (`main` @ 318eff3, built in a
clean worktree — §0.3's baseline was never actually recorded, so it was reconstructed):

| Route              | Baseline | Now      | Δ            |
| ------------------ | -------- | -------- | ------------ |
| `/`                | 217.8 kB | 175.5 kB | **−42.3 kB** |
| `/projects`        | 158.0 kB | 172.2 kB | +14.2 kB     |
| `/projects/[slug]` | 163.4 kB | 172.9 kB | +9.5 kB      |

Every route is inside the +25 kB budget in §5.4, and the homepage is materially _lighter_
than before the redesign — removing framer-motion paid for the whole feature set.

**Lighthouse** (`/` and `/projects/jobnow`) — Performance / Accessibility / Best Practices / SEO:

| Profile | `/`                    | `/projects/jobnow`     |
| ------- | ---------------------- | ---------------------- |
| Desktop | **99 / 96 / 96 / 100** | **99 / 96 / 96 / 100** |
| Mobile  | 69 / 96 / 96 / 100     | 83 / 96 / 96 / 100     |

Two scores sit below §8's bar, both understood and neither a code defect:

- **Accessibility 96** is a single `color-contrast` audit listing three elements: the
  measure-line label, the blueprint frame's caption, and the footer wordmark. All three are
  `aria-hidden` pure decoration, which WCAG 1.4.3 explicitly exempts as incidental — axe
  flags them anyway. Raising them to 4.5:1 would delete the design direction §2.4 is built
  on. Recorded as a deliberate exception rather than chased.
- **Best Practices 96** is `errors-in-console`, and every entry is `_vercel/insights` and
  `_vercel/speed-insights` 404ing because those scripts only exist on Vercel. It is a
  localhost artifact.

**Mobile Performance is not a usable number from this machine.** Lighthouse emitted its own
run warning that the host CPU is slower than it calibrates for, and the run is
CPU-throttled 4× on top of that. The desktop profile — same build, same server — scores 99
on both pages, with LCP 0.9s and CLS 0.001. The structural cost on the mobile profile is
style/layout on a ~1,200-element page carrying 70 inline SVGs; that is the shape of the
design, not a regression, and reducing it is a scope decision rather than a fix.

**Everything else in §8 verified:**

- **Keyboard.** Walked `/` (58 tabbables) and `/projects/jobnow` (37) with real dispatched
  Tab events. Every one reachable, every one matching `:focus-visible`, every one settling
  to the 2px accent ring. Note the ring _fades in_ on controls using `transition-colors` —
  Tailwind v4 includes `outline-color` in that utility — which is why a snapshot taken
  mid-transition reads the element's own colour.
- **Reduced motion.** Under emulated `prefers-reduced-motion: reduce`: all 78
  `[data-reveal]` elements at full opacity, `scroll-behavior: auto`, and no element on the
  page carrying an animation longer than 50ms or set to `infinite`.
- **Contrast.** Both themes re-measured programmatically across 29 foreground/background
  pairs plus 7 coloured-text-over-its-own-tint pairs. Everything passes except
  `--bp-ink-faint`, covered above.
- **Layout.** No horizontal overflow at 360 / 768 / 1280 / 1920 on `/`, `/projects` or a
  project page — `scrollWidth === clientWidth` at every width, with zero elements extending
  past the viewport. CLS 0.000 (mobile) / 0.001 (desktop).
- **Content.** Every figure traces to `data/*.ts`: 9 projects, 22 skills, 3 roles, the 3.72
  CGPA in `data/education.ts`, the resume's 432 kB measured off the real PDF at build time,
  and `data/certifications.ts` still an empty array rendering nothing rather than
  placeholders.

---

## 12. Implementation prompts

Seven prompts closing §11.3. Each is independently shippable and ends green. Run in
order; **P4, P5 and P6 can be reordered freely** — P1 → P2 → P3 is the critical path,
and P6 depends on the `CopyButton` extracted in P3.

### 12.0 Preamble — paste at the top of every prompt below

> Read `AGENTS.md` first — this is Next 16.2.10 and its APIs differ from your training
> data; confirm any Next API you touch against `node_modules/next/dist/docs/` before
> writing it. Read `docs/uiux.md` for the design direction, and **§11.1 for the three
> shipped deviations from it**, which are binding: **(1) framer-motion is not installed
> and must not be added** — entrance motion is CSS `[data-reveal]` (see the ENTRANCE
> CHOREOGRAPHY block in `app/globals.css`) driven by `components/motion/Reveal.tsx` with
> delays from `lib/reveal.ts`; **(2)** prefer Server Components and URL state over client
> state, matching `lib/projectFilters.ts`; **(3)** use only the `--bp-*`-backed Tailwind
> names (`bg-surface`, `text-ink-muted`, `border-line`, `bp-meta`, `bp-ticks`, `bp-focus`,
> …) — the `--color-card` / `--color-muted` / `--color-primary` / `--color-foreground`
> aliases in `globals.css` are legacy and must be deleted from that file once you migrate
> their last consumer. End with `npm run lint`, `npm run typecheck`, `npm run test` and
> `npm run build` all clean.

### P1 — ProjectCard: imagery, spec strip, corner flag

```text
Rewrite components/cards/ProjectCard.tsx per docs/uiux.md §4.5, and migrate it off the
legacy colour aliases.

- Add a 16:10 visual at the top of the card: next/image with `fill`, rendering
  project.screenshots[0]. Correct `sizes` for the two grids it appears in
  (homepage: 3-col at lg; /projects: 3-col at xl) — do not ship a bare 100vw.
- Only one project currently has a screenshot, so the FALLBACK IS THE DEFAULT PATH,
  not the exception: build a deterministic slug-seeded blueprint pattern (inline SVG,
  hashed from the slug, drawn in --bp-line / --bp-line-strong, aria-hidden) so cards
  never look broken or identical. Same slug must always produce the same pattern —
  no Math.random.
- At rest the image carries a blueprint-grid overlay that clears on hover; add a mono
  SLUG annotation in the corner.
- Reserve the box's aspect ratio in CSS so there is zero CLS.
- Replace the footer button row with a mono spec strip at --bp-ink-faint:
  `LANG · ★ STARS · UPDATED`. Fields render only when present (they are GitHub-derived).
  The whole card body already links to the detail page; keep the repo/live links as
  small ticked icon links, not two full-size Buttons.
- `featured` becomes an amber (--bp-signal) corner flag, not a Badge pill.
- Keep the existing Card `interactive` treatment (tick extension + edge sweep); do not
  reimplement hover.
- Add a vitest for the fallback-pattern generator: same slug → same output, different
  slugs → different output.
```

### P2 — /projects: search, sort, bento

```text
Extend the /projects catalogue per docs/uiux.md §4.5, keeping the existing
server-rendered URL-state architecture in lib/projectFilters.ts — do NOT introduce a
client-side ProjectsExplorer (see §11.1.3).

- Text search across title, description and technologies, as a `?q=` param. Implement
  it as a real <form method="get"> so it submits without JS; preserve any active
  `?tech=` selection via hidden inputs. Add matchesQuery() to lib/projectFilters.ts.
- Sort control as a `?sort=` param with three options — curated (data order, default),
  updated (lastUpdated desc, undefined last), stars (desc, undefined last). Render as
  links, same pattern as the tech chips, so it needs no JS either.
- Make buildTechHref / a new buildProjectsHref preserve q and sort across every chip,
  and omit default values so the canonical unfiltered URL stays exactly /projects.
- Bento layout: on xl, the first FEATURED project in the result set spans 2 columns ×
  2 rows and shows its screenshot large; the rest are standard cells. Degrade to a
  plain grid when nothing in the result set is featured, and on smaller breakpoints.
- Update the live count line to the mono `SHOWING 03 / 08` form from §4.5.
- The empty state must reset all three params, and its copy must name whichever
  narrowed the result to zero.
- generateMetadata: keep the canonical at /projects for every combination; add
  `robots: { index: false }` for any request carrying `q`, since search results are
  not indexable content.
- Unit-test matchesQuery and the sort comparators (including the undefined-last rule)
  in tests/lib/.
```

### P3 — Project detail page

```text
Rewrite app/projects/[slug]/page.tsx per docs/uiux.md §4.6. It is the last page still
entirely on the pre-redesign markup and legacy colour aliases.

- Full-bleed screenshot header with the blueprint grid overlay and the title over it.
  Use the P1 slug-seeded fallback when screenshots is empty. priority on this image.
- Left rail becomes a STICKY mono spec sheet: ROLE, STACK, STATUS, REPO, LIVE,
  UPDATED. Rows with no data are omitted, not rendered blank. This replaces the
  "Project snapshot" Card, whose copy is generic filler.
- keyFeatures / challenges / lessonsLearned / futureImprovements become numbered
  blueprint callouts (01, 02, …) with a hairline leader, not <ul class="list-disc">.
- testCredentials gets a proper credentials plate: one row per account, each with a
  copy-to-clipboard button, plus one for the shared password. Extract a reusable
  components/ui/CopyButton.tsx + hooks/useCopyToClipboard.ts — a client island only
  for the button itself, with a mono COPIED confirmation announced via aria-live and
  a graceful fallback when navigator.clipboard is unavailable (insecure context).
- Screenshot gallery with a lightbox: components/ui/Lightbox.tsx behind next/dynamic,
  arrow-key navigable, Escape to close, focus trapped while open (reuse
  hooks/useFocusTrap.ts and hooks/useBodyScrollLock.ts — both already exist), focus
  returned to the trigger on close, role="dialog" + aria-modal.
- Prev/next pager at the foot, ordered by the same curated data order as /projects,
  above the existing related-projects grid.
- Keep the existing JSON-LD, dynamicParams=false and generateStaticParams behaviour
  untouched.
```

### P4 — About + Skills

```text
Rewrite components/sections/AboutSection.tsx and SkillsSection.tsx per docs/uiux.md
§4.3 and §4.4. Both still render pre-redesign markup on legacy colour aliases.

About:
- Portrait gets a blueprint frame — corner ticks, a hairline measure line with end-caps
  down one side, a mono caption. Subtle duotone at rest resolving to full colour on
  hover, disabled under prefers-reduced-motion. Extract the reusable pieces as
  components/ui/BlueprintFrame.tsx; the measure-line treatment already exists ad hoc
  in components/hero/BlueprintSchematic.tsx — factor out rather than duplicate.
  All of it aria-hidden.
- Quick facts become a two-column mono spec table: LOCATION, EDUCATION, LANGUAGES.
- Add a NOW block — 2–3 mono lines on what is currently being learned or built, backed
  by a new data/now.ts with a typed shape and a `since` date. Content must be true and
  traceable to real work in this repo or data/*.ts; invent nothing.

Skills:
- Replace the flat grid with category panels: one bordered blueprint plate per
  category, mono header with count (`FRAMEWORKS / 04`).
- Segmented filter over the SkillCategory union from types/skill.ts (ALL / …). No new
  data. Prefer CSS/:has or a tiny client island — do not pull the whole section into
  the client bundle, and make sure every category is visible with JS off.
- Tiles gain a mono hover annotation and a real bp-focus state.
- Featured skills get an amber (--bp-signal) corner tick, not a border change.
- Keep the existing per-category Reveal so each group cascades on its own observer.
```

### P5 — Unified Timeline + Certifications

```text
Replace components/sections/ExperienceSection.tsx and EducationSection.tsx with one
shared timeline per docs/uiux.md §4.7, and add the missing certifications strip.

- New components/ui/Timeline.tsx: a vertical spine that draws downward as the section
  enters view (use the existing data-reveal="draw" CSS variant on an SVG path carrying
  pathLength="1" — see the ENTRANCE CHOREOGRAPHY block; do NOT add framer-motion).
  Dated nodes, alternating sides at lg, single column on mobile.
- Each node is a blueprint plate. The current role's node pulses in --bp-success —
  and per §3.4 the only permitted infinite loop is the ⌘K caret, so keep this to a
  single settle, not a loop, or gate it behind prefers-reduced-motion: no-preference.
- Experience and Education render through the same Timeline with a shared node shape;
  delete components/cards/ExperienceCard.tsx and EducationCard.tsx once nothing
  imports them.
- Preserve the existing sortByStartDateDesc ordering, the section ids (#experience,
  #education — data/navigation.ts and hooks/useActiveSection.ts depend on them), the
  aria-labelledby bindings, and the SectionHeading index numbering.
- Create types/certification.ts and data/certifications.ts (issuer, name, date,
  credentialUrl) and a certifications strip below education. Populate ONLY with
  certifications that actually exist — if there are none yet, ship the type, the data
  file with an empty typed array, and have the strip render nothing rather than
  placeholder entries.
- Update docs/master-prompt.md's section list if the heading structure changes.
```

### P6 — ⌘K command palette — ✅ shipped 2026-09-01

> Two deliberate departures from the prompt below. **(1)** The theme entry is three
> explicit commands (`Match system` / `Switch to light` / `Switch to dark`, derived from
> `THEME_MODES`) rather than one "toggle": a palette is searched, not cycled, so typing
> "dark" has to land on dark. **(2)** The `CopyButton` from P3 did not exist yet, so the
> `useCopyToClipboard` hook underneath it was built here and P3's button is now a thin
> control over it. Also of note: `useBodyScrollLock` became a layout effect, because both
> it and the mobile nav released the lock a frame _after_ the browser had already tried to
> perform a `#section` jump; and the navbar availability pill moved from `lg` to `xl` to
> make room for the trigger's full search lockup.

```text
Build components/ui/CommandPalette.tsx per docs/uiux.md §5.1. In-house, no cmdk.

- Opens on ⌘K / Ctrl+K and from the navbar trigger. Navbar.tsx already carries a
  comment marking where that trigger goes; the bp-meta utility already covers the
  ⌘K hint lockup.
- One flat action list built from data/navigation.ts, data/projects.ts and
  data/socials.ts: jump to section, open any project, toggle theme (via the existing
  hooks/useTheme.tsx), copy email (via the CopyButton hook from P3), download resume
  (lib/resume.ts), open GitHub/LinkedIn. Nothing hardcoded that already lives in data/.
- Fuzzy filter, arrow-key navigation, Enter to run, Escape to close, focus trapped
  (hooks/useFocusTrap.ts), body scroll locked (hooks/useBodyScrollLock.ts), focus
  restored to the trigger on close, role="dialog" + aria-modal, results announced via
  aria-live.
- Load behind next/dynamic with ssr:false so it costs nothing until first opened; the
  keyboard listener that triggers the import must be tiny and always present.
- The blinking caret in the hint is the one sanctioned infinite animation on the site
  (§3.4) — still disable it under prefers-reduced-motion.
- Use z-modal from the layering scale. Never a bare z-[n].
- Do not trigger any native alert/confirm anywhere in this component.
```

### P7 — Cross-cutting polish + Phase 6 verification — ✅ shipped 2026-09-01

> Three judgement calls worth recording. **(1)** Page transitions use `app/template.tsx`,
> not React's `<ViewTransition>`. Next 16 does document the native path
> (`experimental.viewTransition`), but the component ships from React, and the installed
> `react@19.2.4` — stable, not canary — does not export it; adopting it means moving the
> whole app onto a canary React for an 8px rise. A template remounts its subtree on
> navigation, so a CSS keyframe on the wrapper does the same job with no runtime and no
> flag. Two templates are needed, because a template's key is its own segment level:
> the root one covers `/ ↔ /projects`, and `app/projects/template.tsx` covers
> `/projects → /projects/[slug]` and the pager stepping between projects.
> **(2)** Magnetic hover is on the two hero CTAs only. The effect says "this is the thing
> to click", which is only true of a page's primary actions, and wrapping every button
> would turn a dozen server-rendered controls into client islands for a 4px lean. One
> document-level `pointermove` listener serves every magnetised element, since the effect
> needs pointer positions from outside the element's own box.
> **(3)** The `socialIconMap` moved out of `Footer.tsx` into `components/ui/SocialIcon.tsx`
> — the contact section renders the same set, and importing the map out of the footer
> would have dragged the whole page-chrome module along with it.
>
> Results, including the four defects the sweep itself uncovered, are in §11.4.

```text
Close out docs/uiux.md §4.8/§4.9/§5.3/§5.4 and run the Phase 6 sweep (§6, §8, §9).

Remaining feature gaps:
- ContactSection.tsx: still on legacy aliases. Make the phone a real tel: link, put
  copy-to-clipboard on the email (P3's CopyButton), and render socials with real icons
  in ticked boxes rather than text pills.
- app/template.tsx page transitions (fade + 8px rise). FIRST check Next 16's View
  Transitions support in node_modules/next/dist/docs/ and choose between template.tsx
  and the native API on what you find; if neither is clean without framer-motion,
  skip it and say so rather than adding a dependency.
- Magnetic buttons (hooks/useMagnetic.ts, §3.3): translate up to 4px toward the cursor
  within 90px, spring back. Disabled under prefers-reduced-motion AND on
  pointer: coarse. If this cannot be done cleanly without a spring library, drop it —
  it is the lowest-value item in the plan and not worth a dependency.

Verification, against §8:
- Delete every remaining legacy --color-* alias from globals.css and confirm nothing
  references them.
- Full keyboard-only pass over / and one project page; every interactive element
  reachable with a visible bp-focus ring. One screen-reader pass.
- Re-audit contrast in BOTH themes, including coloured text over its own tinted plate.
- prefers-reduced-motion: reduce must yield a fully static, fully usable site.
- Lighthouse on / and one project page; report the four scores. Check first-load JS
  against the recorded baseline (budget: +25 kB gzipped) and report the delta.
- Verify at 360 / 768 / 1280 / 1920.
- Confirm no fabricated content: every stat, date and count traces to data/*.ts.

Docs, per §9:
- Re-read docs/master-prompt.md against what actually shipped and correct the drift —
  in particular the three deviations recorded in §11.1.
- Update this file's status line and §11.2 phase table to reflect completion.
- Regenerate the stale project-tree.txt. Bump SITE_LAST_MODIFIED in lib/constants.ts.
```
