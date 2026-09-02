# Portfolio Website - Master Context

> **Design revision — 2026-09-01.** The visual direction was reworked to
> **"Blueprint / Engineered"**. The sections below marked _(revised 2026-09-01)_
> — UI Design, Color Theme, Typography, Animation Philosophy — supersede the
> original minimal-modern brief and its slate/blue palette. The full rationale,
> audit, token set and phased implementation plan live in `uiux.md` at the repo
> root; this file records the resulting standing rules. Where the two disagree,
> `uiux.md` is the more detailed source and this file is the summary.
> Everything not marked as revised still stands as originally written.

## Project Overview

This project is a professional portfolio website designed to showcase the developer's technical skills, software engineering experience, projects, education, certifications, achievements, and contact information. The primary purpose of the website is to:

- Introduce the developer professionally
- Demonstrate technical skills
- Showcase software projects
- Improve employability
- Serve as a portfolio for internships and full-time software engineering positions
- Demonstrate frontend development ability through the website itself
  The website should look and behave like a modern professional developer portfolio rather than a personal blog or social media page.

---

# Overall Philosophy

Every design and development decision should prioritize:

1. Professional appearance
2. Excellent user experience
3. Maintainable architecture
4. Performance
5. Accessibility
6. Responsiveness
7. SEO
8. Clean and reusable code
   Avoid unnecessary complexity. Only introduce additional technologies or libraries if they provide meaningful benefits.

---

# Target Audience

The website is primarily intended for:

- Recruiters
- Hiring managers
- Software engineers
- Technical interviewers
- Internship coordinators
- Potential clients
  The website should help visitors understand the developer within approximately 30 seconds.

---

# Technology Stack

Framework: Next.js (App Router)
Language: TypeScript
Styling: Tailwind CSS
Animations: **none — no animation library at all** _(revised 2026-09-01, Phase 6)_.
Framer Motion was removed during the rebuild. Entrance choreography is CSS:
`[data-reveal]` variants in `app/globals.css` driven by one IntersectionObserver in
`components/motion/Reveal.tsx`, with delays from `lib/reveal.ts`. Scroll progress, the
active-nav underline, `pathLength` draws, enter/exit panels and page transitions were
each re-solved without it. Do not reintroduce one — see `docs/uiux.md` §11.1.1.
Icons: Lucide React, plus @icons-pack/react-simple-icons for brand marks
(lucide-react v1 removed all brand icons)
Transactional email: Resend, called over its HTTP API from a Server Action
(`app/actions/contact.ts`) — not an SDK dependency and not a Route Handler
Deployment: Vercel
Repository: GitHub
Development Environment: Visual Studio Code
Database: Supabase (only if dynamic features become necessary)
Analytics: Vercel Analytics

---

# Database Philosophy

The portfolio should remain mostly static. Do not introduce a database unless there is
a clear requirement. Contact submissions are handled by a Server Action sending through
Resend — they are **not** a reason to add a database. Supabase may later be used for:

- Blog system
- Visitor analytics
- Guestbook
- Admin dashboard
- Dynamic project management
  Avoid unnecessary backend complexity.

---

# Project Structure

The project should remain modular. Actual organization:
app/ — routes, layouts, `template.tsx` page transitions, and `actions/` (Server Actions)
components/ — cards/, forms/, hero/, layout/, motion/, projects/, sections/, skills/, ui/
data/ — static content (projects, skills, experience, education, certifications, now, socials, navigation)
types/ — shared interfaces; the source of truth for data shapes
lib/ — pure helpers (utils, animations, metadata, structuredData, constants)
hooks/ — client-side React hooks
services/ — external API access (GitHub)
adapters/ — mapping external shapes onto internal types
tests/ — vitest suites, mirroring the directory they cover
public/
There is no `styles/` directory; all global CSS lives in `app/globals.css`.
Components should remain reusable. Business logic should not be mixed with UI whenever possible.

---

# Website Sections

The portfolio should include:

- Home
- About
- Skills
- Projects
- Experience
- Education
- Certifications
- Contact
- Resume
  Experience and Education render as a single shared timeline component rather than two
  separate stacked-card sections. Additional sections may be added later if they improve
  the portfolio.

---

# Home Page Goals

The landing page should immediately communicate: Who the developer is. What the developer specializes in. Why someone should continue exploring the portfolio.
Include:

- Hero section
- Introduction
- CTA buttons
- Statistics
- Featured projects
- Quick skills overview

---

# Skills

