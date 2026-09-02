# Portfolio Website

A modern, responsive personal portfolio website built with Next.js and TypeScript, designed to showcase professional experience, projects, and skills.

## Overview

This portfolio website serves as a central hub for personal branding, featuring a clean and animated interface that highlights professional background, technical skills, and project work. The site includes dynamic sections for hero introduction, about, experience, education, skills, projects, and contact.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Animations:** none — CSS only. Entrance choreography is `[data-reveal]` rules in
  `app/globals.css` driven by one `IntersectionObserver`
  (`components/motion/Reveal.tsx`); the hero animates straight from `@starting-style`
  with no JavaScript at all
- **Icon Library:** Lucide React (UI icons) + Simple Icons via `@icons-pack/react-simple-icons` (brand/tech logos)
- **Analytics:** `@vercel/analytics` + `@vercel/speed-insights`
- **Testing:** Vitest
- **Deployment:** Vercel

## Features

- Fully responsive design for all device sizes
- Anchor-based section navigation: native fragment links plus CSS `scroll-behavior: smooth`
  (`app/globals.css`), with the current section tracked by an `IntersectionObserver`
  (`hooks/useActiveSection.ts`) and reflected in the navbar as `aria-current="location"`
- Dark and light themes resolved before first paint by an inline script (`lib/theme.ts`),
  so there is no flash of the wrong palette, with a three-state toggle (system/light/dark)
- A Cmd/Ctrl+K command palette (`components/ui/CommandPalette.tsx`) — built in-house,
  loaded on first open — for jumping to any section or project, switching theme, copying
  the email address or downloading the resume
- Entrance, hover and page-transition motion in CSS, fully suppressed under
  `prefers-reduced-motion: reduce`
- Dynamic project detail pages with slug-based routing, loading, and not-found states
- Technology filtering, full-text search (`?q=`) and sorting (`?sort=`) on `/projects`, all
  held in the URL and applied server-side, so every view is linkable, crawlable and works
  without JavaScript
- Per-project structured data (JSON-LD), generated Open Graph images, `robots.txt`, and
  `sitemap.xml` for SEO
- Contact form that emails via Resend, with a mailto fallback (see below)
- Optimized performance with Next.js features

## Project Structure

```
├── adapters/              # Maps external data (e.g. GitHub) into internal types
├── app/                   # Next.js App Router routes
│   ├── actions/           # Server Actions (contact form)
│   └── projects/          # Projects index + [slug] detail routes
├── components/            # Reusable UI components
│   ├── cards/             # Card-based components
│   ├── forms/             # Form components
│   ├── hero/              # Hero-specific visuals
│   ├── layout/            # Layout components (Navbar, Footer)
│   ├── motion/            # The single client root behind the CSS entrance system
│   ├── projects/          # Projects-page components (filter, search, sort, gallery)
│   ├── skills/            # Skills category filter
│   ├── sections/          # Page section components
│   └── ui/                # Base UI components
├── data/                  # Static content data (projects, skills, education)
├── docs/                  # Design and planning notes (uiux, SEO plan, instructions)
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities, metadata, structured data, OG template
├── public/                # Static assets (images, resume)
├── services/              # Data-access layer (project + GitHub services)
├── tests/                 # Vitest suites, mirroring the directory they cover
└── types/                 # TypeScript type definitions
```

## Key Integrations

### Project data (local-first, GitHub as an overlay)

`data/projects.ts` is the **source of truth**. It determines which projects exist, their
order, slugs, and all narrative content (description, key features, challenges, lessons
learned). GitHub never adds, removes, or renames a project.

`services/projectService.ts` is the single entry point every consumer reads from — the
homepage, `/projects`, `/projects/[slug]` (including `generateStaticParams` and
`generateMetadata`), and the sitemap — so they cannot disagree about which projects exist.
It calls `services/githubService.ts` (which wraps the raw client in `lib/github.ts`) and
merges the result through `adapters/githubProjectAdapter.ts`.

