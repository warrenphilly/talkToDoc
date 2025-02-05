"use client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteSideChat,
  getSideChat,
  saveSideChat,
  updateSideChat,
  
} from "@/lib/firebase/firestore";
import { Image, Upload } from "lucide-react"; // Import icons
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import ChatActions from "./ChatActions";
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
  role?: string;
  content?: string;
  system?: boolean;
  systemMessage?: string;
  systemRole?: string;
  systemContent?: string;
  systemFiles?: string[];
}

interface ContextSection {
  id: string;
  text: string;
  timestamp: number;
}

interface SideChatProps {
  notebookId: string;
  pageId: string;
  primeSentence: string | null;
  setPrimeSentence: (sentence: string | null) => void;
}

interface SideChatProps {
  notebookId: string;
  pageId: string;
  primeSentence: string | null;
  setPrimeSentence: (sentence: string | null) => void;
}

const SideChat = ({
  primeSentence,
  setPrimeSentence,
  notebookId,
  pageId,
}: SideChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sideChatId, setSideChatId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [contextSections, setContextSections] = useState<ContextSection[]>([]);

  const { user } = useUser();

  // Add new context section
  const addContextSection = async (text: string) => {
    if (contextSections.length >= 3) {
      alert("Maximum of 3 context sections allowed. Please remove one first.");
      return;
    }

    const newSection: ContextSection = {
      id: crypto.randomUUID(),
      text,
      timestamp: Date.now(),
    };

    // Update local state immediately
    setContextSections(prev => [...prev, newSection]);

     try {
       if (sideChatId) {
         await updateSideChat(sideChatId, [...contextSections, newSection], messages);
       } 
       //else {
    //     const newSideChatId = await saveSideChat(
    //       notebookId,
    //       pageId,
    //       [newSection],
    //       []
    //     );
    //     setSideChatId(newSideChatId);
    //   }
    } catch (error) {
      // Revert local state if update fails
      setContextSections(prev => prev.filter(section => section.id !== newSection.id));
      console.error("Error adding context section:", error);
   }
  };

  // Remove context section
   const removeContextSection = async (sectionId: string) => {
  //   // Store previous state in case we need to revert
     const previousSections = [...contextSections];
    
  //   // Update local state immediately
    setContextSections(prev => prev.filter(section => section.id !== sectionId));

    try {
      if (sideChatId) {
        const updatedSections = contextSections.filter(
          section => section.id !== sectionId
        );
        await updateSideChat(sideChatId, updatedSections, messages);
        
        // If this was the last context section, clear the prime sentence
        if (updatedSections.length === 0) {
          setPrimeSentence(null);
        }
      }
    } catch (error) {
      // Revert local state if update fails
      setContextSections(previousSections);
      console.error("Error removing context section:", error);
    }
  };

  // Effect to handle primeSentence changes
  useEffect(() => {
    if (primeSentence) {
      // Check if the primeSentence already exists in contextSections
      const sentenceExists = contextSections.some(
        section => section.text === primeSentence
      );
      
      // Only add if the sentence doesn't already exist
      if (!sentenceExists) {
        addContextSection(primeSentence);
      }
    }
  }, [primeSentence]);

  // Initialize side chat
  useEffect(() => {
    const initializeSideChat = async () => {
      
      setIsLoading(true);
      try {
        // First check if a sidechat exists for this page
        const existingSideChat = await getSideChat(notebookId, pageId);
      

        if (existingSideChat) {
    
          setSideChatId(existingSideChat?.id || null  );
          setMessages(existingSideChat?.messages || []);
          setContextSections(existingSideChat?.contextSections || []);
          
          // Set primeSentence to the most recent context section if it exists
          if (existingSideChat?.contextSections?.length && existingSideChat?.contextSections?.length > 0) {
            const mostRecentContext = existingSideChat?.contextSections
              .sort((a, b) => b.timestamp - a.timestamp)[0];
            setPrimeSentence(mostRecentContext?.text || null);
          }
        }
      
      } catch (error) {
        console.error("Error initializing side chat:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (notebookId && pageId) {
      initializeSideChat();
    }
  }, [notebookId, pageId]);

  const sendMessage = async (messageText: string = input) => {
    if (!messageText.trim() && files.length === 0) return;

    try {
      
      const formData = new FormData();
      formData.append("userMessage", messageText);
      formData.append("notebookId", notebookId);
      formData.append("pageId", pageId);
      
      // Add context sections to the request
      const contextText = contextSections.map(section => section.text).join("\n\n");
      formData.append("contextSections", contextText);

      formData.append("systemMessage", `You are a helpful Teacher...`);

      const userMessage: Message = {
        user: "User",
        text: messageText,
        files: files.map((file) => URL.createObjectURL(file)),
      };

      // Create new messages array first
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setInput("");
      setFiles([]);

      const response = await fetch("/api/sidechat", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const aiMessage = {
        user: "AI",
        text: data.reply,
        usedExternalContext: data.usedExternalContext // Track if external context was used
      };

      const finalMessages = [...newMessages, aiMessage];
      setMessages(finalMessages);

      try {
        if (sideChatId) {
        

          await updateSideChat(
            sideChatId,
            contextSections,
            finalMessages
          );
    
        } else {
          

          if (!primeSentence) {
            console.warn(
              "No selected text available, creating with empty string"
            );
          }

          const newSideChatId = await saveSideChat(
            notebookId,
            pageId,
            contextSections,
            finalMessages
          );
          
          setSideChatId(newSideChatId);
        }
      } catch (saveError) {
        console.error("Error saving/updating side chat:", saveError);
        throw saveError;
      }
    } catch (error) {
      console.error("Error in sendMessage:", error);
      const errorMessage = {
        user: "AI",
        text: "Sorry, there was an error. Please try again.",
      };
      setMessages([...messages, errorMessage]);
    }
  };

  const handleClearChat = async () => {
    try {
      if (sideChatId) {
        // Clear local state immediately
        setMessages([]);
        setContextSections([]);
        setPrimeSentence(null);
        
        // Delete the entire side chat from the database
        await deleteSideChat(sideChatId);
        setSideChatId(null);
      }
    } catch (error) {
      console.error("Error clearing chat:", error);
      // Optionally restore state if deletion fails
      const existingSideChat = await getSideChat(notebookId, pageId);
      if (existingSideChat) {
        setMessages(existingSideChat.messages || []);
        setContextSections(existingSideChat.contextSections || []);
      }
    }
  };

  // Render context sections with animation


  return (
    <div className="flex flex-col  h-full w-full border-3 bg-white rounded-2xl mb-4 max-h-[90vh] p-3 justify-center items-center">
      {/* Header section */}
      <div className="grid grid-cols-3 items-center gap-2 sm:gap-4">
        <Button
          className="bg-white hover:bg-red-200 w-fit text-sm sm:text-base text-slate-400 border-slate-400 rounded-full border hover:border-red-600 hover:text-red-600"
          onClick={handleClearChat}
        >
          Clear
        </Button>
        <div className="flex flex-row items-center justify-center">
          <h1 className="text-lg sm:text-xl font-semibold text-[#94b347] truncate">Talk to Notes</h1>
        </div>
      </div>

      {/* Messages section */}
      {messages.length > 0 ? (
        <div className="flex-grow p-2 sm:p-4 overflow-y-auto auto-scroll">
          {messages.map(
            (msg, index) =>
              msg.text &&
              (msg.user === "User" || msg.user === "AI") && (
                <div
                  key={index}
                  className={`p-2 rounded mb-2 ${
                    msg.user === "User"
                      ? "border border-slate-400 shadow-sm rounded-lg text-slate-600"
                      : "border border-[#94b347] text-base sm:text-lg text-[#94b347] my-4 rounded-lg"
                  }`}
                >
                  {msg.user === "AI" ? (
                    <div className="text-sm sm:text-md font-semibold">
                      <strong>Mr. Chudd (AI):</strong> <span>{String(msg.text)}</span>
                    </div>
                  ) : (
                    <div className="text-sm sm:text-md font-semibold">
                      <strong>{user?.firstName}:</strong> <span>{String(msg.text)}</span>
                    </div>
                  )}
                </div>
              )
          )}
        </div>
      ) : (
        <div className="flex-grow w-full h-full flex flex-col items-center justify-center p-2 sm:p-4 overflow-y-auto auto-scroll">
          <p className="text-gray-400 text-center text-sm sm:text-base max-w-sm">
            Hey there, my little academic weapon in the making. I'm Mr. Chudd, your AI tutor. Together, we shall pass!
          </p>
        </div>
      )}

      {/* Input section */}
      <div className="m-2 bottom-0 w-full border border-slate-300 rounded-lg p-2">







        
        <ChatActions 
          sendMessage={sendMessage} 
          contextSections={contextSections} 
          removeContextSection={removeContextSection}
        />
        <div className="flex bg-white rounded-lg p-2 flex-row items-center gap-2 sm:gap-3 h-fit">
          <Textarea
            className="w-full h-fit border shadow-none border-slate-300 rounded-lg bg-slate-50 text-slate-900 flex-grow text-sm sm:text-base"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && !e.shiftKey && sendMessage(input)
            }
          />
          <Button
            className="bg-[#94b347] text-white text-sm sm:text-base px-2 sm:px-4"
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
