import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/components/providers/query-provider";
import { DialogProvider } from "@/gradian-ui/shared/contexts/DialogContext";
import { SecurityProvider } from "@/components/security/SecurityProvider";
import { IdleTimeoutProvider } from "@/gradian-ui/shared/providers/IdleTimeoutProvider";
import { AuthEventListener } from "@/gradian-ui/shared/components/AuthEventListener";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { LayoutDirLang } from "@/components/layout/LayoutDirLang";

export const metadata: Metadata = {
  title: "Gradian",
  description: "We help you trust you decision",
  icons: {
    icon: "/logo/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="/odometer-theme-minimal.css" />
        <link rel="stylesheet" href="/fonts/estedad/estedad.css" />
        <link rel="stylesheet" href="/fonts/katex/katex-fonts.css" />
        {/* Preload logo images for faster LCP */}
        <link
          rel="preload"
          href="/logo/Gradian-Logo-lightmode-min.png"
          as="image"
          type="image/png"
        />
        <link
          rel="preload"
          href="/logo/Gradian-Logo-darkmode-min.png"
          as="image"
          type="image/png"
        />
        <link
          rel="preload"
          href="/logo/Gradian-logo-white.png"
          as="image"
          type="image/png"
        />
      </head>
      <body
        className="font-sans antialiased"
        suppressHydrationWarning={true}
      >
        <QueryProvider>
          <SecurityProvider>
            <LayoutDirLang />
            <DialogProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="dark"
                enableSystem
                disableTransitionOnChange
              >
                <IdleTimeoutProvider idleTimeoutMs={15 * 60 * 1000}>
                  <AuthEventListener />
                  <Toaster />
                  <AuthGuard>
                    {children}
                  </AuthGuard>
                </IdleTimeoutProvider>
              </ThemeProvider>
            </DialogProvider>
          </SecurityProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
