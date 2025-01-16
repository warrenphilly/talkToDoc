import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Cpu, Globe, Zap, Code, Check, ChevronRight,ArrowRight, Play, PenTool, Brain, Target, Pointer, CircleCheckBig} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { Separator } from "@/components/ui/separator";
export default function Hero() {
  return (
    <div>
      <header className="px-4 bg-[#e2e9ce] lg:px-6 h-14 flex items-center text-[#8b976e]">
        <Link className="flex items-center justify-center" href="#">
          <Cpu className="h-6 w-6" />
          <span className="sr-only">GammaNote</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link
            className="font-medium hover:underline underline-offset-4 text-sm cursor-pointer"
            href="#features"
          >
            Features
          </Link>
          <SignUpButton>
      <span className="font-medium hover:underline underline-offset-4 text-sm cursor-pointer">
              Sign Up
            </span>

          </SignUpButton>
         
          <SignInButton>
         
            <span className="font-medium hover:underline underline-offset-4 text-sm cursor-pointer">
            Login
            </span>
          </SignInButton>
        
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full bg-[#e2e9ce] py-12 md:py-24 lg:py-32 xl:py-48 flex flex-col items-center justify-center">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col  items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl text-[#94b347] h-full font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Welcome to GammaNote
                </h1>
                <h1 className="text-3xl text-[#8b976e] h-full font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  The world's most powerful notebook.
                </h1>
                <div className="flex flex-col items-center justify-center  ">
                <p className="mx-auto max-w-[700px] mt-3 text-gray-500 md:text-xl dark:text-gray-400 py-4">
                Transform your notes into an intelligent companion. Create learn, and test your understanding with AI-powered features that revolutionize how you capture and interact with knowledge. Crafted by you, Powered by AI.
                </p>
                </div>
              </div>
              <div className="space-x-4 flex flex-row items-center justify-center ">
                <SignInButton>
                    <div className="flex flex-row items-center justify-center  gap-2 font-bold rounded-lg cursor-pointer bg-[#94b347] px-12  text-white p-2 hover:bg-[#b0ba93]">
                        Try me out
                        <ArrowRight className="h-6 w-6" />
                  </div>
                  
                  
                </SignInButton>
                <div className="flex flex-row items-center justify-center gap-2 rounded-lg cursor-pointer font-bold bg-white px-12 text-slate-500 p-2 hover:bg-gray-100">
                        Watch Demo
                      
                    </div>
               
              </div>
            </div>
          </div>
        </section>
        <section
          id="features"
          className="w-full py-12 md:py-24 bg-white lg:py-32   flex flex-col items-center justify-center"
        >
          <div className="flex flex-col items-center justify-center mb-12 gap-4">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-center  text-slate-500 max-w-[700px]">
              Intelligent Features for Modern Note-Taking
            </h2>
            <p className="mx-auto max-w-[700px]  text-gray-500 md:text-xl dark:text-gray-400">
            Everything you need to capture, organize, and interact with your thoughts.
            </p>
          </div>
           
          <div className="container px-4 md:px-6">
          
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           
              <Card className="bg-[#94b347] text-white">
                <CardHeader>
                  <Zap className="h-8 w-8 mb-2" />
                  <CardTitle>AI-Powered Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    Let AI help you generate comprehensive notes from your content, which can be edited or expanded by you at any time.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-[#94b347] text-white">
                <CardHeader>
                  <PenTool className="h-8 w-8 mb-2" />
                  <CardTitle>AI-Powered OCR</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                  Convert your whiteboard and hand written notes into organized digital notes automatically.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-[#94b347] text-white">
                <CardHeader>
                  <CircleCheckBig  className="h-8 w-8 mb-2" />
                  <CardTitle className="text-white" >Test your knowledge</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    Tailor our platform to your specific needs with easy-to-use
                    customization tools.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-[#94b347] text-white">
                <CardHeader>
                  <Pointer className="h-8 w-8 mb-2" />
                  <CardTitle>Interactive Learning</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                  Have conversations with your notes and get AI-generated quizzes to test your knowledge.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-[#94b347] text-white">
                <CardHeader>
                  <Brain className="h-8 w-8 mb-2" />
                  <CardTitle>PDF Intelligence</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                  Extract, summarize, and interact with content from any PDF document effortlessly.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-[#94b347] text-white">
                <CardHeader>
                <Target  className="h-8 w-8 mb-2" />
                  <CardTitle>Progress Tracking</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                  Monitor your learning journey with detailed analytics and insights.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
        {/* <section id="pricing" className="w-full bg-slate-200 py-12 md:py-24 lg:py-32 flex flex-col items-center justify-center">
          <div className="container px-4 md:px-6">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-center mb-12 text-slate-500">
              Pricing Plans
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="bg-slate-100 text-slate-600">
                <CardHeader>
                  <CardTitle>Free (Beta Test)</CardTitle>
                  <CardDescription>
                    Check out the platform for free
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-[#94b347]">Free</p>
                  <ul className="mt-4 space-y-2">
                  <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4" /> Up to 3 notebooks
                    </li>
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4" /> 20 chat requests/day
                    </li>
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4" /> 5 AI Notes Generation requests/Month
                    </li>
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4" /> 2 Quizes/ Month
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
                  <CardDescription>Best for students</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-[#94b347]">$15/mo</p>
                  <ul className="mt-4 space-y-2">
                  <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4" /> Unlimited notebooks
                    </li>
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4" /> Unlimited chat requests 
                    </li>
                    
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4" /> 30 Notes generation/Month
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
                  <CardTitle>Tokens</CardTitle>
                  <CardDescription>For large organizations</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-[#94b347]">$2/ 1000 tokens</p>
                  <ul className="mt-4 space-y-2">
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4" /> Pre-purchase tokens for unlimited use of all features
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
        </section> */}
        <section
          id="cta"
          className="w-full bg-[#94b347] py-12 text-white md:py-24 lg:py-32 flex flex-col items-center justify-center"
        >
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  Make this YOUR semester 
                </h2>
                <p className="mx-auto max-w-[600px]  text-white text-md md:text-xl dark:text-gray-400">
                Use AI the right way to revolutionize your learning experience with our AI-powered notebook.
                </p>
              </div>
              <Button className="inline-flex bg-white  h-10 items-center justify-center rounded-lg px-4 py-2 mt-10 text-md font-medium text-slate-800 shadow transition-colors hover:bg-gray-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50 ">
                Sign Up Now
              </Button>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex bg-[#94b347] border-none text-white flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-white">
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
