import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SalonProvider } from "@/context/salon-context";
import SiteChrome from "@/components/site-chrome";

export const metadata: Metadata = {
  title: "Missed Booking Recovery for Salons | WordbitX",
  description:
    "Salon ke har missed WhatsApp message aur missed call par foran jawab, booking, reminder aur waitlist backfill. A software product by WordbitX, Lahore, Pakistan.",
};

export const viewport: Viewport = {
  themeColor: "#1ca830",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("wordbitx-theme")||"light";var d=t==="system"?window.matchMedia("(prefers-color-scheme: dark)").matches:t==="dark";document.documentElement.classList.toggle("dark",d);document.documentElement.classList.toggle("light",!d);document.documentElement.dataset.theme=d?"dark":"light";}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen font-sans transition-colors bg-[#f8fafc] text-[#052767] dark:bg-[#030814] dark:text-slate-100">
        <SalonProvider>
          <div className="scroll-progress" aria-hidden="true" />
          <SiteChrome>{children}</SiteChrome>
        </SalonProvider>
      </body>
    </html>
  );
}
