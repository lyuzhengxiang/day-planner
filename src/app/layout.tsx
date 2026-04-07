import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import Nav from "@/components/Nav";
import "./globals.css";

const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

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
        className={`${mono.variable} font-mono bg-[#0a0a0a] text-gray-200 min-h-screen`}
      >
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <Nav />
          {children}
        </main>
      </body>
    </html>
  );
}
