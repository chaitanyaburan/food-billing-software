import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Restaurant Billing SaaS",
  description: "Multi-restaurant GST billing, POS, KDS, reports"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
