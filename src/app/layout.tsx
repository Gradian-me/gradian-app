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
      </head>
      <body
        className="font-sans antialiased"
        suppressHydrationWarning={true}
      >
        <SecurityProvider>
          <QueryProvider>
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
          </QueryProvider>
        </SecurityProvider>
      </body>
    </html>
  );
}