Skills should be organized by category instead of proficiency bars. The categories are
a fixed union in `types/skill.ts` — that file is the source of truth, and this list
must match it:
Frontend
Backend
Programming Languages
Databases
Frameworks
Developer Tools
Networking & Cloud
Other Technologies

---

# Projects

Projects are the most important section of the website. Each project should include:

- Title
- Description
- Technologies
- GitHub link
- Live Demo (if available)
- Screenshots
- Key Features
- Challenges
- Lessons Learned
- Future Improvements
  Projects should eventually be automatically synchronized with GitHub whenever practical.

---

# GitHub Integration

GitHub should become the primary source of project information. Possible features include:

- Featured repositories
- Repository language
- Stars
- Last updated date
- GitHub profile link
  The portfolio should avoid manually duplicating information that GitHub already provides.

---

# UI Design _(revised 2026-09-01)_

Design style: **Blueprint / Engineered** — the site presents itself as a technical
drawing of the developer. Professional, developer-oriented, clean and readable, but
with a distinct identity rather than a generic minimal-modern template.

Signature motifs:

- Drafting grid — fixed, `pointer-events-none`, ~3% opacity, 32px with 4th-line emphasis
- Corner registration ticks on card surfaces
- Mono section numbering (`/ 01 — ABOUT`) with a hairline rule to the container edge
- Measure lines annotating one key figure per section
- Leader-line callouts connecting annotations to what they describe
- Monospaced spec tables for project metadata instead of prose

**Governing rule: motifs are chrome, never content.** They stay at or below
`--bp-line` contrast, are always `aria-hidden`, and are deleted outright if they ever
compete with real content for attention. Generous whitespace still applies. Clutter
is still forbidden.

---

# Color Theme _(revised 2026-09-01)_

Dark-first, with a full light theme as a first-class secondary (no longer "future").
Tokens are prefixed `--bp-*` and defined in `app/globals.css`.

Dark (primary):
Void (page): #070C14
Base (section): #0B1220
Surface (cards): #111C2E
Surface alt: #16243A
Line: #1E3050
Line strong: #2C446E
Ink: #E6EDF7
Ink muted: #7D8CA3
Ink faint: #4E5C72 (decorative only — never the sole carrier of information)
Line UI: #5471A0 (borders that identify a control — Line and Line strong are chrome and
do not clear 3:1)
Accent (cyan): #38BDF8 · Accent deep: #0EA5E9 · Accent ink: #070C14
Signal (amber): #F59E0B
Success: #34D399
Danger: #F87171

Light (secondary — "printed blueprint on vellum"), as shipped:
Void: #EEF2F7 · Base: #F7F9FC · Surface: #FFFFFF · Surface alt: #EEF2F7
Line: #D3DCE8 · Line strong: #A9B8CC · Line UI: #7C8CA1
Ink: #0B1220 · Ink muted: #52627A · Ink faint: #7C8CA1
Accent: #0369A1 · Accent deep: #075985 · Accent ink: #FFFFFF
Signal: #9A4506 · Success: #046A4D · Danger: #B91C1C

