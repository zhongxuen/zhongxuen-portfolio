import Image from "next/image";
import { MapPin, GraduationCap, Languages } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { AUTHOR } from "@/lib/constants";

/**
 * Static prose sourced from CV.md's PROFILE SUMMARY / ADDITIONAL
 * INFORMATION. Kept local rather than in data/ since it's free-form
 * prose, not a repeatable record shape like Project/Skill/etc.
 */
const SUMMARY =
    "Motivated diploma student in Information Technology specializing in Software Engineering, with hands-on experience across full-stack development, UI/UX design, database management, and software system design — building complete applications from requirements through deployment using both code-based and low-code platforms.";

/** Assumes a profile photo will live at /public/images/profile/avatar.jpg. */
const AVATAR_PATH = "/images/profile/avatar.jpg";

const quickFacts = [
    { icon: MapPin, label: AUTHOR.location },
    { icon: GraduationCap, label: "Diploma in IT (Software Engineering), APU — Expected 2027" },
    { icon: Languages, label: "English & Chinese (fluent), Malay (basic)" },
];

export function AboutSection() {
    return (
        <Container as="section" id="about" className="flex flex-col gap-10 py-20 md:py-28">
            <SectionHeading
                eyebrow="About"
                title="Who I am"
                description="A quick introduction before you dive into the projects and skills below."
            />

            <div className="grid gap-10 md:grid-cols-[1fr_1.4fr] md:items-start">
                <div className="relative aspect-square w-full max-w-xs overflow-hidden rounded-xl bg-card">
                    <Image
                        src={AVATAR_PATH}
                        alt={AUTHOR.name}
                        fill
                        className="object-cover"
                        sizes="(min-width: 768px) 320px, 100vw"
                    />
                </div>

                <div className="flex flex-col gap-6">
                    <p className="text-base leading-relaxed text-muted">{SUMMARY}</p>

                    <ul className="flex flex-col gap-3">
                        {quickFacts.map(({ icon: Icon, label }) => (
                            <li key={label} className="flex items-center gap-3 text-sm text-foreground">
                                <Icon size={18} className="shrink-0 text-primary" />
                                {label}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </Container>
    );
}