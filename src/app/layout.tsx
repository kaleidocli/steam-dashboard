import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Steam Dashboard",
  description: "A small Next.js app that loads Steam profile data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