Signal, Success and Danger are darker than the light-theme values originally proposed
(#B45309 / #047857): measured, those missed AA as text over their own 10% tint, which is
exactly where the Badge and status plates use them.

Both themes must independently pass WCAG AA (4.5:1 body text, 3:1 large text and UI
borders) before shipping. Verified 2026-09-01 across both themes, including coloured text
over its own tinted plate; the only pairs below the bar are `--bp-ink-faint` and the
hairline chrome, both of which are decorative by contract. Values may evolve but must be
re-measured whenever they change.

---

# Typography _(revised 2026-09-01)_

Display / headings: Space Grotesk (500, 700)
Body: Inter (400, 500)
Mono / annotation: IBM Plex Mono (400, 500)

Mono is a first-class UI face here, not just a code face — it carries eyebrows,
measure labels, tech tags, timestamps and spec tables. Poppins and JetBrains Mono are
retired; the total family count stays at three. Type scale is fluid via `clamp()`,
topping out at 6rem for the hero display. Typography should emphasize readability.

---

# Animation Philosophy _(revised 2026-09-01)_

Motion tier: **Confident**. Animation should enhance usability and demonstrate craft,
without becoming a demo reel.

All timing comes from the `EASE` / `DUR` tokens in `lib/animations.ts` — no inline
durations anywhere.

Permitted:

- Scroll-linked reveals and a scroll-progress indicator
- Staggered text and clip-path wipes
- SVG `pathLength` draw-on animations (hero schematic, timeline spine)
- Hover lifts and magnetic buttons (`hooks/useMagnetic.ts`), settled with an eased CSS
  transition rather than a spring integrator — there is no animation runtime to spring with
- A shared active-nav underline, and page transitions via `app/template.tsx`

Avoid:

- Anything longer than `DUR.slow` (0.6s), except the one-time hero draw
- Scroll-jacking, scroll-scrubbed sequences, WebGL/canvas
- Infinite loops (the ⌘K caret blink is the sole exception)
- Properties that trigger layout — animate `transform` and `opacity` only

**`prefers-reduced-motion: reduce` must produce a fully static, fully usable site.**
Enforced entirely in CSS: the entrance rules only exist inside a
`prefers-reduced-motion: no-preference` query, so a reduced-motion visitor is served the
finished layout rather than an animation that snaps, and a global backstop in
`globals.css` neutralises every transition, keyframe and `scroll-behavior` written since.
`lib/motion.ts` covers the two effects CSS cannot express. Animations should never slow
navigation.

---

# Responsiveness

The website must support: Desktop Tablet Mobile
Responsive behavior should be considered during implementation rather than added later.

---

# Accessibility

Accessibility should always be considered. Include:
Semantic HTML
Keyboard navigation
ARIA attributes where appropriate
Proper heading hierarchy
Accessible color contrast
Alt text
Focus states

---

# Performance Goals _(measured 2026-09-01, Phase 6)_

Aim for high Lighthouse scores. Target:
Performance: 95+
Accessibility: 100
Best Practices: 100
SEO: 100
Prefer server-side rendering and static generation whenever appropriate. Optimize images. Lazy load non-critical assets. Avoid unnecessary JavaScript.

Measured on a local production build (`next start`), `/` and `/projects/jobnow`:
desktop **99 / 96 / 96 / 100**, mobile **69–83 / 96 / 96 / 100**. Two structural gaps
against the targets, both understood — see `docs/uiux.md` §11.4:

- Accessibility 96 is three `aria-hidden` decorative motifs (measure-line label, drawing
  caption, footer wordmark) that axe reports regardless of being hidden. WCAG 1.4.3
  exempts incidental text; raising them would delete the design direction.
- Best Practices 96 is two `_vercel/*` analytics scripts that only exist on Vercel and
  404 locally. It is a localhost artifact, not a code defect.
  Mobile Performance is not a trustworthy figure from this machine — Lighthouse itself
  warns the host CPU is slower than it calibrates for.

---

# SEO

Every page should support:
Metadata
Title
Description
Open Graph
Twitter Cards
Robots
Sitemap
Structured metadata where appropriate.

---

# Future Expansion _(revised 2026-09-01)_

The following moved from "future" into **current scope** under the Blueprint
redesign — see `uiux.md` §5 and §6:
Dark/Light themes (with no-flash SSR resolution)
Project filtering, search and sort (URL-synced)
Command palette (⌘K)
Case studies (project detail pages)
GitHub synchronization (already live via `services/githubService.ts`)
Contact submissions (a real Server Action, with mailto demoted to a visible fallback)

Still future:
Blog
Admin dashboard
Visitor analytics beyond Vercel Analytics
CMS
Internationalization
The architecture should remain scalable without requiring major rewrites.

---

# Coding Standards & AI Behavior (TOKEN-OPTIMIZED)

Prioritize: Readability, Maintainability, Reusability, Consistency, and Strong typing. Avoid duplicate code. Prefer composition over duplication. Keep components focused on a single responsibility.

### AI Context & Token Reduction Rules:

1. STRICT CODE OUTPUT: Return ONLY executable code blocks. No explanations, no introductory greetings, no "Here is the code", and no concluding summaries.
2. PARTIAL SNIPPETS ONLY: Never rewrite an entire 100-line component to change 5 lines. Output only the target function or modified snippet. Use comments like `// ... existing code ...` to represent untouched logic blocks.
3. ERROR TREATMENT: When a bug is pointed out, immediately output the corrected snippet. Do not apologize, analyze why it happened, or explain the fix.
4. CONDITION SYSTEM: If a workflow contains dependent code paths, provide all blocks in a single response using separate code blocks. Do not wait for user validation unless critical data is missing.
5. CHAT OVERRIDE: To bypass this compression mode for file structures, architecture diagrams, or mental explanations, the user's prompt will explicitly include the tag `[EXPLAIN]`. If `[EXPLAIN]` is absent, enforce raw code snippets.

---

# Overall Goal

The final product should represent the quality expected from a professional software developer. The website itself should serve as evidence of the developer's engineering ability, UI/UX understanding, code quality, and attention to detail.
