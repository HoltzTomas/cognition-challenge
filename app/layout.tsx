import type { Metadata } from "next";
import "react-tweet/theme.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Belo Past Work Presentation",
  description:
    "Minimal slide deck for a past work presentation about building Belo's mobile app.",
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
