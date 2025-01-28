import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, ChevronRight, Code, Cpu, Globe, Zap } from 'lucide-react'
import Link from "next/link"
import { SignedOut, SignedIn, SignInButton } from "@clerk/nextjs"
import HomeClient from "@/components/shared/home/HomeClient"
import Hero from "@/components/shared/global/Hero"
export default function LandingPage() {
  return (
    <div className="flex flex-col h-full w-full ">
      <SignedOut>
      <Hero />
      </SignedOut>
      <SignedIn>
      <HomeClient />
      </SignedIn>

    </div>
  )
}

