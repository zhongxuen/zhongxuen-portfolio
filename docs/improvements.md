# Site & Code Improvement Plan

Audit date: 2026-09-01

Method: full read of `app/`, `components/`, `lib/`, `hooks/`, `data/`, `services/`,
`adapters/`, `types/`; `tsc --noEmit` and `eslint` (both clean); a production
`npm run build`; inspection of the emitted HTML in `.next/server/app/` and
`.next/prerender-manifest.json`; and a live call to the GitHub REST API.

---

## Audit findings (verified, not speculative)

### Critical — the GitHub merge is leaking junk into the live site

`mergeProjectsWithRepos` appends *every* unmatched repo as a synthetic `Project`
(`adapters/githubProjectAdapter.ts:126-133`). Live numbers: 13 repos, 9 local projects,
8 matched → **5 ghost projects**.

- `.next/server/app/index.html` renders **14 project cards**; 4 have a completely empty
  `<p class="...leading-relaxed"></p>` description and no tech badges.
- One ghost slug is `Personal-AI-Assistant` — mixed-case URL, inconsistent with every
  other route.
- The build prerendered **10** detail pages but the homepage links to **14**. The 4 extras
  only resolve via `dynamicParams` at request time, i.e. they depend on a live
  unauthenticated GitHub call (60 req/hr) — rate-limited → 404.
- `/projects/zhongxuen-portfolio` is a real, indexable page whose "What I built" card
  renders `<ul ...></ul>` — an empty list with a heading. Its meta description is
  *"Portfolio website through Vercel"*.
- The merge+sort logic is reimplemented three times (`app/page.tsx`,
  `app/projects/page.tsx`, `app/projects/[slug]/page.tsx`), and `generateStaticParams`
  disagreed with page render in the same build — the output is nondeterministic.

### High

- `.env.local` has `NEXT_PUBLIC_SITE_URL=http://localhost:3000`; the built `sitemap.xml`
  contains `<loc>http://localhost:3000</loc>`. Prod relies entirely on the Vercel env var
  being set — no guard.
- `Footer.tsx:96` links raw `item.href` (`#about`). On `/projects/[slug]` those become
  `/projects/[slug]#about` — dead links. `Navbar` has `resolveHref` for exactly this;
  Footer doesn't.
- No `scroll-mt`/`scroll-margin-top` anywhere + a `fixed` h-16 navbar → every anchor lands
  with its heading hidden under the header.
- No `prefers-reduced-motion` handling at all, despite `scroll-behavior: smooth` plus
  Framer Motion on 6 sections.
- `useScroll` calls `setState` on **every** scroll event (unthrottled, no equality check),
  re-rendering `Navbar` continuously.
- Contact form is `mailto:` only, hardcodes `gohzx2006@gmail.com` (duplicating
  `AUTHOR.email`), drops the subject/name into a raw template, has no success/error state,
  and navigates the tab away.
- No `app/error.tsx`, `app/global-error.tsx`, or root `app/not-found.tsx`.

### Medium

- Homepage and `/projects` render **identical** full grids — duplicate content, no
  "featured only", no "View all projects" CTA, no filter/search.
- Hero stats print `{value}+` over exact counts (`projects.length` → "9+"), and use *local*
  projects (9) while the grid below shows 14.
- `react-intersection-observer` and `class-variance-authority` are installed and never
  imported.
- `next.config.ts` is empty — no security headers (CSP, Referrer-Policy,
  X-Content-Type-Options, HSTS).
- `findMatchingRepo` matches with bidirectional `.includes()` and a literal
  `candidate !== "zhongxuen"` guard — fragile.
- `openGraph.type` is `"website"` on project case studies; identical `keywords` on every
  page; `Person` schema lacks `email`/`image`/`alumniOf`/`knowsAbout`; `/projects` has no
  `ItemList`.
- 3 Google font families (Poppins x4 weights, Inter, JetBrains Mono x3) — JetBrains Mono is
  used for two `<code>` tags on one page.
