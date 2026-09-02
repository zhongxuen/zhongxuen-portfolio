import { Fragment } from "react";
import { Mail, ArrowDown } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { CountUp } from "@/components/ui/CountUp";
import { Magnetic } from "@/components/ui/Magnetic";
import { BlueprintSchematic } from "@/components/hero/BlueprintSchematic";
import { Reveal } from "@/components/motion/Reveal";
import { AUTHOR, SITE_DESCRIPTION } from "@/lib/constants";
import type { ResumeMeta } from "@/lib/resume";
import { revealDelay, stagger, WORD_STAGGER_STEP } from "@/lib/reveal";
import { skills } from "@/data/skills";
import { experience } from "@/data/experience";

const featuredSkills = skills.filter((skill) => skill.featured);

const HEADLINE_WORDS = `Hi, I'm ${AUTHOR.firstName}.`.split(" ");

/**
 * Index of the headline among the stacked blocks in the left column. The
 * per-word cascade starts from that block's delay rather than from zero, so
 * the words pick up where the eyebrow above them finished.
 */
const HEADLINE_INDEX = 1;

export interface HeroSectionProps {
    /**
     * Resolved project count. Passed in rather than read from data/projects.ts
     * so the figure matches whatever getProjects() actually returned for this
     * render, including any GitHub-only entries merged in.
     */
    projectCount: number;
    resume: ResumeMeta;
}

/**
 * Hero (docs/uiux.md §4.2).
 *
 * Two columns on lg: content left, the self-drawing system schematic right.
 * The schematic is decorative and is dropped below lg rather than stacked —
 * on a phone it would push the CTAs off the first screen for no information
 * gain.
 *
 * Three fixes from the §1.5 audit are load-bearing here:
 *   - One primary CTA, one secondary, and the resume demoted to a mono text
 *     link. Three equal buttons meant no call to action at all.
 *   - Stats render the exact count. The old `{value}+` displayed "9+" for
 *     exactly nine projects, which is simply untrue.
 *   - The file-size annotation on the resume link is measured off the real
 *     PDF at build time (lib/resume.ts), not typed in here.
 *
 * This is a Server Component. The cascade runs through two `Reveal` wrappers
 * marked `immediate` — the hero is on screen at load, so there is nothing for
 * an intersection callback to wait for — and every element inside them is
 * server-rendered, carrying only a `data-reveal` attribute and its delay.
 *
 * `immediate` also keeps JavaScript out of the first paint entirely: those
 * wrappers ship `data-visible="true"` in the HTML and animate from an
 * `@starting-style` entry state, so the LCP text here does not wait on
 * hydration. It measured a second behind FCP before that changed.
 */
