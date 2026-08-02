# SEO & Click-Through-Rate Improvement Plan

Audit date: 2026-08-02
Scope: `zhongxuen-portfolio` (Next.js App Router site)

## 1. Current state audit

What's already in place (don't rebuild these, just extend them):

- `app/sitemap.ts`, `app/robots.ts` — dynamic sitemap covering home, `/projects`, and every project slug.
- `lib/metadata.ts` — shared `buildMetadata()` helper used by `app/layout.tsx`, `app/projects/page.tsx`, and `app/projects/[slug]/page.tsx`. Sets title, description, canonical, Open Graph, Twitter card, robots.
- `lib/structuredData.ts` — `buildProjectStructuredData()` (JSON-LD `SoftwareSourceCode`) is injected on project detail pages. `buildWebsiteStructuredData()` exists but **is never imported anywhere** — dead code / missed opportunity.
- Static OG image at `public/og/default.png`, reused for every page (home, projects list, and all project detail pages).

Gaps found:

| Area | Issue | File |
|---|---|---|
| Site identity | No `Person`/`WebSite` JSON-LD is actually rendered on any page | `app/layout.tsx` |
| OG images | Every URL shares one static image — no per-project or per-page visual distinction in search/social previews | `lib/metadata.ts:52-59`, `public/og/` |
| Site URL | `NEXT_PUBLIC_SITE_URL` defaults to `http://localhost:3000` in `.env.local`; if this isn't overridden in the Vercel project env, canonical URLs, sitemap, and OG `url` fields will point at localhost in production | `.env.local`, `lib/constants.ts:19` |
| Titles | Homepage title is just `SITE_NAME` ("Goh Zhong Xuen Portfolio") with no role/keyword framing; project titles use " – " em-dash pattern inconsistently | `lib/metadata.ts:17-21`, `data/projects.ts` |
| Meta descriptions | Good length and specificity on project pages, but the homepage description is generic boilerplate reused verbatim as the hero paragraph — duplicate content signal and a missed CTR hook | `lib/constants.ts:16-17`, `components/sections/HeroSection.tsx:60` |
| Headings | Confirm there's exactly one `<h1>` per route (project detail page looks correct); homepage sections should be audited for heading hierarchy | `components/sections/*.tsx` |
| Images | No confirmed `alt` text strategy audit across `ProjectCard`, screenshots | `components/cards/ProjectCard.tsx` |
| Analytics | No `@vercel/analytics`, GA4, or Search Console verification present anywhere in `package.json` or `app/layout.tsx` — there's no way to measure whether SEO/CTR changes work | `package.json` |
| Sitemap metadata | `lastModified: new Date()` on every entry means the sitemap regenerates a fresh "modified today" timestamp on every build/request, which is misleading to crawlers and wastes the recency signal | `app/sitemap.ts:9,15,21` |
| Sitemap freshness | Project priorities are flat (`0.6` for all); no differentiation for `featured` projects | `app/sitemap.ts:19-24` |
| Rich results | No `BreadcrumbList` structured data despite having a clear `Home > Projects > [Project]` hierarchy — breadcrumbs are one of the highest-CTR-impact rich snippets for SERPs | — |
| Favicon/icons | Only a single `.ico` is declared; no `apple-touch-icon`, no `manifest.json` for PWA-style icon richness (minor, but affects brand trust in bookmarks/tabs) | `app/layout.tsx:1`, `public/favicon/` |
| robots.txt | Fine as-is, but doesn't reference an `llms.txt` or explicitly allow key bots — low priority | `app/robots.ts` |

## 2. Priority framework

Fixes are grouped by effort vs. impact. Do Tier 1 first — it's cheap and fixes things that actively hurt rankings or mislead search engines today.

### Tier 1 — Quick wins (do first, <1 day total)

1. **Verify production `NEXT_PUBLIC_SITE_URL`.** Confirm the Vercel project env var is set to the real production domain, not left to fall back to `localhost:3000`. Everything downstream (canonical tags, sitemap, OG `url`) depends on this being correct.
2. **Fix `app/sitemap.ts` `lastModified`.** Replace `new Date()` with real last-modified dates: a static constant for the home/projects index pages (bump manually on content changes), and per-project dates driven by an `updatedAt` field added to `data/projects.ts` (or derived from GitHub repo `pushed_at` via the existing `githubService.ts`/`githubProjectAdapter.ts`, since the site already fetches repo metadata).
3. **Wire up `buildWebsiteStructuredData()`.** It already exists in `lib/structuredData.ts` but is never rendered. Inject it as a `<script type="application/ld+json">` in `app/layout.tsx`, and extend it into a proper `Person` schema (using the `AUTHOR` object in `lib/constants.ts`) so Google can show a knowledge-panel-style rich result for name searches ("Goh Zhong Xuen").
4. **Rewrite the homepage title/description for CTR, not just accuracy.** Current title is a flat brand name; current description is dry and reused as on-page copy (duplicate-content smell). Target a title like `Goh Zhong Xuen — Software Engineer | Full-Stack Projects in Next.js & Java` and a description that leads with a concrete hook + call to action (see §3 for copywriting guidance).
5. **Add `BreadcrumbList` JSON-LD** on `app/projects/[slug]/page.tsx` (Home → Projects → [Project Title]). Cheap to add next to the existing `buildProjectStructuredData` script tag, and directly improves SERP appearance with breadcrumb trails instead of a raw URL.

