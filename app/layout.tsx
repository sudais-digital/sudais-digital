import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

import { LanguageProvider } from "./components/LanguageProvider";
import { CurrencyProvider } from "./components/CurrencyProvider";
import { ThemeProvider } from "./components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sudais Digital",
  description: "Professional social media marketing services",
};

const themeScript = `
(function () {
  try {
    var savedTheme = localStorage.getItem("sudais-digital-theme") || "system";
    var resolvedTheme = savedTheme;

    if (savedTheme === "system") {
      resolvedTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }

    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(resolvedTheme);
    document.documentElement.style.colorScheme = resolvedTheme;
  } catch (error) {
    document.documentElement.classList.add("light");
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>

      <body className="min-h-full bg-background text-foreground transition-colors duration-300">
        <ThemeProvider>
          <LanguageProvider>
            <CurrencyProvider>
              <Toaster
                position="top-right"
                reverseOrder={false}
                toastOptions={{
                  duration: 3500,
                  className: "dark-toast",
                  style: {
                    borderRadius: "12px",
                    fontSize: "14px",
                    padding: "14px 16px",
                  },
                  success: {
                    iconTheme: {
                      primary: "#22c55e",
                      secondary: "#ffffff",
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: "#ef4444",
                      secondary: "#ffffff",
                    },
                  },
                }}
              />

              {children}
            </CurrencyProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}