import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono, Silkscreen } from "next/font/google";
import "./globals.css";

const ibmSans = IBM_Plex_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-ibm-sans",
});

const ibmMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-ibm-mono",
});

const silkscreen = Silkscreen({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-silkscreen",
});

export const metadata: Metadata = {
  title: "HUL SCM OS",
  description: "Agentic AI Supply Chain OS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${ibmSans.variable} ${ibmMono.variable} ${silkscreen.variable} h-full antialiased`}>
      <body className="h-full overflow-hidden text-sys-black bg-sys-bg font-sans">
        {children}
      </body>
    </html>
  );
}
