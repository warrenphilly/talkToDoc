import { SignUp } from "@clerk/nextjs";
import { Cpu } from "lucide-react";
import Link from "next/link";

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f9fa] to-[#e9ecef] flex flex-col items-center justify-center p-4">
      <div className="absolute top-0 left-0 w-full h-64 bg-[#94b347]/10 rounded-b-full blur-3xl -z-10 transform-gpu"></div>
      
      <Link href="/" className="flex items-center gap-2 mb-8 transition-transform hover:scale-105">
        <Cpu className="h-8 w-8 text-[#94b347]" />
        <span className="font-semibold text-slate-800 text-xl">GammaNotes</span>
      </Link>
      
      <div className="w-full max-w-md">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 transition-all hover:shadow-xl">
          <h1 className="text-2xl font-bold text-center text-slate-800 mb-6">Create your account</h1>
          <SignUp
            appearance={{
              layout: {
                showOptionalFields: false,
                socialButtonsVariant: "iconButton"
              },
              elements: {
                formButtonPrimary: "bg-[#94b347] hover:bg-[#b0ba93] transition-all shadow-sm hover:shadow-md",
                card: "shadow-none",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton: "border border-gray-200 hover:bg-gray-50 transition-colors",
                socialButtonsBlockButtonText: "text-gray-600 font-medium",
                formFieldInput: "border-gray-300 focus:ring-[#94b347] focus:border-[#94b347] rounded-lg",
                footerActionText: "text-gray-500",
                footerActionLink: "text-[#94b347] hover:text-[#b0ba93] font-medium",
                formFieldLabel: "font-medium text-slate-700",
                dividerLine: "bg-gray-200",
                dividerText: "text-gray-500 mx-3"
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
          <Link href="/sign-in" className="text-[#94b347] hover:text-[#b0ba93] font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
      
      <div className="mt-10 text-center max-w-sm">
        <p className="text-xs text-slate-500">
          By signing up, you agree to our 
          <Link href="/terms" className="text-[#94b347] hover:text-[#b0ba93] mx-1">Terms of Service</Link>
          and
          <Link href="/privacy" className="text-[#94b347] hover:text-[#b0ba93] mx-1">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
