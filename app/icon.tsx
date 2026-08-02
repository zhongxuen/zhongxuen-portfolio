import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#3B82F6",
                    color: "#F8FAFC",
                    fontSize: 18,
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
