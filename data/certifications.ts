import type { Certification } from "@/types/certification";

/**
 * Professional certifications (docs/uiux.md §4.7).
 *
 * Deliberately empty. Nothing in the CV or in data/education.ts is a
 * certification — the Cisco and forensics entries in data/skills.ts are
 * coursework tooling, not credentials — and the certifications strip in
 * components/sections/EducationSection.tsx renders nothing at all while this
 * array is empty rather than showing placeholder rows.
 *
 * Adding the first real one is a single push here; no component changes.
 */
export const certifications: Certification[] = [];
