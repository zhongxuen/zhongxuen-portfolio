import { ImageResponse } from "next/og";
import { OgImage, ogImageSize, ogImageContentType } from "@/lib/og";

export const alt = "Selected Projects — Goh Zhong Xuen";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default function Image() {
    return new ImageResponse(
        (
            <OgImage
                eyebrow="Portfolio"
                title="Selected projects"
                subtitle="Full-stack apps, desktop systems, and CLI tools I've built and shipped."
                tags={["Next.js", "Java", "Python", "PHP", "Supabase"]}
            />
        ),
        { ...size }
    );
}
