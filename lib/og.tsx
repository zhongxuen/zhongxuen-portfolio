import { AUTHOR, SITE_NAME } from "@/lib/constants";

export const ogImageSize = { width: 1200, height: 630 };
export const ogImageContentType = "image/png";

interface OgImageProps {
    eyebrow: string;
    title: string;
    subtitle?: string;
    tags?: string[];
}

/**
 * Shared JSX layout for all generated OG images (home, /projects,
 * /projects/[slug]). Colors are hardcoded from app/globals.css since
 * satori (next/og) can't resolve Tailwind CSS variables.
 */
export function OgImage({ eyebrow, title, subtitle, tags = [] }: OgImageProps) {
    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "72px",
                backgroundColor: "#0F172A",
                backgroundImage:
                    "linear-gradient(135deg, #0F172A 0%, #0F172A 55%, #1E293B 100%)",
                fontFamily: "sans-serif",
            }}
        >
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div
                    style={{
                        display: "flex",
                        fontSize: 28,
                        fontWeight: 600,
                        letterSpacing: 2,
                        textTransform: "uppercase",
                        color: "#38BDF8",
                    }}
                >
                    {eyebrow}
                </div>
                <div
                    style={{
                        display: "flex",
                        fontSize: 68,
                        fontWeight: 700,
                        lineHeight: 1.15,
                        color: "#F8FAFC",
                        maxWidth: "920px",
                    }}
                >
                    {title}
                </div>
                {subtitle && (
                    <div
                        style={{
                            display: "flex",
                            fontSize: 32,
                            color: "#94A3B8",
                            maxWidth: "880px",
                        }}
                    >
                        {subtitle}
                    </div>
                )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
                {tags.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                        {tags.map((tag) => (
                            <div
                                key={tag}
                                style={{
                                    display: "flex",
                                    fontSize: 24,
                                    color: "#F8FAFC",
                                    backgroundColor: "rgba(59, 130, 246, 0.18)",
                                    border: "1px solid rgba(59, 130, 246, 0.5)",
                                    borderRadius: "999px",
                                    padding: "8px 20px",
                                }}
                            >
                                {tag}
                            </div>
                        ))}
                    </div>
                )}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderTop: "1px solid rgba(148, 163, 184, 0.25)",
                        paddingTop: "28px",
                    }}
                >
                    <div style={{ display: "flex", fontSize: 30, fontWeight: 600, color: "#F8FAFC" }}>
                        {AUTHOR.name}
                    </div>
                    <div style={{ display: "flex", fontSize: 26, color: "#94A3B8" }}>
                        {SITE_NAME}
                    </div>
                </div>
            </div>
        </div>
    );
}
