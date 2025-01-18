"use client";
import ParagraphEditor from "@/components/ParagraphEditor";
import SeparatorWithAddButton from "@/components/SeparatorWithAddButton";
import ExpandableContainer from "@/components/expandable-container";
import QuizPanel from "@/components/shared/global/QuizPanel";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Textarea } from "@/components/ui/textarea";
import { Message, Section, ContextSection } from "@/lib/types";
import { UploadOutlined } from "@ant-design/icons";
import {
  Image,
  Upload as LucideUpload,
  Maximize2,
  Minimize2,
  MoreVertical,
} from "lucide-react"; // Import icons
import React, { RefObject, useEffect, useRef, useState } from "react";
import { ResponseMessage } from "./ResponseMessage";

import SideChat from "@/components/shared/global/SideChat";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  deleteNotebook,
  deletePage,
  getNote,
  saveNote,
  getSideChat,
  saveSideChat,
  updateSideChat,
} from "@/lib/firebase/firestore";
import { ParagraphData } from "@/lib/types";
import {
  fileUpload,
  sectionClick,
  sendMessage,
  sentenceClick,
} from "@/lib/utils";
import { CircularProgress } from "@mui/material";
import { useRouter } from "next/navigation";
import UploadArea from "./UploadArea";
import { TitleEditor } from "./title-editor";
import StudyMaterialTabs from "@/components/StudyMaterialTabs";

interface ChatClientProps {
  title: string;
  tabId: string;
  notebookId: string;
  onPageDelete?: (pageId: string) => void;
}

