# Admin Console — Implementation Plan

Written: 2026-09-20
Scope: `zhongxuen-portfolio` (Next.js 16.2.10, App Router, deployed on Vercel)
Built: 2026-09-20

**Status: [done].** All six phases of §12 are implemented. Everything below
describes shipped code unless §16 says otherwise — that section is the diff
between this plan and what was actually built, including what was verified and
what was not.

> **Filename note.** The repo already has `docs/ADMIN.md` — personal working
> notes, gitignored. Windows filesystems are case-insensitive, so a file named
> `docs/admin.md` would overwrite it. This plan therefore lives at
> `docs/admin-plan.md`. Rename freely once `ADMIN.md` is retired or moved.

---

## 1. What this adds

A password-protected console at `/admin`, styled with the site's own Blueprint
design language, that lets one person (you) do four things without opening an
editor:

| # | Capability | Mechanism |
|---|---|---|
| 1 | Edit, reorder, add and remove entries in `data/projects.ts` | Form → typed serializer → commit |
| 2 | One-click **Sync from GitHub** — pull live repos, diff against the local list, stage the additions and field updates | `services/githubService.ts` + a pure diff, reviewed before commit |
| 3 | Upload a new `resume.pdf` (and project screenshots) | Multipart Server Action → commit |
| 4 | **Regenerate résumé** — build a fresh, laid-out PDF from the site's own data, in the site's own typography | `@react-pdf/renderer` → commit |

Plus the small edits that currently require a code change: the availability
pill (`AUTHOR.availability` in `lib/constants.ts`) and `data/now.ts`.

---

## 2. The constraint that shapes everything

The site is statically generated and runs on Vercel, where **the deployed
filesystem is read-only at runtime**. `node:fs.writeFile("data/projects.ts")`
works on your laptop and silently fails — or throws `EROFS` — in production.
So "the admin page saves a project" has to mean something other than "writes a
file on the server that rendered the page."

**Chosen model: GitHub is the database.** The admin console writes back to the
repo through the GitHub API; Vercel's existing GitHub integration sees the push
and redeploys; the new build ships the new data.

```
Admin form  ─Server Action─▶  serialize to TypeScript source
                                        │
                                        ▼
                          GitHub API  ──▶  commit on main
                                        │
                                        ▼
                         Vercel auto-deploy  (~60–90 s)
                                        │
                                        ▼
                                  site updated
```

Why this over a database or blob overlay:

- **No drift.** `data/projects.ts` stays the single source of truth that
  `services/projectService.ts`, the sitemap, `generateStaticParams` and the
  ⌘K palette already read. A Blob-backed override layer would mean the repo
  and the live site can disagree, and every consumer would need to learn about
  a second source.
- **Free audit trail and undo.** Every admin edit is a commit. `git revert` is
  the rollback button; `git log` is the audit log. No feature to build.
- **No new vendor, no new runtime dependency** for data. The stack gains one
  npm package total (`@react-pdf/renderer`, §8), not a database.
- **Preview deploys keep working.** A branch already gets its own data.

The cost, stated plainly: **changes are not instant.** A save takes a commit
plus a Vercel build — call it 60–90 seconds — before the public site reflects
it. The console must therefore *show* that latency rather than pretend the save
was immediate (§6.4). If sub-second publishing ever matters more than the
single-source-of-truth property, the fallback is a Vercel Blob JSON overlay
merged in `projectService.ts` and flushed with `revalidateTag` — deliberately
not built now.

---

## 3. Route and file layout

### 3.1 Route-group split

`app/layout.tsx` currently renders `<Navbar>`, `<main id="main">`, `<Footer>`
and `<PointerFX>` around **every** route. The admin console must not inherit
the public site's chrome, so the tree splits into two route groups. Route
groups do not affect URLs — `/`, `/projects/[slug]` and `/admin` are unchanged.

```
app/
├── layout.tsx              ← html, body, fonts, THEME_SCRIPT, ThemeProvider,
│                             JSON-LD, Analytics. NO Navbar/Footer.
├── (site)/
│   ├── layout.tsx          ← skip link, bp-grid, PointerFX, Navbar,
│   │                         <main id="main">, Footer   [moved out of root]
│   ├── page.tsx            ← moved
│   ├── template.tsx        ← moved
│   ├── error.tsx           ← moved
│   └── projects/**         ← moved
├── (admin)/
│   ├── layout.tsx          ← admin chrome + `robots: { index: false }`
│   └── admin/
│       ├── page.tsx                    dashboard
│       ├── login/page.tsx              credentials form
│       ├── projects/page.tsx           list + reorder
│       ├── projects/[slug]/page.tsx    editor (slug `new` = create)
│       ├── sync/page.tsx               GitHub diff review
│       ├── resume/page.tsx             upload + regenerate + preview
│       └── settings/page.tsx           availability pill, data/now.ts
├── not-found.tsx           ← stays at root (global 404)
├── global-error.tsx        ← stays at root
├── robots.ts · sitemap.ts · manifest.ts · icon.tsx · apple-icon.tsx
│                           ← stay at root (file conventions, not pages)
└── opengraph-image.tsx     ← stays at root; `(site)` inherits it
```

Two details that break quietly if missed:

- The skip link in `app/layout.tsx` targets `#main`. `#main` moves into
  `(site)/layout.tsx`, so the skip link moves with it. The admin layout gets
  its own `<main id="main">` and its own skip link.
- `ThemeProvider` and `THEME_SCRIPT` stay in the root layout. The admin UI uses
  the same tokens and must honour the same light/dark choice.

### 3.2 New files

| Path | Responsibility |
|---|---|
| `proxy.ts` | Optimistic session check; redirects unauthenticated `/admin/*` to `/admin/login`. Root of repo, beside `app/`. |
| `lib/admin/session.ts` | `server-only`. Sign/verify the session cookie (HMAC-SHA256, `node:crypto`). |
| `lib/admin/auth.ts` | `server-only`. Password verification (scrypt, constant-time). |
| `lib/admin/dal.ts` | `server-only`. `verifySession()` — the authoritative check, memoized with React `cache()`. |
| `lib/admin/github.ts` | GitHub **write** client: read file + sha, commit one file, commit several atomically. |
| `lib/admin/serializeProjects.ts` | `Project[]` → the exact text of `data/projects.ts`. |
| `lib/admin/projectForm.ts` | Shared field limits, `ProjectFormState`, validation contract — client-safe, mirrors `lib/contact.ts`. |
| `lib/admin/syncDiff.ts` | Pure diff: local projects × GitHub repos → added / changed / orphaned. |
| `lib/resume/model.ts` | `buildResumeModel()` — `data/*` → an ordered, typed résumé document model. |
| `lib/resume/theme.ts` | The PDF's palette, type scale and spacing — the site's **light** tokens, restated as `@react-pdf` style objects. |
| `lib/resume/ResumeDocument.tsx` | Document root: page frame, header band, two-zone body, footer. |
| `lib/resume/sections/*.tsx` | `Summary`, `Experience`, `Projects`, `Skills`, `Education`, `Certifications` — one file each, all consuming the model. |
| `public/fonts/*.ttf` | Space Grotesk, Inter, IBM Plex Mono (latin subsets) — the PDF cannot read `next/font`'s build-time downloads (§8.2). |
| `app/(admin)/actions/*.ts` | `"use server"` — login, logout, saveProject, deleteProject, reorder, applySync, uploadFile, regenerateResume, saveSettings. |
| `components/admin/*` | `AdminShell`, `AdminNav`, `Field`, `ListField`, `SaveBar`, `DeployStatus`, `DiffTable`. |
| `types/admin.ts` | `AdminSession`, `CommitResult`, `SyncPlan`. |

