import { SignIn } from "@clerk/nextjs";
import { Cpu } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function Page() {
  return (
    <div className=" flex flex-col items-center justify-center  h-screen p-6  pt-12 pb-24 overflow-y-auto">
  

      <div className="w-full max-w-md flex flex-col items-center justify-center ">
        <div className="">
          <Link
            href="/"
            className=" items-center gap-2 mb-8 transition-transform hover:scale-105 text-center flex justify-center"
          >
             <Image src="/zeLogo.svg" alt="logo" width={32} height={32} />
            <span className="font-semibold text-[#94b347] text-xl">
              Gammanotes
            </span>
          </Link>
          <SignIn
        
              redirectUrl="/onboarding/language-selection"
            signUpUrl="/sign-up"
            
          />
        </div>

      </div>

      <div className="mt-10 text-center max-w-sm">
        <p className="text-xs text-slate-500">
          By signing in, you agree to our
          <Link
            href="/terms"
            className="text-[#94b347] hover:text-[#b0ba93] mx-1"
          >
            Terms of Service
          </Link>
          and
          <Link
            href="/privacy"
            className="text-[#94b347] hover:text-[#b0ba93] mx-1"
          >
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