- No tests, no CI, no `typecheck` or `format` script.
- README claims "active section highlighting" — not implemented.

---

## Prompts

Run waves in order; within a wave the lanes touch disjoint files and are safe to run
simultaneously.

### Wave 1 — run alone (everything else depends on it)

```
Fix the GitHub/project data layer. Verified problem: adapters/githubProjectAdapter.ts
mergeProjectsWithRepos appends every unmatched repo as a synthetic Project. With the live
account (13 repos, 9 local projects, 8 matched) this puts 5 ghost cards on the homepage —
4 with empty descriptions and no tech badges, one with the mixed-case slug
"Personal-AI-Assistant". The build prerendered 10 detail pages while the homepage links to
14, so 4 links only resolve via dynamicParams against a rate-limited unauthenticated
GitHub call. /projects/zhongxuen-portfolio is a live indexable page whose "What I built"
card renders an empty <ul>.

Do three things:

1. Stop synthesizing projects from repos. mergeProjectsWithRepos must return exactly one
   Project per entry in data/projects.ts — GitHub only overlays stats (language, stars,
   lastUpdated, githubUrl, liveUrl). Delete githubRepoToProject and the githubOnlyProjects
   branch, or gate them behind an explicit opt-in flag that is off by default. Update the
   now-obsolete comment in app/sitemap.ts that filters ghost slugs out.

2. Replace the fuzzy matcher. findMatchingRepo currently uses bidirectional .includes()
   plus a hardcoded `candidate !== "zhongxuen"` guard. Match strictly on project.githubRepo
   (exact, case-insensitive) and fall back to the last path segment of project.githubUrl.
   Drop the slug-similarity pass and the hardcoded guard. Make types/project.ts githubUrl
   optional (data/projects.ts already stores "" for several entries) and remove the
   resulting `?.trim()` workarounds.

3. Collapse the triplicated fetch+merge+sort. app/page.tsx, app/projects/page.tsx and
   app/projects/[slug]/page.tsx each reimplement it. Add getProjects() and
   getProjectBySlug(slug) to services/githubService.ts (or a new lib/projects.ts), wrapped
   in React cache(), owning the fetch, the merge, and the `order ?? Infinity` sort. All
   three routes and generateStaticParams call it, so the build is deterministic.

Read node_modules/next/dist/docs/ for the current caching/ISR guidance before changing
fetch options. Keep the existing 1h revalidate behaviour — verify with `npm run build`
that / , /projects and /projects/[slug] still show `1h` in the Revalidate column, that
generateStaticParams and the homepage now agree on the slug list, and that no card in
.next/server/app/index.html has an empty description.
```

### Wave 2 — 4 lanes in parallel

**Lane A — navigation, scroll, footer**

```
Fix navigation in components/layout/Navbar.tsx, components/layout/Footer.tsx,
hooks/useScroll.ts and hooks/useSmoothScroll.ts.

1. Footer.tsx line ~96 renders `href={item.href}` raw. On /projects/[slug] the "#about"
   links become /projects/[slug]#about — dead. Navbar has resolveHref for this. Extract
   that helper to a shared module and use it in both.
2. useScroll setStates on every scroll event with no throttle and no equality check, so
   Navbar re-renders continuously while scrolling. Throttle with requestAnimationFrame
   and bail out when the derived state is unchanged. `direction` and `scrollY` are
   currently unused by any consumer — either use them or drop them from the return type.
3. Implement the active-section highlighting the README already advertises: track the
   in-view section with IntersectionObserver and set aria-current="location" plus a
   visible style on the matching nav link. Note react-intersection-observer is in
   package.json but unused — either use it here or leave it for Lane D to remove; don't
   both use and remove it.
4. Mobile menu a11y: close on Escape, close on outside click, add aria-controls + an id on
   the dropdown nav, and return focus to the toggle on close.
5. useSmoothScroll pushes a history entry but the browser Back button doesn't scroll back,
   and globals.css already sets `html { scroll-behavior: smooth }`, making the explicit
   scrollIntoView({behavior:"smooth"}) redundant. Simplify to one mechanism and make Back
   restore the previous section.
```