No existing `lib/` module is modified except `lib/constants.ts` (§9.3) and
`app/robots.ts` (§9.2). `services/projectService.ts`, the adapter and every
public component are untouched — the admin writes *source*, so the read path
never learns it exists.

---

## 4. Authentication

Single user, no registration, no password reset, no database. That is a
deliberate scope choice: a portfolio admin with one operator does not need a
user table, and every row of one is a row that can leak.

### 4.1 Credentials

Stored as environment variables, never in the repo:

```
ADMIN_USERNAME=zhongxuen
ADMIN_PASSWORD_HASH=scrypt.16384.8.1.<base64url salt>.<base64url hash>
ADMIN_SESSION_SECRET=<32 random bytes, base64>
```

- `ADMIN_PASSWORD_HASH` is produced once by a local script
  (`scripts/hash-password.mjs`) using `node:crypto.scryptSync` with a
  per-password random salt. The plaintext password never exists in the repo,
  in Vercel, or in a log line.
- **The fields are dot-separated and base64url, not `$`-separated and base64.**
  This plan originally specified `$`, which cannot survive a `.env` file: Next's
  env loader expands `$NAME`, so an 86-character hash reached `verifyPassword`
  as `scrypt6384` and every local login failed with the generic wrong-password
  message. Quoting does not rescue it — single quotes, double quotes and
  backslash escapes were all tested against `@next/env` and all still expand.
  Vercel-set variables bypass dotenv entirely, so production was fine and the
  failure reproduced only on a laptop, which is what made it expensive to find.
  `tests/lib/adminAuth.test.ts` now asserts the hash contains no character a
  `.env` loader, a shell or a quoting rule treats specially.
- Verification uses `crypto.timingSafeEqual` on equal-length buffers, so a
  wrong password costs the same time as a right one.
- The username is compared the same way, so the form cannot be used to
  enumerate whether a username exists.
- `ADMIN_SESSION_SECRET` is rotated to log every session out everywhere.

### 4.2 Session

A stateless signed cookie — no session store, because there is no database and
one operator does not need server-side revocation beyond secret rotation.

- Payload: `{ sub: "admin", iat, exp }`, base64url JSON.
- Signature: `HMAC-SHA256(payload, ADMIN_SESSION_SECRET)`, appended after a dot.
- Cookie `admin_session`: `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`,
  `Max-Age` 8 hours.
- Verification rejects a bad signature, a missing signature, and an expired
  `exp`, in that order, all before the payload is trusted for anything.

**This needs no new dependency.** The authentication guide in
`node_modules/next/dist/docs/01-app/02-guides/authentication.md` reaches for
`jose`, which exists because the Edge runtime has no `node:crypto`. In Next 16
**Proxy runs on the Node.js runtime by default** — the `runtime` config option
is not even available in a proxy file — so `node:crypto` is usable in the one
place that used to force the Edge-compatible library. Thirty lines of HMAC beat
a dependency here.

### 4.3 Two-layer authorization

The Next 16 proxy docs are explicit about a trap: *"Server Functions are not
separate routes… a Proxy matcher that excludes a path will also skip Server
Function calls on that path… Always verify authentication and authorization
inside each Server Function rather than relying on Proxy alone."*

So the check happens twice, with different jobs:

1. **`proxy.ts` — optimistic, for UX.** Reads the cookie, verifies the
   signature, redirects to `/admin/login` on failure. Matcher: `/admin/:path*`.
   It exists so an unauthenticated visitor gets a login page instead of a
   flash of admin layout. It is not the security boundary.
2. **`verifySession()` in `lib/admin/dal.ts` — authoritative.** Called as the
   first statement of *every* admin page, *every* Server Action and any future
   route handler. On failure it `redirect("/admin/login")`s (pages) or returns
   a rejection state (actions). Wrapped in React `cache()` so it runs once per
   render pass.

A Server Action that forgets that first line is the vulnerability this plan is
most concerned about, because Server Actions are public POST endpoints
reachable by replay — the same reasoning already written into
`app/actions/contact.ts`. §11 makes it a test.

`unauthorized()` / `unauthorized.tsx` would be the idiomatic Next 16 answer
here, but they sit behind the `experimental.authInterrupts` flag. A plain
`redirect()` is stable and does the same job; revisit when the flag graduates.

### 4.4 Login form and brute-force brake

`app/(admin)/admin/login/page.tsx` renders a Server Action form with
`useActionState`, mirroring `components/forms/ContactForm.tsx` so there is one
form idiom in the codebase. It works without JavaScript.

Rate limiting reuses `lib/rateLimit.ts` — 5 attempts per 15 minutes per IP,
keyed `admin-login:${ip}`. That module's own docstring is honest that it is a
courtesy brake, not a security control: the counters are per-instance and lost
on cold start. For a login form that is weaker than it should be, so:

- the *real* defence is the password's entropy (use a generated 20+ character
  passphrase) and scrypt's cost factor;
- a failed attempt returns one generic message — never "no such user";
- **recommended companion:** a Vercel WAF rate-limit rule on `/admin/login`,
  configured in the dashboard, which is shared across instances. Noted here
  because it is a two-minute configuration that does more than any code in
  this file.

---

## 5. Writing data back: the serializer

The hardest correctness problem in this plan is not auth. It is turning
`Project[]` back into the *text* of `data/projects.ts` without corrupting it.

`lib/admin/serializeProjects.ts` exports `serializeProjects(projects): string`.

**Why a hand-written serializer and not Prettier at runtime:** Prettier is a
devDependency; importing it from a Server Action drags a formatter into the
function bundle to print 25 KB of object literals. The output shape here is
fully known, so the serializer emits Prettier-compatible text directly —
4-space indent, double quotes, trailing commas, 100-column wrapping — matching
`.prettierrc`.

Rules it must honour, all of them observable in the current file:

- Fixed key order, matching `types/project.ts`: `slug, title, description,
  longDescription, testCredentials, role, technologies, githubUrl, githubRepo,
  liveUrl, screenshots, keyFeatures, disclaimers, challenges, lessonsLearned,
  futureImprovements, featured, order`. A stable order keeps diffs small and
  reviewable. `disclaimers` is in that list because the type grew it after this
  plan's first draft — the order is read off `types/project.ts`, and a field
  the serializer does not know about is a field the first save silently
  deletes, which is why §11's byte-for-byte test is the one that matters.
- Optional fields that are `undefined` or empty arrays are **omitted**, not
  emitted as `undefined` — that is how the file reads today.
- GitHub-derived fields (`language`, `stars`, `lastUpdated`, `publishedAt`) are
  **never written**. They are overlaid at request time by
  `adapters/githubProjectAdapter.ts`; persisting them would freeze a snapshot
  into the repo and quietly lie the next time a repo is pushed to.
