import { CustomSidebar } from "@/components/shared/global/custom-sidebar";
import { SidebarHeader } from "@/components/shared/global/sidebar-header";
import { SidebarNav } from "@/components/shared/global/SidebarNav";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";
import Image from "next/image";
import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import "katex/dist/katex.min.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gammanotes",
  description: "the worlds most powerful notes app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
    >
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased h-screen flex flex-col overflow-hidden`}
          suppressHydrationWarning={true}
        >
          <SignedIn>
            <div className="flex h-screen overflow-hidden bg-white max-h-[90vh] md:max-h-screen  ">
              <CustomSidebar />
              <main className="flex-1 flex-col ml-0 md:ml-64  transition-all duration-300 overflow-hidden bg-white ">
                <div className="w-full rounded-lg bg-white  items-center  py-2 justify-center flex text-center text-[#94b347] text-2xl ">
                  <Link href="/" className="flex items-center gap-2 text-[#94b347] pt-4 bg-white">
                    <Image
                      src="/zeLogo.svg"
                      alt="logo"
                      width={32}
                      height={32}
                    /> 
                    <span className="font-semibold text-xl">
                      Gammanotes
                    </span>
                  </Link>
                </div>
                {children}
              </main>
            </div>
          </SignedIn>
          <SignedOut>
            <main className="flex-1 h-screen overflow-none">{children}</main>
          </SignedOut>
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
