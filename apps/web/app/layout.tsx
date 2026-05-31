import type { Metadata } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";
import "./globals.css";
import { ThemeProvider } from "../components/ThemeProvider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

const RESEARCH_FAVICON = "/research-favicon.png?v=20260531a1";

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host") || "";
  const isResearchHost =
    host === "research.tamph.com" ||
    host.startsWith("research.") ||
    host.startsWith("research.localhost");
  const icon = isResearchHost ? RESEARCH_FAVICON : "/icon.svg";
  const title = isResearchHost
    ? "Tam's Research Hub"
    : "Tamph LMS & Research Portal";

  return {
    title,
    description: "A comprehensive platform for learning and research.",
    icons: {
      icon,
      shortcut: icon,
      apple: icon,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50 transition-colors duration-200`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
