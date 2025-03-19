
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
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          suppressHydrationWarning={true}
        >
          <SignedIn>
            <div className="flex max-h-[90vh] overflow-hidden">
              <CustomSidebar />
              <main className="flex-1 ml-0 md:ml-64 p-4 transition-all duration-300 max-h-[90vh] bg-green-500 overflow-hidden  mx-auto">
                <div className="max-h-[90vh] bg-blue-500 w-full overflow-hidden rounded-lg">
                  gammanotes
                </div>
                {children}
              </main>
            </div>
          </SignedIn>
          <SignedOut>
            <main className="flex-1">{children}</main>
          </SignedOut>
        </body>
      </html>
    </ClerkProvider>
  );
}
