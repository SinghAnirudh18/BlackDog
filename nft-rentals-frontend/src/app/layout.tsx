import type { Metadata } from "next";
import localFont from "next/font/local";
import { Space_Grotesk } from "next/font/google";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "NeonRent - Futuristic NFT Rentals",
    template: "%s | NeonRent",
  },
  description: "Silver-black futuristic NFT rental marketplace with immersive animations.",
  metadataBase: new URL("https://example.com"),
  themeColor: "#0A0A0A",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-black-primary">
      <body
        className={`${spaceGrotesk.variable} ${jetBrainsMono.variable} antialiased min-h-screen`}
      >
        <div className="relative min-h-screen flex flex-col">
          <div className="pointer-events-none fixed inset-0 -z-10">
            <div className="absolute -top-32 -left-32 h-[40rem] w-[40rem] rounded-full blur-3xl opacity-40" style={{
              background: "radial-gradient(circle at 30% 30%, rgba(0,212,255,0.18), transparent 60%)",
            }} />
            <div className="absolute top-1/2 -right-32 h-[36rem] w-[36rem] rounded-full blur-3xl opacity-30" style={{
              background: "radial-gradient(circle at 70% 50%, rgba(168,85,247,0.16), transparent 60%)",
            }} />
          </div>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
