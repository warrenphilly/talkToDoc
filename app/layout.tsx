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
import { SidebarHeader } from "@/components/shared/global/sidebar-header";

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
            {/* <div className="flex flex-row md:ml-6 bg-red-500 w-full absolute top-0 pt-6 left-4 z-50 items-center justify-start md:justify-center gap-2">
              {/* <SidebarTrigger className="" /> */}
            {/* <div className=" flex w-full justify-center items-center ">
                <p className="  md:ml-8">Gammanotes</p>
              </div>
            </div>  */}
            {/* <SidebarTrigger className="" /> */}
            <SidebarProvider defaultOpen={true}>
              <SidebarHeader />

              <div className="flex h-full max-h-[90vh] w-full ">
                <div className="h-full max-h-[90vh] bg-red-500">
                  <SidebarNav />
                </div>
                <main className="flex-1">{children}</main>
              </div>
            </SidebarProvider>
          </SignedIn>
          <SignedOut>
            <main className="flex-1">{children}</main>
          </SignedOut>
        </body>
      </html>
    </ClerkProvider>
  );
}
