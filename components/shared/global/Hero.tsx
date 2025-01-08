import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Cpu, Globe, Zap, Code, Check, ChevronRight } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import { SignInButton } from "@clerk/nextjs";

export default function Hero() {
  return (
    <div>
      <header className="px-4 lg:px-6 h-14 flex items-center">
        <Link className="flex items-center justify-center" href="#">
          <Cpu className="h-6 w-6" />
          <span className="sr-only">Studiyo</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link
            className="text-sm font-medium hover:underline underline-offset-4"
            href="#features"
          >
            Features
          </Link>
          <Link
            className="text-sm font-medium hover:underline underline-offset-4"
            href="#pricing"
          >
            Pricing
          </Link>
          <Link
            className="text-sm font-medium hover:underline underline-offset-4"
            href="#contact"
          >
            Contact
          </Link>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 flex flex-col items-center justify-center">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Welcome to  Studiyo 
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Empower your business with our cutting-edge software solution.
                  Streamline workflows, boost productivity, and drive growth.
                </p>
              </div>
              <div className="space-x-4 flex flex-row items-center justify-center ">
                <SignInButton>
                    <div className="rounded-lg  bg-[#94b347] text-white p-2">
                        Get Started for Free
                    </div>
                </SignInButton>
                <Button variant="outline" className="bg-slate-100 border border-[bg-slate-400] p-2">Learn More</Button>
              </div>
            </div>
          </div>
        </section>
        <section
          id="features"
          className="w-full py-12 md:py-24 lg:py-32 bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center"
        >
          <div className="container px-4 md:px-6">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-center mb-12">
              Key Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card>
                <CardHeader>
                  <Globe className="h-8 w-8 mb-2" />
                  <CardTitle>Generate Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    Connect with customers and partners worldwide with our
                    robust platform.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Zap className="h-8 w-8 mb-2" />
                  <CardTitle>Lightning Fast</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    Experience unparalleled speed and performance in all your
                    operations.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Code className="h-8 w-8 mb-2" />
                  <CardTitle>Test your knowledge</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    Tailor our platform to your specific needs with easy-to-use
                    customization tools.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
        <section id="pricing" className="w-full py-12 md:py-24 lg:py-32 flex flex-col items-center justify-center">
          <div className="container px-4 md:px-6">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-center mb-12 text-[#94b347]">
              Pricing Plans
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="bg-slate-100 text-slate-600">
                <CardHeader>
                  <CardTitle>Basic</CardTitle>
                  <CardDescription>
                    For small teams and startups
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-[#94b347]">$5/mo</p>
                  <ul className="mt-4 space-y-2">
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4" /> 20 Notes generation/Month, Then Pay as you go
                    </li>
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4" /> 10 Quizes/ Month, then Pay as you go
                    </li>
                 
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full bg-[#94b347] text-white">Choose Plan</Button>
                </CardFooter>
              </Card>
              <Card className="bg-slate-100 text-slate-600">
                <CardHeader>
                  <CardTitle>Pro</CardTitle>
                  <CardDescription>For growing businesses</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-[#94b347]">$15/mo</p>
                  <ul className="mt-4 space-y-2">
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4" /> Unlimited Notes generation
                    </li>
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4" /> Unlimited Quiz generation
                    </li>
                    
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full bg-[#94b347] text-white">Choose Plan</Button>
                </CardFooter>
              </Card>
              <Card className="bg-slate-100 text-slate-600">
                <CardHeader>
                  <CardTitle>Enterprise</CardTitle>
                  <CardDescription>For large organizations</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-[#94b347]">Buy Tokens</p>
                  <ul className="mt-4 space-y-2">
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4" /> Pre-purchase tokens for note generation
                    </li>
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4" /> After, you can buy more or set up pay as you go 
                    </li>
                    
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full bg-[#94b347] text-white">Contact Sales</Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>
        <section
          id="cta"
          className="w-full py-12 md:py-24 lg:py-32 bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center"
        >
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  Ready to Get Started?
                </h2>
                <p className="mx-auto max-w-[600px] text-gray-500 md:text-xl dark:text-gray-400">
                  Join thousands of satisfied customers and take your business
                  to the next level.
                </p>
              </div>
              <Button className="inline-flex h-9 items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-gray-50 shadow transition-colors hover:bg-gray-900/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-50/90 dark:focus-visible:ring-gray-300">
                Sign Up Now
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          © 2023 Acme Inc. All rights reserved.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
