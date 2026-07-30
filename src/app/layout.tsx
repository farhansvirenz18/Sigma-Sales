import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/ui/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sigma Sales — Data Processing System",
  description:
    "Sistem otomatis untuk import, validasi, dan transformasi data sales menjadi file Finance & Marketing.",
  icons: { icon: "/images/icon_sigma.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: "12px",
              padding: "12px 16px",
              fontSize: "14px",
              boxShadow: "0 10px 40px -10px rgba(0,0,0,0.15)",
            },
          }}
        />
        <Navbar />
        <main className="flex-1 container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="page-transition">{children}</div>
        </main>
      </body>
    </html>
  );
}
