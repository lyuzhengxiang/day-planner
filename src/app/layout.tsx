import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AC } from "@/lib/design-tokens";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Day Planner",
  description: "Proactive daily planning",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${mono.variable} min-h-screen`}
        style={{ background: AC.shellGrad, color: AC.text }}
      >
        {children}
      </body>
    </html>
  );
}
