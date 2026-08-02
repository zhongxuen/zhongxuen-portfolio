import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#0F172A",
                    backgroundImage: "linear-gradient(135deg, #0F172A 0%, #3B82F6 100%)",
                    color: "#F8FAFC",
                    fontSize: 84,
                    fontWeight: 700,
                    fontFamily: "sans-serif",
                }}
            >
                GZ
            </div>
        ),
        { ...size }
    );
}
