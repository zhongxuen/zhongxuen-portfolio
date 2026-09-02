import { Mail, Phone, MapPin, type LucideIcon } from "lucide-react";
import { ContactForm } from "@/components/forms/ContactForm";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { Reveal } from "@/components/motion/Reveal";
import { socials } from "@/data/socials";
import { AUTHOR } from "@/lib/constants";
import { revealDelay, stagger } from "@/lib/reveal";
import { toTelHref } from "@/lib/utils";

interface ContactFact {
    icon: LucideIcon;
    /** Mono spec key, rendered uppercase by bp-meta. */
    label: string;
    value: string;
    /** Omitted for facts that are not actionable. */
    href?: string;
    /** Renders a CopyButton beside the value, for values worth pasting. */
    copyLabel?: string;
}

/**
 * The three single-line contact facts (docs/uiux.md §4.8).
 *
 * Two of the three now do something. The email is both a mailto link and a
 * copy target — a recruiter pasting it into their own client is at least as
 * common as launching one — and the phone is a real `tel:` URI rather than the
 * plain text it used to be, which on a phone is the difference between a tap
 * and a hand-transcription. Location stays inert because it is a fact, not an
 * action.
 */
const CONTACT_FACTS: ContactFact[] = [
    {
        icon: Mail,
        label: "Email",
        value: AUTHOR.email,
        href: `mailto:${AUTHOR.email}`,
        copyLabel: "email address",
    },
    {
        icon: Phone,
        label: "Phone",
        value: AUTHOR.phone,
        href: toTelHref(AUTHOR.phone),
    },
    { icon: MapPin, label: "Location", value: AUTHOR.location },
];

export function ContactSection() {
    return (
        <Container
            as="section"
            id="contact"
            aria-labelledby="contact-heading"
            className="bp-section-y flex flex-col gap-10"
        >
            <SectionHeading
                index={6}
                headingId="contact-heading"
                eyebrow="Contact"
                title="Let's Work Together"
                description="I'm on an internship at TED Optimus through October 2026 and open to conversations about what comes after it — graduate roles, freelance work, or a project worth building. The form below reaches me directly."
            />

            {/*
             * The two columns converge on the seam between them rather than
             * both rising: the form is the destination and the facts are the
             * alternative to it, so they should read as arriving from opposite
             * sides of one decision.
             */}
            <div className="grid gap-10 lg:grid-cols-[1fr_420px] lg:items-start">
                <Reveal variant="left">
                    <ContactForm />
                </Reveal>

                <Reveal className="flex flex-col gap-5">
                    {CONTACT_FACTS.map(({ icon: Icon, label, value, href, copyLabel }, index) => (
                        <div key={label} data-reveal="right" style={revealDelay(stagger(index))}>
                            <Card interactive className="flex items-center gap-4">
                                <Icon
                                    size={20}
                                    aria-hidden="true"
                                    className="shrink-0 text-accent"
                                />

                                <div className="min-w-0 flex-1">
                                    <p className="bp-meta text-ink-muted">{label}</p>

                                    {href ? (
                                        <a
                                            href={href}
                                            className="bp-focus font-medium break-all text-ink transition-colors duration-fast ease-bp hover:text-accent"
                                        >
                                            {value}
                                        </a>
                                    ) : (
                                        <span className="font-medium text-ink">{value}</span>
                                    )}
                                </div>

                                {copyLabel && (
                                    <CopyButton value={value} label={`my ${copyLabel}`} />
                                )}
                            </Card>
                        </div>
                    ))}

                    <div data-reveal="right" style={revealDelay(stagger(CONTACT_FACTS.length))}>
                        <Card interactive className="flex flex-col gap-4">
                            <h3 className="bp-meta text-ink-muted">Find me online</h3>

                            {/*
                             * Ticked icon boxes, matching the footer's set
                             * exactly — same data, same treatment, so the two
                             * read as one control rather than two lists that
                             * happen to overlap. The label is the accessible
                             * name and the visible tooltip; SocialIcon falls
                             * back to rendering it when an icon is unmapped.
                             */}
                            <ul className="flex flex-wrap gap-2">
                                {socials.map((social) => (
                                    <li key={social.id}>
                                        <a
                                            href={social.url}
                                            target={
                                                social.url.startsWith("mailto:")
                                                    ? undefined
                                                    : "_blank"
                                            }
                                            rel="noopener noreferrer"
                                            aria-label={social.label}
                                            title={social.label}
                                            className="bp-focus bp-ticks bp-ticks-live inline-flex h-11 w-11 items-center justify-center border border-line bg-surface-alt text-ink-muted transition-[color,border-color,translate] duration-fast ease-bp hover:-translate-y-0.5 hover:border-line-strong hover:text-accent"
                                        >
                                            <SocialIcon
                                                icon={social.icon}
                                                label={social.label}
                                                size={19}
                                            />
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    </div>
                </Reveal>
            </div>
        </Container>
    );
}
