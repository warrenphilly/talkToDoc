"use client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Image, Upload } from "lucide-react"; // Import icons
import React, { useEffect, useRef, useState } from "react";
import { saveSideChat, updateSideChat, getSideChat, deleteSideChat } from "@/lib/firebase/firestore";

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

interface SideChatProps {
  primeSentence: string | null;
  setPrimeSentence: (primeSentence: string | null) => void;
  notebookId: string;
  pageId: string;
}

const SideChat = ({ 
  primeSentence: initialPrimeSentence,
  setPrimeSentence, 
  notebookId, 
  pageId 
}: SideChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sideChatId, setSideChatId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [primeSentence, setPrimeSentenceLocal] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update both local and parent state when prime sentence changes
  const updatePrimeSentence = (newPrimeSentence: string | null) => {
    setPrimeSentenceLocal(newPrimeSentence);
    setPrimeSentence(newPrimeSentence);
  };

  useEffect(() => {
    const initializeSideChat = async () => {
      setIsLoading(true);
      try {
        const existingSideChat = await getSideChat(notebookId, pageId);
        
        if (existingSideChat) {
          console.log("Loading existing side chat:", existingSideChat);
          setSideChatId(existingSideChat.id);
          setMessages(existingSideChat.messages);
          updatePrimeSentence(existingSideChat.primeSentence);
        } else if (initialPrimeSentence) {
          console.log("Creating new side chat");
          const newSideChatId = await saveSideChat(
            notebookId, 
            pageId, 
            initialPrimeSentence, 
            []
          );
          setSideChatId(newSideChatId);
          updatePrimeSentence(initialPrimeSentence);
          setMessages([]);
        }
      } catch (error) {
        console.error("Error initializing side chat:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSideChat();
  }, [notebookId, pageId]);

  const sendMessage = async (messageText: string = input) => {
    if (!messageText.trim() && files.length === 0) return;

    const formData = new FormData();
    formData.append("message", messageText);
    formData.append("context", primeSentence || "");
    files.forEach((file) => {
      formData.append("files", file);
    });

    const userMessage = {
      user: "User",
      text: messageText,
      files: files.map((file) => URL.createObjectURL(file)),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setFiles([]);

    try {
      const response = await fetch("/api/sidechat", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      const aiMessage = {
        user: "AI",
        text: data.reply,
      };

      const finalMessages = [...updatedMessages, aiMessage];
      setMessages(finalMessages);

      if (sideChatId) {
        await updateSideChat(sideChatId, primeSentence, finalMessages);
      } else if (initialPrimeSentence) {
        const newSideChatId = await saveSideChat(
          notebookId, 
          pageId, 
          initialPrimeSentence, 
          finalMessages
        );
        setSideChatId(newSideChatId);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = {
        user: "AI",
        text: "Sorry, there was an error. Please try again.",
      };
      setMessages([...updatedMessages, errorMessage]);
    }
  };

  const handleClearChat = async () => {
    try {
      if (sideChatId) {
        await deleteSideChat(sideChatId);
        setSideChatId(null);
        setMessages([]);
        updatePrimeSentence(null);
      }
    } catch (error) {
      console.error("Error clearing chat:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full border-3 bg-slate-200 rounded-2xl mb-4 max-h-[90vh] p-3 overflow-y-auto">
      <div className="flex flex-row items-center justify-center">
      <h1 className='text-xl font-regular text-[#94b347]'>Talk to Notes</h1>
      </div>
      
      <div className="border border-slate-400 text-[#94b347] rounded-lg   p-4 m-4">
        
        <div className="m-2">
          {initialPrimeSentence ? (
            <p>"{initialPrimeSentence}"</p>
          ) : (
            <p className="text-gray-500">Click a Sentence to add context</p>
          )}
        </div>
        <div className="h-px bg-slate-300" />
        <div className="flex flex-row gap-2 w-full items-center justify-center m-4">
          <Button
            className="bg-[#94b347] text-white"
            onClick={() => sendMessage("Explain this in greater detail")}
            disabled={initialPrimeSentence == null}
          >
            Explain{" "}
          </Button>
          <Button
            className="bg-[#94b347] text-white"
            onClick={() => sendMessage("Give me a step-by-step example")}
            disabled={initialPrimeSentence == null}
          >
            Give Example{" "}
          </Button>
          <Button
            className="bg-[#94b347] text-white"
            onClick={() => setPrimeSentence(null)}
            disabled={initialPrimeSentence == null}
          >
            Clear Context{" "}
          </Button>
          <Button
            className="bg-red-500 hover:bg-red-600 text-white"
            onClick={handleClearChat}
            disabled={!sideChatId}
          >
            Clear Chat
          </Button>
        </div>
      </div>
      <div className="flex-grow overflow-y-auto p-4 auto-scroll">
        {messages.map(
          (msg, index) =>
            msg.text &&
            (msg.user === "User" || msg.user === "AI") && (
              <div
                key={index}
                className={`p-2 rounded mb-2 ${
                  msg.user === "User"
                    ? "bg-slate-100 shadow-sm rounded-lg text-slate-400"
                    : "border border-[#94b347] text-lg text-[#94b347]"
                }`}
              >
                {msg.user === "AI" ? (
                  <div className="text-sm">
                    <strong className="block mb-4 text-lg">{msg.user}:</strong>
                    {Array.isArray(msg.text) ? (
                      <div className="space-y-6 ">
                        {msg.text.map(
                          (section: Section, sectionIdx: number) => (
                            <div
                              key={sectionIdx}
                              className="bg-white p-4 rounded-lg shadow"
                            >
                              {/* <h3 className="text-lg font-bold text-gray-100 mb-3">
                                {section.title}
                              </h3> */}
                              <div className="space-y-2">
                                {section.sentences.map((sentence: Sentence) => (
                                  <div className="p-2 bg-gray-50 hover:bg-gray-100 rounded cursor-pointer transition-colors">
                                    <p className="text-gray-100">
                                      {sentence.text}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <span>{String(msg.text)}</span>
                    )}
                  </div>
                ) : (
                  <div className="text-sm">
                    <strong>{msg.user}:</strong> <span>{String(msg.text)}</span>
                    {msg.files && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {msg.files.map((fileUrl: string, idx: number) => (
                          <img
                            key={idx}
                            src={fileUrl}
                            alt={`Uploaded file ${idx + 1}`}
                            className="max-w-[200px] max-h-[200px] object-cover rounded"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
        )}
      </div>
      <div className="bg-slate-200 p-4  rounded-b-lg">
        <div className="flex  bg-slate-100 rounded-lg  p-2 flex-row items-center gap-3 h-fit">
          <Textarea
            className="w-full h-fit border shadow-none border-slate-200 rounded-lg bg-slate-100 text-slate-900 flex-grow"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && !e.shiftKey && sendMessage(input)
            }
          />
          <Button
            className="bg-[#94b347] text-white"
            onClick={() => sendMessage(input)}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SideChat;