export function HeroSection({ projectCount, resume }: HeroSectionProps) {
    const stats = [
        { label: "Projects", value: projectCount },
        { label: "Technologies", value: skills.length },
        { label: "Roles", value: experience.length },
    ];

    return (
        <Container
            as="section"
            aria-labelledby="hero-heading"
            className="grid min-h-[calc(100svh-4rem)] items-center gap-14 py-16 lg:grid-cols-[1.15fr_1fr] lg:gap-16"
        >
            <Reveal immediate className="flex flex-col gap-7">
                <p data-reveal="up" style={revealDelay(stagger(0))} className="bp-meta text-accent">
                    / {AUTHOR.role} · {AUTHOR.location}
                </p>

                {/*
                 * Per-word clip wipe rather than a fade (§3.3). The words are
                 * split for animation only, so the heading is reassembled as a
                 * single string for assistive tech instead of being announced
                 * word by word.
                 */}
                <h1
                    id="hero-heading"
                    aria-label={HEADLINE_WORDS.join(" ")}
                    className="font-display text-display text-balance text-ink"
                >
                    <span aria-hidden="true">
                        {HEADLINE_WORDS.map((word, index) => (
                            <Fragment key={`${word}-${index}`}>
                                <span className="inline-block overflow-hidden pb-[0.06em] align-bottom">
                                    <span
                                        data-reveal="wipe"
                                        style={revealDelay(
                                            stagger(HEADLINE_INDEX) + index * WORD_STAGGER_STEP,
                                        )}
                                        className="inline-block"
                                    >
                                        {word}
                                    </span>
                                </span>
                                {/*
                                 * The separator sits between the clipping
                                 * spans, not inside one. Trailing whitespace
                                 * at the end of an inline-block is stripped,
                                 * so the previous nesting rendered the
                                 * headline as "Hi,I'm ZhongXuen." with every
                                 * inter-word space swallowed.
                                 */}
                                {index < HEADLINE_WORDS.length - 1 && " "}
                            </Fragment>
                        ))}
                    </span>
                </h1>

                <p
                    data-reveal="up"
                    style={revealDelay(stagger(2))}
                    className="max-w-xl text-body-lg text-pretty text-ink-muted"
                >
                    {SITE_DESCRIPTION}
                </p>

                <div
                    data-reveal="up"
                    style={revealDelay(stagger(3))}
                    className="flex flex-wrap items-center gap-4"
                >
                    {/*
                     * The two primary actions are magnetic (§3.3). The resume
                     * link below them deliberately is not — it is the demoted
                     * third action, and giving it the same pull would undo the
                     * hierarchy this row exists to establish.
                     */}
                    <Magnetic>
                        <Button href="#projects" variant="primary" size="lg">
                            View Projects
                            {/* Nudges the way the link travels — down the page,
                                not across it. See `.bp-nudge-y` in globals. */}
                            <ArrowDown size={18} className="bp-nudge-y" />
                        </Button>
                    </Magnetic>
                    <Magnetic>
                        <Button href="#contact" variant="outline" size="lg">
                            <Mail size={18} />
                            Get in Touch
                        </Button>
                    </Magnetic>
                    <Button href={resume.path} variant="link" external className="ml-1">
                        Resume
                        <span aria-hidden="true" className="text-ink-muted">
                            {resume.sizeLabel ? `PDF · ${resume.sizeLabel}` : "PDF"}
                        </span>
                    </Button>
                </div>

                <ul
                    data-reveal="up"
                    style={revealDelay(stagger(4))}
                    aria-label="Core technologies"
                    className="flex flex-wrap gap-x-4 gap-y-2"
                >
                    {featuredSkills.map((skill) => (
                        <li key={skill.id} className="bp-meta text-ink-muted">
                            {skill.name}
                        </li>
                    ))}
                </ul>

                {/* Spec strip — measure lines between figures, exact counts. */}
                <dl
                    data-reveal="up"
                    style={revealDelay(stagger(5))}
                    className="mt-2 grid max-w-lg grid-cols-3 divide-x divide-line border-t border-line pt-6"
                >
                    {stats.map((stat, index) => (
                        <div
                            key={stat.label}
                            className={index === 0 ? "pr-3 sm:pr-5" : "px-3 last:pr-0 sm:px-5"}
                        >
                            <dd className="font-display text-3xl font-medium text-ink sm:text-4xl">
                                <CountUp value={stat.value} />
                            </dd>
                            {/* Steps down below sm: at bp-meta's tracking,
                                "TECHNOLOGIES" is wider than a third of a 390px
                                viewport and collides with its neighbour. */}
                            <dt className="mt-1 font-mono text-[0.625rem] tracking-[0.08em] text-ink-muted uppercase sm:text-meta sm:tracking-[0.14em]">
                                {stat.label}
                            </dt>
                        </div>
                    ))}
                </dl>
            </Reveal>

            {/*
             * The schematic drifts against the copy as the hero scrolls away,
             * which is what gives the two columns a sense of depth rather than
             * of being one flat plate. Scroll-driven and therefore inert where
             * `animation-timeline` is unsupported; the travel is halved from
             * the default because the graphic sits beside body copy and a full
             * 64px of relative movement reads as the layout coming apart.
             */}
            <Reveal
                immediate
                style={
                    {
                        "--bp-parallax-from": "16px",
                        "--bp-parallax-to": "-16px",
                    } as React.CSSProperties
                }
                className="bp-parallax hidden justify-self-center lg:block lg:justify-self-end"
            >
                <BlueprintSchematic />
            </Reveal>
        </Container>
    );
}
