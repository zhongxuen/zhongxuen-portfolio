import type { Certification } from "@/types/certification";

/**
 * Professional certifications (docs/uiux.md §4.7).
 *
 * Empty is a legitimate state and renders as nothing at all: the certifications
 * strip in components/sections/EducationSection.tsx is absent rather than
 * showing placeholder rows. Nothing currently in the CV or in data/education.ts
 * is a certification — the Cisco and forensics entries in data/skills.ts are
 * coursework tooling, not credentials.
 *
 * `credentialUrl` is optional because not every credential has an online
 * record; the strip renders an entry without one as plain text rather than as a
 * dead link.
 *
 * WRITTEN BY THE ADMIN CONSOLE (/admin/career). The array below is re-emitted in
 * full by lib/admin/serializeCareer.ts on every save, so a comment placed inside
 * it will be deleted by the next one. Put notes in this header instead.
 */
export const certifications: Certification[] = [];