**Lane B — contact form**

```
Rewrite components/forms/ContactForm.tsx. Current state: it builds a mailto: string and
assigns window.location.href, hardcodes "gohzx2006@gmail.com" instead of AUTHOR.email from
lib/constants.ts, drops the subject out of the message body, and has no pending/success/
error state — the user gets no feedback and their tab navigates away.

Replace with a Next.js Server Action that posts to Resend (read node_modules/next/dist/docs/
for the current Server Action conventions in this version). Requirements:
- Validate on the server (name, email format, subject, message length); return typed field
  errors rendered next to each input.
- useActionState for pending/success/error, a disabled submitting button, and an
  aria-live="polite" region announcing the result.
- Honeypot field plus a simple per-IP rate limit.
- RESEND_API_KEY read server-side only; if it's absent, fall back to the existing mailto
  behaviour rather than throwing, and say so in the UI.
- Inputs currently only have `focus:border-primary` with no visible ring — give them the
  same focus-visible ring treatment as components/ui/Button.tsx, and wire aria-invalid /
  aria-describedby to the error text.
Do not touch Navbar, Footer, next.config.ts or package.json — other work is in flight there.
```

**Lane C — error boundaries + URL guard**

```
Two independent fixes.

1. The app has no app/error.tsx, no app/global-error.tsx and no root app/not-found.tsx —
   only app/projects/[slug]/not-found.tsx. Any thrown error (e.g. a GitHub fetch failure
   that escapes) shows the default Next.js screen. Add all three, styled to match
   app/projects/[slug]/not-found.tsx (Container + Button + the existing dark palette from
   app/globals.css). error.tsx must expose the reset() retry. Also add app/projects/
   loading.tsx to match the existing [slug]/loading.tsx skeleton.

2. lib/constants.ts falls back to "http://localhost:3000" when NEXT_PUBLIC_SITE_URL is
   unset. This is not theoretical: the current production build emits
   <loc>http://localhost:3000</loc> in sitemap.xml, and the same value feeds every
   canonical URL, OG url and JSON-LD @id. Resolve the URL from NEXT_PUBLIC_SITE_URL, then
   VERCEL_PROJECT_PRODUCTION_URL, then localhost — and throw at build time if the result
   is localhost while NODE_ENV === "production". Verify by running `npm run build` and
   grepping .next/server/app/sitemap.xml.body.

Only touch app/error.tsx, app/global-error.tsx, app/not-found.tsx, app/projects/loading.tsx
and lib/constants.ts.
```

**Lane D — config + dependency hygiene**

```
Only touch next.config.ts, package.json, .prettierrc/.prettierignore and .gitignore.

1. next.config.ts is an empty object. Add security headers via the headers() config:
   Strict-Transport-Security, X-Content-Type-Options, Referrer-Policy, X-Frame-Options (or
   frame-ancestors), Permissions-Policy, and a Content-Security-Policy. The CSP must
   account for the two inline JSON-LD <script> tags in app/layout.tsx and
   app/projects/[slug]/page.tsx, and for @vercel/analytics. Read
   node_modules/next/dist/docs/ first — this Next version may prefer a different
   configuration surface (check whether vercel.ts is the recommended home for these).
2. Remove unused dependencies: react-intersection-observer and class-variance-authority are
   in package.json and imported nowhere in app/, components/, lib/, hooks/, data/,
   services/ or adapters/. Re-verify with grep before removing — if a parallel task has
   started using react-intersection-observer for scroll-spy, keep it.
3. package.json scripts are only dev/build/start/lint. Add `typecheck` (tsc --noEmit),
   `format` and `format:check` (prettier is configured but has no script). Fix `lint` to
   run over the project explicitly.
4. tsconfig.tsbuildinfo (734KB) is on disk; confirm .gitignore's `*.tsbuildinfo` actually
   covers it and that it isn't tracked.
```

