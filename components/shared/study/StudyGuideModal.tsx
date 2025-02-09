import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Message } from "@/lib/types";
import { BookOpen, RefreshCw } from "lucide-react";
import React, { RefObject } from "react";
import { uploadLargeFile } from "@/lib/fileUpload";

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
}: StudyGuideModalProps) {
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
            content: data.text,
            url: downloadURL
          });
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          throw error;
        }
      }

      // Generate study guide with processed files
      const response = await fetch("/api/generate-guide", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          guideName,
          processedFiles,
          selectedPages,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate study guide");
      }

      onClose();

    } catch (error) {
      console.error("Error generating study guide:", error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-600/30 opacity-100 backdrop-blur-sm flex items-center justify-center z-10 w-full">
          <div className="bg-white p-6 rounded-lg h-full max-h-[60vh] w-full overflow-y-auto max-w-xl">

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
            {renderNotebookSelection()}
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
            disabled={
              isGenerating ||
              !guideName.trim() ||
              (filesToUpload.length === 0 &&
                Object.keys(selectedPages).length === 0)
            }
            className="rounded-full bg-white border border-slate-400 text-slate-600 hover:bg-white hover:border-[#94b347] hover:text-[#94b347]"
          >
            {isGenerating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <BookOpen className="h-4 w-4" />
            )}
            {isGenerating ? "Generating..." : "Generate"}
          </Button>
        </div>
      </div>
    </div>
  );
}
