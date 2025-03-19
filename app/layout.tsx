import { SidebarHeader } from "@/components/shared/global/sidebar-header";
import { CustomSidebar } from "@/components/shared/global/custom-sidebar";
import { SidebarNav } from "@/components/shared/global/SidebarNav";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
          className={`${geistSans.variable} ${geistMono.variable} antialiased h-screen flex flex-col`}
          suppressHydrationWarning={true}
        >
          <SignedIn>
            <div className="flex h-screen overflow-hidden">
              {/* <CustomSidebar /> */}
              <main className="flex-1 ml-0 md:ml-64  transition-all duration-300 overflow-none">
                <div className="w-full rounded-lg">
                  gammanotes
                </div>
                {children}
              </main>
            </div>
          </SignedIn>
          <SignedOut>
            <main className="flex-1 h-screen overflow-none">{children}</main>
          </SignedOut>
        </body>
      </html>
    </ClerkProvider>
  );
}
