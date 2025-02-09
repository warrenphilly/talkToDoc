"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Message } from "@/lib/types";
import { storage } from "@/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { FileText, Loader2, RefreshCw, Trash2, Upload } from "lucide-react";
import React, { useCallback, useState } from "react";
import { toast } from "react-hot-toast";

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
  const [isConverting, setIsConverting] = useState(false);
  const [convertedFiles, setConvertedFiles] = useState<string[]>([]);

  const handleConvertFile = useCallback(async (file: File) => {
    try {
      setIsConverting(true);
      
      // Upload to Firebase Storage
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const path = `uploads/${timestamp}_${sanitizedFileName}`;
      
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      // Convert using the new endpoint
      const response = await fetch('/api/convert-from-storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileUrl: url,
          fileName: file.name,
          fileType: file.type
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to convert file: ${file.name}`);
      }

      const data = await response.json();
      if (data.text) {
        setConvertedFiles(prev => [...prev, file.name]);
        toast.success(`Converted ${file.name} successfully`);
      } else {
        toast.error(`No text content extracted from ${file.name}`);
      }
    } catch (error) {
      console.error("Error converting file:", error);
      toast.error(`Failed to convert ${file.name}`);
    } finally {
      setIsConverting(false);
    }
  }, []);

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
                  accept=".pdf,.doc,.docx,.txt,.pptx"
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
                    {!convertedFiles.includes(file.name) && (
                      <Button
                        onClick={() => handleConvertFile(file)}
                        disabled={isConverting}
                        className="bg-white border border-slate-400 text-slate-600 hover:bg-white hover:border-[#94b347] hover:text-[#94b347] rounded-full"
                      >
                        {isConverting ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          "Convert"
                        )}
                      </Button>
                    )}
                    {convertedFiles.includes(file.name) && (
                      <span className="text-[#94b347] text-sm">Converted ✓</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
