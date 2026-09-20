import { parseModule, type ModuleShape } from "@/lib/admin/parseModule";
import type { Certification } from "@/types/certification";
import type { Education } from "@/types/education";
import type { Experience } from "@/types/experience";
import type { Skill } from "@/types/skill";

/**
 * Readers for the four career files, inverse to `lib/admin/serializeCareer.ts`.
 *
 * Each is a `ModuleShape` handed to the shared scanner in
 * `lib/admin/parseModule.ts` — see that module for why nothing is evaluated and
 * why a field neither this nor the serializer knows about is a hard failure
 * rather than a shrug. `tests/lib/career.test.ts` round-trips all four against
 * the real files, which is what keeps these key lists from falling behind
 * `types/`.
 *
 * `required` is deliberately short in each case. The file-level parser answers
 * "is this the file both modules agreed on"; whether a date parses or an icon
 * resolves is the form validator's question, and it is asked in
 * `lib/admin/careerForm.ts` where the answer can be shown next to the field.
 */

export const EXPERIENCE_SHAPE: ModuleShape<Experience> = {
    file: "data/experience.ts",
    declaration: "export const experience: Experience[] = [",
    known: [
        "id",
        "role",
        "company",
        "companyUrl",
        "logo",
        "location",
        "employmentType",
        "startDate",
        "endDate",
        "description",
        "responsibilities",
        "technologies",
        "featured",
    ],
    required: ["id", "role", "company", "startDate", "description"],
};

export function parseExperience(source: string): Experience[] {
    return parseModule<Experience>(source, EXPERIENCE_SHAPE);
}

export const EDUCATION_SHAPE: ModuleShape<Education> = {
    file: "data/education.ts",
    declaration: "export const education: Education[] = [",
    known: [
        "id",
        "degree",
        "institution",
        "institutionUrl",
        "location",
        "startDate",
        "endDate",
        "gpa",
        "relevantCourses",
        "honors",
        "description",
        "featured",
    ],
    required: ["id", "degree", "institution", "startDate"],
};

export function parseEducation(source: string): Education[] {
    return parseModule<Education>(source, EDUCATION_SHAPE);
}

export const SKILLS_SHAPE: ModuleShape<Skill> = {
    file: "data/skills.ts",
    declaration: "export const skills: Skill[] = [",
    known: ["id", "name", "category", "icon", "featured"],
    required: ["id", "name", "category", "icon"],
};

export function parseSkills(source: string): Skill[] {
    return parseModule<Skill>(source, SKILLS_SHAPE);
}

export const CERTIFICATIONS_SHAPE: ModuleShape<Certification> = {
    file: "data/certifications.ts",
    declaration: "export const certifications: Certification[] = [",
    known: ["id", "name", "issuer", "date", "credentialUrl"],
    required: ["id", "name", "issuer", "date"],
};

export function parseCertifications(source: string): Certification[] {
    return parseModule<Certification>(source, CERTIFICATIONS_SHAPE);
}
