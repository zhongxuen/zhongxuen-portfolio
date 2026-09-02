import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { BlueprintFrame } from "@/components/ui/BlueprintFrame";
import { Reveal } from "@/components/motion/Reveal";
import { education } from "@/data/education";
import { now } from "@/data/now";
import { AUTHOR, AVATAR_PATH } from "@/lib/constants";
import { revealDelay, stagger } from "@/lib/reveal";
import { formatMonthYear, sortByStartDateDesc } from "@/lib/utils";

/**
 * Static prose sourced from CV.md's PROFILE SUMMARY / ADDITIONAL
 * INFORMATION. Kept local rather than in data/ since it's free-form
 * prose, not a repeatable record shape like Project/Skill/etc.
 */
const SUMMARY =
    "Motivated diploma student in Information Technology specializing in Software Engineering, with hands-on experience across full-stack development, UI/UX design, database management, and software system design — building complete applications from requirements through deployment using both code-based and low-code platforms.";

const LANGUAGES = "English & Chinese (fluent), Malay (basic)";

/*
 * The education row reads out of data/education.ts rather than restating the
 * programme in a literal. The two had already drifted — this file used to claim
 * a 2027 completion against the 2026 recorded there — and a spec table whose
 * facts disagree with the section below it is worse than no spec table.
 */
const [currentEducation] = sortByStartDateDesc(education);

const specs = [
    { key: "Location", value: AUTHOR.location },
    {
        key: "Education",
        value: `${currentEducation.degree}, ${currentEducation.institution}`,
    },
    { key: "Languages", value: LANGUAGES },
];

/**
 * Who the author is (docs/uiux.md §4.3).
 *
 * Three plates: a framed portrait, a mono spec table, and a NOW block. The
 * spec table exists because a recruiter scanning for location and language
 * should not have to read a paragraph to find them, and the NOW block because
 * a dated line about current work is the cheapest possible signal that the site
 * is not abandoned.
 *
 * Stays a Server Component — the only moving parts are the CSS entrance
 * choreography and the frame's hover resolve.
 */
export function AboutSection() {
    return (
        <Container
            as="section"
            id="about"
            aria-labelledby="about-heading"
            className="bp-section-y flex flex-col gap-10"
        >
            <SectionHeading
                index={1}
                headingId="about-heading"
                eyebrow="About"
                title="Who I am"
                description="A quick introduction before you dive into the projects and skills below."
            />

            <Reveal className="grid gap-10 md:grid-cols-[minmax(0,18rem)_1fr] md:items-start">
                <div data-reveal="left">
                    <BlueprintFrame
                        caption="Fig.00 — The author"
                        measure="1:1"
                        frameClassName="aspect-square"
                    >
                        <Image
                            src={AVATAR_PATH}
                            alt={AUTHOR.name}
                            fill
                            /*
                             * The frame column is `minmax(0, 18rem)` from md up
                             * and full-width below it, less the 1.5rem the
                             * measure line takes. `100vw` on mobile would ask a
                             * phone at DPR 3 for a 1170px source for a box that
                             * never exceeds 288px.
                             */
                            sizes="min(100vw, 288px)"
                            className="object-cover"
                        />
                    </BlueprintFrame>
                </div>

                <div className="flex flex-col gap-8">
                    <p
                        data-reveal="right"
                        style={revealDelay(stagger(0))}
                        className="text-body-lg leading-relaxed text-pretty text-ink-muted"
                    >
                        {SUMMARY}
                    </p>

                    <dl
                        data-reveal="right"
                        style={revealDelay(stagger(1))}
                        className="flex flex-col border-t border-line"
                    >
                        {specs.map((spec) => (
                            <div
                                key={spec.key}
                                className="grid grid-cols-[6.5rem_1fr] gap-4 border-b border-line py-3"
                            >
                                <dt className="bp-meta pt-0.5 text-ink-muted">{spec.key}</dt>
                                <dd className="text-sm text-ink">{spec.value}</dd>
                            </div>
                        ))}
                    </dl>

                    <div
                        data-reveal="scale"
                        style={revealDelay(stagger(2))}
                        data-fx="spotlight"
                        className="bp-ticks bp-ticks-live bp-lift isolate rounded-xl border border-line bg-surface p-5"
                    >
                        <span aria-hidden="true" className="bp-spotlight" />

                        <h3 className="bp-meta mb-4 flex items-center gap-3 text-accent">
                            Now
                            <span
                                aria-hidden="true"
                                data-reveal="rule"
                                style={revealDelay(stagger(3))}
                                className="h-px flex-1 bg-linear-to-r from-line-strong to-transparent"
                            />
                        </h3>

                        <ul className="flex flex-col gap-3">
                            {now.map((entry, index) => (
                                <li
                                    key={entry.id}
                                    data-reveal="up"
                                    style={revealDelay(stagger(index + 4))}
                                    className="flex flex-col gap-1"
                                >
                                    <p className="flex items-baseline gap-3">
                                        <span className="bp-meta text-ink">{entry.label}</span>
                                        <span className="bp-meta text-ink-muted">
                                            <span className="sr-only">since</span>
                                            {formatMonthYear(entry.since)}
                                        </span>
                                    </p>
                                    <p className="font-mono text-sm leading-relaxed text-ink-muted">
                                        {entry.detail}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </Reveal>
        </Container>
    );
}
