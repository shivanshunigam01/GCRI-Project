import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ApiLoadingProvider } from "@/context/ApiLoadingContext";
import { ApiLoadingBar } from "@/components/shared/ApiLoadingBar";

export const metadata: Metadata = {
  title: "GCRAI - Enterprise AI Governance & Assessment Platform",
  description: "Global Responsible AI Certification & Institutional Assessment Platform across 7 GRAICE Pillars",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white">
        <ApiLoadingProvider>
          <AuthProvider>
            <ApiLoadingBar />
            {children}
          </AuthProvider>
        </ApiLoadingProvider>
      </body>
    </html>
  );
}
