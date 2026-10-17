import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HackathonOS — Run Hackathons End to End",
  description:
    "HackathonOS is a free, open platform to run hackathons end to end: registrations, team management, project submissions, AI-assisted judging, live leaderboards, and verifiable certificates.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
