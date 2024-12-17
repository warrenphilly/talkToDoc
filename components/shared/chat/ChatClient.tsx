"use client";
import React, { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Upload, Image } from "lucide-react"; // Import icons

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import SideChat from "./SideChat";
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
    files.forEach((file) => {
      formData.append("files", file);
    });

    const userMessage = {
      user: "User",
      text: input,
      files: files.map((file) => URL.createObjectURL(file)),
    };

    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput("");
    setFiles([]);

    const maxRetries = 3;
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
          if (!data.reply) {
            throw new Error("No reply in response");
          }

          parsedResponse =
            typeof data.reply === "string"
              ? JSON.parse(data.reply)
              : data.reply;

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

          const aiMessage = {
            user: "AI",
            text: parsedResponse,
          };

          setMessages((prevMessages) => [...prevMessages, aiMessage]);
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
  };

  useEffect(() => {
    if(messages.length > 0){
      setShowUpload(false);
    }
  }, [messages]);

  return (
    <div className="flex flex-row h-screen bg-slate-900 ">
      <div className="flex flex-col h-screen bg-gray-100 w-full  bg-slate-900  container ">
        <div className="flex flex-row items-center justify-between ">
        <div className=" text-white p-4 bg-slate-800 rounded-2xl w-fit my-5 font-semibold">
          <h1 className="text-xl font-regular ">Enhanced Notes</h1>
        </div>
       
          <Button onClick={() => {setShowChat(!showChat); setPrimeSentence(null)}} className="text-white px-4 py-2 bg-slate-800 rounded-full w-fit m-5 font-semibold "> 
            {showChat ? "Close Chat" : "Talk to my notes"}
          </Button>
 
        </div>
        <div className="flex flex-row  justify-center h-screen">
        <div className="flex-grow overflow-y-auto p-4 bg-slate-800 rounded-2xl">


















          {showUpload && (
            <div className=" w-full flex flex-col gap-2 items-center justify-center rounded-2xl ">
              <div className="bg-slate-700 p-4 border-t flex flex-col gap-2 items-center justify-center rounded-2xl w-full max-w-lg ">
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
                  <Button
                    variant="outline"
                    onClick={() => {fileInputRef.current?.click(); }}
                    className="flex items-center gap-2"
                  >
                    <Upload size={16} />
                    Upload Files
                  </Button>
                  {files.length > 0 && (
                    <span className="text-sm text-gray-500 self-center">
                      {files.length} file(s) selected
                    </span>
                  )}
                </div>

                <div className="flex flex-row items-center gap-3">
                  <Button onClick={sendMessage}>Generate Notes</Button>
                </div>
              </div>
            </div>
          ) }




          {/* if the user has not uploaded any files */}

          {messages.map((msg, index) => (
            <div key={index} className={`p-2 rounded  mb-2 bg-slate-800`}>
              {msg.user === "AI" ? (
                <div className="text-sm">
                  {Array.isArray(msg.text) ? (
                    <div className="space-y-6">
                      {msg.text.map((section: Section, sectionIdx: number) => (
                        <div
                          key={sectionIdx}
                          className="bg-slate-800 p-4 rounded-lg "
                        >
                          <h3 className="text-lg font-bold text-gray-500 mb-3">
                            {section.title}
                          </h3>
                          <div className="space-y-2">
                            {section.sentences.map((sentence: Sentence) => (
                              <Button
                                asChild
                                onClick={() => handleSentenceClick(sentence)}
                              >
                                <div className="p-2 bg-slate-900 hover:bg-gray-100 rounded cursor-pointer transition-colors">
                                  <p className="text-gray-400">
                                    {sentence.text}
                                  </p>
                                </div>
                              </Button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span>{String(msg.text)}</span>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2 items-center justify-center rounded-2xl w-full">
                <div className="text-sm bg-slate-700 p-5 flex flex-col gap-2 items-center justify-center rounded-2xl w-full max-w-lg ">
               
                
                  {/* <strong>{msg.user}:</strong> <span>{String(msg.text)}</span> */}
                  <p className="text-gray-500">Uploaded files</p>
                  {msg.files && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {msg.files.map((fileUrl: string, idx: number) => (
                        <img
                          key={idx}
                          src={fileUrl}
                          alt={`Uploaded file ${idx + 1}`}
                          className="max-w-[400px] max-h-[400px] object-cover rounded"
                        />
                      ))}
                    </div>
                  )}
                </div>
                <Button onClick={() => {setMessages([]); setShowUpload(true); setShowChat(false); setPrimeSentence(null);}}>Clear Notes</Button>
                </div>
              )}
            </div>
          ))}
        </div>



        {showChat && (
        <div className="w-[400px] rounded-2xl">
          <SideChat primeSentence={primeSentence} />
        </div>
      )}
      </div>
      </div>
     
    </div>
  );
};

export default ChatClient;
