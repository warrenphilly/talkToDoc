"use client";

import PricingModal from "@/components/pricing-modal";
import SubscriptionModal, {
  SubscriptionPlan,
} from "@/components/subscription-modal";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getUserByClerkId,
  updateUserLanguage,
  updateUserSettings,
} from "@/lib/firebase/firestore";
import { UserProfile, useUser } from "@clerk/nextjs";
import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

// Language options as simple strings
const languages = [
  "English",
  "Spanish",
  "French",
  "German",
  "Chinese",
  "Japanese",
  "Turkish",
  "Arabic",
  "Russian",
  "Portuguese",
  "Hindi",
];

export default function SettingsPage() {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [userCredits, setUserCredits] = useState(0);
  const [accountStatus, setAccountStatus] = useState("Free");
  const [firestoreUserId, setFirestoreUserId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [activeTab, setActiveTab] = useState("account");
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState<
    "success" | "canceled" | null
  >(null);
  const [shouldRefreshAfterPayment, setShouldRefreshAfterPayment] =
    useState(false);
  const [firestoreUser, setFirestoreUser] = useState<any>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.id) {
        try {
          setIsLoading(true);
          const firestoreUser = await getUserByClerkId(user.id);
          console.log("Firestore user data:", firestoreUser);
          if (firestoreUser) {
            setFirestoreUserId(firestoreUser.id);
            setFirestoreUser(firestoreUser);
            setUserCredits(
              firestoreUser.creditBalance !== undefined &&
                firestoreUser.creditBalance !== null
                ? firestoreUser.creditBalance
                : 0
            );

            // Set language if it exists in the user data
            if (firestoreUser.language) {
              setSelectedLanguage(firestoreUser.language);
            }

            // Determine account status based on metadata
            const isPro = firestoreUser.metadata?.isPro || false;
            setAccountStatus(isPro ? "Pro" : "Free");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        } finally {
          setIsLoading(false);
          // Reset the refresh flag if it was set
          if (shouldRefreshAfterPayment) {
            setShouldRefreshAfterPayment(false);
          }
        }
      }
    };

    fetchUserData();
  }, [user?.id, shouldRefreshAfterPayment]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const success = urlParams.get("success");
      const canceled = urlParams.get("canceled");

      if (success === "true") {
        setCheckoutStatus("success");
        setSaveMessage(
          "Payment successful! Your credits have been added to your account."
        );

        // Set the active tab to preferences when payment is successful
        setActiveTab("preferences");

        // Set flag to refresh data instead of directly calling getUserByClerkId
        setShouldRefreshAfterPayment(true);

        // Clear URL parameters
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      } else if (canceled === "true") {
        setCheckoutStatus("canceled");
        setSaveMessage(
          "Payment was canceled. No credits were added to your account."
        );

        // Clear URL parameters
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      }
    }
  }, []);

  const handleLanguageChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newLanguage = e.target.value;
    setSelectedLanguage(newLanguage);

    if (firestoreUserId) {
      try {
        setIsSaving(true);
        setSaveMessage("");

        // Update the language in Firestore
        await updateUserLanguage(firestoreUserId, newLanguage);

        setSaveMessage("Language preference saved!");

        // Clear the message after 3 seconds
        setTimeout(() => {
          setSaveMessage("");
        }, 3000);
      } catch (error) {
        console.error("Error saving language preference:", error);
        setSaveMessage("Failed to save language preference");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handlePurchaseCredits = async (option: {
    credits: number;
    price: number;
  }) => {
    // Here you would implement the payment processing logic
    console.log(
      `Purchasing ${option.credits} credits for $${option.price.toFixed(2)}`
    );

    // After successful payment, you would update the user's credit balance
    // This is just a placeholder - you'll need to implement actual payment processing
    try {
      // Example: await processPayment(option.price);
      // Example: await updateUserCredits(firestoreUserId, userCredits + option.credits);

      // For now, just show a success message
      setSaveMessage(`Successfully purchased ${option.credits} credits!`);

      // Clear the message after 3 seconds
      setTimeout(() => {
        setSaveMessage("");
      }, 3000);

      // Optionally refresh the user's credit balance
      // setUserCredits(userCredits + option.credits);
    } catch (error) {
      console.error("Error processing payment:", error);
      setSaveMessage("Failed to process payment");
    }
  };

  const handleSubscriptionChange = async (plan: SubscriptionPlan) => {
    try {
      setIsSaving(true);
      setSaveMessage("");

      // Here you would implement the subscription change logic
      console.log(`Changing to ${plan.name} plan with price $${plan.price}`);

      // Example: await updateUserSubscription(firestoreUserId, plan.id);

      setSaveMessage(`Successfully changed to ${plan.name} plan!`);

      // Update the account status
      setAccountStatus(plan.id === "pay-as-you-go" ? "Free" : "Pro");

      setTimeout(() => {
        setSaveMessage("");
      }, 3000);
    } catch (error) {
      console.error("Error changing subscription:", error);
      setSaveMessage("Failed to change subscription");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="bg-white rounded-lg  max-w-4xl mx-auto">
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-bold mb-6">Account Settings</h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <RefreshCw className="text-[#94b347] animate-spin" />
          </div>
        ) : (
          <Tabs
            defaultValue={activeTab}
            className="w-full"
            onValueChange={setActiveTab}
          >
            <TabsList
              defaultValue={"preferences"}
              className="grid w-full grid-cols-2 mb-6 bg-slate-50 rounded-xl border border-gray-200"
            >
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="preferences" defaultChecked={true}>
                Preferences
              </TabsTrigger>
            </TabsList>

            <TabsContent value="account" className="w-full">
              <UserProfile
                path="/settings"
                routing="path"
                appearance={{
                  elements: {
                    rootBox: "w-full max-w-full bg-white shadow-none",
                    card: "shadow-none border-0 mx-auto bg-white",
                    navbar: "bg-white",
                    navbarBox: "bg-white",

                    pageScrollBox: "max-w-full mx-auto bg-white shadow-none",
                    formFieldRow: "max-w-xl mx-auto bg-white",
                    formButtonPrimary: "bg-primary hover:bg-primary/90",
                    formFieldInput:
                      "focus:border-primary focus:ring-primary bg-white",
                    avatarBox: "mx-auto bg-white",
                    profilePage: "mx-auto px-4 bg-white shadow-none",
                    profileSection: "mx-auto bg-white",
                    card__main: "shadow-none border-0 bg-white",
                    profileSectionContent: "shadow-none border-0 bg-white",
                    profileSectionTitle: "shadow-none border-0 bg-white",
                    profileSectionTitleText: "shadow-none border-0 bg-white",
                    userPreviewMainIdentifier: "shadow-none border-0 bg-white",
                    userButtonBox: "shadow-none border-0 bg-white",
                  },
                  variables: {
                    colorBackground: "white",
                    colorInputBackground: "white",
                    colorInputText: "black",
                    colorText: "black",
                    colorTextSecondary: "#4B5563",
                    colorPrimary: "#94b347",
                    colorDanger: "#EF4444",
                  },
                  layout: {
                    showOptionalFields: true,
                    socialButtonsPlacement: "bottom",
                    socialButtonsVariant: "iconButton",
                  },
                }}
                fallback={
                  <div className="flex justify-center items-center h-64">
                    <RefreshCw className="text-[#94b347] animate-spin" />
                  </div>
                }
              />
            </TabsContent>

            <TabsContent value="preferences" className="w-full">
              <div className=" flex flex-col p-6 w-full bg-white border border-gray-200 rounded-xl">
                <h2 className="text-xl font-semibold mb-4">
                  Preferences & Account Info
                </h2>

                {saveMessage && (
                  <div className="mb-4 p-2 bg-green-50 text-green-700 rounded-md text-sm">
                    {saveMessage}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                  {/* Language selection */}
                  <div className="bg-white p-4 rounded-lg">
                    <label
                      htmlFor="language"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Interface Language
                    </label>
                    <select
                      id="language"
                      value={selectedLanguage}
                      onChange={handleLanguageChange}
                      disabled={isSaving}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary disabled:opacity-70 bg-white"
                    >
                      {languages.map((language) => (
                        <option key={language} value={language}>
                          {language}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-sm text-gray-500">
                      Select your preferred language for the application
                      interface
                    </p>
                  </div>

                  {/* Account information */}
                  <div className="space-y-4 flex flex-col 0 md:flex-row gap-8 justify-between p-4 rounded-lg ">
                    <div className="w-full   flex flex-col justify-center items-start gap-4 ">
                      <div className="w-full flex flex-row justify-between items-center gap-4 ">
                        <div className=" w-fit ">
                          <h3 className="text-sm font-medium text-gray-700">
                            Account Status
                          </h3>
                          <div className="mt-1 w-full flex justify-center items-center">
                            <span
                              className={`inline-flex items-center justify-center px-2.5 py-0.5 w-full rounded-full text-md   font-medium ${
                                accountStatus === "Pro"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {isLoading ? "Loading..." : accountStatus}
                            </span>
                          </div>
                        </div>
                        <div className="w- flex flex-row justify-end items-center gap-4 ">
                          {accountStatus === "Pro" ? (
                            <Button
                              onClick={() => setIsSubscriptionModalOpen(true)}
                              className="w-32 rounded-full text-slate-600 bg-white border border-gray-400 shadow-none hover:bg-white hover:border-[#94b347] hover:text-[#94b347]"
                            >
                              Manage Plan
                            </Button>
                          ) : (
                            <Button
                              onClick={() => setIsSubscriptionModalOpen(true)}
                              className="w-32 rounded-full text-slate-600 bg-white border border-gray-400 shadow-none hover:bg-white hover:border-[#94b347] hover:text-[#94b347]"
                            >
                              Upgrade to Pro
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="w-full flex  flex-row justify-between items-center gap-4 ">
                        <div className=" w-fit ">
                          <h3 className="text-sm font-medium text-gray-700">
                            Credit Balance
                          </h3>
                          <div className="mt-1 flex items-center">
                            {accountStatus === "Pro" ? (
                              <>
                                <span className="text-2xl font-semibold text-gray-900">
                                  {isLoading ? "..." : "unlimited"}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="text-2xl font-semibold text-gray-900">
                                  {isLoading ? "..." : userCredits}
                                </span>
                                <span className="ml-2 text-sm text-gray-500">
                                  credits
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col w-fit gap-2">
                          <Button
                            onClick={() => setIsPricingModalOpen(true)}
                            className="w-32 rounded-full text-slate-600 bg-white border border-gray-400 shadow-none hover:bg-white hover:border-[#94b347] hover:text-[#94b347]"
                          >
                            Get Credits
                          </Button>
                          <p className="text-sm text-gray-400">
                            <span>500 credits</span> = $1.50
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* <Separator
                      orientation="vertical"
                      className="my-4 bg-gray-200 text-gray-200"
                    /> */}
                    <div className="w-full flex flex-col items-start justify-start border border-gray-200 rounded-lg p-4">
                      <h3 className="text-md font-semibold text-gray-700 mb-2">
                        Pricing and Usage
                      </h3>
                      <ul className="list-disc list-inside text-sm text-gray-500">
                        <li>
                          <span>Notebook Generation</span> = 450 credits/request
                        </li>
                        <li>
                          <span>Quiz Generation</span> = 250 credits/request
                        </li>
                        <li>
                          <span>Study Guide Generation</span> = 150
                          credits/request
                        </li>
                        <li>
                          <span>Study Cards Generation</span> = 150
                          credits/request
                        </li>
                        <li>
                          <span>Chat</span> = 25 credits/request
                        </li>
                      </ul>
                      <p className="text-md font-semibold mt-2 text-[#94b347]">
                        Pro users gain unlimited access to all features
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>

      <PricingModal
        isOpen={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
        onSelect={handlePurchaseCredits}
      />

      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        onSelect={handleSubscriptionChange}
        currentPlan={
          accountStatus === "Pro"
            ? firestoreUser?.metadata?.planId || "pro-monthly"
            : "pay-as-you-go"
        }
        subscriptionId={firestoreUser?.metadata?.subscriptionId || null}
      />
    </div>
  );
}
