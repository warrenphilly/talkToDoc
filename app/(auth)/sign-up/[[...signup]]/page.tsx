import { SignUp } from "@clerk/nextjs";
import { Cpu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import OnboardingLanguageSelector from "@/components/onboarding/language-selector";

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f9fa] to-[#e9ecef] flex flex-col items-center justify-center p-4">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <Cpu className="h-8 w-8 text-[#94b347]" />
        <span className="font-semibold text-slate-800 text-xl">GammaNotes</span>
      </Link>
      
      <div className="w-full max-w-md">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
          <h1 className="text-2xl font-bold text-center text-slate-800 mb-6">Create your account</h1>
          <SignUp
            appearance={{
              elements: {
                formButtonPrimary: "bg-[#94b347] hover:bg-[#b0ba93]",
                card: "shadow-none",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton: "border border-gray-200 hover:bg-gray-50",
                socialButtonsBlockButtonText: "text-gray-600 font-medium",
                formFieldInput: "border-gray-300 focus:ring-[#94b347] focus:border-[#94b347]",
                footerActionLink: "text-[#94b347] hover:text-[#b0ba93]"
              }
            }}
            path="/sign-up"
            afterSignUpUrl="/onboarding"
            redirectUrl="/onboarding"
            fallbackRedirectUrl="/"
            signInFallbackRedirectUrl="/sign-in"
          />
        </div>
        
        <p className="text-center mt-6 text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-[#94b347] hover:text-[#b0ba93] font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
