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

export const metadata: Metadata = {
  title: "Tamph LMS & Research Portal",
  description: "A comprehensive platform for learning and research.",
};

function isResearchHost(host: string | null) {
  if (!host) return false;
  return host.split(":")[0]?.toLowerCase().startsWith("research.") ?? false;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const defaultTheme = isResearchHost(host) ? "dark" : "light";

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50 transition-colors duration-200`}>
        <ThemeProvider
          attribute="class"
          defaultTheme={defaultTheme}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
