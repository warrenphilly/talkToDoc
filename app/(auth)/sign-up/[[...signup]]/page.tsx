import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function Page() {
  return (
    <div className=" w-full h-screen overflow-y-auto bg-white">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="w-fit h-fit overflow-visible pt-6 items-center justify-center py-44">
          <SignUp
            redirectUrl="/auth-redirect"
            signInUrl="/sign-in"
            appearance={{
              elements: {
                rootBox: "w-full overflow-visible",
                card: "w-full shadow-none overflow-visible",
                formButtonPrimary:
                  "bg-[#94b347] hover:bg-[#94b347] text-white border-none",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
