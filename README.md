# Portfolio Website

A modern, responsive personal portfolio website built with Next.js and TypeScript, designed to showcase professional experience, projects, and skills.

## Overview

This portfolio website serves as a central hub for personal branding, featuring a clean and animated interface that highlights professional background, technical skills, and project work. The site includes dynamic sections for hero introduction, about, experience, education, skills, projects, and contact.

## Tech Stack

- **Framework:** Next.js (React)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion
- **Icon Library:** Lucide React (UI icons) + Simple Icons via `@icons-pack/react-simple-icons` (brand/tech logos)
- **Deployment:** Vercel / Netlify

## Features

- Fully responsive design for all device sizes
- Smooth scroll navigation with active section highlighting
- Animated UI elements with Framer Motion
- Dynamic project detail pages with slug-based routing, loading, and not-found states
- Per-project structured data (JSON-LD), Open Graph metadata, `robots.txt`, and `sitemap.xml` for SEO
- Contact form integration
- Optimized performance with Next.js features

## Project Structure
```
├── adapters/              # Maps external data (e.g. GitHub) into internal types
├── app/                   # Next.js app router pages
│   └── projects/[slug]/  # Dynamic project detail routes
├── components/            # Reusable UI components
│   ├── cards/             # Card-based components
│   ├── forms/             # Form components
│   ├── layout/            # Layout components (Navbar, Footer)
│   ├── sections/          # Page section components
│   └── ui/                # Base UI components
├── data/                  # Static content data
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions, metadata, structured data
├── public/                # Static assets (images, resume)
├── services/               # External service integrations (GitHub)
└── types/                 # TypeScript type definitions
```

## Key Integrations

- **GitHub API:** Fetches real-time repository data for the projects section via `services/githubService.ts` and `adapters/githubProjectAdapter.ts`
- **Contact Form:** Handles form submissions (configurable backend)

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```
