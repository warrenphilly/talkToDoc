import { SidebarNav } from "@/components/shared/global/SidebarNav";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ClerkProvider, SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
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
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          suppressHydrationWarning={true}
        >
          <SignedIn>
            <SidebarProvider defaultOpen={true}>
              <div className="flex h-screen w-full">
                <div className="flex flex-row absolute top-4 left-4 z-50 items-center justify-center gap-2">
                  <SidebarTrigger className="" />
                  <p>Gammanotes</p>
                </div>

                <SidebarNav />
                <main className="flex-1 relative">
                  {children}
                </main>
              </div>
            </SidebarProvider>
          </SignedIn>
          <SignedOut>
            <main className="flex-1">
              {children}
            </main>
          </SignedOut>
        </body>
      </html>
    </ClerkProvider>
  );
}