- Strings are escaped for `"`, `\` and newlines. Long strings wrap onto the
  line below the key, exactly as the current file does.
- The header (`import { Project } from "@/types/project";`) and the
  `export const projects: Project[] = [` / `];` frame are emitted verbatim.

This works because `data/projects.ts` is a pure data literal today — verified:
no comments inside the array, no computed values, no imports beyond the type.
**That is now a constraint, not an observation.** A comment added inside the
array will be destroyed by the first admin save. §11 makes that a test, and the
file gets a header comment saying so.

---

## 6. Committing: `lib/admin/github.ts`

### 6.1 Token

A **second, separate** token — `GITHUB_ADMIN_TOKEN` — not the existing
`GITHUB_TOKEN`.

`GITHUB_TOKEN` is read-only and used by `lib/github.ts` on the public render
path. Granting it write scope would put a repo-write credential into every page
render's environment for no reason. The admin token should be a fine-grained
PAT, scoped to `zhongxuen/zhongxuen-portfolio` only, with **Contents: Read and
write** and nothing else, and an expiry date set.

### 6.2 Operations

```ts
readFile(path)                      // GET  /repos/{o}/{r}/contents/{path} → { text, sha }
commitFile({ path, content, sha, message })
commitFiles({ files[], message })   // atomic multi-file
```

- **Single file** uses the Contents API (`PUT /contents/{path}`), which needs
  the current blob `sha` for an update. Passing a stale `sha` returns `409`,
  which is exactly the conflict detection wanted: someone edited the repo from
  another device, so the save must fail loudly rather than clobber. The UI
  re-reads and asks.
- **Several files in one commit** (e.g. a new screenshot *plus* the
  `data/projects.ts` entry referencing it) cannot be done with the Contents API
  without producing two commits, one of which may reference a file the other
  has not added yet. That path uses the Git Data API instead: create blobs →
  create a tree on the current head → create a commit → fast-forward
  `refs/heads/main`. One commit, no intermediate broken state.
- Binary content is base64-encoded. File sizes here are comfortable: the résumé
  is 432 KB, screenshots 48–78 KB. Confirm GitHub's current per-file API limits
  at implementation time rather than trusting this sentence — the inline
  `GET /contents` response in particular is capped around 1 MB and needs the
  raw media type above that.

### 6.3 Commit messages

Machine-written, human-readable, greppable:

```
chore(admin): update project "JobNow – Job Listing Application"
chore(admin): add 3 projects from GitHub sync
chore(admin): regenerate resume.pdf from site data
```

They are the audit log.

### 6.4 Telling the truth about latency

After a successful commit the UI must not say "Saved." It says what actually
happened, with the commit link:

> Committed `a1b2c3d`. Vercel is building — the public site updates in about a
> minute. [View commit ↗]

The `DeployStatus` component polls nothing by default (a deployment-status call
needs yet another token). If live build status is wanted later, the Vercel REST
API's deployment list filtered by `sha` is the hook — optional scope, not
phase 1.

---

## 7. Feature specifications

### 7.1 Dashboard — `/admin`

Counts (projects, featured, screenshots), the résumé's real file size read
through the existing `getResumeMeta()`, the last five `chore(admin)` commits
from the GitHub API, and four large actions: Edit projects · Sync from GitHub ·
Résumé · Settings.

### 7.2 Project list — `/admin/projects`

Table of every project: order, title, slug, featured flag, repo match state
(✓ matched / ⚠ no repo / ⚠ repo not found). Row actions edit and delete.
Reordering rewrites the `order` field for the whole list in one commit —
`order` is already the curated sort key read by `projectService.ts`.

Delete is a two-step confirm and warns that the slug is a live URL: removing it
turns `/projects/<slug>` into a 404 and drops it from the sitemap. It does not
touch the GitHub repo.

### 7.3 Project editor — `/admin/projects/[slug]`

One form over every field in `types/project.ts`. `slug` = `new` creates.

- `technologies`, `keyFeatures`, `challenges`, `lessonsLearned`,
  `futureImprovements` and `screenshots` are repeatable list inputs (add /
  remove / reorder), not comma-separated strings — the data model is arrays and
  the form should not invent a serialization the user has to get right.
- `testCredentials` is a nested group (password + account list), collapsed when
  empty.
- Validation runs in the Server Action, not only in the browser, on the same
  reasoning as the contact form. Enforced: slug unique, slug URL-safe
  (`/^[a-z0-9]+(?:-[a-z0-9]+)*$/` — the exact rule
  `tests/data/integrity.test.ts` already asserts), title and description
  non-empty, description ≤ 155 characters **as a soft warning rather than a
  hard error**, because `buildMetadata()` reuses it as the meta description and
  `docs/seo-improvement-plan.md` §7 is still tracking three entries that
  overrun. The console is the natural place to stop that getting worse.
- Screenshot upload sits inside the editor: pick a file → it is committed to
  `public/images/projects/<slug>-<n>.jpg` and the path is appended to
  `screenshots` **in the same commit** (§6.2).

### 7.4 GitHub sync — `/admin/sync`

The "click a button and it updates the GitHub projects itself" feature, with a
review step.

1. Fetch repos via the existing `getPortfolioRepos()` — already filters forks
   and archived repos and sorts by push date. No new fetching code.
2. `lib/admin/syncDiff.ts` (pure, testable, no I/O) produces a `SyncPlan`:
   - **Unlisted** — a repo matching no local project. Proposed as a new entry
     with `slug` (from repo name, normalized), `title`, `description` (repo
     description), `technologies` (seeded from `language` + `topics`),
     `githubRepo`, `liveUrl` (from `homepage`), `featured: false`, `order`
     appended.
   - **Changed** — a matched project whose `liveUrl` disagrees with the repo
     `homepage`, or whose `githubUrl` is missing while the repo exists.
   - **Orphaned** — a project whose `githubRepo` no longer resolves (renamed,
     made private, deleted). Flagged, never auto-deleted.

   Matching reuses the normalization already in
   `adapters/githubProjectAdapter.ts` rather than inventing a second rule.
3. The page renders the plan as a diff table with a checkbox per change,
   everything pre-selected except new entries (which arrive with a
   machine-written description you will want to rewrite).
4. **Apply selected** → one commit.

The adapter's existing principle holds: GitHub supplies stats and identity,
never narrative. A synced project arrives as a stub with real fields and an
honest description, and stays `featured: false` until you say otherwise.

### 7.5 Résumé — `/admin/resume`

Three things on one page:

- **Current file** — `getResumeMeta()` size, last-modified from the commit
  history, inline PDF preview.
- **Upload replacement** — file input, `application/pdf` only, validated
  server-side by magic bytes (`%PDF-`) rather than the browser-supplied MIME
  type, committed to `public/resume/resume.pdf`.
- **Regenerate from site data** — §8.

`lib/resume.ts` reads the real file size at build time, so a new PDF's size
annotation updates itself on the deploy that follows the commit. Nothing to
keep in sync.

### 7.6 Settings — `/admin/settings`

The one-line edits that currently need a code change:

- `AUTHOR.availability.open` / `.label` — the navbar pill and footer both read
  it. Requires extracting availability out of the `AUTHOR` literal into a
  serializable island (§9.3) so it can be rewritten without a TypeScript parser
  touching the rest of the file.
- `data/now.ts` — the "what I'm doing now" block.
- `SITE_LAST_MODIFIED` — a "bump to today" button, since the constant exists
  precisely so it is *not* `new Date()` and therefore needs a human.

Also on this page, as a read-only panel: which environment variables are
configured (`GITHUB_ADMIN_TOKEN` ✓ / ✗, `RESEND_API_KEY` ✓ / ✗ …) — presence
only, never values.

---

## 8. Résumé regeneration

One click produces a real PDF from the site's own data. Two new
dependencies: `@react-pdf/renderer` for the document, and `qrcode` for the
footer QR code (§8.3).

### 8.1 Model first, renderer second

`lib/resume/model.ts` exports `buildResumeModel(): ResumeModel`, reading
`data/experience.ts`, `data/education.ts`, `data/skills.ts`,
`data/certifications.ts`, `data/projects.ts` and `AUTHOR`. It does the
selection and ordering; the renderer does layout only. That split is what stops
the PDF from becoming a second, drifting copy of the site's content.

Selection rules live in a new `data/resume.ts` — editable from the console:

```ts
export const resumeConfig = {
    summary: "…",                 // the one paragraph a PDF needs and the site doesn't
    maxProjects: 4,               // featured first, then by `order`
    maxBulletsPerRole: 4,
    skillCategories: [...],       // which of the 8 categories make the page
    includeCertifications: true,
};
```

A résumé is a *curated* view, not a dump — 12 projects and 8 skill categories
do not fit one page. Making the curation data means the console can adjust it
without touching the renderer.

### 8.2 Typography — the site's three faces

**Decided: the PDF uses the site's fonts.** `@react-pdf` ships Helvetica and
cannot see `next/font`'s build-time downloads, so the real files go into
`public/fonts/` as latin-subset TTFs (`.woff2` is not supported) and are
registered at module load:

| Family | Weights | Role in the PDF |
|---|---|---|
| Space Grotesk | 700 | The name, and nothing else. One display moment per page. |
| Inter | 400, 600 | Body, bullets, role titles. |
| IBM Plex Mono | 400, 500 | Section labels, dates, tech chips, footer — every annotation. |

Five files, roughly 500–700 KB in the repo. That is the honest number; the
earlier "≈300 KB" estimate assumed two families. If it grates, the trim is to
drop Space Grotesk and set the name in Inter 600 — but the display face is the
single cheapest thing that makes the page look designed rather than typed.

Two `@react-pdf` specifics that bite:

- **Disable hyphenation.** It hyphenates by default and will break
  "TypeScript" across a line as "Type-Script". One line fixes it:
  `Font.registerHyphenationCallback((word) => [word])`.
- **Reaching the font files at runtime.** `public/` is served by the CDN, but
  a Server Action's function bundle only contains what Next's tracer found,
  and nothing statically imports a `.ttf`. Force it:

  ```ts
  // next.config.ts — the résumé action is a POST to /admin/resume
  outputFileTracingIncludes: {
      "/admin/resume": ["public/fonts/**/*"],
  },
  ```

  If that proves unreliable, the fallback is registering by URL
  (`${SITE_URL}/fonts/Inter-Regular.ttf`) — `Font.register` accepts one, and
  the files are already public. Verify on the first preview deploy, not in
  production.

### 8.3 Layout

The brief: **clean and readable, but not a wall of paragraphs.** The design
language is already decided — this is the Blueprint palette and type scale
rendered onto A4. `lib/resume/theme.ts` restates the site's **light** theme
tokens as `@react-pdf` styles, so the PDF is the same design system rather than
a lookalike:

```
ink #0b1220 · ink-muted #52627a · ink-faint #7c8ca1
accent #0369a1 · signal #9a4506
line #d3dce8 · line-strong #a9b8cc · rail tint #eef2f7 · paper #ffffff
```

Always the light palette, whatever the site is currently showing — a dark
résumé is a printer's enemy and an ATS parser's indifference.

Page: **A4** (210 × 297 mm, the Malaysian and European default), 14 mm margins.
US Letter is a one-line `size` change on `<Page>` if a US application ever
needs it.

```
┌──────────────────────────────────────────────────────────────┐
│ ┌                                          CV · GZX · 2026-09 │ ← mono, ink-faint
│                                                               │
│   GOH ZHONG XUEN                                              │ ← Space Grotesk 700, 24pt
│   Software Engineering Student · Full-Stack Developer         │ ← Inter 400, 10pt, muted
│   ─────────────────────────────────────────────────────────   │ ← accent hairline, 0.8pt
│   gohzx2006@gmail.com · +60 10-772 2127 · Selangor, MY        │ ← mono 8pt, · separators
│   github.com/zhongxuen · linkedin.com/in/…  · portfolio ↗     │ ← accent, real hyperlinks
│                                                               │
│ ┌─ MAIN COLUMN (≈64%) ──────────────┐ ┌─ RAIL (≈32%) ───────┐ │
│ │ SUMMARY ───────────────────────── │ │ ▓ tinted #eef2f7    │ │
│ │ Two or three lines. Not a         │ │                     │ │
│ │ paragraph of adjectives.          │ │ SKILLS ──────────── │ │
│ │                                   │ │ Frontend            │ │ ← mono 7pt category
│ │ EXPERIENCE ────────────────────── │ │ (React)(Next.js)    │ │ ← bordered chips, wrap
│ │ ▍Software Engineer Intern         │ │ (TypeScript)        │ │
│ │  Company Name      JUN–SEP 2026   │ │ Backend             │ │
│ │  ▪ Outcome-first bullet.          │ │ (FastAPI)(Java)     │ │
│ │  ▪ Second bullet.                 │ │                     │ │
│ │                                   │ │ EDUCATION ───────── │ │
│ │ PROJECTS ──────────────────────── │ │ BSc (Hons) Software │ │
│ │ ▍JobNow — Job Matching App        │ │ Engineering         │ │
│ │  [React Native][Supabase][TS]     │ │ Asia Pacific Univ.  │ │
│ │  One line on what it does and     │ │ 2024 – 2027         │ │
│ │  what was hard about it.          │ │                     │ │
│ │  job-now-navy.vercel.app ↗        │ │ CERTIFICATIONS ──── │ │
│ │                                   │ │ CCNA: Intro to      │ │
│ │ ▍AI Code Visualizer               │ │ Networks · Cisco    │ │
│ │  …                                │ │ 2025                │ │
│ └───────────────────────────────────┘ └─────────────────────┘ │
│                                                               │
│   ░▒ zhongxuen-portfolio.vercel.app                page 1/1  ┘│ ← mono 7pt, ink-faint
│   ▒░  ↑ 14 mm QR to the same URL, baseline-aligned              │
└──────────────────────────────────────────────────────────────┘
```

The devices doing the work, all of them already on the site:

| Element | Treatment | Echoes |
|---|---|---|
| Section labels | IBM Plex Mono 500, 7.5pt, uppercase, `letterSpacing: 1.2`, ink-muted, over a 0.5pt `line-strong` rule spanning the column | `SectionHeading` |
| Entry marker | 2pt accent bar down the left edge of each experience and project block, 4 mm gutter | `BlueprintPlate` |
| Dates | Mono 8pt, ink-faint, right-aligned on the same row as the role — a flex row, so the eye gets a clean right edge | `MeasureLine` |
| Bullets | 2.5pt accent square, not a bullet glyph; 1.45 line height | `ProjectCallouts` |
| Tech chips | 0.5pt `line-strong` border, 2pt radius, mono 7pt, 3 mm gaps, wrapping | `Badge` |
| Corner ticks | Four 6 mm hairlines at the page corners | `BlueprintFrame` |
| Document code | `CV · GZX · 2026-09` in the top-right, mono 7pt | the site's plate annotations |
| Links | accent, underline-free, real PDF hyperlinks via `<Link>` | — |
| Footer QR | 14 mm module-rendered QR to `SITE_URL`, ink at `errorCorrectionLevel: "M"`, sitting left of the footer URL it duplicates | — |

Accent discipline: the accent appears on the header rule, the entry markers,
the bullet squares and the links. Nowhere else. `signal` (#9a4506) is held in
reserve for one thing only — marking a featured project — and may end up unused.

**This has to survive an ATS**, which is the constraint that kills most
designed résumés. The rules the implementation follows:

- Every character is real embedded text. Nothing rendered as an image, no
  icon fonts, no text inside SVG. The footer QR is the single exception and is
  allowed to be one because it carries no information of its own: the URL it
  encodes is printed as text beside it, so a parser that ignores the image
  loses nothing. It is `Image`-free too — `qrcode` emits the module matrix and
  the renderer draws it as filled `View` rects, which keeps it vector and
  keeps the PDF free of a raster asset.
- The two columns are a flex row with the main column **first in the element
  tree**, so the extracted text order is Summary → Experience → Projects →
  Skills → Education, which reads correctly as plain text.
- Conventional section names (`EXPERIENCE`, `EDUCATION`, `SKILLS`,
  `PROJECTS`, `CERTIFICATIONS`) — styled unconventionally, named
  conventionally.
- Contact details live in the body, never in a running header.
- Document metadata is set (`title`, `author`, `subject`, `keywords` from
  `data/skills.ts`), because some parsers read it first.
- No photo. Configurable later if a market that expects one comes up.

**One page is the target.** `resumeConfig` (§8.1) is the lever: `maxProjects`,
`maxBulletsPerRole`, `skillCategories`. The preview surfaces the page count so
the lever gets pulled before the commit, not after someone downloads it —
counting `/Type /Page` occurrences in the rendered buffer is a heuristic, but a
sufficient one for a warning banner.

### 8.4 Rendering and commit

`renderToBuffer(<ResumeDocument model={…} />)` in the Server Action; the bytes
go to `public/resume/resume.pdf` in one commit.

- **Bundling.** If the package misbehaves under server bundling,
  `serverExternalPackages: ["@react-pdf/renderer"]` is the documented escape
  hatch.
- **Preview before commit.** The action returns the PDF as a base64 data URL
  for an in-page preview plus the page count, with a separate explicit "Commit
  this version" button. Regenerating must never silently replace a résumé you
  have already sent to someone.
- **Diffability.** A PDF is a binary blob in git — the diff is useless and each
  version adds its full weight to history. Acceptable at a few hundred KB and a
  handful of regenerations a year; worth remembering before wiring it to
  anything automatic.

### 8.5 Explicitly not doing

No LLM rewriting of bullet points in phase 1. The data files already contain
written prose; passing them through a model would introduce a
non-deterministic step into a document that has to be factually exact. If it is
wanted later, the seam is `buildResumeModel()` — one function, one place to
insert a "tighten these bullets" call, with the output shown for approval
before it reaches the PDF.

---

## 9. Configuration changes

### 9.1 `next.config.ts`

```ts
// Screenshots and PDFs arrive through Server Actions, whose request body is
// capped at 1 MB by default. The resume is 432 KB today; 6 MB leaves room for
// a screenshot plus multipart overhead without inviting large uploads.
experimental: {
    serverActions: { bodySizeLimit: "6mb" },
},

