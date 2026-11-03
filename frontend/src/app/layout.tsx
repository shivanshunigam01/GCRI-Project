import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { ApiLoadingProvider } from "@/context/ApiLoadingContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ApiLoadingBar } from "@/components/shared/ApiLoadingBar";
import { fontDisplay, fontSans } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "GCRAI - Enterprise AI Governance & Assessment Platform",
  description: "Global Responsible AI Certification & Institutional Assessment Platform across 7 GRAICE Pillars",
};

const themeInitScript = `(function(){try{var t=localStorage.getItem('graice-theme');if(t==='dark'){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}else{document.documentElement.classList.remove('dark');document.documentElement.style.colorScheme='light';}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fontSans.variable} ${fontDisplay.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${fontSans.className} antialiased min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 selection:bg-blue-600 selection:text-white`}
      >
        <ApiLoadingProvider>
          <ThemeProvider>
            <AuthProvider>
              <ToastProvider>
                <ApiLoadingBar />
                {children}
              </ToastProvider>
            </AuthProvider>
          </ThemeProvider>
        </ApiLoadingProvider>
      </body>
    </html>
  );
}
