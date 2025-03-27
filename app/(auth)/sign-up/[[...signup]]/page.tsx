import { SignIn, SignUp } from "@clerk/nextjs";
import { Cpu } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function Page() {
  return (
    <div className=" flex flex-col items-center justify-center  w-full h-screen  bg-white overflow-y-auto  md:py-0 py-32 md:pb-0">






      <div className="w-full max-w-md bg-blue-500 h-[90%] py-12">
        <SignUp
            redirectUrl="/"
            signInUrl="/sign-in"
          />
      </div>

         

    

      {/* <div className="mt-10 text-center max-w-sm">
        <p className="text-xs text-slate-500 flex flex-col items-center justify-center">
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
      </div> */}
    </div>
  );
}
