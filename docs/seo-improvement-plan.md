# SEO & Click-Through-Rate Improvement Plan

Audit date: 2026-08-02
Last reconciled: 2026-09-01
Scope: `zhongxuen-portfolio` (Next.js App Router site)

Status key: **[done]** shipped and verified in a production build ·
**[partial]** shipped but unfinished · **[open]** not started.
All of Tier 1 and most of Tier 2 has shipped since the audit. The sections
below are marked rather than rewritten, so the original reasoning stays
readable next to what it produced.

## 1. Current state audit

What's already in place (don't rebuild these, just extend them):

- `app/sitemap.ts`, `app/robots.ts` — dynamic sitemap covering home, `/projects`, and every project slug.
- `lib/metadata.ts` — shared `buildMetadata()` helper used by `app/layout.tsx`, `app/projects/page.tsx`, and `app/projects/[slug]/page.tsx`. Sets title, description, canonical, Open Graph, Twitter card, robots.
- `lib/structuredData.ts` — `buildProjectStructuredData()` (JSON-LD `SoftwareSourceCode`) is injected on project detail pages. ~~`buildWebsiteStructuredData()` exists but is never imported anywhere~~ — resolved: `WebSite` and `Person` both render from `app/layout.tsx`, and `ItemList` renders on `/projects`.
- ~~Static OG image at `public/og/default.png`, reused for every page.~~ — resolved: `app/opengraph-image.tsx`, `app/projects/opengraph-image.tsx` and `app/projects/[slug]/opengraph-image.tsx` render per-route cards from the shared `lib/og.tsx` template.

Gaps found:

| Area | Issue | Status |
|---|---|---|
| Site identity | No `Person`/`WebSite` JSON-LD is actually rendered on any page | **[done]** both render from `app/layout.tsx`, linked by stable `@id` |
| OG images | Every URL shares one static image — no per-project visual distinction in search/social previews | **[done]** three `opengraph-image.tsx` routes over `lib/og.tsx` |
| Site URL | `NEXT_PUBLIC_SITE_URL` defaults to localhost; unless overridden in the Vercel project env, canonical URLs, sitemap and OG `url` point at localhost in production | **[done]** `resolveSiteUrl()` in `lib/constants.ts` falls back to `VERCEL_PROJECT_PRODUCTION_URL` and hard-fails a production build that resolves to localhost |
| Titles | Homepage title is just `SITE_NAME`, with no role/keyword framing | **[done]** `HOME_TITLE` in `lib/constants.ts` |
| Meta descriptions | Homepage description is boilerplate reused verbatim as the hero paragraph — duplicate-content signal | **[done]** `HOME_META_DESCRIPTION`, distinct from the hero copy |
| Keywords | The same 11-item array is emitted on every route, so it distinguishes no page from any other | **[done]** `IDENTITY_KEYWORDS` plus per-page terms; `/projects` and `/projects/[slug]` derive theirs from `Project.technologies` |
| Content type | Every route declares `og:type: website`, including dated project case studies | **[done]** `/projects/[slug]` is `article`, with published/modified times from the repo |
| Headings | Confirm exactly one `<h1>` per route; homepage heading hierarchy unaudited | **[done]** audited: exactly one `<h1>` per route, no skipped levels — `SectionHeading` defaults to `h2` and takes an explicit `as` prop, so the level is a decision rather than a side effect of styling |
| Images | No confirmed `alt` text strategy across `ProjectCard` and screenshots | **[done]** the detail-page screenshot names the project and stack; `ProjectCard` no longer renders an image at all, so there is nothing left to audit |
| Analytics | No analytics or Search Console verification — no way to measure whether the changes work | **[partial]** `@vercel/analytics` is mounted in `app/layout.tsx`; the Google verification token is hardcoded in `buildMetadata()` so it ships in every page's `<head>`. Not verified in-repo: whether the Search Console property is actually claimed and `sitemap.xml` submitted. No Bing token, no reporting cadence |
| Sitemap metadata | `lastModified: new Date()` regenerates a fresh "modified today" timestamp on every build | **[done]** `SITE_LAST_MODIFIED` plus per-project GitHub `pushed_at` |
| Sitemap freshness | Project priorities are flat; no differentiation for `featured` projects | **[done]** featured projects weight 0.7 against 0.5 |
| Rich results | No `BreadcrumbList` despite a clear `Home > Projects > [Project]` hierarchy | **[done]** on `/projects/[slug]` |
| Rich results | `/projects` renders a project grid with no `ItemList` describing it | **[done]** emitted on the unfiltered view only, which is the canonical one |
| JSON-LD safety | Structured data is injected with raw `JSON.stringify` through `dangerouslySetInnerHTML`, so a data string containing a closing script tag would break out | **[done]** `serializeJsonLd()` escapes `<`, `>` and `&` |
| Favicon/icons | Only a single `.ico` is declared; no `apple-touch-icon`, no manifest | **[done]** `app/icon.tsx`, `app/apple-icon.tsx`, `app/manifest.ts` |
| robots.txt | Fine as-is, but doesn't reference an `llms.txt` or explicitly allow key bots — low priority | **[open]** |

