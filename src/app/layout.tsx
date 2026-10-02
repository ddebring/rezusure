import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import "./globals.css";

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),

  title: {
    default: "REZUSURE — Resume & Career Optimization",
    template: "%s · REZUSURE",
  },

  description:
    "AI-powered resume analysis and career optimization for stronger, clearer job-fit decisions.",

  applicationName: "REZUSURE",

  keywords: [
    "resume analyzer",
    "resume optimization",
    "career tools",
    "AI resume",
  ],

  alternates: {
    canonical: "/",
  },

  openGraph: {
    title: "REZUSURE — Resume & Career Optimization",
    description:
      "Analyze your resume, find the problems, and turn recommendations into a clearer job-search document.",
    url: "/",
    siteName: "REZUSURE",
    type: "website",
  },

  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}