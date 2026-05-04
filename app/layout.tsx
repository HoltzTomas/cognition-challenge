import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Devin Remediation Queue",
  description: "GitHub issue to Devin remediation automation dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
