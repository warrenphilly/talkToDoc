"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Add any necessary auth checks or data loading here
    const redirectTimeout = setTimeout(() => {
      router.push("/");
    }, 1500); // Shows loading state for 1.5 seconds

    return () => clearTimeout(redirectTimeout);
  }, [router]);

  return (
    <div className="w-full h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-[#94b347] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600 text-lg">Setting up your account...</p>
      </div>
    </div>
  );
}
