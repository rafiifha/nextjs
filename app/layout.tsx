import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Toko Imas - Toko Sembako Terpercaya",
  description: "Toko sembako terpercaya dengan harga terjangkau",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Navbar />
        <main className="min-h-screen">
          {children}
        </main>
        <Footer />
        <Toaster
          position="top-center"
          theme="light"
          offset={20}
          gap={10}
          closeButton
          toastOptions={{
            classNames: {
              toast:
                "group flex items-center gap-3 px-4.5 py-3 rounded-2xl bg-white/95 backdrop-blur-md border border-zinc-200/90 shadow-[0_12px_32px_-6px_rgba(0,0,0,0.12),0_4px_12px_-4px_rgba(0,0,0,0.06)] text-zinc-900 font-sans transition-all duration-200",
              title: "text-[13px] font-semibold text-zinc-900 tracking-tight",
              description: "text-[12px] text-zinc-500 font-normal mt-0.5",
              icon: "self-center shrink-0",
              actionButton:
                "bg-zinc-900 text-white hover:opacity-90 rounded-full text-xs font-medium px-3 py-1.5 transition-all",
              cancelButton:
                "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 rounded-full text-xs font-medium px-3 py-1.5 transition-all",
              closeButton:
                "!bg-white !border !border-zinc-200 !text-zinc-400 hover:!text-zinc-700 !shadow-xs !rounded-full !w-5 !h-5",
              success:
                "!bg-white/95 !border-emerald-500/30 !text-zinc-900 [&_[data-icon]]:text-emerald-600",
              error:
                "!bg-white/95 !border-rose-500/30 !text-zinc-900 [&_[data-icon]]:text-rose-600",
              warning:
                "!bg-white/95 !border-amber-500/30 !text-zinc-900 [&_[data-icon]]:text-amber-600",
              info:
                "!bg-white/95 !border-sky-500/30 !text-zinc-900 [&_[data-icon]]:text-sky-600",
            },
          }}
        />
      </body>
    </html>
  );
}
