import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "CLASH Rule Matcher",
  description:
    "Professional CLASH rule engine testing tool for network proxy configuration",
  generator: "Unic",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style>
          {`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}
        </style>
        {/* 环境变量注入脚本 - 静态部署兼容 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__ENV__ = {
                NEXT_PUBLIC_STATIC_DEPLOYMENT: '${process.env.NEXT_PUBLIC_STATIC_DEPLOYMENT || 'false'}',
                NEXT_PUBLIC_DEPLOYMENT_PLATFORM: '${process.env.NEXT_PUBLIC_DEPLOYMENT_PLATFORM || 'unknown'}',
                NEXT_PUBLIC_BASE_URL: '${process.env.NEXT_PUBLIC_BASE_URL || ''}',
                NEXT_PUBLIC_AI_PROVIDER: '${process.env.NEXT_PUBLIC_AI_PROVIDER || ''}',
                NEXT_PUBLIC_AI_MODEL: '${process.env.NEXT_PUBLIC_AI_MODEL || ''}',
                NEXT_PUBLIC_AI_ENDPOINT: '${process.env.NEXT_PUBLIC_AI_ENDPOINT || ''}'
              };
            `,
          }}
        />
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
          storageKey="clash-rule-tester-theme"
        >
          {children}
        </ThemeProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
