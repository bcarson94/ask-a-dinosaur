import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ask a Dinosaur! - Talk to Rex the T-Rex",
  description:
    "An interactive kiosk where kids can ask Rex the T-Rex questions about dinosaurs and prehistoric life.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#1a2e1a] text-[#f5f0e8] antialiased">
        {children}
      </body>
    </html>
  );
}
