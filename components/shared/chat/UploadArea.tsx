import { Button } from "@/components/ui/button";
import { UploadOutlined } from "@ant-design/icons";
import { LucideUpload } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Message } from "@/lib/types";

interface UploadAreaProps {
  messages: Message[];
  files: File[];
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSendMessage: (e: React.MouseEvent<HTMLButtonElement>) => void;
  handleClear: () => void;
}

const UploadArea = ({
  messages,
  files,
  fileInputRef,
  handleFileUpload,
  handleSendMessage,
  handleClear,
}: UploadAreaProps) => {
  //useEffect for watching messages.length

  const [showUploader, setShowUploader] = useState(true);

  useEffect(() => {
    if (messages.length > 0) {
      setShowUploader(false);
    }
  }, [messages]);

  return (
    <div className="flex flex-col gap-2  items-center justify-center rounded-2xl w-full ">
      {showUploader ? (
        <div className="border border-slate-700 bg-slate-800 md:items-start md:justify-between items-center justify-between rounded-2xl w-full px-4 py-4">
          <div className="flex flex-row gap-2 md:items-start md:justify-between items-center justify-between rounded-2xl w-full p-2">
            <h1 className="text-gray-100 text-xl font-regular">
              Uploaded files
            </h1>

            <div className="flex flex-row gap-2 items-center justify-center">
              <Button
                onClick={handleClear}
                className={`bg-slate-500 text-white rounded-2xl w-fit ${
                  messages.length > 0 ? "block" : "hidden"
                }`}
              >
                Clear Notes
              </Button>
              <Button
                onClick={() => setShowUploader(!showUploader)}
                className={`bg-slate-500 text-white rounded-2xl w-fit ${
                  messages.length > 0 ? "block" : "hidden"
                }`}
              >
                Close Uploads
              </Button>
            </div>
          </div>
          <div className="flex flex-row gap-2 items-start justify-start rounded-2xl w-full">
            {messages.map((msg, index) => (
              <div
                key={index}
                className="flex flex-col gap-2 items-center justify-center rounded-2xl w-fit"
              >
                {msg.files && (
                  <div className="mx-2 flex flex-wrap gap-2">
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
                          className="w-[200px] h-[200px] object-cover rounded-2xl mx-4"
                        />
                      ) : (
                        <div
                          key={idx}
                          className="w-[200px] h-[200px] bg-slate-700 rounded-2xl mx-4 flex items-center justify-center"
                        >
                          <div className="text-center p-4">
                            <LucideUpload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                            <p className="text-slate-300 text-sm">
                              Document {idx + 1}
                            </p>
                            <p className="text-slate-400 text-xs line-clamp-1 max-w-[150px]">
                              {fileExtension?.toUpperCase()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            <div className="p-4 border border-slate-700 flex flex-col gap-2 items-center justify-center rounded-2xl w-full max-w-[200px] h-[200px]">
              <h1 className="text-xl font-regular text-slate-100">
                Upload Files
              </h1>
              <div className="flex gap-2 mb-2">
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx"
                />

                <div className="flex flex-col items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 bg-slate-500"
                  >
                    <UploadOutlined />
                    Upload Files
                  </Button>
                  {files.length > 0 && (
                    <span className="text-sm text-gray-500 self-center">
                      {files.length} file(s) selected
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-row items-center gap-3 p-2 rounded-2xl">
                <Button onClick={handleSendMessage}>Generate Notes</Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-row gap-2 md:items-start md:justify-between items-center justify-between rounded-2xl w-full">
     
          <Button
            onClick={() => setShowUploader(!showUploader)}
            className={`bg-slate-500 text-white rounded-2xl w-fit ${
              messages.length > 0 ? "block" : "hidden"
            }`}
          >
            Uploaded Files
          </Button>
        </div>
      )}
    </div>
  );
};

export default UploadArea;
