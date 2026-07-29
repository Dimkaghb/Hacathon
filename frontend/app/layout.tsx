import type { Metadata } from "next";
import { Inter, Almarai, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { SubscriptionProvider } from "@/lib/contexts/SubscriptionContext";

const interDisplay = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter-display",
});

const almarai = Almarai({
  weight: ["300", "400", "700", "800"],
  subsets: ["arabic"],
  display: "swap",
  variable: "--font-almarai",
});

const instrumentSerif = Instrument_Serif({
  weight: "400",
  style: "italic",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument-serif",
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
        className={`${interDisplay.variable} ${almarai.variable} ${instrumentSerif.variable} antialiased bg-[#0a0a0a] text-white`}
      >
        <AuthProvider>
          <SubscriptionProvider>
            {children}
          </SubscriptionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
