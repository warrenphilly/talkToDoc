import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function Page() {
  return (
    <div className=" w-full h-screen overflow-y-auto bg-white">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="w-fit h-fit overflow-visible pt-6 items-center justify-center pb-44">
          <SignUp
            redirectUrl="/"
            signInUrl="/sign-in"
            appearance={{
              elements: {
                rootBox: "w-full overflow-visible",
                card: "w-full shadow-none overflow-visible",
                formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white",
              },
            }}
          />
        </div>

      </div>
    </div>
  );
}
