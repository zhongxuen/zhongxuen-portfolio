import { ImageResponse } from "next/og";
import { OgImage, ogImageSize, ogImageContentType } from "@/lib/og";
import { projects } from "@/data/projects";

export const alt = "Project case study — Goh Zhong Xuen";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default async function Image({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const project = projects.find((item) => item.slug === slug);

    return new ImageResponse(
        (
            <OgImage
                eyebrow="Case study"
                title={project?.title ?? "Project case study"}
                subtitle={project?.description}
                tags={project?.technologies ?? []}
            />
        ),
        { ...size }
    );
}
