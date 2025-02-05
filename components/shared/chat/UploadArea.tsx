import { Button } from "@/components/ui/button";
import { UploadOutlined } from "@ant-design/icons";
import { LucideUpload } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Message } from "@/lib/types";

interface UploadAreaProps {
  messages: Message[];
  files: File[];
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleSendMessage: () => void;
  handleClear: () => void;
  className?: string;
  showUpload: boolean;
  setShowUpload: (show: boolean) => void;
}

const UploadArea = ({
  messages,
  files,
  fileInputRef,
  handleFileUpload,
  handleSendMessage,
  handleClear,
  showUpload,
  setShowUpload,
}: UploadAreaProps) => {

  const handleGenerateNotes = () => {
    setShowUpload(false);
    handleSendMessage();
  }
  //useEffect for watching messages.length

  return (
    <div className="flex flex-col gap-2 items-center justify-center rounded-2xl w-full">
      {showUpload && (
        <div className="bg-white flex flex-col gap-2 items-start justify-center rounded-2xl w-full h-fit p-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Uploaded files
          </label>

          <div className="w-full space-y-4">
            {/* File Display Area */}
            <div className="w-full">
              {messages.map((msg, index) => (
                msg.files && msg.files.length > 0 && (
                  <div key={index} className="border border-slate-400 rounded-lg p-4 space-y-3">
                    <div className="flex flex-wrap gap-3">
                      {msg.files.map((fileUrl: string, idx: number) => {
                        const fileExtension = fileUrl.split(".").pop()?.toLowerCase();
                        const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(fileExtension || "");

                        return isImage ? (
                          <div key={idx} className="relative w-24 h-24">
                            <img
                              src={fileUrl}
                              alt={`Uploaded file ${idx + 1}`}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          </div>
                        ) : (
                          <div
                            key={idx}
                            className="w-24 h-24 rounded-lg flex items-center justify-center bg-slate-50"
                          >
                            <div className="text-center p-2">
                              <LucideUpload className="w-6 h-6 mx-auto mb-1 text-slate-600" />
                              <p className="text-slate-600 text-xs">
                                {fileExtension?.toUpperCase()}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              ))}
            </div>

            {/* Upload Area */}
            <div className="border border-slate-400 rounded-lg p-4 space-y-3">
              <p className="text-sm text-slate-600 font-semibold">Upload New Files</p>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.pptx,.png,.jpg,.jpeg,.csv"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 bg-white text-slate-600 border border-slate-400 shadow-lg"
                  >
                    <UploadOutlined />
                    Upload Files
                  </Button>
                  {files.length > 0 && (
                    <span className="text-sm text-gray-500">
                      {files.length} file(s) selected
                    </span>
                  )}
                </div>
                
                <Button 
                  className="bg-[#dae9b6] text-slate-700 hover:bg-[#c8d9a2] w-fit"
                  onClick={() => {
                    setShowUpload(false);
                    handleSendMessage();
                  }}
                >
                  Generate Notes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadArea;
