import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bioforge — QR and Barcode Generator",
  description:
    "Create polished QR codes and printable barcodes from URLs, text, and SKUs. No signup needed.",
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