### Wave 3 — 3 lanes in parallel (after Wave 1 and 2)

**Lane E — page differentiation and honest stats**

```
app/page.tsx, app/projects/page.tsx, components/sections/ProjectsSection.tsx and
components/sections/HeroSection.tsx.

1. The homepage and /projects currently render the identical full project grid — duplicate
   content and no reason to click through. Make the homepage show featured projects only
   (Project.featured already exists; 5 entries are marked) with a "View all projects →"
   CTA to /projects. Keep /projects as the complete list.
2. /projects has no way to narrow the list. Add technology filtering — derive the facets
   from the union of Project.technologies, keep it a Server Component with searchParams-
   driven state so filters are linkable and crawlable, and show a "no matches" empty state.
   Do not introduce client-side state for this.
3. HeroSection stats render `{stat.value}+` over exact counts, so 9 projects displays as
   "9+" — drop the plus or replace it with a real number. Worse, the stats read
   projects.length from data/projects.ts while the grid below now shows the merged list;
   source both from the same getProjects() helper added in Wave 1 so the page can't
   contradict itself.
```

**Lane F — accessibility and motion**

```
Primarily app/globals.css, plus components/ui/*.

1. There is no scroll-mt / scroll-margin-top anywhere in the codebase, and the navbar is
   `fixed` at h-16 (app/layout.tsx applies pt-16 to <main>). Every anchor jump therefore
   hides the section heading behind the header. Add scroll-margin-top to section[id] in
   globals.css sized to the header — do not edit the individual section components, another
   task is in those files.
2. No prefers-reduced-motion handling exists anywhere. Add a media query in globals.css
   that neutralises `scroll-behavior: smooth` and transitions/animations, and add a
   useReducedMotion-aware fallback in lib/animations.ts so the Framer Motion variants in
   the six section components resolve to no-op transitions instead of animating.
3. Add a "Skip to main content" link as the first focusable element in app/layout.tsx,
   visible on focus, targeting an id on <main>.
4. Set `color-scheme: dark` on :root — the palette in globals.css is dark-only, so form
   controls and scrollbars currently render as light-mode UA defaults.
5. Audit focus-visible: only components/ui/Button.tsx defines a ring. Bare <a> elements in
   Footer.tsx, ContactSection.tsx, EducationCard.tsx and the project detail page have none.
   Add a shared focus-visible utility class and apply it.
```

**Lane G — SEO and structured data**

```
lib/metadata.ts, lib/structuredData.ts, app/layout.tsx and the opengraph-image routes.

1. buildMetadata sets openGraph.type: "website" for every route, including project case
   studies. Take a type param and use "article" (with publishedTime/modifiedTime from
   Project.lastUpdated) on /projects/[slug].
2. The same 11-item `keywords` array is emitted on every page. Make it per-page — derive
   project pages' keywords from Project.technologies.
3. buildPersonStructuredData omits email, image, alumniOf (Asia Pacific University, already
   in data/education.ts) and knowsAbout (derivable from data/skills.ts). Add them, and give
   Person and WebSite stable @id values so they link rather than duplicate.
4. /projects has no ItemList schema for its project grid — add one.
5. The JSON-LD is injected via dangerouslySetInnerHTML with raw JSON.stringify in
   app/layout.tsx and app/projects/[slug]/page.tsx. Escape `<`, `>` and `&` so a future
   data string containing "</script>" can't break out.
6. app/projects/[slug]/opengraph-image.tsx reads data/projects.ts directly rather than the
   merged source, so it silently falls back to a generic card. Point it at the Wave 1
   getProjectBySlug helper.

docs/seo-improvement-plan.md exists — reconcile against its Tier 1/2 items and mark off
what this completes.
```

### Wave 4 — 3 lanes in parallel

**Lane H — performance**

