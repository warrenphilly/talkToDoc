"use client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteSideChat,
  getSideChat,
  saveSideChat,
  updateSideChat,
} from "@/lib/firebase/firestore";
import { Image, Send, Trash2, X, RefreshCw } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import ChatActions from "./ChatActions";
import { AnimatePresence, motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast"
import { AlertCircle } from "lucide-react";

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
  const [isSending, setIsSending] = useState(false);
  const [contextSections, setContextSections] = useState<ContextSection[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { user } = useUser();
  const { toast } = useToast();

  // Add state for tracking last refresh
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  
  // Function to refresh context data
  const refreshContextData = async () => {
    try {
      setIsLoading(true);
      const existingSideChat = await getSideChat(notebookId, pageId);
      
      if (existingSideChat) {
        setSideChatId(existingSideChat.id || null);
        setMessages(existingSideChat.messages || []);
        setContextSections(existingSideChat.contextSections || []);
      } else {
        // Reset to empty state if no sidechat exists
        setSideChatId(null);
        setMessages([]);
        setContextSections([]);
      }
    } catch (error) {
      console.error("Error refreshing context data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Add a manual refresh button
  const handleRefresh = () => {
    setLastRefresh(Date.now());
  };

  // Enhanced initialization effect
  useEffect(() => {
    if (notebookId && pageId) {
      refreshContextData();
    }
  }, [notebookId, pageId, lastRefresh]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Add new context section
  const addContextSection = async (text: string) => {
    if (contextSections.length >= 3) {
      toast({
        variant: "destructive",
        title: "Maximum Context Reached",
        description: "You can only add up to 3 context sections. Please remove one first.",
      });
      return;
    }

    const isDuplicate = contextSections.some(section => section.text === text);
    if (isDuplicate) {
      toast({
        title: "Section Already Added",
        description: "This section is already in your context.",
      });
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
        
        toast({
          title: "Context Added",
          description: "New context section added successfully.",
        });
      } else {
        const newSideChatId = await saveSideChat(notebookId, pageId, [newSection], []);
        setSideChatId(newSideChatId);
        
        toast({
          title: "Context Added",
          description: "First context section added.",
        });
      }
    } catch (error) {
      // Revert local state if update fails
      setContextSections(prev => prev.filter(section => section.id !== newSection.id));
      console.error("Error adding context section:", error);
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add context. Please try again.",
      });
    }
  };

  // Remove context section
  const removeContextSection = async (sectionId: string) => {
    // Store previous state in case we need to revert
    const previousSections = [...contextSections];
    
    // Update local state immediately
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
        
        toast({
          title: "Context Removed",
          description: "Context section removed successfully.",
        });
      }
    } catch (error) {
      // Revert local state if update fails
      setContextSections(previousSections);
      console.error("Error removing context section:", error);
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove context. Please try again.",
      });
    }
  };

  // Effect to handle primeSentence changes
  useEffect(() => {
    if (primeSentence) {
      // First refresh the context data to get latest state
      refreshContextData().then(() => {
        // After refresh, check if the primeSentence already exists
        const sentenceExists = contextSections.some(
          section => section.text === primeSentence
        );
        
        // Only add if the sentence doesn't already exist
        if (!sentenceExists) {
          addContextSection(primeSentence);
        }
      });
    }
  }, [primeSentence]);

  const sendMessage = async (messageText: string = input) => {
    if (!messageText.trim() && files.length === 0) return;

    setIsSending(true);
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
    } finally {
      setIsSending(false);
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

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  };

  // Placeholder loading bubbles
  const LoadingPlaceholder = () => (
    <div className="flex flex-col gap-3 p-4 w-full">
      <div className="flex items-start gap-3 max-w-[80%]">
        <Skeleton className="w-8 h-8 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-16 w-60" />
        </div>
      </div>
      <div className="flex items-start gap-3 max-w-[80%] self-end">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24 ml-auto" />
          <Skeleton className="h-12 w-48" />
        </div>
        <Skeleton className="w-8 h-8 rounded-full" />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full rounded-2xl py-6 max-h-[90vh] bg-white overflow-hidden relative">
      {/* Header section */}
      <div className="bg-white py-3 px-4 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Button
            className="bg-white hover:bg-red-50 text-sm text-red-400 border border-red-200 rounded-full hover:text-red-600 hover:border-red-400 flex items-center gap-1.5 px-3 py-1.5 h-auto"
            onClick={handleClearChat}
          >
            <Trash2 size={14} />
            <span>Clear</span>
          </Button>
          
          {/* Add refresh button */}
          <Button
            className="bg-white hover:bg-blue-50 text-sm text-blue-400 border border-blue-200 rounded-full hover:text-blue-600 hover:border-blue-400 h-auto px-2 py-1.5"
            onClick={refreshContextData}
            disabled={isLoading}
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          </Button>
        </div>
        
        <h1 className="text-lg font-semibold text-[#94b347] flex items-center gap-2">
          Talk to Notes
        </h1>
      </div>
      
      {/* Context Section Counter */}
     
      
      {/* Chat Actions */}
      <ChatActions 
        sendMessage={sendMessage} 
        contextSections={contextSections} 
        removeContextSection={removeContextSection}
      />
      
      {/* Messages section */}
      <div className="flex-grow p-2 sm:p-4 overflow-y-auto relative">
        {isLoading ? (
          <LoadingPlaceholder />
        ) : messages.length > 0 ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {messages.map((msg, index) => (
              <AnimatePresence key={index} mode="wait">
                {msg.text && (msg.user === "User" || msg.user === "AI") && (
                  <motion.div
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, y: -20 }}
                    className={`p-3 rounded-2xl ${
                      msg.user === "User"
                        ? "bg-white border border-gray-200 text-slate-700 ml-auto max-w-[80%]"
                        : "bg-[#94b347]/10 border border-[#94b347]/20 text-gray-800 mr-auto max-w-[80%]"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {msg.user === "AI" ? (
                        <div className="flex-1">
                          <p className="text-sm font-semibold mb-1 text-[#94b347]">
                            Mr. Chudd (AI)
                          </p>
                          <p className="text-sm leading-relaxed">{String(msg.text)}</p>
                        </div>
                      ) : (
                        <div className="flex-1">
                          <p className="text-sm font-semibold mb-1 text-slate-600">
                            {user?.firstName || "You"}
                          </p>
                          <p className="text-sm leading-relaxed">{String(msg.text)}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            ))}
            <div ref={messagesEndRef} />
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center h-full p-6 text-center"
          >
            <div className="bg-[#94b347]/10 p-6 rounded-2xl border border-[#94b347]/20 max-w-sm">
              <p className="text-gray-600 mb-3">
                Hey there, my little academic weapon in the making. I'm Mr. Chudd, your AI tutor.
              </p>
              <p className="text-[#94b347] font-medium">Select some text to get started!</p>
            </div>
          </motion.div>
        )}
        
        {/* Loading indicator for new message */}
        {isSending && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-[#94b347]/10 border border-[#94b347]/20 rounded-2xl max-w-[80%] mr-auto mt-3"
          >
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-[#94b347]">Mr. Chudd (AI)</p>
            </div>
            <div className="flex items-center gap-1 mt-2 ml-1">
              <motion.div 
                className="w-2 h-2 bg-[#94b347] rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity, repeatType: "loop" }}
              />
              <motion.div 
                className="w-2 h-2 bg-[#94b347] rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity, repeatType: "loop", delay: 0.2 }}
              />
              <motion.div 
                className="w-2 h-2 bg-[#94b347] rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity, repeatType: "loop", delay: 0.4 }}
              />
            </div>
          </motion.div>
        )}
      </div>
      
      {/* Input section */}
      <div className="bg-white p-3 border-t border-gray-100 sticky bottom-0 z-10">
        <div className="flex bg-white rounded-lg flex-row items-center gap-2 h-fit">
          <Textarea
            className="w-full border shadow-none border-gray-200 rounded-lg bg-gray-50 text-gray-800 flex-grow text-sm resize-none min-h-[44px] py-2.5 px-3"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage(input))}
            rows={1}
          />
          <Button
            className="bg-[#94b347] hover:bg-[#7a9639] text-white px-3 h-[44px] rounded-lg transition-all duration-200 flex items-center justify-center"
            onClick={() => sendMessage(input)}
            disabled={isSending}
          >
            <Send size={18} className={isSending ? "opacity-70" : ""} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SideChat;
