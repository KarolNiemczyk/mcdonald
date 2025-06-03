import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import StripeProvider from "./StripeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "McDonald's Kiosk",
  description: "Self-service kiosk for McDonald's orders",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body className={inter.className}>
        <StripeProvider>{children}</StripeProvider>
      </body>
    </html>
  );
}