## 2. Priority framework

Fixes are grouped by effort vs. impact. Do Tier 1 first — it's cheap and fixes things that actively hurt rankings or mislead search engines today.

### Tier 1 — Quick wins (do first, <1 day total) — **[done]**

1. **[done] Verify production `NEXT_PUBLIC_SITE_URL`.** Confirm the Vercel project env var is set to the real production domain, not left to fall back to `localhost:3000`. Everything downstream (canonical tags, sitemap, OG `url`) depends on this being correct.
2. **[done] Fix `app/sitemap.ts` `lastModified`.** Replace `new Date()` with real last-modified dates: a static constant for the home/projects index pages (bump manually on content changes), and per-project dates driven by an `updatedAt` field added to `data/projects.ts` (or derived from GitHub repo `pushed_at` via the existing `githubService.ts`/`githubProjectAdapter.ts`, since the site already fetches repo metadata).
3. **[done] Wire up `buildWebsiteStructuredData()`.** It already exists in `lib/structuredData.ts` but is never rendered. Inject it as a `<script type="application/ld+json">` in `app/layout.tsx`, and extend it into a proper `Person` schema (using the `AUTHOR` object in `lib/constants.ts`) so Google can show a knowledge-panel-style rich result for name searches ("Goh Zhong Xuen").
   *Shipped as:* `Person` now carries `email`, `image`, `alumniOf` (derived from `data/education.ts`) and `knowsAbout` (derived from `data/skills.ts`); `Person` and `WebSite` hold stable `@id` values (`/#person`, `/#website`) and reference each other, so the two scripts resolve to one entity graph instead of duplicate anonymous nodes.
4. **[done] Rewrite the homepage title/description for CTR, not just accuracy.** Current title is a flat brand name; current description is dry and reused as on-page copy (duplicate-content smell). Target a title like `Goh Zhong Xuen — Software Engineer | Full-Stack Projects in Next.js & Java` and a description that leads with a concrete hook + call to action (see §3 for copywriting guidance).
5. **[done] Add `BreadcrumbList` JSON-LD** on `app/projects/[slug]/page.tsx` (Home → Projects → [Project Title]). Cheap to add next to the existing `buildProjectStructuredData` script tag, and directly improves SERP appearance with breadcrumb trails instead of a raw URL.

### Tier 2 — Medium effort, high CTR impact (1–3 days) — **[mostly done]**

