import { Button } from "@/components/ui/button";
import { Message } from "@/lib/types";
import { UploadOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { ImageIcon, LucideFileText, Trash2 } from "lucide-react";
import React, { useEffect, useState } from "react";

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
  isProcessing: boolean;
  progress: number;
  totalSections: number;
  setIsProcessing: (isProcessing: boolean) => void;
  isDatabaseUpdating: boolean;
}

interface FileMetadata {
  id: string;
  name: string;
  size?: number;
  type?: string;
  uploadedAt?: number;
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
  isProcessing,
  progress,
  totalSections,
  setIsProcessing,
  isDatabaseUpdating,
}: UploadAreaProps) => {
  const [previouslyUploadedFiles, setPreviouslyUploadedFiles] = useState<
    FileMetadata[]
  >([]);
  const [filesToProcess, setFilesToProcess] = useState<File[]>(files);
  const [processingFiles, setProcessingFiles] = useState<boolean>(false);
  const [hasProcessedFiles, setHasProcessedFiles] = useState(false);

  // Update filesToProcess when files prop changes
  useEffect(() => {
    setHasProcessedFiles(false);
  }, [files]);

  useEffect(() => {
    if (!processingFiles && files.length > 0 && !hasProcessedFiles) {
      setFilesToProcess(files);
    }
  }, [files, processingFiles, hasProcessedFiles]);

  // Extract previously uploaded files from messages
  useEffect(() => {
    const allUploadedFiles: FileMetadata[] = [];

    messages.forEach((msg) => {
      // If we have detailed file metadata, use it
      if (msg.fileMetadata && msg.fileMetadata.length > 0) {
        allUploadedFiles.push(...msg.fileMetadata);
      }
      // Otherwise fall back to just the file names
      else if (msg.files && msg.files.length > 0) {
        msg.files.forEach((fileName) => {
          // Check if this file is already in our list to avoid duplicates
          if (!allUploadedFiles.some((f) => f.name === fileName)) {
            allUploadedFiles.push({
              id: crypto.randomUUID(),
              name: fileName,
            });
          }
        });
      }
    });

    // Sort by uploadedAt if available, newest first
    allUploadedFiles.sort((a, b) => {
      if (a.uploadedAt && b.uploadedAt) {
        return b.uploadedAt - a.uploadedAt;
      }
      return 0;
    });

    setPreviouslyUploadedFiles(allUploadedFiles);
  }, [messages]);

  const handleGenerateNotes = async () => {
    setIsProcessing(true);
    setProcessingFiles(true);

    try {
      // File details will now be handled in the ChatClient component
      setFilesToProcess([]);
      setHasProcessedFiles(true);
      setShowUpload(false);
      await handleSendMessage();
    } finally {
      setProcessingFiles(false);
    }
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setFilesToProcess((prev) =>
      prev.filter((_, index) => index !== indexToRemove)
    );
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="flex min-h-[480px] md:min-h-[300px] md:min-w-[300px] flex-col md:px-6 gap-2 items-start justify-center rounded-2xl w-full h-full md:h-fit">
      {showUpload && (
        <motion.div
          className="flex flex-col min-h-[480px] md:min-h-[300px] dd . gap-2 items-center justify-start rounded-2xl w-full md:max-w-[800px]  h-full md:h-fit p-6"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
   
          <label className="block text-lg font-medium text-gray-700 mb-1">
            Upload your files
          </label>

          <div className="w-fit space-y-4 flex flex-col gap-2 items-start justify-start h-full max-w-[300px] min-h-[420px] md:min-h-[300px]">
            {/* Upload Button */}
            <div className="flex items-center gap-2 w-full justify-center ">
              <input
                type="file"
                multiple
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept=".pdf,.doc,.docx,.pptx,.png,.jpg,.jpeg,.csv"
                disabled={processingFiles}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-white text-slate-600 border border-slate-400 shadow-lg data-[state=active]:bg-white data-[state=active]:text-slate-600 data-[state=active]:border-slate-400"
                disabled={processingFiles}
              >
                <UploadOutlined />
                Upload Files
              </Button>
            </div>

            {/* New Files List */}
            <div className="flex flex-col gap-2 w-full">
              {filesToProcess.length > 0 ? (
                <motion.div
                  className="space-y-3 w-full flex flex-col gap-2 items-center justify-center"
                  variants={containerVariants}
                >
                  <p className="text-sm text-slate-600 font-semibold">
                    Files to Process
                  </p>
                  <div className="space-y-2 w-full max-w-md">
                    {filesToProcess.map((file, index) => {
                      const isImage = file.type.startsWith("image/");

                      return (
                        <motion.div
                          key={index}
                          className="flex items-center justify-between bg-slate-100 p-2 rounded-lg"
                          variants={itemVariants}
                        >
                          <div className="flex items-center gap-3">
                            {isImage ? (
                              <div className="w-12 h-12 flex items-center justify-center bg-slate-100 rounded overflow-hidden">
                                {file instanceof File ? (
                                  <img
                                    src={URL.createObjectURL(file)}
                                    alt={file.name}
                                    className="w-12 h-12 object-cover"
                                    onError={(e) => {
                                      e.currentTarget.src = "";
                                      e.currentTarget.style.display = "none";
                                      e.currentTarget.parentElement?.classList.add(
                                        "fallback-icon"
                                      );
                                    }}
                                  />
                                ) : (
                                  <ImageIcon className="w-8 h-8 text-slate-400" />
                                )}
                              </div>
                            ) : (
                              <LucideFileText className="md:w-8 md:h-8 text-slate-600" />
                            )}
                            <div>
                              <p className="text-sm font-medium text-slate-700 line-clamp-1 max-w-[100px] md:max-w-[350px]">
                                {file.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveFile(index)}
                            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                            aria-label="Remove file"
                          >
                            <Trash2 className="w-4 h-4 text-slate-500 hover:text-red-500" />
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              ) : (
                <div className="flex items-center justify-center h-full line-clamp-2 max-w-[300px] text-center">
                  <p className="text-sm text-slate-600 font-semibold">
                    No files to process. Upload some files to get started.
                  </p>
                </div>
              )}

              {/* Previously Uploaded Files List */}
              {previouslyUploadedFiles.length > 0 && (
                <motion.div
                  className="rounded-lg p-4 space-y-3 w-full"
                  variants={containerVariants}
                >
                  <p className="text-sm text-slate-600 font-semibold">
                    Previously Uploaded Files
                  </p>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                    {previouslyUploadedFiles.map((file, index) => {
                      const fileExtension = file.name
                        .split(".")
                        .pop()
                        ?.toLowerCase();
                      const isImage = [
                        "jpg",
                        "jpeg",
                        "png",
                        "gif",
                        "webp",
                      ].includes(fileExtension || "");

                      // Format the upload date if available
                      const uploadDate = file.uploadedAt
                        ? new Date(file.uploadedAt).toLocaleDateString()
                        : null;

                      return (
                        <motion.div
                          key={file.id}
                          className="bg-white flex items-center justify-between max-w-[270px] p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                          variants={itemVariants}
                        >
                          <div className="flex items-center gap-3 bg-white w-full">
                            {isImage ? (
                              <div className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded flex-shrink-0">
                                <ImageIcon className="w-5 h-5 text-slate-400" />
                              </div>
                            ) : (
                              <LucideFileText className="w-5 h-5 text-slate-600 flex-shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-slate-700 truncate">
                                {file.name}
                              </p>
                              {(file.size || uploadDate) && (
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  {file.size && (
                                    <span>
                                      {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </span>
                                  )}
                                  {uploadDate && <span>• {uploadDate}</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </div>
            {/* Generate Button - only shown when there are new files */}
         
              <div className="flex flex-col gap-2 w-full h-full items-center justify-start pt-6">
                <Button
                  className="border border-slate-600 shadow-none hover:bg-white bg-white text-slate-700 hover:border-[#94b347] hover:text-[#94b347] w-fit rounded-full"
                  onClick={handleGenerateNotes}
                  disabled={
                    processingFiles ||
                    filesToProcess.length === 0 ||
                    isDatabaseUpdating
                  }
                >
                  {processingFiles || isDatabaseUpdating
                    ? "Processing..."
                    : "Generate Notes from New Files"}
                </Button>
              </div>
            
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default UploadArea;
