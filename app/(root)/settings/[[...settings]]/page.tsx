"use client";

import {
  getUserByClerkId,
  updateUserLanguage,
  updateUserSettings,
} from "@/lib/firebase/firestore";
import { UserProfile, useUser } from "@clerk/nextjs";
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
      <h1 className="text-2xl font-bold mb-6">Account Settings</h1>

      {/* Custom settings section */}
      <div className="bg-white rounded-lg shadow-sm mb-8 p-6 border border-slate-200">
        <h2 className="text-xl font-semibold mb-4">
          Preferences & Account Info
        </h2>

        {saveMessage && (
          <div className="mb-4 p-2 bg-green-50 text-green-700 rounded-md text-sm">
            {saveMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Language selection */}
          <div>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary disabled:opacity-70"
            >
              {languages.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Select your preferred language for the application interface
            </p>
          </div>

          {/* Account information */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700">
                Credit Balance
              </h3>
              <div className="mt-1 flex items-center">
                <span className="text-2xl font-semibold text-gray-900">
                  {isLoading ? "..." : userCredits}
                </span>
                <span className="ml-2 text-sm text-gray-500">credits</span>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700">
                Account Status
              </h3>
              <div className="mt-1">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    accountStatus === "Pro"
                      ? "bg-green-100 text-green-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {isLoading ? "Loading..." : accountStatus}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clerk UserProfile component */}
      <div className="bg-white rounded-lg shadow-sm max-w-4xl mx-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-2xl p-2">
            <UserProfile
              path="/settings"
              routing="path"
              appearance={{
                elements: {
                  rootBox: "w-full max-w-full",
                  card: "shadow-none border-0 mx-auto",
                  navbar: "border-b border-gray-200",
                  pageScrollBox: "max-w-full mx-auto",
                  formFieldRow: "max-w-xl mx-auto",
                  formButtonPrimary: "bg-primary hover:bg-primary/90",
                  formFieldInput: "focus:border-primary focus:ring-primary",
                  avatarBox: "mx-auto",
                  profilePage: "max-w-4xl mx-auto px-4",
                  profileSection: "max-w-3xl mx-auto",
                },
              }}
              fallback={
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