// The résumé renderer reads TTFs off disk, and nothing statically imports a
// font file, so Next's tracer would leave them out of the function bundle.
outputFileTracingIncludes: {
    "/admin/resume": ["public/fonts/**/*"],
},
```

and a second `headers()` entry, before the catch-all:

```ts
{
    source: "/admin/:path*",
    headers: [
        ...securityHeaders,
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
        { key: "Cache-Control", value: "no-store, must-revalidate" },
    ],
}
```

The existing CSP needs no change — the admin adds no external origin,
`form-action 'self'` already covers the forms, and the PDF preview is
same-origin. Worth re-checking once that preview lands: if the browser's PDF
viewer is blocked by `object-src 'none'`, the preview becomes a link rather
than the CSP becoming looser.

### 9.2 `app/robots.ts`

```ts
rules: { userAgent: "*", allow: "/", disallow: "/admin" },
```

Belt and braces with the header and the layout's `robots: { index: false }`.
`app/sitemap.ts` needs no change — it enumerates routes explicitly and never
walked the admin tree.

### 9.3 `lib/constants.ts`

`AUTHOR.availability` moves out of the `AUTHOR` object literal into its own
exported constant that `AUTHOR` references, so the settings page can rewrite a
small, fully-serializable declaration without needing to re-emit a file that
also contains `resolveSiteUrl()` and three paragraphs of comments. The public
API (`AUTHOR.availability.open`) stays identical, so no consumer changes.

### 9.4 `.env.example`

Four documented additions, in the file's existing voice (what it does, what
happens when missing):

```
ADMIN_USERNAME=
ADMIN_PASSWORD_HASH=
ADMIN_SESSION_SECRET=
GITHUB_ADMIN_TOKEN=
```

**When any of the first three is unset, `/admin` returns 404** — not a login
page. An admin console with no configured password should not exist as a
reachable surface, and a preview deploy that lacks the secrets should not
advertise one.

---

## 10. Security review

| Risk | Mitigation |
|---|---|
| Server Action reachable without auth (replay) | `verifySession()` is the first statement of every action; §11 asserts it by static check over `app/(admin)/actions/` |
| Brute-forced password | scrypt with a real cost factor, generic errors, per-IP limiter, plus a Vercel WAF rule (§4.4) |
| Stolen session cookie | `HttpOnly` + `Secure` + `SameSite=Lax`, 8-hour expiry, secret rotation as the revoke-all |
| CSRF | Next's built-in Server Action origin check; `allowedOrigins` deliberately left unset |
| Write token leaking into the client | `GITHUB_ADMIN_TOKEN` is read only inside `lib/admin/github.ts`, which is `server-only`; no `NEXT_PUBLIC_` prefix; never returned in an action result |
| Write token blast radius | Fine-grained PAT: one repo, Contents-only, with an expiry |
| Admin surface indexed or cached | `X-Robots-Tag`, `robots.ts` disallow, layout `robots: { index: false }`, `Cache-Control: no-store` |
| Malicious upload | Extension + magic-byte check server-side, size cap, fixed destination paths — a user-supplied path must never reach the commit call |
| Path traversal in a commit | Every writable path comes from a fixed allowlist (`data/projects.ts`, `data/now.ts`, `data/resume.ts`, `lib/constants.ts`, `public/resume/resume.pdf`, `public/images/projects/*`); the API is `commitTo(allowlistKey)`, never `commit(arbitraryPath)` |
| Secrets in action return values | Actions return only status, message and a commit SHA — the discipline `app/actions/contact.ts` already documents |
| A bad commit breaking the build | The serializer is round-trip tested (§11); a broken build fails on Vercel and the previous deploy keeps serving; `git revert` is the undo |

Accepted, and stated: **whoever holds the admin password can write to the
repo.** That is inherent to this write model. It is why the password should be
generated rather than chosen, and why the token is scoped to one repo.

---

## 11. Testing

New tests, in the existing `tests/` layout (vitest, node environment):

- `tests/lib/serializeProjects.test.ts`
  - **The important one:** import `projects` from `data/projects.ts`,
    serialize, and assert the output equals the current file byte-for-byte.
    This single assertion guards format drift, key order, escaping and the
    "no comments inside the array" constraint at once, and fails loudly the day
    someone adds one.
  - Round-trip: serialize → write to a temp module → import → deep-equal.
  - Escaping: quotes, backslashes and newlines in a description survive.
  - GitHub-derived fields are absent from the output even when present on the
    input object.
- `tests/lib/adminAuth.test.ts` — scrypt verify accepts the right password and
  rejects a wrong one; a tampered payload, a tampered signature, a missing
  signature and an expired `exp` are all rejected.
- `tests/lib/syncDiff.test.ts` — added / changed / orphaned classification,
  including the normalization cases the adapter already handles
  (`IT-ticket-helpdesk-system` vs `it_ticket_helpdesk_system`).
- `tests/lib/resumeModel.test.ts` — the model respects `maxProjects`, orders
  experience newest-first, and contains no empty section.
- `tests/admin/actionGuards.test.ts` — reads every file in
  `app/(admin)/actions/` and asserts each exported async function's body calls
  `verifySession()`. Crude, and worth it: the failure it catches is the one
  that matters most and is invisible in review.

Existing `tests/data/integrity.test.ts` keeps passing unchanged — which is the
point. Admin-written data must satisfy the same invariants as hand-written
data.

CI needs no change; `typecheck · lint · test · build` already covers it.
Consider adding `npm run format:check` to the workflow at the same time, since
the serializer's output correctness is partly a formatting claim.

---

## 12. Build order

Each phase ends somewhere shippable.

| Phase | Deliverable | Rough size |
|---|---|---|
| **1. Shell + auth** | Route-group split, `proxy.ts`, session/auth/DAL, login page, empty dashboard, 404-when-unconfigured, noindex, auth tests | ~1 day |
| **2. Write path** | `serializeProjects.ts` + its byte-for-byte test, `lib/admin/github.ts` (single file), commit-result UI | ~1 day |
| **3. Project CRUD** | List, reorder, editor, delete, validation, screenshot upload with atomic multi-file commit | ~1.5 days |
| **4. GitHub sync** | `syncDiff.ts` + tests, review table, apply | ~0.5 day |
| **5. Résumé** | Upload, `@react-pdf/renderer`, fonts, `lib/resume/*` incl. the laid-out document (§8.3) and the footer QR (`qrcode`), `data/resume.ts`, preview-then-commit | ~2 days |
| **6. Settings** | Availability, `data/now.ts`, `SITE_LAST_MODIFIED`, env-presence panel | ~0.5 day |

Phase 1 is the one to get right; phase 2 is the one to test hardest.

---

## 13. UI

The console reuses the site's design language rather than importing a UI kit.
Everything needed exists: `Container`, `Card`, `Button` (five variants),
`Badge`, `BlueprintFrame`, `SectionHeading`, `CopyButton`, the `bp-focus` focus
ring, and the full token set (`surface`, `line-ui`, `ink-muted`, `accent`,
`signal`, `success`, `danger`).

- **Layout:** fixed left rail (Dashboard · Projects · Sync · Résumé · Settings)
  over `bg-void`, content in a `Container`, one `SectionHeading` per page.
- **Forms:** new `components/admin/Field.tsx` and `ListField.tsx` — the public
  site has exactly one form and no reusable field primitive, so these are new;
  they follow `ContactForm`'s label / input / `aria-describedby` error pattern.
- **Save bar:** sticky bottom bar with dirty-state tracking, `Save` disabled
  until something changes, and an explicit "this creates a commit" line so the
  weight of the button is never a surprise.
- **Motion:** none of the Expressive scroll choreography. The admin is a tool,
  not a portfolio piece — `duration-fast` transitions on interactive states,
  nothing else. `Reveal` and `PointerFX` stay out.
- **Accessibility:** the same bar as the public site — skip link, visible focus
  on every control, `aria-live` on action results, no colour-only status.

---

## 14. Decisions and open questions

Settled (2026-09-20):

- **Branch target: `main`.** Commits land directly on `main`; no PR step. The
  commit client still takes the branch as a parameter, so an `admin/` branch
  plus PR is a one-line change if the console ever gets a second operator.
  `git revert` remains the undo.
- **Résumé typography: the site's fonts.** Space Grotesk, Inter and IBM Plex
  Mono ship as TTFs in `public/fonts/` (§8.2), and the PDF is laid out rather
  than typed out — two zones, mono section labels, accent entry markers, tech
  chips (§8.3). Readable and ATS-parseable first, designed second, never a
  wall of paragraphs.
- **Résumé footer QR code: in.** Confirmed 2026-09-20. `qrcode` is the second
  and last new dependency of phase 5. It earns the 14 mm it costs on a printed
  copy, where the footer URL is otherwise something to retype; it is drawn as
  vector rects rather than a raster `Image`; and because the URL is printed as
  text beside it, it adds nothing an ATS can fail to read (§8.3).

Still open:

1. **`data/now.ts` and `data/resume.ts` serializers.** Each needs its own
   emitter. Worth generalizing `serializeProjects` into a small typed printer
   after the third caller — not before.
2. **Live deploy status.** Worth a Vercel API token to turn "building…" into a
   real progress indicator, or is the commit link enough?

---

## 15. What this plan deliberately excludes

- Multi-user accounts, roles, registration, password reset.
- A database, CMS or blob store for project data (§2 explains the trade).
- Editing `components/` or page copy from the browser. Layout is code, and code
  belongs in an editor with a typechecker.
- Draft/preview mode for unpublished project entries. Branch previews already
  give this for free if it is ever needed.
- LLM-generated résumé or project copy (§8.5).
- Media processing (resize, compress, convert to WebP) on upload. Screenshots
  are prepared before upload today; adding `sharp` to a function bundle for a
  handful of images a year is not warranted yet.

---

## 16. What was built, and where it departed from this plan

Written after the build, 2026-09-20. The plan above is left as written; this
section is the diff.

### 16.1 Additions the plan did not anticipate

**`lib/admin/parseProjects.ts` — a reader to match the writer.** §2 says GitHub
is the database, but the console runs inside a build whose `import { projects }`
was frozen when that build ran. Editing two projects in a row would have computed
the second save from the array *before* the first, silently reverting it. So
every admin page now loads `data/projects.ts` from the repository and parses it.
Nothing is evaluated: the literal is mechanically rewritten into JSON and handed
to `JSON.parse`, so a corrupted file fails to parse rather than executing. The
grammar it accepts is exactly what the serializer emits, and it refuses a field
neither module knows about — which is the failure §5 warns of, made loud.
`lib/admin/projectStore.ts` is the read seam; without `GITHUB_ADMIN_TOKEN` it
falls back to the build's copy and the UI goes read-only rather than letting a
save fail at the last step.

**`components/layout/SiteChrome.tsx`.** §3.1 has `not-found.tsx` staying at the
root, which is necessary — it is the only file guaranteed to catch a URL matching
no route — but the root layout no longer carries the navbar or footer, so a
mistyped address would have landed on a page with no way off it. The public
chrome is now a component that both `(site)/layout.tsx` and `app/not-found.tsx`
render.

**`(admin)/error.tsx`.** Moving `app/error.tsx` into `(site)` left the admin tree
covered only by `global-error.tsx`, the bare-document fallback.

**`ResumeConfig.maxRoles` and `.projectSummaryMaxChars`.** §8.1 lists three
levers; the layout needed five. Measured against A4's 841.89pt, the document as
first written wanted 920pt. See §16.3.

**A `UploadError` class**, so only messages written in this repository can reach a
client — `tests/admin/actionGuards.test.ts` now asserts that no action returns a
raw `error.message`.

### 16.2 Corrections to the plan's own text

- **§5's key order was missing `disclaimers`.** `types/project.ts` grew the field
  after the plan's first draft. A serializer that did not know about it would
  have deleted four entries' worth of prose on the first save. Corrected above,
  and `parseProjects` now refuses to load a file containing a field neither
  module knows.
- **§9.1's header ordering is backwards.** Next applies every matching rule and
  the *last* one wins for a repeated key, so the admin block has to come after
  the catch-all, not before it. With the intuitive ordering the generic CSP
  silently overwrote the admin one — caught by reading `object-src` off a real
  response, not by review.
- **§9.1 said the CSP needs no change; it does.** The résumé preview is a `data:`
  URL in an `<object>`, and `object-src 'none'` blocks exactly that. The
  alternative was a download link — leaving the page to check a document before
  replacing the live one, which is the check most likely to be skipped. So
  `object-src` is relaxed to `'self' data:` on `/admin/:path*` only.
- **§8.2's font estimate was wrong, for a different reason than it gives.** Five
  files, 480 KB. Inter and Space Grotesk are Google's latin subsets at 32–67 KB;
  IBM Plex Mono had to be the full 157 KB upstream release, because Google's
  subset crashes fontkit on the space glyph. `public/fonts/README.md` records the
  provenance and licences.

### 16.3 Three defects found only by extracting the rendered PDF's text

None produced an error, and none was visible in review. They are recorded because
the same class of bug will recur.

1. **`letterSpacing` broke the section names.** A text extractor inserts a space
   wherever the gap between glyphs is wide enough, so `letterSpacing: 1.2` turned
   `EXPERIENCE` into `E X P E R I E N C E` — defeating the entire point of §8.3's
   "named conventionally". Measured threshold at 7.5pt: 0.6 survives, 0.8 does
   not.
2. **A `lineHeight` on `<Page>` silently deleted the page number.** An inherited
   unitless `lineHeight` makes `@react-pdf` drop every `<Text render={...}>` in
   the document, with no warning. The footer shipped without `1 / 1` until the
   bytes were read. `styles.page` now carries a warning not to reinstate it.
3. **The fonts cannot draw 坤成中学.** `data/education.ts` records the school's real
   name; `@react-pdf` rendered those four characters as `.notdef` boxes that
   extracted as `Kuen Cheng High School ( d-f )`. The model now strips characters
   outside Latin and general punctuation, and removes the emptied bracket pair.

The layout also needed 78pt more than A4 has. It was brought down by tightening
the print spacing scale, trimming project card copy to a clause boundary, and
dropping the oldest role — the 2022–2023 pharmacy job, which belongs on the site's
timeline and not on a software résumé. It now wants 768pt against 842, and
`tests/lib/resumePdf.test.ts` asserts it stays at one page.

### 16.4 Verified, and not verified

Verified against a production build running locally: every console page renders;
the proxy redirects an unauthenticated `/admin` to the login page; a tampered,
foreign-signed or expired cookie is rejected by the real server; `/admin` 404s
with the credentials unset and is dynamic with them set; the admin CSP,
`X-Robots-Tag` and `Cache-Control` headers are correct and differ from the public
site's; `robots.txt` disallows `/admin`; the public site, its 404 chrome and its
static/SSG shape are unchanged by the route-group split. 253 tests pass, including
the byte-for-byte serializer assertions, the session crypto, and the static action
guard — which was itself checked by removing a `verifySession()` call and
confirming it failed.

**Not verified: any commit actually reaching GitHub.** That needs a real
`GITHUB_ADMIN_TOKEN`, which the build machine does not have. The write path —
`commitFile`, `commitFiles`, conflict handling on a stale blob sha — is exercised
only by its types. Do the first save on a preview deploy and check the commit
lands before pointing it at `main`.

**Also not verified: `outputFileTracingIncludes` on Vercel.** The résumé renders
correctly under `next start`, where `process.cwd()/public/fonts` simply exists.
Whether Next's tracer carries those files into the deployed function is a question
only a deploy answers. §8.2's fallback — registering the fonts by URL — remains
available, and the tell is a résumé that renders in Helvetica.

### 16.5 Deliberately not done

`npm run format:check` was **not** added to CI, despite §11 suggesting it. 62
files in the repository predate Prettier and would fail it immediately; adding the
step would mean a reformat commit touching most of the tree, which is a separate
decision. Every file this work touched is format-clean, and the serializers'
output correctness is pinned by their byte-for-byte tests instead.

---

## 17. Second pass — what the first version could not do

Written after the follow-up build, 2026-09-20. §16 is the diff against the plan;
this is the diff against §16. Ten items, in roughly the order of how badly they
were needed.

The through-line: the first version could **write** well, and could not
**check**, **edit its own source data**, **delete**, or **notice**. Every item
below is one of those four.

### 17.1 The career files are editable — `/admin/career`

§14's first open question asked whether `data/now.ts` and `data/resume.ts` were
worth their own emitters, and put the threshold for generalizing at the third
caller. There are now six, and the gap was sharper than "two more files":
**`/admin/resume` could regenerate the PDF and could not edit one word that went
into it.** `lib/resume/model.ts` reads `data/experience.ts`,
`data/education.ts`, `data/skills.ts` and `data/certifications.ts`, and all four
were unreachable from a browser. The console could publish a résumé it could not
author.

So the layout rules moved into `lib/admin/printer.ts` and the scanner into
`lib/admin/parseModule.ts`, and `serializeProjects`, `serializeSettings` and the
four new `serializeCareer` emitters became field orders and headers over them.
The byte-for-byte tests passed through the refactor unchanged, which is the only
reason it was safe to do at all.

Four separate forms and four separate commits, not one "save everything" button:
the git history is the audit log, and `chore(admin): update experience` is worth
more than `chore(admin): update career`. It also means a validation failure in
Skills does not discard unsaved work in Experience.

**Three things this cost, recorded because they were real losses:**

- **`data/experience.ts` and `data/education.ts` carried block comments inside
  their arrays** — why one `endDate` is `"Present"` rather than a known future
  date, and why a finished diploma is still open. Both are genuine reasoning, and
  both moved into the file headers where a re-emit keeps them.
- **`data/skills.ts` grouped its entries with `// Category` headings.** Those
  restated the `category` field on the following line, and were dropped.
- **`parseModule` now reads comments** so a hand-edit that adds one is not a
  parse failure. It still cannot *keep* one. Every written file's header says so.

### 17.2 Nothing is committed without being parsed back — `lib/admin/validate.ts`

The hole, stated plainly: `serializeProjects` emitted text and `commitFile`
pushed it, and **nothing read the emitted text back**. Under §2's bet — GitHub is
the database, no staging, a save is a commit to `main` — a serializer bug does
not produce an error message. It produces a deploy, and the recovery path is
`git revert` from whatever device is to hand.

Now every write serializes, re-parses its own output, and refuses the commit
unless what comes back equals what went in. That one property covers the whole
class: a field the serializer does not know about and drops (which is §16.2's
`disclaimers` bug — the one that would have deleted four entries' worth of
prose), a quote choice that mangles an apostrophe, output that is not valid
TypeScript at all. The project invariants from `tests/data/integrity.test.ts`
run alongside it, because a save from this console does not pass through CI
before it reaches `main`.

`safeProjectsSource` is now the only way `data/projects.ts` is produced for a
commit. A call to the bare serializer in an action is a review finding.

Cost: one extra parse of a 40 KB string, inside an action already waiting on two
GitHub round trips.

### 17.3 Deletion exists

Three additions and one reversal.

`commitFiles` gained deletions (a tree entry with a null sha); `deleteFiles`
filters to paths that exist first — GitHub answers a delete of an absent path
with 422, which `request()` would have reported as "the repository changed since
this page loaded", a confusing lie about a file that was already gone; and
`screenshotTarget` re-derives a stored path back into a write target, returning
null for anything this console could not itself have written.

That last one matters more than it looks. The allowlist closes path traversal by
*construction* — a caller cannot express a path. Deletion broke the symmetry,
because it starts from a string sitting in `data/projects.ts`. So the string goes
back through the same constructor rather than being trusted, and
`tests/lib/screenshotTarget.test.ts` is nineteen assertions about what it
refuses.

**The reversal:** `deleteProject` used to leave screenshots behind, arguing that
it kept the deletion reversible with `git revert`. That was wrong. The deletion
and the images are now one commit, so reverting restores both — and leaving them
bought nothing while growing `public/images/projects/` monotonically, since the
console could add files there and never remove one.

### 17.4 A save now reports whether its build succeeded

§14's second open question — "worth a Vercel API token to turn 'building…' into
a real progress indicator, or is the commit link enough?" — had the wrong frame.
Landing was never in doubt; the action returned a sha. What the banner could not
say is whether the **build** succeeded, and **a save that broke the build looked
exactly like one that worked**: the same green plate, the same "Vercel is
building", then silence. The live site would go on serving the previous deploy,
so checking it showed no change and read as "not finished yet".

`DeployStatus` now polls `checkDeployment(sha)` with a widening interval, and
stops three ways — a terminal state, a poll ceiling, or a first answer of
`"unknown"`. Without `VERCEL_TOKEN` the first call answers `"unknown"`, the
original sentence renders, and no further requests are made.

The dashboard also shows the latest **production** deployment's state, which
answers a question it could not before: is what the live site is serving actually
the last thing that was committed?

### 17.5 Sessions can be revoked without rotating the secret

The cookie is stateless and signed, so there is no session row to delete. The
only way to end a live session early was rotating `ADMIN_SESSION_SECRET` — a real
revoke-all button, but one needing a new secret pasted into Vercel and a
redeploy, at exactly the moment you are least willing to wait.

`ADMIN_SESSION_EPOCH` is carried inside the signed payload, so a stolen cookie
cannot have its epoch edited without breaking the signature. Raising it rejects
every token signed under the previous number, immediately. A token minted before
the field existed reads as the default rather than being rejected, so shipping
this did not sign anyone out; a malformed value falls back to the default rather
than throwing, because a typo in this variable must not be a total lockout.

### 17.6 Access is logged — `lib/admin/audit.ts`

The dashboard says the commit history *is* the audit log and there was no feature
to build. That is exactly right for **writes**, and says nothing about
**access**. A rejected login produced `console.warn("[admin] rejected login
attempt")` — no address, no username, and no record whatsoever of a *successful*
one. Someone who got in left no trace until they saved something.

One structured line per event, `AUDIT` prefix, JSON payload, read with `vercel
logs`. A database for this would be a database the console does not otherwise
have. No password, no token, no cookie, and no TOTP code ever appears — not even
a rejected one, since a near-miss code is a real code a few seconds early.
Submitted usernames are stripped of control characters before logging, so a
newline cannot forge a second line.

### 17.7 The contact form's silence is distinguishable from success

`sendViaResend` threw, the action caught it, the visitor got the mailto fallback
— correct for them, and the site's owner was told nothing. A revoked key turns
every enquiry into a silent fallback, and the symptom is a quiet month. **You do
not notice a form that has been broken for three weeks, because that looks
exactly like nobody writing to you.**

`lib/admin/deliveries.ts` keeps twenty outcomes in memory. It is honest about its
limits and the page says both out loud: an empty panel means "nothing since this
instance started", never "nothing ever"; a failure shown is real. False
negatives, never false positives, which is the right way round for a warning
light. No message content is kept, and no provider response body — a visitor
wrote to a contact form, not to a diagnostic buffer.

### 17.8 `/admin/health` — the things that break without telling anyone

Three checks sharing one property: **nothing else in the system reports them.**
A dead demo link still builds. A screenshot referenced but absent still builds —
Next does not fail a build over a missing file in `public/`. A contact form with
a revoked key still renders and still thanks the visitor.

- **Outbound links**, a button rather than a page load, because it makes a dozen
  requests to other people's servers. `HEAD` then `GET` on 405, since some hosts
  only route declared verbs and reporting those as broken would be the checker's
  own bug shown as the site's. `redirect: "manual"`, because a live demo that now
  301s to a parked domain is exactly the failure being looked for. 401/403/429 is
  its own verdict — "something is there and it will not say" — because the
  checker cannot tell a private repo from bot protection and should not guess.
- **Screenshots**, reconciled in both directions against the repository rather
  than against this build, since `public/` is baked in and a file deleted
  yesterday is still on disk in a week-old deploy. Orphans get a checkbox; files
  this console could not have written are listed and never offered for deletion.
- **Contact deliveries**, from §17.7.

### 17.9 The dashboard says whether anyone is reading

It counted projects, featured projects and screenshots — all facts about the
file, none of them about whether the work is being seen. The decision made most
often in this console is which projects to feature and in what order, and it was
being made with no information at all.

Per-slug views over 30 days, bars scaled to the most-viewed entry rather than to
an absolute maximum, and the home page excluded — it wins by an order of
magnitude and would flatten the comparison the panel exists to make.

### 17.10 An optional second factor

**The honest objection first:** `ADMIN_TOTP_SECRET` lives in the same environment
as `ADMIN_PASSWORD_HASH` and `GITHUB_ADMIN_TOKEN`, so it does not help against a
leaked environment. The value is narrower and real — it defeats a password that
leaked *on its own*, through a reused credential, a phishing page, or a browser
that saved it on a shared machine, which is the common way a single-operator
console is actually broken into.

Optional by presence of the secret: no variable, no second factor, no field. No
enrolment flow and no recovery codes — this is one operator with access to their
own Vercel dashboard, and deleting the variable is a faster and safer escape
hatch than any code that could itself be stolen. `scripts/hash-password.mjs
--totp` mints a secret and prints both the `otpauth://` URI and the current code,
so the app can be checked to agree *before* the variable is deployed.

`tests/lib/totp.test.ts` pins the implementation against RFC 6238's own published
vectors rather than against itself — a round-trip test would pass for something
internally consistent and wrong, and the symptom of wrong is an authenticator
that never agrees with the login form.

### 17.11 Three bugs the new checks found

None was visible in review; each was found by an assertion, which is the only
reason they are listed here rather than shipped.

1. **`serializeNow` always used double quotes.** Prettier picks whichever
   character produces fewer escapes, so a NOW entry containing a `"` would have
   emitted text that `npm run format:check` reformats — and the byte-for-byte
   assertion would have started failing after an admin save, for a reason nobody
   would have connected to the save. Moving onto the shared printer took
   `serializeProjects`' rule, which was always the correct one.
2. **`totpUri` built its query with `URLSearchParams`**, which encodes a space as
   `+`. Correct for a form body, wrong for a URI. An issuer containing a space
   arrives at the authenticator as `Portfolio+console` and is filed under that
   name forever — invisible until someone reads the entry in their app, which is
   the moment it can no longer be fixed without re-enrolling.
3. **`printModule` emitted `[` and `];` for an empty array**, where Prettier
   writes `[];`. `data/certifications.ts` is empty today and failed
   `format:check` immediately; the same bug would otherwise have appeared the
   first time the console removed the last entry from any list.

### 17.12 Verified, and not verified

Verified: 384 tests pass, `tsc --noEmit` and `eslint` are clean, and a production
build succeeds with the four new routes present. The four career files were
regenerated *from their own contents* through the new serializers, so what is on
disk is byte-for-byte what the console will write, and the first save from
`/admin/career` produces a zero-diff commit. The action guard test picks up all
three new action modules automatically and asserts `verifySession()` on every
export.

**Still not verified, and unchanged from §16.4: no commit has ever reached
GitHub.** Everything in §17.2 and §17.3 sits on top of that path — the round-trip
gate, deletion, the tree-with-null-sha write — and all of it is exercised only by
its types and by unit tests over pure functions. Do the first save on a preview
deploy and confirm the commit lands before pointing this at `main`.

Also unverified: the Vercel deployment and analytics reads, since the build
machine has no token, and the link checker against real hosts.

### 17.13 Still deliberately not done

§15's exclusions all stand — no multi-user accounts, no database, no editing
components from the browser, no draft mode, no LLM-generated copy, no media
processing. `npm run format:check` is still not in CI for §16.5's reason,
although every file this work touched is format-clean.

New to the list:

- **A durable store for contact deliveries.** The in-memory ring is a diagnostic,
  and giving it a database would be a larger decision than the diagnostic
  deserves.
- **Scheduled link checking.** A cron job that emails about a dead demo is a
  notification channel to build and maintain; a button pressed when it is useful
  is most of the value for none of the cost.
- **Per-entry saves on `/admin/career`.** Would need a second concept of identity
  layered on top of an `id` the operator is editing in the same form.
