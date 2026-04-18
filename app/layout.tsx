import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Multiply — Swarm Outreach Engine",
  description:
    "25 personalized AI sales agents in parallel. Built for HappyRobot × TUM.ai.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
