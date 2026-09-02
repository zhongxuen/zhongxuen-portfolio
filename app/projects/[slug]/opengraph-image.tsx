import { ImageResponse } from "next/og";
import { OgImage, ogImageSize, ogImageContentType } from "@/lib/og";
import { getProjectBySlug } from "@/services/projectService";

export const alt = "Project case study — Goh Zhong Xuen";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default async function Image({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    // The merged source, not data/projects.ts directly: a project whose local
    // entry is keyed differently than its route slug would silently render the
    // generic fallback card here while the page itself resolved fine.
    const project = await getProjectBySlug(slug);

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
