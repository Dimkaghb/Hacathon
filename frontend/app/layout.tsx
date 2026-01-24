import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/contexts/AuthContext";

const interDisplay = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter-display",
});

export const metadata: Metadata = {
  title: "Axel",
  description: "We transform ideas into AI-powered videos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${interDisplay.variable} antialiased bg-[#0a0a0a] text-white`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
