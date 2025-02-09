"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Message } from "@/lib/types";
import { FileText, Trash2, Upload } from "lucide-react";
import React, { useState } from "react";
import { storage } from "@/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { uploadLargeFile } from "@/lib/fileUpload";

interface FormUploadProps {
  files: File[];
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleClear: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  messages: Message[];
  handleSendMessage: () => void;
  showUpload: boolean;
  setShowUpload: (show: boolean) => void;
}

export default function FormUpload({
  files,
  handleFileUpload,
  handleClear,
  fileInputRef,
  messages,
  handleSendMessage,
  showUpload,
  setShowUpload,
}: FormUploadProps) {
  const [progress, setProgress] = useState<number>(0);

  const processFile = async (file: File) => {
    try {
      // Upload file to Firebase Storage using chunked upload
      const downloadURL = await uploadLargeFile(file);
      
      // Convert file using the convert-from-storage endpoint
      const response = await fetch("/api/convert-from-storage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.NEXT_PUBLIC_API_KEY || "",
        },
        body: JSON.stringify({
          fileUrl: downloadURL,
          fileName: file.name,
          fileType: file.type,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Failed to convert file");
      }

      const data = await response.json();
      return data.text;

    } catch (error) {
      console.error("Error processing file:", error);
      throw error;
    }
  };

  return (
    <div className="w-full space-y-2">
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white border border-slate-400 text-slate-600 hover:bg-white hover:border-[#94b347] hover:text-[#94b347] rounded-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Files
                </Button>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept=".pdf,.doc,.docx,.txt,.pptx,.png,.jpg,.jpeg"
                  multiple
                />
              </div>
              {files.length > 0 && (
                <Button
                  onClick={handleClear}
                  variant="outline"
                  className="bg-white border border-red-400 text-red-400 hover:bg-red-100 hover:border-red-400 hover:text-red-500 rounded-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              )}
            </div>
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 border rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-600" />
                      <span className="text-sm text-slate-600">{file.name}</span>
                    </div>
                  </div>
                ))}
                {progress > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-[#94b347] h-2.5 rounded-full"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
