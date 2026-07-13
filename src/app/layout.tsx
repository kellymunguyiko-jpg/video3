import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import PWAInstall from "@/components/PWAInstall";

export const metadata: Metadata = {
  title: "VidGrab - YouTube Video Downloader",
  description:
    "Download YouTube videos easily with our fast and free downloader. Installable on all devices.",
  manifest: "/manifest.json",
  applicationName: "VidGrab",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "VidGrab",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-green-50 text-gray-900 antialiased min-h-screen">
        {children}
        <PWAInstall />
      </body>
    </html>
  );
}
