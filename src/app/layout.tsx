import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NextAuthProvider } from "@/providers/session-provider";
import { Toaster } from "react-hot-toast";
import SystemThemeListener from "@/components/system-theme-listener";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SPIOT Feedback Portal",
  description: "Student feedback portal for Sharadchandra Pawar Institute of Technology",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Use a deterministic asset version so favicons and logo URLs are stable
  // across server and client renders. Bump NEXT_PUBLIC_ASSET_VERSION to
  // force clients to fetch a new icon when you intentionally change the asset.
  const assetVersion = process.env.NEXT_PUBLIC_ASSET_VERSION ?? "1";
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href={`/logo.png?v=${assetVersion}`} />
        <link rel="icon" type="image/png" sizes="32x32" href={`/favicon-32.png?v=${assetVersion}`} />
        <link rel="icon" type="image/png" sizes="16x16" href={`/favicon-16.png?v=${assetVersion}`} />
        <link rel="apple-touch-icon" href={`/logo.png?v=${assetVersion}`} />
        <link rel="shortcut icon" href={`/favicon.ico?v=${assetVersion}`} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NextAuthProvider>
          <SystemThemeListener />
          {children}
          <Toaster />
        </NextAuthProvider>
      </body>
    </html>
  );
}
