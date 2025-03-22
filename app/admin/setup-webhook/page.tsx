"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@clerk/nextjs";
import { ArrowRight, CheckCircle, Loader2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SetupWebhookPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const setupWebhook = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/sync-clerk-webhook");
      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: "Webhook successfully configured!",
        });
      } else {
        setResult({
          success: false,
          message: data.error || "Failed to configure webhook",
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (!isSignedIn) {
    router.push("/sign-in");
    return null;
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Clerk Webhook Setup</CardTitle>
          <CardDescription>
            Configure Clerk webhook to automatically create users in Firestore
            when they sign up.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-4">
            This will configure a webhook that listens for the{" "}
            <code>user.created</code> event from Clerk and creates a
            corresponding user in your Firestore database.
          </p>

          {result && (
            <div
              className={`p-3 mb-4 rounded-lg ${
                result.success
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <div className="flex items-start">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                )}
                <span
                  className={result.success ? "text-green-700" : "text-red-700"}
                >
                  {result.message}
                </span>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button
            onClick={setupWebhook}
            disabled={isLoading}
            className="w-full bg-[#94b347] hover:bg-[#b0ba93]"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Configuring...
              </>
            ) : (
              <>
                Setup Webhook
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
