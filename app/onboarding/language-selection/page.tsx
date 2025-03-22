"use client";

import LanguageSelector from "@/components/onboarding/language-selector";
import {
  createFirestoreUser,
  getUserByClerkId,
} from "@/lib/firebase/firestore";
import { useAuth, useUser } from "@clerk/nextjs";
import { Cpu, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LanguageSelectionPage() {
  const router = useRouter();
  const { userId: clerkId, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [creatingUser, setCreatingUser] = useState(false);

  useEffect(() => {
    const initUser = async () => {
      try {
        if (!isLoaded || !user) return;

        // Redirect to sign-in if not signed in
        if (!isSignedIn || !clerkId) {
          router.push("/sign-in");
          return;
        }

        console.log("Checking if user exists in Firestore:", clerkId);

        // Get Firestore user ID from Clerk ID
        let firestoreUser = await getUserByClerkId(clerkId);

        // If the user doesn't exist in Firestore, create them
        if (!firestoreUser) {
          console.log("User not found in Firestore, creating new user");
          setCreatingUser(true);

          const newUserId = await createFirestoreUser({
            id: clerkId,
            email: user.primaryEmailAddress?.emailAddress,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            imageUrl: user.imageUrl,
            metadata: {},
            language: "English",
          });

          console.log("Created new Firestore user with ID:", newUserId);

          // Fetch the user again to get the complete user object
          firestoreUser = await getUserByClerkId(clerkId);
          setCreatingUser(false);
        }

        if (firestoreUser) {
          setUserId(firestoreUser.id);

          // If the user already has a language preference set, redirect to dashboard
          if (firestoreUser.language && firestoreUser.language !== "English") {
            router.push("/dashboard");
            return;
          }
        } else {
          console.error("Failed to create or retrieve Firestore user");
          return;
        }
      } catch (error) {
        console.error("Error initializing user:", error);
      } finally {
        setLoading(false);
      }
    };

    initUser();
  }, [router, clerkId, isLoaded, isSignedIn, user]);

  const handleLanguageSelected = () => {
    router.push("/dashboard");
  };

  if (loading || creatingUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="absolute top-0 left-0 w-full h-64 bg-[#94b347]/10 rounded-b-full blur-3xl -z-10 transform-gpu"></div>
        <div className="w-full max-w-md text-center">
          <Link
            href="/"
            className="items-center gap-2 mb-8 transition-transform hover:scale-105 inline-flex justify-center"
          >
            <Cpu className="h-8 w-8 text-[#94b347]" />
            <span className="font-semibold text-slate-800 text-xl">
              GammaNotes
            </span>
          </Link>

          {creatingUser ? (
            <div className="flex flex-col items-center justify-center p-8">
              <Loader2 className="h-8 w-8 text-[#94b347] animate-spin mb-4" />
              <p className="text-slate-600">Setting up your account...</p>
            </div>
          ) : (
            <div className="animate-pulse flex flex-col items-center justify-center p-8">
              <div className="w-12 h-12 rounded-full bg-gray-200 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="absolute top-0 left-0 w-full h-64 bg-[#94b347]/10 rounded-b-full blur-3xl -z-10 transform-gpu"></div>

      <div className="w-full max-w-3xl">
        <div className="text-center mb-6">
          <Link
            href="/"
            className="items-center gap-2 mb-8 transition-transform hover:scale-105 inline-flex justify-center"
          >
            <Cpu className="h-8 w-8 text-[#94b347]" />
            <span className="font-semibold text-slate-800 text-xl">
              GammaNotes
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 mt-4">
            Welcome to GammaNotes!
          </h1>
          <p className="text-slate-600 mt-2">
            Set your preferred language before we get started.
          </p>
        </div>

        {userId && (
          <LanguageSelector
            userId={userId}
            onComplete={handleLanguageSelected}
          />
        )}
      </div>
    </div>
  );
}
