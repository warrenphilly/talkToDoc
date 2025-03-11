"use client";

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
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [userCredits, setUserCredits] = useState(0);
  const [accountStatus, setAccountStatus] = useState("Free");
  const [firestoreUserId, setFirestoreUserId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [activeTab, setActiveTab] = useState("account");

  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.id) {
        try {
          const firestoreUser = await getUserByClerkId(user.id);
          if (firestoreUser) {
            setFirestoreUserId(firestoreUser.id);
            setUserCredits(firestoreUser.creditBalance || 0);

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
        }
      }
    };

    fetchUserData();
  }, [user?.id]);

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
            defaultValue="account"
            className="w-full"
            onValueChange={setActiveTab}
          >
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-100 rounded-xl border border-gray-200">
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
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
                          <Button className="w-32 rounded-full  bg-white border border-gray-300 shadow-none hover:bg-gray-100">
                            Manage Plan
                          </Button>
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
                          <Button className="w-32 rounded-full bg-white border border-gray-300 shadow-none hover:bg-gray-100">
                            Buy Credits
                          </Button>
                          <p className="text-sm text-gray-400">
                            <span>1000 credits</span> = $1.00
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* <Separator
                      orientation="vertical"
                      className="my-4 bg-gray-200 text-gray-200"
                    /> */}
                    <div className="w-full flex flex-col items-start justify-start border border-gray-200 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-700">
                        Pricing and Usage
                      </h3>
                      <ul>
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
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
