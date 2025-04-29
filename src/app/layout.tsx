import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastProvider } from "@/components/common/Toast";
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
  title: "Building Rock-Solid Encrypted Applications",
  description: "A demonstration of encryption concepts from plaintext to perfect forward secrecy",
  openGraph: {
    title: "Building Rock-Solid Encrypted Applications",
    description: "A technical talk on implementing secure encryption in modern applications",
    images: [
      {
        url: "/preview.png",
        width: 1200,
        height: 630,
        alt: "Building Rock-Solid Encrypted Applications"
      }
    ],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Building Rock-Solid Encrypted Applications",
    description: "A technical talk on implementing secure encryption in modern applications",
    images: ["/preview.png"],
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Rubik+Glitch&family=Rubik:wght@400;500;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
