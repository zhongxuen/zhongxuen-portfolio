import { ImageResponse } from "next/og";
import { OgImage, ogImageSize, ogImageContentType } from "@/lib/og";
import { AUTHOR } from "@/lib/constants";

export const alt = "Goh Zhong Xuen — Software Engineer Portfolio";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default function Image() {
    return new ImageResponse(
        (
            <OgImage
                eyebrow={AUTHOR.role}
                title={`Hi, I'm ${AUTHOR.firstName}.`}
                subtitle="Full-stack projects in Next.js, Java, and Python."
                tags={["Next.js", "TypeScript", "Java", "Python", "Supabase"]}
            />
        ),
        { ...size }
    );
}
