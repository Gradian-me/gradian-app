import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/components/providers/query-provider";
import { DialogProvider } from "@/gradian-ui/shared/contexts/DialogContext";

export const metadata: Metadata = {
  title: "Gradian App",
  description: "We help you trust you decision",
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
        <QueryProvider>
          <DialogProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem
              disableTransitionOnChange
            >
              <Toaster />
              {children}
            </ThemeProvider>
          </DialogProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
