"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthRedirect() {
  const router = useRouter();
  const { isLoaded, userId } = useAuth();

  useEffect(() => {
    console.log("isLoaded", isLoaded);
    console.log("userId", userId);
    if (isLoaded) {
      const redirectTimeout = setTimeout(() => {
        // If user is authenticated, redirect to dashboard
        if (userId) {
          router.push("/");
        } else {
          // If not authenticated, redirect to sign-in
          router.push("/sign-in");
        }
      }, 1500); // Reduced timeout to 1.5 seconds

      return () => clearTimeout(redirectTimeout);
    }
  }, [isLoaded, userId, router]);

  return (
    <div className="w-full h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-[#94b347] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600 text-lg">Setting up your account...</p>
      </div>
    </div>
  );
}
