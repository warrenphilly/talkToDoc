import { Button } from "@/components/ui/button";
import { Message } from "@/lib/types";
import { UploadOutlined } from "@ant-design/icons";
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
}: UploadAreaProps) => {
  const [previouslyUploadedFiles, setPreviouslyUploadedFiles] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [filesToProcess, setFilesToProcess] = useState<File[]>(files);
  const [processingFiles, setProcessingFiles] = useState<boolean>(false);
  const [newFiles, setNewFiles] = useState<File[]>([]);
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

  useEffect(() => {
    console.log("filesToProcess labratory", filesToProcess);
  }, [filesToProcess]);

  // Extract previously uploaded files from messages
  useEffect(() => {
    const allUploadedFiles = messages
      .filter((msg) => msg.files && msg.files.length > 0)
      .flatMap((msg) => {
        if (msg.fileDetails) {
          return msg.fileDetails;
        }
        return (msg.files || []).map((id) => ({ id, name: "Unknown File" }));
      });
    setPreviouslyUploadedFiles(allUploadedFiles);
  }, [messages]);

  const handleGenerateNotes = async () => {
    setProcessingFiles(true);

    try {
      const fileDetails = filesToProcess.map((file) => ({
        id: crypto.randomUUID(),
        name: file.name,
      }));

      setPreviouslyUploadedFiles((prev) => [...prev, ...fileDetails]);
      setFilesToProcess([]);
      setHasProcessedFiles(true); // Mark files as processed

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

  return (
    <div className="flex  md:min-w-[300px] flex-col md:px-6 gap-2 items-start justify-center rounded-2xl w-full h-full md:h-fit bg-white">
      {showUpload && (
        <div className="flex flex-col gap-2  items-center justify-start bg-white rounded-2xl w-full md:max-w-[800px] md:border border-slate-400 h-full md:h-fit p-6">
          {isProcessing && (
            <div className="w-full space-y-2">
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-[#94b347] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress / totalSections) * 100}%` }}
                />
              </div>
              <p className="text-sm text-slate-500 text-center">
                Processing section {progress} of {totalSections}
              </p>
            </div>
          )}
          <label className="block text-lg font-medium text-gray-700 mb-1">
            Upload your files
          </label>

          <div className="w-fit space-y-4 flex flex-col gap-2 items-start justify-start h-full">
            {/* Upload Button */}
            <div className="flex items-center gap-2 w-full justify-center my-4">
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
                Upload Files ({filesToProcess.length})
              </Button>
            </div>

            {/* New Files List */}
            <div className="flex flex-col  gap-2 w-full">
              {filesToProcess.length > 0 && (
                <div className="border-t border-slate-400  p-4 space-y-3 w-full flex flex-col gap-2 items-center justify-center">
                  <p className="text-sm text-slate-600 font-semibold">
                    New Files to Process
                  </p>
                  <div className="space-y-2 w-full max-w-md">
                    {filesToProcess.map((file, index) => {
                      const isImage = file.type.startsWith("image/");

                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-slate-100 p-2 rounded-lg"
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
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Previously Uploaded Files List */}
              {previouslyUploadedFiles.length > 0 && (
                <div className=" rounded-lg p-4 space-y-3">
                  <p className="text-sm text-slate-600 font-semibold">
                    Previously Uploaded Files
                  </p>
                  <div className="space-y-2">
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

                      return (
                        <div
                          key={index}
                          className="bg-white flex items-center justify-between p-2 sm:p-3 rounded-lg border border-slate-400"
                        >
                          <div className="flex items-center gap-2 sm:gap-3 bg-white w-full">
                            {isImage ? (
                              <div className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center bg-slate-100 rounded flex-shrink-0">
                                <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                              </div>
                            ) : (
                              <LucideFileText className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 flex-shrink-0" />
                            )}
                            <div className="min-w-0 flex-1 ">
                              <p className="text-xs sm:text-sm font-medium text-slate-700 truncate">
                                {file.name}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            {/* Generate Button - only shown when there are new files */}
            <div className="flex flex-col gap-2 w-full h-full max-h-[300px]  items-center justify-start pt-6 ">
              <Button
                className="border border-slate-600 shadow-none hover:bg-white bg-white text-slate-700 hover:border-[#94b347] hover:text-[#94b347] w-fit rounded-full"
                onClick={handleGenerateNotes}
                disabled={
                  processingFiles || filesToProcess.length === 0 || isProcessing
                }
              >
                {processingFiles || isProcessing
                  ? "Processing..."
                  : "Generate Notes from New Files"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadArea;
