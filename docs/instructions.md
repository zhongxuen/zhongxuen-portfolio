# AI Project Instructions

These instructions define how the AI should assist throughout this project.

They should be followed for every response unless explicitly overridden by the user.

---

# General Behavior

Always assume this project already exists.

Maintain consistency with the existing architecture.

Do not redesign existing systems unless requested.

Avoid unnecessary rewrites.

Preserve the current project style.

---

# Response Style

Provide:

- Clear explanations
- Practical recommendations
- Industry-standard solutions
- Maintainable implementations

Avoid vague responses.

Avoid unnecessary theory unless requested.

Focus on implementation.

---

# Code Generation

Whenever generating code:

Produce production-quality code.

Use TypeScript.

Follow Next.js App Router conventions.

Use Tailwind CSS utilities.

Prefer functional React components.

Use modern React practices.

Use reusable components whenever practical.

Avoid deprecated APIs.

Avoid unnecessary dependencies.

---

# Component Design

Components should:

Have one responsibility.

Remain reusable.

Remain modular.

Avoid large monolithic files.

Extract repeated UI into reusable components.

Avoid duplicated logic.

---

# State Management

Prefer:

React state

Context

Server Components

Only introduce external state libraries if a genuine need exists.

---

# Styling

Use Tailwind CSS.

Avoid inline styles unless absolutely necessary.

Maintain consistent spacing.

Use consistent border radius.

Use consistent typography.

Maintain visual hierarchy.

---

# Animations

Use Framer Motion sparingly.

Animations should improve UX.

Do not animate everything.

Avoid distracting effects.

---

# Accessibility

Always consider:

Keyboard navigation

ARIA labels

Semantic HTML

Accessible buttons

Focus indicators

Alt text

Proper form labels

---

# Performance

Whenever making recommendations, prefer:

Static rendering

Server Components

Image optimization

Code splitting

Lazy loading

Minimal bundle size

Avoid unnecessary client-side rendering.

---

# GitHub Integration

When referencing projects:

Prefer GitHub as the source of truth.

Avoid manually duplicating repository information whenever practical.

---

# Supabase

Assume Supabase is optional.

Do not introduce database solutions unless required.

If proposing Supabase, explain:

Why it is needed.

What problem it solves.

Whether a simpler approach exists.

---

# Folder Structure

Respect the existing project organization.

Do not randomly relocate files.

Keep components organized logically.

---

# Error Prevention

Before suggesting changes:

Consider existing architecture.

Avoid introducing breaking changes.

Avoid duplicate functionality.

Avoid unnecessary abstractions.

Avoid overengineering.

---

# Refactoring

Only recommend refactoring when it significantly improves:

Maintainability

Performance

Readability

Scalability

Do not refactor purely for stylistic preferences.

---

# Explanations

When explaining technical concepts:

Explain the reasoning.

Explain trade-offs.

Mention alternative approaches when relevant.

Avoid excessive verbosity.

---

# Recommendations

Recommendations should prioritize:

Maintainability

Performance

Developer experience

Industry best practices

Scalability

Professional appearance

---

# UI Decisions

Favor:

Simple layouts

Clear navigation

Consistent spacing

Modern typography

Subtle animations

Professional appearance

Avoid trends that reduce usability.

---

# Security

Never expose secrets.

Never hardcode credentials.

Recommend environment variables where appropriate.

Follow standard web security practices.

---

# Documentation

When adding new features:

Suggest updates to documentation if appropriate.

Maintain consistent naming conventions.

Keep documentation concise.

---

# If Context Is Missing

Do not hallucinate project details.

If required information is unavailable:

State the assumption.

Ask concise clarification questions only when necessary.

Otherwise continue using the existing project context.

---

# Goal

Help build a portfolio website that reflects professional software engineering standards.

Every response should improve the quality, maintainability, usability, and professionalism of the project.