6. **[done] Generate per-page OG images instead of one static image.** Use Next.js `ImageResponse` (`app/opengraph-image.tsx` / route-level `opengraph-image.tsx` files) to dynamically render the project title, tech stack badges, and your name onto a branded template for each project route. This is one of the highest-leverage CTR changes for social shares and any search surface that renders image previews (Discord, LinkedIn, X, Google's rich image results).
7. **[partial] Rewrite all `data/projects.ts` descriptions with a consistent, benefit-first pattern.** Current descriptions are technically accurate but feature-listy ("Full-stack job listing platform with a cloud backend..."). Reframe as outcome + tech, consistently, e.g.: `"Built a production job board that handles real-time listings for 100+ postings — Next.js, Supabase, and role-based auth."` Keep every description under ~155 characters since it doubles as the meta description via `buildMetadata`.
   *Where it stands (2026-09-01):* the tone rewrite has largely landed, but the length budget has not. 3 of 9 descriptions still overrun and will truncate in SERPs — AI Code Visualizer (220), GrabExpress Receipt Collector (240), EcoQuest (170) — and JobNow sits exactly on the 155 cap. The remaining five are within budget.
8. **[done] Audit and standardize image `alt` text** across `ProjectCard.tsx` and the screenshot `<Image>` in `app/projects/[slug]/page.tsx` — make alt text descriptive and keyword-relevant (e.g., `"JobNow job listing dashboard showing real-time application tracking"` instead of generic `"Preview for {title}"`).
9. **[done] Add `apple-touch-icon` and a `site.webmanifest`.** Small trust/branding signal in bookmarks, iOS home screens, and some search UIs.
10. **[done] Internal linking pass.** Add a "Related projects" or "Next project" block at the bottom of each project detail page (`app/projects/[slug]/page.tsx`) linking to 2–3 other projects — improves crawl depth and time-on-site, both of which correlate with search performance.

### Tier 3 — Ongoing / structural (measure and iterate)

11. **[partial] Install analytics + Search Console.**
    - **[done]** Add `@vercel/analytics` (trivial with this being a Vercel project) or GA4 for pageview/CTR-adjacent behavioral data. — mounted in `app/layout.tsx`.
    - **[partial]** Verify the site in Google Search Console and Bing Webmaster Tools; submit `sitemap.xml`. — the Google verification token is emitted by `buildMetadata()`, so the tag is on every page; claiming the property and submitting the sitemap happen in the Search Console UI and cannot be confirmed from the repo. No Bing token yet.
    - This is the only way to know whether Tier 1/2 changes actually move CTR — treat it as a prerequisite for iterating further, not an optional nice-to-have.
12. **Track SERP title/description performance in Search Console** monthly; A/B the homepage title/description phrasing based on actual impression-to-click data once there's enough traffic to be meaningful.
13. **Build lightweight content that targets long-tail search intent.** A portfolio's natural long-tail queries are things like "Java tutorial centre management system source code" or "Next.js Supabase job board example" — the existing project case-study pages already target this; consider a short technical write-up/blog angle per major project (even 2–3 paragraphs on `challenges`/`lessonsLearned`, which the data model already supports via `project.challenges` and `project.lessonsLearned`) to capture more long-tail traffic.
14. **Off-page signals:** ensure GitHub repo READMEs link back to the live portfolio/project page (cheap backlink + drives GitHub search traffic to the site), and that LinkedIn/JobStreet profiles (already in `AUTHOR` constants) link to the portfolio URL.

### Shipped 2026-09-01 (not in the original audit)

These came out of a second pass over `lib/metadata.ts`, `lib/structuredData.ts`,
`app/layout.tsx` and the `opengraph-image` routes. Recorded here so the plan
reflects the site as it stands.

15. **[done] `og:type: article` on project case studies.** `buildMetadata()` takes a `type`
    and emits `article:published_time` / `article:modified_time` on
    `/projects/[slug]`. The dates are real: `GitHubRepo.created_at` and
    `pushed_at` now flow through `githubProjectAdapter.ts` as
    `Project.publishedAt` / `Project.lastUpdated`, and are simply absent for a
    project with no matched repo rather than being invented. The same dates
    appear as `datePublished` / `dateModified` on the `SoftwareSourceCode` node.
16. **[done] Per-page keywords.** A shared 11-item array was repeated on every URL, which
    told a crawler nothing about what distinguished them. Now only four
    identity terms are site-wide; `/projects` derives its keywords from the
    technologies of the projects it lists, `/projects/[slug]` from that
    project's own `technologies`.
17. **[done] `ItemList` on `/projects`.** Describes the grid as the ordered set of case-study
    URLs behind it. Emitted only on the unfiltered view, since every `?tech=`
    permutation canonicalises to `/projects` and a filtered subset published
    under the same `@id` would describe neither the canonical page nor the
    indexed content.
18. **[done] JSON-LD escaping.** All five injection sites now go through `serializeJsonLd()`,
    which escapes `<`, `>` and `&` to their `\u` form. Previously a project
    description containing a closing script tag would have terminated the tag
    early and had its remainder parsed as HTML.
19. **[done] `/projects/[slug]/opengraph-image.tsx` reads the merged project source.** It
    queried `data/projects.ts` directly, so any slug the local list did not
    answer for silently produced the generic fallback card while the page
    itself rendered fine. It now uses `getProjectBySlug()`, the same helper the
    page and its metadata use.

## 3. CTR copywriting guidelines (apply across Tier 1 & 2)

- **Titles:** front-load the primary keyword/role, keep under ~60 characters so it doesn't truncate in SERPs. Pattern: `{Name} — {Role/Value Prop} | {Site Name}`.
- **Descriptions:** 120–155 characters, lead with a concrete result or number (project count, tech stack, "role-based access control", etc.), end with an implicit or explicit action ("See the case study →"). Avoid restating the title verbatim.
- **Avoid duplicate copy between meta description and on-page hero text** — search engines and users both notice when the snippet just repeats what's above the fold with nothing new.
- **Use power/specificity words sparingly but purposefully:** "production," "role-based," "real-time," "full-stack" — all already true of this portfolio's projects per `data/projects.ts`, just underused in metadata copy.

## 4. Suggested execution order

Original order (all of Tier 1, Tier 2 #6, #8, #9, #10, the heading-hierarchy
audit, and #15-#19 are now done):

```
Tier 1 (this week):    #1 → #2 → #3 → #4 → #5
Tier 2 (next 1-2 wks):  #6 → #7 → #8 → #9 → #10
Tier 3 (ongoing):       #11 first (so you can measure everything above),
                        then #12-#14 as recurring/iterative work
```

What is left, in order:

```
#7  trim the 3 over-length descriptions in data/projects.ts to <=155 chars
    (AI Code Visualizer 220, GrabExpress Receipt Collector 240, EcoQuest 170)
#11 claim the Google Search Console property and submit sitemap.xml; add a
    Bing Webmaster Tools token alongside the existing Google one
    robots.txt: llms.txt reference / explicit bot allows (low priority)
#12 → #14 once there is enough impression data to read
```

## 5. Success metrics

Once `@vercel/analytics` + Search Console are live (Tier 3, #11), track monthly:

- Search impressions & average position (Search Console) for name + project-related queries.
- CTR per page in Search Console — target improvement after Tier 1/2 metadata rewrites ship.
- Organic sessions to `/projects/[slug]` pages specifically (validates whether case-study depth is paying off).
- Social share preview quality — spot-check OG images render correctly via Twitter Card Validator / LinkedIn Post Inspector after Tier 2 #6 ships.
