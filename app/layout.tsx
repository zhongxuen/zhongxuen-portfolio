import { Analytics } from "@vercel/analytics/next";
import { buildMetadata } from "@/lib/metadata";
import { buildWebsiteStructuredData, buildPersonStructuredData } from "@/lib/structuredData";
import { HOME_META_DESCRIPTION } from "@/lib/constants";
import { Poppins, Inter, JetBrains_Mono } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

const poppins = Poppins({
    variable: "--font-poppins",
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
});

const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
    variable: "--font-jetbrains-mono",
    subsets: ["latin"],
    weight: ["400", "500", "700"],
});

export const metadata = buildMetadata({
    isHome: true,
    description: HOME_META_DESCRIPTION,
});

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            className={`${poppins.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
        >
            <body className="min-h-full flex flex-col bg-background text-foreground">
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify(buildWebsiteStructuredData()),
                    }}
                />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify(buildPersonStructuredData()),
                    }}
                />
                <Navbar />
                <main className="flex-1 pt-16">{children}</main>
                <Footer />
                <Analytics />
            </body>
        </html>
    );
}