import { Button } from "@/components/ui/button";
import { UploadOutlined } from "@ant-design/icons";
import { LucideFileText, LucideUpload, Trash2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Message } from "@/lib/types";
import { Separator } from "@/components/ui/separator";

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

const FormUpload = ({
  messages,
  files,
  fileInputRef,
  handleFileUpload,
  handleSendMessage,
  handleClear,
  showUpload,
  setShowUpload,
}: UploadAreaProps) => {
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    setFilesToUpload([...filesToUpload, ...files]);
  }, [files]);

  const handleRemoveFile = (index: number) => {
    setFilesToUpload(prev => prev.filter((_, i) => i !== index));
  };

  const renderFilePreview = (file: File) => {
    const fileType = file.type;
    const isImage = fileType.startsWith('image/');

    if (isImage) {
      return (
        <img
          src={URL.createObjectURL(file)}
          alt={file.name}
          className="w-12 h-12 object-cover rounded"
        />
      );
    }

    return <LucideFileText className="w-12 h-12 text-slate-600" />;
  };

  return (
    <div className="flex flex-col gap-2 items-center justify-center rounded-2xl w-full">
      <div className="bg-white flex flex-col gap-2 items-start justify-center rounded-2xl w-full h-fit p-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Upload your files (optional)
        </label>
        
        <div className="w-full space-y-4">
          {/* Upload Button */}
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
              disabled={isUploading}
            >
              <UploadOutlined />
              Upload Files ({filesToUpload.length})
            </Button>
          </div>

          {/* File List */}
          {filesToUpload.length > 0 && (
            <div className="border border-slate-400 rounded-lg p-4 space-y-3">
              <p className="text-sm text-slate-600 font-semibold">Uploaded Files</p>
              <div className="space-y-2">
                {filesToUpload.map((file, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between bg-slate-50 p-2 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {renderFilePreview(file)}
                      <div>
                        <p className="text-sm font-medium text-slate-700">{file.name}</p>
                        <p className="text-xs text-slate-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFile(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormUpload;
