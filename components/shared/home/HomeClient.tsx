"use client";
import { Button } from "@/components/ui/button";
import React, { useEffect, useRef, useState } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

import ContinuousSegmentSpinner from "@/components/continuous-segment-spinner";
import SideChat from "@/components/shared/global/SideChat";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createNewNotebook,
  getUserByClerkId,
  updateUserLanguage,
} from "@/lib/firebase/firestore";
import { User } from "@/types/users";
import { useUser } from "@clerk/nextjs";
import CircularProgress from "@mui/material/CircularProgress";
import { Globe } from "lucide-react";
import BentoDashboard from "./bento-dashboard";

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

// First, let's define our message types
interface Sentence {
  id: number;
  text: string;
}

interface Section {
  title: string;
  sentences: Sentence[];
}

interface Message {
  user: string;
  text: string | Section[];
  files?: string[];
}

const HomeClient = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [showUpload, setShowUpload] = useState(true);
  const [primeSentence, setPrimeSentence] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const { isLoaded, isSignedIn, user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [isSavingLanguage, setIsSavingLanguage] = useState(false);
  const [userProfile, setUserProfile] = useState<User | null>(null);

  useEffect(() => {
    setTimeout(() => {
      setIsLoading(true);
    }, 1000);
  }, []);

  // Check if user has a language set
  useEffect(() => {
    const checkUserLanguage = async () => {
      if (isSignedIn && user) {
        try {
          const firestoreUser = await getUserByClerkId(user.id);
          setUserProfile(firestoreUser as User);

          // If user has no language set, show the language selection modal
          if (firestoreUser && !firestoreUser.language) {
            setShowLanguageModal(true);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    };

    if (isLoaded && isSignedIn) {
      checkUserLanguage();
    }
  }, [isLoaded, isSignedIn, user]);

  const handleLanguageSelect = async () => {
    if (!user || !userProfile) return;

    try {
      setIsSavingLanguage(true);
      await updateUserLanguage(userProfile.id, selectedLanguage);
      setShowLanguageModal(false);

      // Update local state to reflect the change
      setUserProfile((prev) =>
        prev ? { ...prev, language: selectedLanguage } : null
      );
    } catch (error) {
      console.error("Failed to save language preference:", error);
    } finally {
      setIsSavingLanguage(false);
    }
  };

  return (
    <>
      <div className="flex flex-col md:flex-row h-screen bg-red-500 w-full overflow-none">
        <div className="flex flex-col h-full bg-white w-full">
          <div className="flex flex-col md:flex-row justify-start h-full pb-12">
            <div className="flex-grow overflow-y-auto p-2 bg-white rounded-2xl w-full h-full mt-4">
              <BentoDashboard listType="recent" />
            </div>
          </div>
        </div>
      </div>

      {/* Language Selection Modal */}
      <Dialog
        open={showLanguageModal}
        onOpenChange={(open) => {
          // Only allow closing if we're saving or if the user has a language set
          if (!open && (isSavingLanguage || userProfile?.language)) {
            setShowLanguageModal(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-white border-0 shadow-xl">
          <DialogHeader className="space-y-3">
            <DialogTitle className="flex items-center gap-3 text-xl font-semibold text-gray-900">
              <div className="p-2 bg-[#94b347]/10 rounded-full">
                <Globe className="text-[#94b347] h-6 w-6" />
              </div>
              Select Language
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Choose your preferred language to continue
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="relative">
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                disabled={isSavingLanguage}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#94b347]/20 focus:border-[#94b347] text-gray-900 font-medium disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {languages.map((language) => (
                  <option key={language} value={language} className="py-2">
                    {language}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <Button
              onClick={handleLanguageSelect}
              disabled={isSavingLanguage}
              className="bg-[#94b347] hover:bg-[#b0ba93] text-white font-medium px-6 py-2 rounded-lg transition-all duration-200 disabled:opacity-70"
            >
              {isSavingLanguage ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </div>
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HomeClient;
