import { Button } from "@/components/ui/button";
import { UploadOutlined } from "@ant-design/icons";
import { LucideFileText, LucideUpload } from "lucide-react";
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


  const handleGenerateNotes = () => {
    
    console.log("filesToUpload frfrfr", filesToUpload);
    // handleSendMessage();
  };
  //useEffect for watching messages.length

  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);

  useEffect(() => {
    setFilesToUpload([...filesToUpload, ...files]);
    console.log("filesToUpload", filesToUpload);
  }, [files]);

  return (
    <div className="flex flex-col gap-2  items-center justify-center rounded-2xl w-full  ">
      <div className="  md:items-start md:justify-between items-center justify-between rounded-2xl w-full  py-4">
        <div className="flex flex-row gap-2  items-start justify-start  rounded-2xl w-full">
          {messages.map(
            (msg, index) =>
              msg.files &&
              msg.files.length > 0 && (
                <div
                  key={index}
                  className="flex flex-col gap-2 items-center justify-center rounded-2xl w-fit mx-4"
                >
                  {msg.files && (
                    <div className=" flex flex-wrap gap-2">
                      {msg.files.map((fileUrl: string, idx: number) => {
                        const fileExtension = fileUrl
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

                        return isImage ? (
                          <img
                            key={idx}
                            src={fileUrl}
                            alt={`Uploaded file ${idx + 1}`}
                            className=" object-cover rounded-2xl "
                          />
                        ) : (
                          <div
                            key={idx}
                            className="w-[200px] h-[200px]  rounded-2xl flex items-center justify-center bg-slate-100"
                          >
                            <div className="text-center p-4">
                              <LucideUpload className="w-8 h-8 mx-auto mb-2 text-slate-900" />
                              <p className="text-slate-900 text-sm">
                                Document {idx + 1}
                              </p>
                              <p className="text-slate-700 text-xs line-clamp-1 max-w-[150px]">
                                {fileExtension?.toUpperCase()}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )
          )}

          <div className=" bg-white  flex flex-col gap-2 items-start justify-center rounded-2xl w-full  h-fit ">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                   Upload your files (optional)
                  </label>
            <div className=" gap-2\ flex flex-row items-start w-full">
              
              <input
                type="file"
                multiple
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx"
              />

              <div className="flex flex-col items-start  w-full gap-1 ">
                <div className="flex flex-col gap-2  items-center justify-center w-fit">
             
                  <Button
                    variant="outline"
                    onClick={() => {
                      fileInputRef.current?.click();
                      console.log("files", files);
                    }}
                    className="flex items-center gap-2  bg-white text-slate-600 border border-slate-400 shadow-lg"
                  >
                    <UploadOutlined />
                    Upload Files ({filesToUpload.length})
                  </Button>
                </div>
               
              
            
                
                {files.length > 0 && (
                  <>
                    
                    <div className="flex flex-col gap-2 items-start  justify-start border border-slate-400 rounded-lg p-2 w-full">
                      <p className="text-sm text-slate-600 self-start font-semibold ">Uploaded Files</p>
                      {filesToUpload.map((file, index) => (
                      <div className="text-sm text-[#94b347] self-start" key={index}> 
                      <div className="flex flex-row gap-2 items-center justify-center">
                        <LucideFileText className="w-4 h-4 text-[#94b347]" />
                        {file.name}
                      </div>
                      </div>
                    ))}
                    </div>
                    </>
                )}
              </div>
            </div>

            
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormUpload;