The merge only **overlays repository stats** onto a matching local entry:
`stars`, `language`, `lastUpdated` (`pushed_at`), `publishedAt` (`created_at`),
`githubUrl`, and `liveUrl` (only when the local entry does not already set one). Matching
is on `githubRepo`/`githubUrl` after normalising case and separators — never on the slug —
and each repo is claimed by at most one project.

Caching and limits:

- Requests use `next: { revalidate: 3600 }` — repo data refreshes at most once per hour.
- `getProjects()` is wrapped in React `cache()`, so the fetch and merge run once per
  render pass rather than once per consumer.
- Unauthenticated requests are capped at **60 requests/hour** by GitHub. Set `GITHUB_TOKEN`
  to raise this via authenticated requests.
- GitHub is a progressive enhancement: any failure is logged and the full local project
  list is still returned, just without live stats.

### Contact form

`components/forms/ContactForm.tsx` posts to the `submitContactForm` Server Action in
`app/actions/contact.ts` via `<form action>`, so it also works with JavaScript disabled.
`useActionState` drives pending, success, and error state. On the server the action:

1. Discards submissions that fill the honeypot field, returning the same success state a
   human would see.
2. Re-validates every field server-side — length bounds from `lib/contact.ts` and a format
   check on the email address.
3. Applies a per-IP rate limit of 5 submissions per 10 minutes (`lib/rateLimit.ts`, an
   in-memory fixed window — a courtesy brake, not a security control, since the state is
   per-instance and lost on cold start).
4. Sends the message through the Resend HTTP API to the address in `AUTHOR.email`, with the
   sender's address as `reply_to` and a 10s timeout.

If `RESEND_API_KEY` is not set, the action does not throw — it returns a `fallback` state
with a prefilled `mailto:` link containing everything that was typed. A plain mailto link
to the same address is always visible regardless.

## Configuration

Environment variables are read from `.env.local` in development and from the hosting
project's environment settings in production. Copy `.env.example` to get started:

```bash
cp .env.example .env.local
```

| Variable                        | Required                   | Read by                  | Purpose / what breaks without it                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------- | -------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`          | **Required in production** | `lib/constants.ts`       | Absolute site origin, no trailing slash. Backs every canonical URL, Open Graph `url`, JSON-LD `@id`, and `sitemap.xml` entry. Falls back to `https://$VERCEL_PROJECT_PRODUCTION_URL`, then `http://localhost:3001`. A production build whose site URL resolves to localhost **throws and fails the build** rather than shipping localhost URLs. Note that a localhost value in `.env.local` is picked up by `next build` too. |
| `GITHUB_TOKEN`                  | Optional                   | `lib/github.ts`          | Any token with public-repo read scope. Without it, requests are unauthenticated and capped at 60/hour; when exhausted, the site still renders from `data/projects.ts` but project cards show no stars, language, or last-updated date.                                                                                                                                                                                        |
| `RESEND_API_KEY`                | Optional                   | `app/actions/contact.ts` | Enables actual email delivery from the contact form. Without it, the form validates and rate-limits as normal but sends nothing — it returns the mailto fallback described above.                                                                                                                                                                                                                                             |
| `CONTACT_FROM_EMAIL`            | Optional                   | `app/actions/contact.ts` | Sender identity, e.g. `Name <hello@example.com>`. Defaults to Resend's shared `onboarding@resend.dev` sender, which needs no domain setup but only delivers to the Resend account owner's own address. Set this once a domain is verified.                                                                                                                                                                                    |
| `VERCEL_PROJECT_PRODUCTION_URL` | Auto                       | `lib/constants.ts`       | Injected by Vercel. Used only as the fallback when `NEXT_PUBLIC_SITE_URL` is unset.                                                                                                                                                                                                                                                                                                                                           |

`NEXT_PUBLIC_SITE_URL` is the only variable exposed to the browser. `GITHUB_TOKEN`,
`RESEND_API_KEY`, and `CONTACT_FROM_EMAIL` are server-only and must never be prefixed with
`NEXT_PUBLIC_`.

## Getting Started

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env.local

# Run development server (http://localhost:3001)
npm run dev

# Build for production
npm run build
```

Other scripts: `npm run lint`, `npm run typecheck`, `npm run format`, `npm run format:check`.
