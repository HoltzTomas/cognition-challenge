import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Superset Remediation Lane",
  description: "Controlled Devin remediation workflow for Superset maintainers",
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
