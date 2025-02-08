"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LucideFileText, ImageIcon, Trash2 } from "lucide-react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/firebase"; // or wherever your Firebase client is
import { v4 as uuidv4 } from "uuid";
import { Message } from "@/lib/types";

interface UploadAreaProps {
  handleSendMessage: (filesData: { name: string; url: string }[]) => void;
  handleClear: () => void;
  className?: string;
  files: File[];
  showUpload: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setShowUpload: React.Dispatch<React.SetStateAction<boolean>>;
  messages: Message[];
}

export default function UploadArea({
  handleSendMessage,
  handleClear,
  className,
  files,
  showUpload,
  fileInputRef,
  handleFileUpload,
  setShowUpload,
  messages,
}: UploadAreaProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; url: string }[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileUpload(e);
    }
  };

  // Upload each file directly to Firebase Storage
  const handleFileUploads = async () => {
    if (files.length === 0) return;
    setUploading(true);

    // For storing references to all successfully uploaded files
    const uploadedData: { name: string; url: string }[] = [];

    for (const file of files) {
      try {
        const uniqueId = uuidv4();
        const fileRef = ref(storage, `uploads/${uniqueId}-${file.name}`);
        const uploadTask = uploadBytesResumable(fileRef, file);

        const downloadUrl = await new Promise<string>((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            () => {},
            (error) => reject(error),
            async () => {
              const url = await getDownloadURL(fileRef);
              resolve(url);
            }
          );
        });

        uploadedData.push({ name: file.name, url: downloadUrl });
      } catch (error) {
        console.error("File upload error:", error);
      }
    }

    setUploadedFiles(uploadedData);
    setUploading(false);
    setShowUpload(false);

    // Instead of sending large files to /api/convert, pass storage references:
    handleSendMessage(uploadedData);
  };

  const handleRemoveFile = (index: number) => {
    handleFileUpload({ target: { files: files.filter((_, i) => i !== index) } } as unknown as React.ChangeEvent<HTMLInputElement>);
  };

  return (
    <div className={`flex flex-col w-full max-w-lg gap-3 ${className || ""}`}>
      <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
        Selected Files
        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="fileInput"
          accept=".pdf,.doc,.docx,.pptx,.png,.jpg,.jpeg,.csv"
          ref={fileInputRef}
        />
      </label>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => document.getElementById("fileInput")?.click()}
          className="bg-white text-slate-600 border border-slate-400"
          disabled={uploading}
        >
          Choose Files ({files.length})
        </Button>
        <Button
          onClick={handleFileUploads}
          disabled={files.length === 0 || uploading}
          className="bg-blue-600 text-white"
        >
          {uploading ? "Uploading..." : "Upload to Firebase"}
        </Button>
        <Button variant="destructive" onClick={handleClear}>
          Clear
        </Button>
      </div>

      {files.length > 0 && (
        <div className="border border-slate-300 rounded-md p-2 space-y-2">
          <p className="text-sm font-semibold">Pending Uploads</p>
          {files.map((file, index) => {
            const isImage = file.type.startsWith("image/");
            return (
              <div
                key={index}
                className="flex items-center justify-between gap-2 bg-slate-50 p-2 rounded"
              >
                <div className="flex items-center gap-3">
                  {isImage ? (
                    <div className="w-12 h-12 flex items-center justify-center bg-slate-100 rounded overflow-hidden">
                      <ImageIcon className="w-6 h-6 text-slate-400" />
                    </div>
                  ) : (
                    <LucideFileText className="w-12 h-12 text-slate-600" />
                  )}
                  <div>
                    <p className="text-sm text-slate-700">{file.name}</p>
                    <p className="text-xs text-slate-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleRemoveFile(index)}
                  className="p-1 hover:bg-slate-200 rounded-full transition-colors"
                  aria-label="Remove file"
                >
                  <Trash2 className="w-4 h-4 text-slate-500 hover:text-red-500" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="border border-green-300 rounded-md p-2 space-y-2">
          <p className="text-sm font-semibold">Uploaded Successfully</p>
          {uploadedFiles.map((f, i) => (
            <div
              key={i}
              className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2"
            >
              <span className="text-sm">{f.name}</span>
              <a
                className="text-blue-600 text-sm underline break-all"
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {f.url}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
