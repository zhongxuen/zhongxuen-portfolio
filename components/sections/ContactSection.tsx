"use client";

import { motion } from "framer-motion";
import { Mail, Phone, MapPin } from "lucide-react";
import { ContactForm } from "@/components/forms/ContactForm";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { socials } from "@/data/socials";
import { AUTHOR } from "@/lib/constants";
import {
    fadeInUp,
    staggerContainer,
    defaultViewport,
} from "@/lib/animations";

export function ContactSection() {
    return (
        <Container
            as="section"
            id="contact"
            className="flex flex-col gap-10 py-20 md:py-28"
        >
            <SectionHeading
                eyebrow="Contact"
                title="Let's Work Together"
                description="I'm currently seeking internship opportunities, software engineering projects, and collaborations. Feel free to reach out through the form below or any of my contact channels."
            />

            <div className="grid gap-10 lg:grid-cols-[1fr_420px] lg:items-start">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={defaultViewport}
                    variants={fadeInUp}
                >
                    <ContactForm />
                </motion.div>

                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={defaultViewport}
                    variants={staggerContainer}
                    className="flex flex-col gap-5"
                >
                    <motion.div variants={fadeInUp}>
                        <Card className="flex items-center gap-4">
                            <Mail
                                size={22}
                                className="shrink-0 text-primary"
                            />

                            <div>
                                <p className="text-sm text-muted">
                                    Email
                                </p>

                                <a
                                    href={`mailto:${AUTHOR.email}`}
                                    className="font-medium hover:text-primary"
                                >
                                    {AUTHOR.email}
                                </a>
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div variants={fadeInUp}>
                        <Card className="flex items-center gap-4">
                            <Phone
                                size={22}
                                className="shrink-0 text-primary"
                            />

                            <div>
                                <p className="text-sm text-muted">
                                    Phone
                                </p>

                                <span className="font-medium">
                                    {AUTHOR.phone}
                                </span>
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div variants={fadeInUp}>
                        <Card className="flex items-center gap-4">
                            <MapPin
                                size={22}
                                className="shrink-0 text-primary"
                            />

                            <div>
                                <p className="text-sm text-muted">
                                    Location
                                </p>

                                <span className="font-medium">
                                    {AUTHOR.location}
                                </span>
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div variants={fadeInUp}>
                        <Card className="flex flex-col gap-4">
                            <h3 className="font-heading text-lg font-semibold">
                                Find Me Online
                            </h3>

                            <div className="flex flex-wrap gap-3">
                                {socials.map((social) => (
                                    <a
                                        key={social.id}
                                        href={social.url}
                                        target={
                                            social.url.startsWith("mailto:")
                                                ? undefined
                                                : "_blank"
                                        }
                                        rel="noopener noreferrer"
                                        className="rounded-lg border border-muted/20 px-4 py-2 text-sm transition hover:border-primary hover:text-primary"
                                    >
                                        {social.label}
                                    </a>
                                ))}
                            </div>
                        </Card>
                    </motion.div>
                </motion.div>
            </div>
        </Container>
    );
}