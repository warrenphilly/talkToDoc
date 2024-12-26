"use client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UploadOutlined } from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd";
import { Upload } from "antd";
import { Image, Upload as LucideUpload } from "lucide-react"; // Import icons
import React, { useEffect, useRef, useState } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

import SideChat from "@/components/shared/SideChat";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
// First, let's define our message types
interface Sentence {
  id: number;
  text: string;
}

interface Section {
  title: string;
  sentences: Sentence[];
}

interface Message {
  user: string;
  text: string | Section[];
  files?: string[];
}

// Define the upload properties
const uploadProps: UploadProps = {
  action: "/api/chat", // Your API endpoint
  multiple: true, // Allow multiple file uploads
  onChange({ file, fileList }: { file: UploadFile; fileList: UploadFile[] }) {
    if (file.status !== "uploading") {
      console.log(file, fileList);
    }
  },
  showUploadList: true, // Show the list of uploaded files
};

const ChatClient = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(
    "Explain this to me to like you are an expert"
  );
  const [showUpload, setShowUpload] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [primeSentence, setPrimeSentence] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  // const [selectedSentence, setSelectedSentence] = useState<Sentence | null>(
  //   null
  // ); - possible to remove
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sideChatWidth, setSideChatWidth] = useState(300); // Initial width for SideChat

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (uploadedFiles) {
      setFiles(Array.from(uploadedFiles));
    }
  };

  const handleSentenceClick = (sentence: Sentence) => {
    setPrimeSentence(sentence.text);
    setShowChat(true);
  };

  const sendMessage = async () => {
    if (!input.trim() && files.length === 0) return;

    const formData = new FormData();
    formData.append("message", input);

    const userMessage = {
      user: "User",
      text: input,
      files: files.map((file) => URL.createObjectURL(file)),
    };

    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput("");
    setFiles([]);

    const maxRetries = 3;

    for (const file of files) {
      formData.append("files", file);

      let attempt = 0;
      let success = false;

      while (attempt < maxRetries && !success) {
        try {
          const response = await fetch("/api/chat", {
            method: "POST",
            body: formData,
          });

          const data = await response.json();
          console.log("Raw API response:", data); // Debug log

          let parsedResponse;

          try {
            if (!data.replies) {
              throw new Error("No replies in response");
            }

            parsedResponse =
              typeof data.replies === "string"
                ? JSON.parse(data.replies)
                : data.replies;

            console.log("Parsed response:", parsedResponse); // Debug log

            if (!Array.isArray(parsedResponse)) {
              throw new Error("Response is not an array");
            }

            const validSections = parsedResponse.every((section) => {
              if (
                !section.title ||
                !section.sentences ||
                !Array.isArray(section.sentences)
              ) {
                console.error("Invalid section structure:", section);
                return false;
              }

              return section.sentences.every((sentence: Sentence) => {
                if (
                  !sentence ||
                  typeof sentence.id !== "number" ||
                  typeof sentence.text !== "string"
                ) {
                  console.error("Invalid sentence structure:", sentence);
                  return false;
                }
                return true;
              });
            });

            if (!validSections) {
              throw new Error("Invalid section or sentence structure");
            }

            // Send each section as a separate message
            for (const section of parsedResponse) {
              const aiMessage = {
                user: "AI",
                text: [section],
              };

              setMessages((prevMessages) => [...prevMessages, aiMessage]);
            }

            success = true;
          } catch (parseError) {
            console.error("Parsing error:", parseError);
            attempt++;
            if (attempt >= maxRetries) {
              const fallbackResponse = [
                {
                  title: "Error",
                  sentences: [
                    {
                      id: 1,
                      text: "Sorry, there was an error processing the response. Please try again.",
                    },
                  ],
                },
              ];

              setMessages((prevMessages) => [
                ...prevMessages,
                {
                  user: "AI",
                  text: fallbackResponse,
                },
              ]);
              setShowUpload(false);
            }
          }
        } catch (error) {
          console.error("Network error:", error);
          const errorResponse = [
            {
              title: "Error",
              sentences: [
                {
                  id: 1,
                  text: "Sorry, there was a network error. Please try again.",
                },
              ],
            },
          ];

          setMessages((prevMessages) => [
            ...prevMessages,
            {
              user: "AI",
              text: errorResponse,
            },
          ]);
          break;
        }
      }
    }
  };

  useEffect(() => {
    // if (messages.length > 0) {
    //   setShowUpload(false);
    // }
    console.log("messages", messages);
  }, [messages]);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-900 w-full">
      <div className="flex flex-col h-full bg-slate-900  w-full mx-2">
        <div className="flex flex-row items-center justify-between w-full ">
          <div className="text-white p-4 bg-slate-800 rounded-2xl w-fit my-5 font-semibold">
            <h1 className="text-xl font-regular">Enhanced Notes</h1>
          </div>

          <Button
            onClick={() => {
              setShowChat(!showChat);
              setPrimeSentence(null);
            }}
            className="text-white px-4 py-2 bg-slate-800 rounded-full w-fit m-5 font-semibold"
          >
            {showChat ? "Close Chat" : "Talk to my notes"}
          </Button>
        </div>
        <div className="flex flex-col md:flex-row justify-start h-full max-h-[90vh] px-2">
          <ResizablePanelGroup direction="horizontal" className="w-full px-2">
            <ResizablePanel className="w-full p-2 min-w-[600px]  flex flex-col gap-2 items-center justify-center h-full overflow-y-auto ">
              {/* surgery area */}
              <div className="flex flex-col gap-2  p-4 items-center justify-center rounded-2xl w-full border border-slate-700 bg-slate-800">
                {messages.length > 0 && (
                  <div className="flex  flex-row gap-2 md:items-start md:justify-start items-center justify-center rounded-2xl w-full">
                    <h1 className="text-gray-100 text-xl font-regular ">
                      Uploaded files
                    </h1>
                    <Button
                      onClick={() => {
                        setMessages([]);
                        setShowUpload(true);
                        setShowChat(false);
                        setPrimeSentence(null);
                      }}
                      className={`bg-slate-500 text-white rounded-2xl w-fit ${
                        messages.length > 0 ? "block" : "hidden"
                      }`}
                    >
                      Clear Notes
                    </Button>
                  </div>
                )}

                <div className="flex flex-row gap-2 items-start justify-start rounded-2xl w-full ">
                  {messages.map((msg, index) => (
                    <div className="flex flex-col gap-2 items-center justify-center rounded-2xl w-fit">
                      {msg.files && (
                        <div className="mx-2 flex flex-wrap gap-2 ">
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

                  <div className=" p-4 border border-slate-700 flex flex-col gap-2 items-center justify-center rounded-2xl w-full max-w-[200px] h-[200px]">
                    <h1 className="text-xl font-regular text-slate-100">
                      Upload Files
                    </h1>
                    <div className="flex gap-2 mb-2 ">
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
                          onClick={() => {
                            fileInputRef.current?.click();
                          }}
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

                    <div className="flex flex-row items-center gap-3  p-2 rounded-2xl">
                      <Button onClick={sendMessage}>Generate Notes</Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* end of surgery area */}

              <div className="flex-grow overflow-y-auto p-4 bg-slate-800 rounded-2xl m-2 w-full h-full  max-h-[90vh]">
                {messages.map((msg, index) => (
                  <div key={index} className={`p-2 rounded mb-2 bg-slate-00`}>
                    {/* AI Responses */}
                    {/* surgery area------------------------------------------------------------------------------------------------ */}
                    {msg.user === "AI" && (
                      <div className="text-sm">
                        {Array.isArray(msg.text) ? (
                          <div className="space-y-6 bg-slate-100">
                            {msg.text.map(
                              (section: Section, sectionIdx: number) => (
                                <div
                                  key={sectionIdx}
                                  className="bg-slate-700 p-4 rounded-lg"
                                >
                                  <h3 className="text-lg font-bold text-slate-200 mb-3">
                                    {section.title}
                                  </h3>
                                  <div className="space-y-2">
                                    {section.sentences.map(
                                      (sentence: Sentence) => (
                                        <Button
                                          asChild
                                          onClick={() =>
                                            handleSentenceClick(sentence)
                                          }
                                          className="bg-slate-700 hover:bg-slate-900 rounded cursor-pointer transition-colors shadow-none p-0 m-0"
                                        >
                                          <div className="pl-2 hover:p-2 hover:m-2 hover:shadow-md rounded cursor-pointer transition-colors">
                                            <p className="text-gray-400">
                                              {sentence.text}
                                            </p>
                                          </div>
                                        </Button>
                                      )
                                    )}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          <span>{String(msg.text)}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ResizablePanel>

            <>
              <ResizableHandle withHandle />
              <ResizablePanel
                className={` ${
                  showChat
                    ? "translate-x-0 w-full min-w-[400px] p-2 transition-transform duration-1000 ease-in-out transform"
                    : "hidden"
                }`}
              >
                <div className="rounded-2xl mx-2 w-full min-w-[400px] max-w-[700px] ">
                  <SideChat primeSentence={primeSentence} />
                </div>
              </ResizablePanel>
            </>
          </ResizablePanelGroup>
        </div>
      </div>
    </div>
  );
};

export default ChatClient;