```
1. Six section components ("use client" purely for Framer Motion) push most of the homepage
   into the client bundle: HeroSection, SkillsSection, ProjectsSection, ExperienceSection,
   EducationSection, ContactSection. Only the entrance animations need the client. Either
   extract a small client <Reveal> wrapper so the section bodies stay Server Components, or
   replace the fade/stagger variants in lib/animations.ts with CSS animations driven by an
   IntersectionObserver and drop framer-motion entirely. Measure the First Load JS delta
   from `npm run build` before and after and report both numbers.
2. app/layout.tsx loads three Google font families: Poppins (4 weights), Inter, and
   JetBrains Mono (3 weights). JetBrains Mono is used only by the `code` rule in
   globals.css, which renders on the test-credentials block of one project page. Drop it or
   load it on that route only, and trim Poppins to the weights actually used.
3. AboutSection's avatar (public/images/profile/avatar.jpg) is the largest above-the-fold
   image and has no `priority`. Add it and confirm the `sizes` values on both next/image
   usages (AboutSection, project detail page) match their rendered widths.
4. Add @vercel/speed-insights alongside the existing @vercel/analytics so Core Web Vitals
   are measured, not assumed.
```

**Lane I — tests and CI**

```
The project has zero tests and no CI. Add Vitest with unit tests for the pure logic that
currently has no safety net:
- adapters/githubProjectAdapter.ts: mergeProjectsWithRepos must return exactly
  data/projects.ts length (this is the Wave 1 regression to lock down), matching by
  githubRepo, and local liveUrl winning over repo.homepage.
- lib/utils.ts: formatMonthYear/formatDateRange (including the "Present" branch and the
  invalid-date passthrough), slugify, truncate, sortByStartDateDesc.
- lib/metadata.ts: canonical URL construction and the isHome title branch.
- lib/structuredData.ts: valid JSON-LD shape for each builder.
Add a data-integrity test asserting every Project.slug is unique and URL-safe, every
Skill.icon resolves in the SkillCard iconMap, and every Social.icon resolves in the Footer
iconMap (both maps currently fail silently to a fallback).
Then add a GitHub Actions workflow running install → typecheck → lint → test → build on
push and PR.
```

**Lane J — documentation**

```
README.md overstates the current state. Verify each claim against the code and correct it:
- "Smooth scroll navigation with active section highlighting" — highlighting is not
  implemented (no aria-current, no scroll-spy anywhere in components/).
- "Contact form integration" — describe what it actually does now.
- "GitHub API: Fetches real-time repository data" — document the actual model: local
  data/projects.ts is the source of truth, GitHub only overlays stars/language/lastUpdated,
  1h revalidate, unauthenticated 60 req/hr unless GITHUB_TOKEN is set.
- The Project Structure block is missing docs/ and has a misaligned `services/` row.
Add a "Configuration" section documenting every env var actually read by the code
(NEXT_PUBLIC_SITE_URL, GITHUB_TOKEN, and RESEND_API_KEY if the contact-form work landed),
which are required vs optional, and what breaks when each is missing. Add an .env.example.
Then reconcile docs/seo-improvement-plan.md against what has shipped.
```

### Wave 5 — optional, run any time after Wave 3

```
Add a light/dark theme toggle. app/globals.css defines a single hardcoded dark palette on
:root with no light variant and no color-scheme declaration. Introduce a light token set,
drive it with a data-theme attribute on <html> plus prefers-color-scheme as the default,
persist the choice, and set the attribute in a blocking inline script so there is no
flash of wrong theme on first paint. Add the toggle to components/layout/Navbar.tsx.
Audit contrast in both themes — the muted token (#94A3B8) needs a light-mode counterpart
that still clears 4.5:1 on the card surface.
```

### Verification prompt (run after each wave)

```
Run npm run typecheck, npm run lint, npm run test and npm run build. Then verify against
the build output, not assumptions: confirm the Revalidate column still reads 1h for /,
/projects and /projects/[slug]; confirm the prerendered slug list in
.next/prerender-manifest.json matches every /projects/* href in
.next/server/app/index.html; confirm no card in index.html has an empty description
paragraph; and confirm .next/server/app/sitemap.xml.body contains no localhost URLs.
Report the actual output for anything that fails.
```