const ChatClient = ({
  title,
  tabId,
  notebookId,
  onPageDelete,
}: ChatClientProps) => {
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
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalSections, setTotalSections] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isNotebookFullscreen, setIsNotebookFullscreen] = useState(false);
  const [isChatFullscreen, setIsChatFullscreen] = useState(false);
  const [isQuizFullscreen, setIsQuizFullscreen] = useState(false);
  const [isStudyMaterialFullscreen, setIsStudyMaterialFullscreen] = useState(false);
  const [showStudyMaterial, setShowStudyMaterial] = useState(false);

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

  const handleSectionClick = async (
    section: Section,
    setPrimeSentence: (sentence: string) => void,
    setShowChat: (show: boolean) => void
  ) => {
    try {
      // Get the section text
      const sectionText = section.sentences.map((sentence) => sentence.text).join(" ");
      
      // Update UI state
      setPrimeSentence(sectionText);
      setShowChat(true);
      
      // First check if a sidechat already exists
      const existingSideChat = await getSideChat(notebookId, tabId);
      console.log("existingSideChat", existingSideChat);
      
      if (existingSideChat) {
        // If sidechat exists, just add the new context section to it
        const newContextSection: ContextSection = {
          id: crypto.randomUUID(),
          text: sectionText,
          timestamp: Date.now(),
          isHighlighted: true
        };
        
        const updatedContextSections = [...existingSideChat.contextSections, newContextSection];
        await updateSideChat(existingSideChat.id, updatedContextSections, existingSideChat.messages);
       } 
       else {
        // Only create new sidechat if one doesn't exist
        const newContextSection: ContextSection = {
          id: crypto.randomUUID(),
          text: sectionText,
          timestamp: Date.now(),
          isHighlighted: true
        };
        
        await saveSideChat(notebookId, tabId, [newContextSection], []);
      }
    } catch (error) {
      console.error("Error updating side chat:", error);
    }
  };

  const handleSendMessage = async () => {
    await sendMessage(
      input,
      files,
      setMessages,
      setInput,
      setFiles,
      setShowUpload,
      setProgress,
      setTotalSections,
      setIsProcessing,
      notebookId,
      tabId
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

  // useEffect(() => {
  //   console.log(
  //     "messages(this value will be stores in the database):",
  //     messages
  //   );
  // }, [messages]);

  // Load messages when component mounts
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const pageData = await getNote(notebookId, tabId);
        if (pageData?.messages) {
          setMessages(pageData.messages);
          if (pageData.messages.length === 0) {
            setShowUpload(true);
          } else {
            setShowUpload(false);
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

  const handleParagraphSave = async (
    paragraphData: ParagraphData,
    index: number
  ) => {
    if (!paragraphData?.text) {
      console.error("Invalid paragraph data");
      return;
    }

    setIsSaving(true);
    try {
      const newMessage: Message = {
        text: paragraphData.text,
        user: "AI",
      };

      const updatedMessages = JSON.parse(JSON.stringify(messages));
      updatedMessages.splice(index + 1, 0, newMessage);

      setMessages(updatedMessages);
      console.log("updatedMessages", updatedMessages);
      await saveNote(notebookId, tabId, updatedMessages);
    } catch (error) {
      console.error("Error saving paragraph:", error);
      setMessages(messages); // Revert on error
      // Optionally show an error toast/notification here
    } finally {
      setIsSaving(false);
    }
  };

  const handleMessageEdit = async (
    editedData: ParagraphData | null,
    index: number
  ) => {
    if (!editedData) {
      // This is just the initial edit click, not the actual save
      return;
    }

    try {
      const updatedMessages = [...messages];
      updatedMessages[index] = {
        user: "AI",
        text: editedData.text,
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
      router.push("/"); // Redirect to home page
    } catch (error) {
      console.error("Error deleting notebook:", error);
      // Optionally add error handling UI here
    }
  };

  // Add this useEffect to handle screen size changes
  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 1068);
    };

    // Set initial value
    handleResize();

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Cleanup
    if (isSmallScreen) {
      setShowQuiz(false);
    }
    return () => window.removeEventListener("resize", handleResize);
  }, [isSmallScreen]);

  return (
    <div className="flex flex-col md:flex-row h-full bg-white w-full rounded-xl overflow-hidden">
      {/* hydration error is here */}
      <div className="flex flex-col bg-white w-full mx-2 overflow-hidden">
        <div className="flex flex-row items-center justify-between w-full py-2">
          {/* Primary notebook buttons */}
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
                setShowStudyMaterial(!showStudyMaterial);

                setShowChat(false);
                setShowQuiz(false);
                setIsNotebookFullscreen(false);
                setIsChatFullscreen(false);
                setIsQuizFullscreen(false);
              }}
              className="text-slate-500 px-4 py-2 bg-slate-100 hover:border-[#94b347] hover:text-[#94b347] hover:bg-slate-100 rounded-2xl w-fit font-semibold  border border-slate-400 shadow-none"
            >
              Study Set
            </Button>
            <Button
              onClick={() => {
                setShowQuiz(!showQuiz);

                setShowChat(false);
                setIsNotebookFullscreen(false);
                setIsChatFullscreen(false);
                setIsQuizFullscreen(false);
              }}
              className="text-slate-500 px-4 py-2 bg-slate-100 hover:border-[#94b347] hover:text-[#94b347] hover:bg-slate-100 rounded-2xl w-fit font-semibold  border border-slate-400 shadow-none"
            >
              Quiz Me
            </Button>

            <Button
              onClick={() => {
                setShowChat(!showChat);

                setShowQuiz(false);
                setIsNotebookFullscreen(false);
                setIsChatFullscreen(false);
                setIsQuizFullscreen(false);
              }}
              className="text-slate-500 px-4 py-2 bg-slate-100 hover:border-[#94b347] hover:text-[#94b347] hover:bg-slate-100 rounded-2xl w-fit font-semibold  border border-slate-400 shadow-none"
            >
              {showChat ? "Close Chat" : "Talk to my notes"}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
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
                <DropdownMenuSeparator className="m-0 p-0 bg-slate-300" />
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
          {/* workspace panel if the viewport is small then it will be vertical else horizontal */}
          <ResizablePanelGroup
            direction={isSmallScreen ? "vertical" : "horizontal"}
            className="w-full px-2"
          >
            {/* notbook panel */}
            <ResizablePanel
              className={`relative ${
                isNotebookFullscreen ? "w-full" : "w-full p-2 min-w-[600px]"
              } ${
                isChatFullscreen || isQuizFullscreen
                  ? "hidden"
                  : "w-full p-2 min-w-[600px]"
              } flex flex-col gap-2 h-full overflow-hidden`}
              defaultSize={isNotebookFullscreen ? 100 : 50}
            >
              <UploadArea
                messages={messages}
                files={files}
                showUpload={showUpload}
                fileInputRef={fileInputRef as RefObject<HTMLInputElement>}
                handleFileUpload={(event) => handleFileUpload(event, setFiles)}
                handleSendMessage={handleSendMessage}
                handleClear={handleClear}
                setShowUpload={setShowUpload}
              />

              {isProcessing && (
                <div className="w-full px-4">
                  <div className="w-full bg-slate-200 rounded-full h-2.5">
                    <div
                      className="bg-[#94b347] h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${(progress / totalSections) * 100}%` }}
                    />
                  </div>
                  <p className="text-sm text-slate-500 text-center mt-2">
                    Processing section {progress} of {totalSections}
                  </p>
                </div>
              )}

              <div className="flex bg-white flex-col overflow-y-auto p-4   rounded-2xl m-2 w-full h-full">
                
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
                            msg={msg}
                            index={index}
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
                            onEdit={() => handleMessageEdit(null, index)}
                            onDelete={() => handleMessageDelete(index)}
                            onSave={(data) => handleMessageEdit(data, index)}
                          />

                          <div key={`editor-${index}`}>
                            <ParagraphEditor
                              onSave={(data: ParagraphData) =>
                                handleParagraphSave(data, index)
                              }
                              messageIndex={index}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
                {isProcessing && (
                  <div className="w-full px-4">
                    <p className="text-sm text-slate-500 text-center mt-2 flex flex-col items-center justify-center gap-2">
                      Generating note sections {progress} of {totalSections}
                      <CircularProgress
                        size={20}
                        sx={{
                          color: "#94b347",
                        }}
                      />
                    </p>
                  </div>
                )}
              </div>
            </ResizablePanel>

            {!(isNotebookFullscreen || isChatFullscreen || isQuizFullscreen || isStudyMaterialFullscreen) &&
              (showQuiz || showChat || showStudyMaterial) && (
                <ResizableHandle withHandle className="bg-slate-300 m-2 ml-5" />
              )}

            {/* Chat and Quiz panels */}
            {!isNotebookFullscreen && (showChat || showQuiz || showStudyMaterial) && (
              <ResizablePanel
                className={`relative ${
                  showChat || showQuiz || showStudyMaterial
                    ? "translate-x-0 my-4 transition-transform duration-1000 ease-in-out transform rounded-none mx-2 w-full min-w-[400px]"
                    : "hidden"
                } ${
                  isChatFullscreen || isQuizFullscreen
                    ? "w-full"
                    : "w-full p-2 min-w-[600px]"
                }`}
                defaultSize={isChatFullscreen || isQuizFullscreen ? 100 : 50}
              >
                {showChat && (
                  <ResizablePanel
                    className={`relative ${
                      showChat
                        ? "translate-x-0 overflow-y-auto bg-slate-300 h-full transition-transform duration-1000 ease-in-out transform rounded-2xl w-full min-w-[400px]"
                        : "hidden"
                    }`}
                    defaultSize={isChatFullscreen ? 100 : 50}
                  >
                    <Button
                      onClick={() => setIsChatFullscreen(!isChatFullscreen)}
                      className="absolute top-2 right-2 z-10 bg-slate-100 hover:bg-slate-200 p-2"
                      size="icon"
                    >
                      {isChatFullscreen ? (
                        <Minimize2 size={16} />
                      ) : (
                        <Maximize2 size={16} />
                      )}
                    </Button>
                    <SideChat
                      notebookId={notebookId}
                      pageId={tabId}
                      primeSentence={primeSentence}
                      setPrimeSentence={setPrimeSentence}
                    />
                  </ResizablePanel>
                )}

               

                {showQuiz && !isChatFullscreen && !isStudyMaterialFullscreen && (
                  <ResizablePanel
                    className={`relative ${
                      showQuiz
                        ? "translate-x-0 min-h-[500px] h-full transition-transform duration-1000 ease-in-out transform rounded-2xl w-full min-w-[400px]"
                        : "hidden"
                    }`}
                    defaultSize={isQuizFullscreen ? 100 : 50}
                  >
                    <Button
                      onClick={() => setIsQuizFullscreen(!isQuizFullscreen)}
                      className="absolute top-2 right-2 z-10 bg-slate-100 hover:bg-slate-200 p-2"
                      size="icon"
                    >
                      {isQuizFullscreen ? (
                        <Minimize2 size={16} />
                      ) : (
                        <Maximize2 size={16} />
                      )}
                    </Button>
                    <QuizPanel
                      notebookId={notebookId}
                      pageId={tabId}
                    />
                  </ResizablePanel>

                )}
                {showStudyMaterial && !isStudyMaterialFullscreen && !isChatFullscreen && !isQuizFullscreen && (
                  <ResizablePanel
                    className={`relative ${
                      showStudyMaterial
                        ? "translate-x-0 min-h-[500px] h-full transition-transform duration-1000 ease-in-out transform rounded-2xl w-full min-w-[400px]"
                        : "hidden"
                    }`}
                    defaultSize={isStudyMaterialFullscreen ? 100 : 50}
                  >
                    <Button
                      onClick={() => setIsStudyMaterialFullscreen(!isStudyMaterialFullscreen)}
                      className="absolute top-2 right-2 z-10 bg-slate-100 hover:bg-slate-200 p-2"
                      size="icon"
                    >
                      {isStudyMaterialFullscreen ? (
                        <Minimize2 size={16} />
                      ) : (
                        <Maximize2 size={16} />
                      )}
                    </Button>
             
                    <StudyMaterialTabs
                      notebookId={notebookId}
                      pageId={tabId}
                    />
                  </ResizablePanel>
                  
                )}
              </ResizablePanel>
            )}
          </ResizablePanelGroup>
        </div>
      </div>
    </div>
  );
};

export default ChatClient;