### Tier 2 — Medium effort, high CTR impact (1–3 days)

6. **Generate per-page OG images instead of one static image.** Use Next.js `ImageResponse` (`app/opengraph-image.tsx` / route-level `opengraph-image.tsx` files) to dynamically render the project title, tech stack badges, and your name onto a branded template for each project route. This is one of the highest-leverage CTR changes for social shares and any search surface that renders image previews (Discord, LinkedIn, X, Google's rich image results).
7. **Rewrite all `data/projects.ts` descriptions with a consistent, benefit-first pattern.** Current descriptions are technically accurate but feature-listy ("Full-stack job listing platform with a cloud backend..."). Reframe as outcome + tech, consistently, e.g.: `"Built a production job board that handles real-time listings for 100+ postings — Next.js, Supabase, and role-based auth."` Keep every description under ~155 characters since it doubles as the meta description via `buildMetadata`.
8. **Audit and standardize image `alt` text** across `ProjectCard.tsx` and the screenshot `<Image>` in `app/projects/[slug]/page.tsx` — make alt text descriptive and keyword-relevant (e.g., `"JobNow job listing dashboard showing real-time application tracking"` instead of generic `"Preview for {title}"`).
9. **Add `apple-touch-icon` and a `site.webmanifest`.** Small trust/branding signal in bookmarks, iOS home screens, and some search UIs.
10. **Internal linking pass.** Add a "Related projects" or "Next project" block at the bottom of each project detail page (`app/projects/[slug]/page.tsx`) linking to 2–3 other projects — improves crawl depth and time-on-site, both of which correlate with search performance.

### Tier 3 — Ongoing / structural (measure and iterate)

11. **Install analytics + Search Console.**
    - Add `@vercel/analytics` (trivial with this being a Vercel project) or GA4 for pageview/CTR-adjacent behavioral data.
    - Verify the site in Google Search Console and Bing Webmaster Tools; submit `sitemap.xml`.
    - This is the only way to know whether Tier 1/2 changes actually move CTR — treat it as a prerequisite for iterating further, not an optional nice-to-have.
12. **Track SERP title/description performance in Search Console** monthly; A/B the homepage title/description phrasing based on actual impression-to-click data once there's enough traffic to be meaningful.
13. **Build lightweight content that targets long-tail search intent.** A portfolio's natural long-tail queries are things like "Java tutorial centre management system source code" or "Next.js Supabase job board example" — the existing project case-study pages already target this; consider a short technical write-up/blog angle per major project (even 2–3 paragraphs on `challenges`/`lessonsLearned`, which the data model already supports via `project.challenges` and `project.lessonsLearned`) to capture more long-tail traffic.
14. **Off-page signals:** ensure GitHub repo READMEs link back to the live portfolio/project page (cheap backlink + drives GitHub search traffic to the site), and that LinkedIn/JobStreet profiles (already in `AUTHOR` constants) link to the portfolio URL.

## 3. CTR copywriting guidelines (apply across Tier 1 & 2)

- **Titles:** front-load the primary keyword/role, keep under ~60 characters so it doesn't truncate in SERPs. Pattern: `{Name} — {Role/Value Prop} | {Site Name}`.
- **Descriptions:** 120–155 characters, lead with a concrete result or number (project count, tech stack, "role-based access control", etc.), end with an implicit or explicit action ("See the case study →"). Avoid restating the title verbatim.
- **Avoid duplicate copy between meta description and on-page hero text** — search engines and users both notice when the snippet just repeats what's above the fold with nothing new.
- **Use power/specificity words sparingly but purposefully:** "production," "role-based," "real-time," "full-stack" — all already true of this portfolio's projects per `data/projects.ts`, just underused in metadata copy.

## 4. Suggested execution order

```
Tier 1 (this week):    #1 → #2 → #3 → #4 → #5
Tier 2 (next 1-2 wks):  #6 → #7 → #8 → #9 → #10
Tier 3 (ongoing):       #11 first (so you can measure everything above),
                        then #12-#14 as recurring/iterative work
```

## 5. Success metrics

Once `@vercel/analytics` + Search Console are live (Tier 3, #11), track monthly:

- Search impressions & average position (Search Console) for name + project-related queries.
- CTR per page in Search Console — target improvement after Tier 1/2 metadata rewrites ship.
- Organic sessions to `/projects/[slug]` pages specifically (validates whether case-study depth is paying off).
- Social share preview quality — spot-check OG images render correctly via Twitter Card Validator / LinkedIn Post Inspector after Tier 2 #6 ships.
