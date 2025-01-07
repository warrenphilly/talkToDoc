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
import { Message, Section } from "@/lib/types";
import { UploadOutlined } from "@ant-design/icons";
import { Image, Upload as LucideUpload, MoreVertical } from "lucide-react"; // Import icons
import React, { RefObject, useEffect, useRef, useState } from "react";
import { ResponseMessage } from "./ResponseMessage";

import SideChat from "@/components/shared/global/SideChat";

import { saveNote, getNote, deleteNotebook, deletePage } from "@/lib/firebase/firestore";
import {
  fileUpload,
  sectionClick,
  sendMessage,
  sentenceClick,
} from "@/lib/utils";
import UploadArea from "./UploadArea";
import { TitleEditor } from "./title-editor";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ParagraphData } from "@/lib/types";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";

interface ChatClientProps {
  title: string;
  tabId: string;
  notebookId: string;
  onPageDelete?: (pageId: string) => void;
}

const ChatClient = ({ title, tabId, notebookId, onPageDelete }: ChatClientProps) => {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(
    "Explain this to me to like you are an expert"
  );

  const [showUpload, setShowUpload] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [primeSentence, setPrimeSentence] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sideChatWidth, setSideChatWidth] = useState(300); // Initial width for SideChat
  const [showQuiz, setShowQuiz] = useState(false);
  const [isSaving, setIsSaving] = useState(false);


  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    setFiles: (files: File[]) => void
  ) => {
    fileUpload(event, setFiles);
  };

  const handleSentenceClick = (
    sentence: {
      id: number;
      text: string;
    },
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

    try {
      await saveNote(notebookId, tabId, messages);
    } catch (error) {
      console.error("Error saving chat:", error);
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

  // Load messages when component mounts
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const pageData = await getNote(notebookId, tabId);
        if (pageData?.messages) {
          setMessages(pageData.messages);
          if(pageData.messages.length === 0){
            setShowUpload(true)
          }
          else{
            setShowUpload(false)
          }
        }
      } catch (error) {
        console.error("Error loading messages:", error);
      }
    };

    loadMessages();
  }, [notebookId, tabId]);

  // Save messages whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      saveNote(notebookId, tabId, messages).catch((error) => {
        console.error("Error saving messages:", error);
      });
    }
  }, [messages, notebookId, tabId]);

  const handleParagraphSave = async (paragraphData: ParagraphData, index: number) => {
    if (!paragraphData?.text) {
      console.error('Invalid paragraph data');
      return;
    }

    setIsSaving(true);
    try {
      const newMessage: Message = {
            
            text: paragraphData.text,
            user: 'AI'
      };

      const updatedMessages = JSON.parse(JSON.stringify(messages));
      updatedMessages.splice(index + 1, 0, newMessage);
      
      setMessages(updatedMessages);
      console.log('updatedMessages', updatedMessages)
      await saveNote(notebookId, tabId, updatedMessages);
    } catch (error) {
      console.error("Error saving paragraph:", error);
      setMessages(messages); // Revert on error
      // Optionally show an error toast/notification here
    } finally {
      setIsSaving(false);
    }
  };

  const handleMessageEdit = async (editedData: ParagraphData | null, index: number) => {
    if (!editedData) {
      // This is just the initial edit click, not the actual save
      return;
    }

    try {
      const updatedMessages = [...messages];
      updatedMessages[index] = {
        user: 'AI',
        text: editedData.text
      };
      setMessages(updatedMessages);
      await saveNote(notebookId, tabId, updatedMessages);
    } catch (error) {
      console.error("Error updating message:", error);
      setMessages(messages);
    }
  };

  const handleMessageDelete = async (index: number) => {
    try {
      const updatedMessages = [...messages];
      updatedMessages.splice(index, 1);
      setMessages(updatedMessages);
      await saveNote(notebookId, tabId, updatedMessages);
    } catch (error) {
      console.error("Error deleting message:", error);
      setMessages(messages); // Revert on error
    }
  };

  const handleDeletePage = async () => {
    try {
      await deletePage(notebookId, tabId);
      onPageDelete?.(tabId); // Call the callback to update tabs
    } catch (error) {
      console.error("Error deleting page:", error);
    }
  };

  const handleDeleteNotebook = async () => {
    try {
      await deleteNotebook(notebookId);
      router.push('/'); // Redirect to home page
    } catch (error) {
      console.error("Error deleting notebook:", error);
      // Optionally add error handling UI here
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full bg-slate-100 w-full rounded-xl overflow-hidden">
      <div className="flex flex-col bg-slate-100 w-full mx-2 overflow-hidden">
        <div className="flex flex-row items-center justify-between w-full py-2">
          <div className="flex flex-row gap-2 items-center justify-between px-7">
            <Button
              onClick={() => setShowUpload(!showUpload)}
              className={`bg-slate-100 shadow-none border border-slate-400 hover:border-[#94b347] hover:text-[#94b347] hover:bg-slate-100 text-slate-500 rounded-2xl w-fit ${
                messages.length > 0 ? "block" : "hidden"
              }`}
            >
              {showUpload ? "Close Uploads" : "Uploaded Files"}
            </Button>
          </div>

          <div className="flex flex-row items-center justify-center w-fit mx-8 gap-4">
            <Button
              onClick={() => {
                setShowQuiz(!showQuiz);
              }}
              className="text-slate-500 px-4 py-2 bg-slate-100 hover:border-[#94b347] hover:text-[#94b347] hover:bg-slate-100 rounded-2xl w-fit font-semibold  border border-slate-400 shadow-none"
            >
              Quiz Me
            </Button>
            <Button
              onClick={() => {
                setShowChat(!showChat);
              }}
              className="text-slate-500 px-4 py-2 bg-slate-100 hover:border-[#94b347] hover:text-[#94b347] hover:bg-slate-100 rounded-2xl w-fit font-semibold  border border-slate-400 shadow-none"
            >
              {showChat ? "Close Chat" : "Talk to my notes"}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger className="bg-slate-100  rounded-full w-fit ">
                <Button className="bg-slate-100 rounded-full w-fit shadow-none border border-slate-400 text-slate-500 hover:border-[#94b347] hover:text-[#94b347] hover:bg-slate-100">
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-slate-100 p-0">
                <DropdownMenuItem className="w-full bg-green-500 p-0">
                  <Button
                    onClick={handleClear}
                    className={`bg-slate-100 shadow-none text-red-500 hover:bg-red-200 rounded-none w-full`}
                  >
                    Clear Page
                  </Button>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="m-0 p-0 bg-slate-300"  />
                <DropdownMenuItem className="w-full hover:bg-red-500 p-0">
                  <Button
                    onClick={handleDeletePage}
                    className={`bg-slate-100 shadow-none hover:bg-red-200 rounded-none m-0 text-red-500  w-full`}
                  >
                    Delete Page
                  </Button>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="m-0 p-0 bg-slate-300" />
                <DropdownMenuItem className="w-full hover:bg-red-500 p-0 m-0">
                  <Button
                    onClick={handleDeleteNotebook}
                    className={`bg-slate-100 shadow-none hover:bg-red-200 text-red-500  rounded-none w-full `}
                  >
                    Delete Notebook
                  </Button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex flex-col md:flex-row justify-start h-[calc(100%-3rem)] overflow-hidden">
          <ResizablePanelGroup direction="horizontal" className="w-full px-2">
            <ResizablePanel className="w-full p-2 min-w-[600px] flex flex-col gap-2 h-full overflow-hidden">
              <UploadArea
                messages={messages}
                files={files}
                showUpload={showUpload}
                fileInputRef={fileInputRef as RefObject<HTMLInputElement>}
                handleFileUpload={(event) => handleFileUpload(event, setFiles)}
                handleSendMessage={handleSendMessage}
                handleClear={handleClear}
              />

              <div className="flex flex-col overflow-y-auto p-4 bg-slate-100  rounded-t-2xl m-2 w-full h-full">
                <ParagraphEditor 
                  onSave={(data: ParagraphData) => handleParagraphSave(data, 0)}
                  messageIndex={0}
                />
                {messages.map((msg, index) => {
                  const sections = Array.isArray(msg.text) ? msg.text : [];

                  return (
                    <div key={`message-${index}`} className="">
                      {msg.user === "AI" && (
                        <>
                        <ResponseMessage
                          key={`response-${index}`}
                          index={index}
                          msg={{ user: msg.user, text: sections }}
                          handleSectionClick={(section) =>
                            handleSectionClick(section, setPrimeSentence, setShowChat)
                          }
                          handleSentenceClick={(sentence) =>
                            handleSentenceClick(sentence, setPrimeSentence, setShowChat)
                          }
                          onEdit={() => handleMessageEdit(null, index)}
                          onDelete={() => handleMessageDelete(index)}
                          onSave={(data) => handleMessageEdit(data, index)}
                        />
                       
                        <div key={`editor-${index}`}>
                          <ParagraphEditor 
                            
                            onSave={(data: ParagraphData) => handleParagraphSave(data, index) }
                            messageIndex={index}
                          />
                        </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </ResizablePanel>
         

            <>
              <ResizableHandle withHandle  />
              <ResizablePanel
                className={` ${
                  showChat || showQuiz
                    ? "translate-x-0 flex flex-col gap-2   p-2 transition-transform duration-1000 ease-in-out transform rounded-none mx-2 w-full min-w-[400px] max-w-[700px]"
                    : "hidden"
                }`}
              >
                
                <div
                  className={` ${
                    showChat
                      ? "translate-x-0  p-2 border border-slate-300 h-full transition-transform duration-1000 ease-in-out transform rounded-2xl mx-2 w-full min-w-[400px] max-w-[700px]"
                      : "hidden"
                  }`}
                >
                  <SideChat primeSentence={primeSentence} setPrimeSentence={setPrimeSentence} />
                </div>

                <div
                  className={` ${
                    showQuiz
                      ? "translate-x-0  p-2 border border-slate-300 h-full transition-transform duration-1000 ease-in-out transform rounded-2xl mx-2 w-full min-w-[400px] max-w-[700px]"
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
