"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import {
  ArrowRight,
  Brain,
  CheckCircle,
  Cpu,
  FileText,
  Menu,
  PenTool,
  Play,
  Target,
  X,
  ZapIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function Hero() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#f8f9fa] to-[#e9ecef] overflow-y-auto">
      <header className="px-6 lg:px-10 h-16 flex items-center border-b border-gray-100 backdrop-blur-sm bg-white/70 fixed w-full z-50">
        <Link className="flex items-center gap-2" href="#">
          <Image src="/zeLogo.svg" alt="logo" width={32} height={32} />
          <span className="font-semibold text-[#94b347]">Gammanotes</span>
        </Link>

        {/* Mobile Menu Button */}
        <button
          className="ml-auto md:hidden"
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? (
            <X className="h-6 w-6 text-slate-600" />
          ) : (
            <Menu className="h-6 w-6 text-slate-600" />
          )}
        </button>

        {/* Desktop Navigation */}
        <nav className="ml-auto hidden md:flex gap-6">
          <Link
            className="font-medium text-slate-600 hover:text-[#94b347] transition-colors"
            href="#features"
          >
            Features
          </Link>
          <SignUpButton>
            <span className="font-medium text-slate-600 hover:text-[#94b347] transition-colors cursor-pointer">
              Sign Up
            </span>
          </SignUpButton>

          <SignInButton>
            <span className="font-medium text-slate-600 hover:text-[#94b347] transition-colors cursor-pointer">
              Login
            </span>
          </SignInButton>
        </nav>
      </header>

      {/* Mobile Navigation Menu */}
      {isMenuOpen && (
        <div className="fixed top-16 left-0 right-0 bg-white z-40 shadow-md md:hidden">
          <nav className="flex flex-col py-4 px-6">
            <Link
              className="font-medium text-slate-600 hover:text-[#94b347] transition-colors py-3 border-b border-gray-100"
              href="#features"
              onClick={toggleMenu}
            >
              Features
            </Link>
            <div className="py-3 border-b border-gray-100">
              <SignUpButton>
                <span className="font-medium text-slate-600 hover:text-[#94b347] transition-colors cursor-pointer">
                  Sign Up
                </span>
              </SignUpButton>
            </div>
            <div className="py-3">
              <SignInButton>
                <span className="font-medium text-slate-600 hover:text-[#94b347] transition-colors cursor-pointer">
                  Login
                </span>
              </SignInButton>
            </div>
          </nav>
        </div>
      )}

      <main className="flex-1 pt-16">
        <section className="w-full py-20 md:py-28 lg:py-32 xl:py-40 flex flex-col items-center justify-center">
          <div className="container px-4 md:px-6 max-w-6xl ">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6 flex flex-col items-center justify-center  md:items-start">
                <div className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-[#94b347] text-white">
                  <span className="flex h-2 w-2 rounded-full bg-white mr-2"></span>
                  Introducing Gammanotes
                </div>
                <div className="space-y-3 flex flex-col items-center justify-center md:items-start text-center md:text-left">
                  <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                    Transform your <span className="text-[#94b347]">notes</span>{" "}
                    into an intelligent{" "}
                    <span className="text-[#94b347]">companion</span>
                  </h1>
                  <p className="text-xl text-slate-600 max-w-xl">
                    Create, learn, and test your understanding with AI-powered
                    features that revolutionize knowledge capture and
                    interaction.
                  </p>
                </div>
                <div className="flex flex-col items-center justify-center sm:items-start gap-6  ">
                  <div className="relative lg:hidden  w-full flex justify-center">
                    <div className="absolute -top-8 -left-8 w-64 h-64 bg-[#94b347] rounded-full opacity-70 blur-3xl"></div>
                    <div className="absolute -bottom-8 -right-8 w-64 h-64 bg-blue-100 rounded-full opacity-70 blur-3xl"></div>
                    <div className="rounded-xl overflow-hidden shadow-2xl border border-gray-200 bg-white p-2 relative z-10 max-w-[60%]">
                      <video
                        className="aspect-video rounded-lg w-full object-cover"
                        autoPlay
                        muted
                        loop
                        playsInline
                      >
                        <source src="/gammaDemotrue.mp4" type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  </div>
                  <SignInButton>
                    <Button className="bg-[#94b347] hover:bg-[#b0ba93] w-full max-w-64 shadow-md text-white h-12 px-6 rounded-lg font-medium gap-2 text-base">
                      Try it free
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </SignInButton>
                </div>
              </div>
              <div className="relative hidden lg:block">
                <div className="absolute -top-8 -left-8 w-64 h-64 bg-[#94b347] rounded-full opacity-70 blur-3xl"></div>
                <div className="absolute -bottom-8 -right-8 w-64 h-64 bg-blue-100 rounded-full opacity-70 blur-3xl"></div>
                <div className="rounded-xl overflow-hidden shadow-2xl border border-gray-200 bg-white p-2 relative z-10">
                  <video
                    className="aspect-video rounded-lg w-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                  >
                    <source src="/gammaDemotrue.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="w-full py-20 bg-white">
          <div className="container px-4 md:px-6 max-w-6xl mx-auto">
            <div className="flex flex-col items-center text-center mb-16 space-y-4">
              <div className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-slate-100 text-slate-800 mb-2">
                Features
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-slate-900 max-w-3xl">
                Intelligent Features for Modern Note-Taking
              </h2>
              <p className="text-xl text-slate-600 max-w-2xl">
                Everything you need to capture, organize, and interact with your
                knowledge.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="h-12 w-12 rounded-lg bg-[#94b347] flex items-center justify-center mb-4">
                    <Brain className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-slate-900">
                    AI-Powered Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">
                    Generate comprehensive notes from your content, with AI
                    assistance that adapts to your learning style.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="h-12 w-12 rounded-lg bg-[#94b347] flex items-center justify-center mb-4">
                    <PenTool className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-slate-900">
                    AI-Powered OCR
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">
                    Convert your whiteboard and handwritten notes into organized
                    digital documents automatically.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="h-12 w-12 rounded-lg bg-[#94b347] flex items-center justify-center mb-4">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-slate-900">
                    Test Your Knowledge
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">
                    Generate quizzes and flashcards based on your notes to
                    reinforce learning and identify knowledge gaps.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="h-12 w-12 rounded-lg bg-[#94b347] flex items-center justify-center mb-4">
                    <ArrowRight className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-slate-900">
                    Interactive Learning
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">
                    Have conversations with your notes and get AI-generated
                    insights to deepen your understanding.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="h-12 w-12 rounded-lg bg-[#94b347] flex items-center justify-center mb-4">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-slate-900">
                    PDF Intelligence
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">
                    Extract, summarize, and interact with content from any PDF
                    document with powerful AI analysis.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="h-12 w-12 rounded-lg bg-[#94b347] flex items-center justify-center mb-4">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-slate-900">
                    Progress Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">
                    Monitor your learning journey with detailed analytics and
                    insights that help optimize your study time.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section
          id="cta"
          className="w-full py-20 flex flex-col items-center justify-center bg-gradient-to-b from-[#f8f9fa] to-[#e9ecef"
        >
          <div className="container px-4 md:px-6 max-w-4xl">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="space-y-3">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-[#94b347]">
                  Make this YOUR semester
                </h2>
                <p className="text-xl text-slate-600 max-w-2xl">
                  Use AI the right way to revolutionize your learning experience
                  with our intelligent notebook.
                </p>
              </div>
              <SignUpButton>
                <Button className="bg-white text-[#94b347] hover:bg-slate-100 h-12 px-8 rounded-lg font-medium text-base mt-4">
                  Get Started Free
                </Button>
              </SignUpButton>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#94b347] text-white py-12 px-4 md:px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Cpu className="h-6 w-6 text-[#94b347]" />
                <span className="font-semibold text-white text-xl">
                  GammaNotes
                </span>
              </div>
              <p className="text-sm text-white max-w-md">
                Transform your notes into an intelligent companion. Create,
                learn, and test your understanding with AI.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h3 className="font-medium text-white mb-4">Links</h3>
                <ul className="space-y-2">
                  <li>
                    <Link
                      className="text-sm hover:text-emerald-500 transition-colors"
                      href="#features"
                    >
                      Features
                    </Link>
                  </li>
                  <li>
                    <Link
                      className="text-sm hover:text-emerald-500 transition-colors"
                      href="#"
                    >
                      Pricing
                    </Link>
                  </li>
                  <li>
                    <Link
                      className="text-sm hover:text-emerald-500 transition-colors"
                      href="#"
                    >
                      About
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-white mb-4">Legal</h3>
                <ul className="space-y-2">
                  <li>
                    <Link
                      className="text-sm hover:text-emerald-500 transition-colors"
                      href="#"
                    >
                      Terms
                    </Link>
                  </li>
                  <li>
                    <Link
                      className="text-sm hover:text-emerald-500 transition-colors"
                      href="#"
                    >
                      Privacy
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-12 pt-6 flex flex-col md:flex-row justify-between items-center">
            <p className="text-xs text-white">
              © 2023 GammaNote. All rights reserved.
            </p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <Link href="#" className="text-white hover:text-white">
                <span className="sr-only">Twitter</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                </svg>
              </Link>
              <Link href="#" className="text-white hover:text-white">
                <span className="sr-only">GitHub</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path>
                  <path d="M9 18c-4.51 2-5-2-7-2"></path>
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
