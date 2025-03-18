import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { uploadLargeFile } from "@/lib/fileUpload";
import { saveGeneratedStudyGuide } from "@/lib/firebase/firestore";
import { Message } from "@/lib/types";
import { StudyGuide, StudyGuideSection } from "@/types/studyGuide";
import { useUser } from "@clerk/nextjs";
import { BookOpen, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { RefObject, useMemo } from "react";
import { toast } from "react-hot-toast";

import FormUpload from "./formUpload";

interface StudyGuideModalProps {
  guideName: string;
  setGuideName: (name: string) => void;
  files: File[];
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleClear: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  messages: Message[];
  handleSendMessage: () => void;
  showUpload: boolean;
  setShowUpload: (show: boolean) => void;
  renderNotebookSelection: () => React.ReactNode;
  onClose: () => void;
  handleGenerateGuide: () => Promise<void>;
  isGenerating: boolean;
  filesToUpload: File[];
  selectedPages: { [notebookId: string]: string[] };
  setIsGenerating: (isGenerating: boolean) => void;
  onGuideCreated?: (guide: StudyGuide) => void;
}

export default function StudyGuideModal({
  guideName,
  setGuideName,
  files,
  handleFileUpload,
  handleClear,
  fileInputRef,
  messages,
  handleSendMessage,
  showUpload,
  setShowUpload,
  renderNotebookSelection,
  onClose,

  isGenerating,
  filesToUpload,
  selectedPages,
  setIsGenerating,
  onGuideCreated,
}: StudyGuideModalProps) {
  const router = useRouter();
  const { user } = useUser();

  // Calculate if the button should be disabled
  const isGenerateDisabled = useMemo(() => {
    const hasNoTitle = !guideName.trim();
    const hasNoFiles = filesToUpload.length === 0;
    const hasNoSelectedPages =
      Object.keys(selectedPages).length === 0 ||
      Object.values(selectedPages).every((pages) => pages.length === 0);

    return hasNoTitle || (hasNoFiles && hasNoSelectedPages) || isGenerating;
  }, [guideName, filesToUpload, selectedPages, isGenerating]);

  const handleGenerateGuide = async () => {
    if (!guideName.trim()) return;

    try {
      setIsGenerating(true);

      // Process uploaded files
      const processedFiles = [];
      for (const file of filesToUpload) {
        try {
          const downloadURL = await uploadLargeFile(file);

          const response = await fetch("/api/convert-from-storage", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              fileUrl: downloadURL,
              fileName: file.name,
              fileType: file.type,
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to convert file: ${file.name}`);
          }

          const data = await response.json();
          processedFiles.push({
            name: file.name,
            path: downloadURL,
            content: data.text,
          });
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          throw error;
        }
      }

      // Create the request body
      const requestBody = {
        selectedPages,
        guideName,
        uploadedDocs: processedFiles,
      };

      console.log("Sending request to generate study guide:", requestBody);

      const response = await fetch("/api/studyguide", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Study Guide API Error Response:", errorData);
        throw new Error(errorData.details || "Failed to generate study guide");
      }

      const result = await response.json();
      console.log("Received study guide result:", result);

      if (!result.content) {
        throw new Error("No content received from study guide generation");
      }

      // Create a properly formatted study guide object
      const newStudyGuide: StudyGuide = {
        id: `guide_${crypto.randomUUID()}`,
        title: guideName,
        content: result.content,
        createdAt: new Date(),
        userId: user?.id || "",
      };

      // Save to Firestore
      if (user?.id) {
        try {
          await saveGeneratedStudyGuide(newStudyGuide as StudyGuide, user.id);
          console.log("Successfully saved study guide to database");
          toast.success("Study guide created successfully!");

          // Call the callback with the new guide
          if (onGuideCreated) {
            onGuideCreated(newStudyGuide);
          }
        } catch (error) {
          console.error("Error saving study guide to database:", error);
          toast.error("Failed to save study guide to database");
          throw error;
        }
      }

      onClose();
    } catch (error) {
      console.error("Error in handleGenerateGuide:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to generate study guide"
      );
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-600/30 opacity-100 backdrop-blur-sm flex items-center justify-center z-50 w-full">
      <div className="bg-white p-6 py-16 rounded-lg h-full md:max-h-[75vh] w-full max-w-3xl overflow-y-auto">
        <div className="flex flex-col gap-2 my-4 items-center justify-center">
          <h2 className="text-xl font-bold mb-4 text-[#94b347]">
            Create Study Guide
          </h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Study Guide Name
            </label>
            <Input
              placeholder="Study Guide Name"
              value={guideName}
              onChange={(e) => setGuideName(e.target.value)}
              className="text-slate-600"
            />
          </div>
          <div className="font-semibold text-gray-500 w-full flex items-center justify-center text-lg">
            <h3>Select notes or upload files to study</h3>
          </div>
          <FormUpload
            files={files}
            handleFileUpload={handleFileUpload}
            handleClear={handleClear}
            fileInputRef={fileInputRef}
            messages={messages}
            handleSendMessage={handleSendMessage}
            showUpload={showUpload}
            setShowUpload={setShowUpload}
          />
          <div className="max-h-72 overflow-y-auto ">
            {renderNotebookSelection()}
          </div>
        </div>

        <div className="flex justify-between mt-5">
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-white border border-red-400 text-red-400 hover:bg-red-100 hover:border-red-400 hover:text-red-500 rounded-full"
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerateGuide}
            disabled={isGenerateDisabled}
            className={`rounded-full bg-white border border-slate-400 text-slate-600 
              ${
                !isGenerateDisabled
                  ? "hover:bg-white hover:border-[#94b347] hover:text-[#94b347]"
                  : "opacity-50 cursor-not-allowed"
              }`}
          >
            {isGenerating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <BookOpen className="h-4 w-4" />
            )}
            {isGenerating ? "Generating..." : "Generate"}
          </Button>
        </div>

        {/* Add error message when button is disabled */}
      </div>
    </div>
  );
}
