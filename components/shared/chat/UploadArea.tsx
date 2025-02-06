import { Button } from "@/components/ui/button";
import { UploadOutlined } from "@ant-design/icons";
import { LucideFileText, ImageIcon } from "lucide-react";
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
  const [previouslyUploadedFiles, setPreviouslyUploadedFiles] = useState<Array<{id: string, name: string}>>([]);
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
    console.log("filesToProcess labratory",filesToProcess)
  }, [filesToProcess])

  // Extract previously uploaded files from messages
  useEffect(() => {
    const allUploadedFiles = messages
      .filter(msg => msg.files && msg.files.length > 0)
      .flatMap(msg => {
        if (msg.fileDetails) {
          return msg.fileDetails;
        }
        return (msg.files || []).map(id => ({ id, name: 'Unknown File' }));
      });
    setPreviouslyUploadedFiles(allUploadedFiles);
  }, [messages]);

  const handleGenerateNotes = async () => {
    setProcessingFiles(true);
    
    try {
      const fileDetails = filesToProcess.map(file => ({
        id: crypto.randomUUID(),
        name: file.name
      }));
      
      setPreviouslyUploadedFiles(prev => [...prev, ...fileDetails]);
      setFilesToProcess([]);
      setHasProcessedFiles(true); // Mark files as processed
      
      setShowUpload(false);
      await handleSendMessage();
    } finally {
      setProcessingFiles(false);
    }
  };

  return (
    <div className="flex  min-w-[300px] w-full bg-white  flex-col px-6 gap-2 items-start justify-start rounded-2xl w-full">
      {showUpload && (
        <div className="flex flex-col gap-2  bg-[] items-start justify-center rounded-2xl w-full border border-slate-400 h-fit p-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Upload your files
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
                disabled={processingFiles}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-white text-slate-600 border border-slate-400 shadow-lg"
                disabled={processingFiles}
              >
                <UploadOutlined />
                Upload Files ({filesToProcess.length})
              </Button>
            </div>

            {/* New Files List */}
            {filesToProcess.length > 0 && (
              <div className="border border-slate-400 rounded-lg p-4 space-y-3">
                <p className="text-sm text-slate-600 font-semibold">New Files to Process</p>
                <div className="space-y-2">
                  {filesToProcess.map((file, index) => {
                    const isImage = file.type.startsWith('image/');
                    
                    return (
                      <div 
                        key={index}
                        className="flex items-center justify-between bg-slate-50 p-2 rounded-lg"
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
                                    e.currentTarget.src = ''; // Clear the src
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.parentElement?.classList.add('fallback-icon');
                                  }}
                                />
                              ) : (
                                <ImageIcon className="w-8 h-8 text-slate-400" />
                              )}
                            </div>
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

            {/* Previously Uploaded Files List */}
            {previouslyUploadedFiles.length > 0 && (
              <div className=" rounded-lg p-4 space-y-3">
                <p className="text-sm text-slate-600 font-semibold">Previously Uploaded Files</p>
                <div className="space-y-2">
                  {previouslyUploadedFiles.map((file, index) => {
                    const fileExtension = file.name.split(".").pop()?.toLowerCase();
                    const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(fileExtension || "");

                    return (
                      <div 
                        key={index}
                        className="bg-white flex items-center justify-between p-2 rounded-lg border border-slate-400"
                      >
                        <div className="flex items-center gap-3 bg-white">
                          {isImage ? (
                            <div className="w-12 h-12 flex items-center justify-center bg-slate-100 rounded">
                              <ImageIcon className="w-8 h-8 text-slate-400" />
                            </div>
                          ) : (
                            <LucideFileText className="w-12 h-12 text-slate-600" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-slate-700">{file.name}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Generate Button - only shown when there are new files */}
            {filesToProcess.length > 0 && (
              <Button 
                className="bg-[#dae9b6] text-slate-700 hover:bg-[#c8d9a2] w-fit"
                onClick={handleGenerateNotes}
                disabled={processingFiles}
              >
                {processingFiles ? 'Processing...' : 'Generate Notes from New Files'}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadArea;
