import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Message } from "@/lib/types";
import { BookOpen, RefreshCw } from "lucide-react";
import React, { RefObject } from "react";

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
  handleGenerateGuide,
  isGenerating,
  filesToUpload,
  selectedPages,
}: StudyGuideModalProps) {
  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-10">
      <Card className="w-full h-full overflow-y-auto bg-white rounded-none border-none shadow-none max-w-xl">
        <CardContent>
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
        </CardContent>
        <CardFooter className="flex justify-between">
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
        </CardFooter>
      </Card>
    </div>
  );
}
