import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ApiLoadingProvider } from "@/context/ApiLoadingContext";
import { ApiLoadingBar } from "@/components/shared/ApiLoadingBar";
import { fontDisplay, fontSans } from "@/lib/fonts";

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
    <html lang="en" className={`${fontSans.variable} ${fontDisplay.variable}`}>
      <body
        className={`${fontSans.className} antialiased min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white`}
      >
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
