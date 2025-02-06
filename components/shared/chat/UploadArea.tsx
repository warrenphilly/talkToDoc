import { Button } from "@/components/ui/button";
import { UploadOutlined } from "@ant-design/icons";
import { LucideFileText } from "lucide-react";
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
        <div className=" flex flex-col gap-2 items-start justify-center rounded-2xl w-full h-fit px-6">
        

          <div className="w-full ">
            {/* Upload Button */}
          

            {/* File List */}
            {files.length > 0 && (
              <div className="border border-slate-400 rounded-lg p-4 space-y-3">
                <p className="text-sm text-slate-600 font-semibold">Uploaded Files</p>
                <div className="space-y-2">
                  {files.map((file, index) => {
                    const isImage = file.type.startsWith('image/');
                    
                    return (
                      <div 
                        key={index}
                        className="flex items-center justify-between bg-slate-50 p-2 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {isImage ? (
                            <img
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <LucideFileText className="w-12 h-12 text-slate-600" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-slate-700">{file.name}</p>
                            <p className="text-xs text-slate-500">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}





            <div className="flex flex-row gap-2 items-start justify-center md:justify-start rounded-2xl w-full h-fit mt-2">
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
                Upload Files ({files.length})
              </Button>
            </div>
            {files.length > 0 && (
              <Button 
                className="bg-[#dae9b6] text-slate-700 hover:bg-[#c8d9a2] w-fit"
                onClick={handleGenerateNotes}
              >
                Generate Notes
              </Button>
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadArea;
