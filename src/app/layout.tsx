import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Weather & News Hub - Live Updates & City Customization",
  description: "Get real-time weather updates, trending news, and city-based customization. Live weather data every 30 minutes with personalized news feeds for your location.",
  keywords: ["weather", "news", "live updates", "forecast", "breaking news", "local news", "weather alerts"],
  authors: [{ name: "Weather & News Hub" }],
  openGraph: {
    title: "Weather & News Hub",
    description: "Real-time weather updates and trending news with city-based customization",
    type: "website",
    locale: "en_US",
    siteName: "Weather & News Hub",
  },
  twitter: {
    card: "summary_large_image",
    title: "Weather & News Hub",
    description: "Real-time weather updates and trending news with city-based customization",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
