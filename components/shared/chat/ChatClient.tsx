"use client";
import ParagraphEditor from "@/components/ParagraphEditor";
import SeparatorWithAddButton from "@/components/SeparatorWithAddButton";
import QuizPanel from "@/components/shared/global/QuizPanel";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Textarea } from "@/components/ui/textarea";
import { Message, Section, Sentence } from "@/lib/types";
import { UploadOutlined } from "@ant-design/icons";
import { Image, Upload as LucideUpload } from "lucide-react"; // Import icons
import React, { RefObject, useEffect, useRef, useState } from "react";
import { ResponseMessage } from "./ResponseMessage";

import SideChat from "@/components/shared/global/SideChat";

import { saveNote, getNote } from "@/lib/firebase/firestore"; 
import {
  fileUpload,
  sectionClick,
  sendMessage,
  sentenceClick,
} from "@/lib/utils";
import UploadArea from "./UploadArea";
import { TitleEditor } from "./title-editor";

interface ChatClientProps {
  title: string;
  tabId: string;
}

const ChatClient = ({ title, tabId }: ChatClientProps) => {
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
  const [showQuiz, setShowQuiz] = useState(false);
  
  
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

  const handleSendMessage = async () => {
    await sendMessage(
      input,
      files,
      setMessages,
      setInput,
      setFiles,
      setShowUpload
    );
    // Save messages to Firestore whenever they change
    try {
      await saveNote(tabId, messages);
    } catch (error) {
      console.error("Error saving chat to Firestore:", error);
    }
  };

  const handleClear = () => {
    setMessages([]);
    setShowUpload(true);
    setShowChat(false);
    setPrimeSentence(null);
  };

  useEffect(() => {
    console.log(
      "messages(this value will be stores in the database):",
      messages
    );
  }, [messages]);

  // Load existing chat when component mounts
  useEffect(() => {
    const loadChat = async () => {
      try {
        const existingMessages = await getNote(tabId);
        if (existingMessages.length > 0) {
          setMessages(existingMessages);
        }
      } catch (error) {
        console.error('Error loading chat:', error);
      }
    };
    loadChat();
  }, [tabId]);

  // Save to Firestore whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      saveNote(tabId, messages).catch(error => {
        console.error('Error saving chat to Firestore:', error);
      });
    }
  }, [messages, tabId]);

  return (
    <div className="flex flex-col md:flex-row h-full bg-slate-100 w-full rounded-xl">
      <div className="flex flex-col  bg-slate-100  w-full mx-2">
        <div className="flex flex-row items-center justify-end w-full py-2 ">
       
          <div className="flex flex-row items-center justify-center w-fit mx-8 gap-4">
            <Button
              onClick={() => {
                setShowQuiz(!showQuiz);
              }}
              className="text-[#94b347] px-4 py-2 bg-slate-100 hover:bg-[#e9efda] rounded-2xl w-fit font-semibold"
            >
              Quiz Me
            </Button>
            <Button
              onClick={() => {
                setShowChat(!showChat);
              }}
              className="text-[#94b347] px-4 py-2 bg-slate-100 hover:bg-[#e9efda] rounded-2xl w-fit font-semibold"
            >
              {showChat ? "Close Chat" : "Talk to my notes"}
            </Button>
          </div>
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

              <div className="flex-grow overflow-y-auto p-4 bg-slate-200 rounded-2xl m-2 w-full h-full max-h-[90vh]">
                {messages.map((msg, index) => {
                  // Ensure msg.text is an array of Section[]
                  const sections = Array.isArray(msg.text) ? msg.text : [];

                  return (
                    <div className="">
                      <ResponseMessage
                        key={index}
                        index={index}
                        msg={{ user: msg.user, text: sections }}
                        handleSectionClick={(section) =>
                          handleSectionClick(
                            section,
                            setPrimeSentence,
                            setShowChat
                          )
                        }
                        handleSentenceClick={(sentence) =>
                          handleSentenceClick(
                            sentence,
                            setPrimeSentence,
                            setShowChat
                          )
                        }
                      />
                      <div>
                        {index}
                        <ParagraphEditor />
                      </div>
                    </div>
                  );
                })}
              </div>
            </ResizablePanel>

            <>
              <ResizableHandle withHandle />
              <ResizablePanel
                className={` ${
                  showChat || showQuiz
                    ? "translate-x-0  p-2 transition-transform duration-1000 ease-in-out transform rounded-2xl mx-2 w-full min-w-[400px] max-w-[700px]"
                    : "hidden"
                }`}
              >
                <div
                  className={` ${
                    showChat
                      ? "translate-x-0  p-2 transition-transform duration-1000 ease-in-out transform rounded-2xl mx-2 w-full min-w-[400px] max-w-[700px]"
                      : "hidden"
                  }`}
                >
                  <SideChat primeSentence={primeSentence} />
                </div>
                <div
                  className={` ${
                    showQuiz
                      ? "translate-x-0  p-2 transition-transform duration-1000 ease-in-out transform rounded-2xl mx-2 w-full min-w-[400px] max-w-[700px]"
                      : "hidden"
                  }`}
                >
                  <QuizPanel />
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
