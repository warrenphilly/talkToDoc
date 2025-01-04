"use client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Message, Section, Sentence } from "@/lib/types";
import { UploadOutlined } from "@ant-design/icons";
import { Image, Upload as LucideUpload } from "lucide-react"; // Import icons
import React, { RefObject, useEffect, useRef, useState } from "react";
import { ResponseMessage } from "./ResponseMessage";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

import SideChat from "@/components/shared/global/SideChat";

import {
  fileUpload,
  sectionClick,
  sendMessage,
  sentenceClick,
} from "@/lib/utils";
import UploadArea from "./UploadArea";

const ChatClient = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(
    "Explain this to me to like you are an expert"
  );
  const [showUpload, setShowUpload] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [primeSentence, setPrimeSentence] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sideChatWidth, setSideChatWidth] = useState(300); // Initial width for SideChat

  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    setFiles: (files: File[]) => void
  ) => {
    fileUpload(event, setFiles);
  };

  const handleSentenceClick = (
    sentence: Sentence,
    setPrimeSentence: (sentence: string) => void,
    setShowChat: (show: boolean) => void
  ) => {
    sentenceClick(sentence, setPrimeSentence, setShowChat);
  };

  const handleSectionClick = (
    section: Section,
    setPrimeSentence: (sentence: string) => void,
    setShowChat: (show: boolean) => void
  ) => {
    sectionClick(section, setPrimeSentence, setShowChat);
  };

  const handleSendMessage = () => {
    sendMessage(input, files, setMessages, setInput, setFiles, setShowUpload);
  };

  const handleClear = () => {
    setMessages([]);
    setShowUpload(true);
    setShowChat(false);
    setPrimeSentence(null);
  };

  useEffect(() => {
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
              <UploadArea
                messages={messages}
                files={files}
                fileInputRef={fileInputRef as RefObject<HTMLInputElement>}
                handleFileUpload={(event) => handleFileUpload(event, setFiles)}
                handleSendMessage={handleSendMessage}
                handleClear={handleClear}
              />

              <div className="flex-grow overflow-y-auto p-4 bg-slate-800 rounded-2xl m-2 w-full h-full max-h-[90vh]">
                {messages.map((msg, index) => {
                  // Ensure msg.text is an array of Section[]
                  const sections = Array.isArray(msg.text) ? msg.text : [];

                  return (
                    <ResponseMessage
                      key={index}
                      index={index}
                      msg={{ user: msg.user, text: sections }}
                      handleSectionClick={(section) =>
                        handleSectionClick(section, setPrimeSentence, setShowChat)
                      }
                      handleSentenceClick={(sentence) =>
                        handleSentenceClick(sentence, setPrimeSentence, setShowChat)
                      }
                    />
                  );
                })}
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
