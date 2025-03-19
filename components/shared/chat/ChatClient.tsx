"use client";
import ParagraphEditor from "@/components/ParagraphEditor";
import SeparatorWithAddButton from "@/components/SeparatorWithAddButton";
import ExpandableContainer from "@/components/expandable-container";
import LoadingSection from "@/components/shared/chat/loading-section";
import QuizPanel from "@/components/shared/global/QuizPanel";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Textarea } from "@/components/ui/textarea";
import { ContextSection, Message, Section } from "@/lib/types";
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

import StudyMaterialTabs from "@/components/StudyMaterialTabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  deleteNotebook,
  deletePage,
  getNote,
  getSideChat,
  saveNote,
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
import { useUser } from "@clerk/nextjs";
import { CircularProgress } from "@mui/material";
import { useRouter } from "next/navigation";
import StudyCards from "../study/StudyCards";
import StudyGuide from "../study/StudyGuide";
import UploadArea from "./UploadArea";
import { TitleEditor } from "./title-editor";
import { FullscreenButton } from "@/components/shared/global/fullscreen-button";
import { ResizeButton } from "@/components/shared/global/resize-button";

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
  const [language, setLanguage] = useState("English");
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
  const [currentSections, setCurrentSections] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isChatFullscreen, setIsChatFullscreen] = useState(false);
  const [isQuizFullscreen, setIsQuizFullscreen] = useState(false);

  const [showStudyCards, setShowStudyCards] = useState(false);
  const [isStudyCardsFullscreen, setIsStudyCardsFullscreen] = useState(false);
  const [showStudyGuides, setShowStudyGuides] = useState(false);
  const [isStudyGuidesFullscreen, setIsStudyGuidesFullscreen] = useState(false);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [showUploadModal, setShowUploadModal] = useState(false);

  // Add new state for tracking database update status
  const [isDatabaseUpdating, setIsDatabaseUpdating] = useState(false);

  // Add a state for sidechat resize
  const [isSideChatExpanded, setIsSideChatExpanded] = useState(false);

  const { user } = useUser();

  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    setFiles: (files: File[]) => void
  ) => {
    fileUpload(event, setFiles);
  };

  const handleSectionClick = async (
    section: Section,
    setPrimeSentence: (sentence: string) => void,
    setShowChat: (show: boolean) => void
  ) => {
    try {
      // Get the section text
      const sectionText = section.sentences
        .map((sentence) => sentence.text)
        .join(" ");

      // Update UI state
      setPrimeSentence(sectionText);
      setShowChat(true);
      
      // For small screens, also open the drawer with chat tab
      if (isSmallScreen) {
        setIsDrawerOpen(true);
        // Make sure other components are hidden
        setShowStudyGuides(false);
        setShowStudyCards(false);
        setShowQuiz(false);
      }
    } catch (error) {
      console.error("Error handling section click:", error);
    }
  };

  const handleSetMessages = (
    messagesOrUpdater: Message[] | ((prev: Message[]) => Message[])
  ) => {
    if (typeof messagesOrUpdater === "function") {
      setMessages((prev) => {
        const newMessages = messagesOrUpdater(prev);
        // Check if the last message is from AI and has sections
        const lastMessage = newMessages[newMessages.length - 1];
        if (
          lastMessage &&
          lastMessage.user === "AI" &&
          Array.isArray(lastMessage.text)
        ) {
          setCurrentSections(lastMessage.text.length);
        }
        return newMessages;
      });
    } else {
      setMessages(messagesOrUpdater);
      // Check if the last message is from AI and has sections
      const lastMessage = messagesOrUpdater[messagesOrUpdater.length - 1];
      if (
        lastMessage &&
        lastMessage.user === "AI" &&
        Array.isArray(lastMessage.text)
      ) {
        setCurrentSections(lastMessage.text.length);
      }
    }
  };

  const handleSendMessage = async () => {
    setIsDatabaseUpdating(true);
    setIsProcessing(true);
    setCurrentSections(0);
    try {
      // Create file metadata to store in the notebook
      const fileMetadata = files.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: Date.now(),
        id: crypto.randomUUID(),
      }));

      // The sendMessage function now handles incremental database updates
      await sendMessage(
        language,
        input,
        files,
        handleSetMessages,
        setInput,
        setFiles,
        setShowUpload,
        setProgress,
        setTotalSections,
        setIsProcessing,
        notebookId,
        tabId,
        fileMetadata // Pass the file metadata to be saved
      );
    } catch (error) {
      console.error("Error processing files:", error);
      // Add a user-friendly error message
      handleSetMessages((prevMessages) => [
        ...prevMessages.filter(
          (msg) =>
            !(
              msg.user === "AI" &&
              Array.isArray(msg.text) &&
              msg.text.length === 0
            )
        ),
        {
          user: "AI",
          text: [
            {
              title: "Error",
              sentences: [
                {
                  id: 1,
                  text:
                    error instanceof Error
                      ? `Error: ${error.message}`
                      : "An unexpected error occurred while processing your files. Please try again.",
                },
              ],
            },
          ],
          files: [], // Empty files array
          fileMetadata: [], // Empty file metadata
        },
      ]);
    } finally {
      // Ensure loading states are reset even if there's an error
      setIsDatabaseUpdating(false);
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
    setShowUpload(true);
    setShowChat(false);
    setPrimeSentence(null);
  };

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
    index: number,
    sectionIndex: number
  ) => {
    if (!paragraphData?.text) {
      console.error("Invalid paragraph data");
      return;
    }

    setIsSaving(true);
    try {
      // Create a deep copy of messages
      const updatedMessages = [...messages];

      // Get the target message
      const targetMessage = updatedMessages[index];

      if (Array.isArray(targetMessage.text)) {
        // Insert the new section after the specified sectionIndex
        targetMessage.text.splice(sectionIndex + 1, 0, paragraphData.text[0]);
      }

      setMessages(updatedMessages);

      // Save to Firestore
      await saveNote(notebookId, tabId, updatedMessages);
    } catch (error) {
      console.error("Error saving paragraph:", error);
      setMessages(messages); // Revert on error
    } finally {
      setIsSaving(false);
    }
  };

  const handleMessageEdit = async (
    editedData: ParagraphData | null,
    index: number,
    sectionIndex: number
  ) => {
    if (!editedData) {
      // This is just the initial edit click, not the actual save
      return;
    }

    try {
      const updatedMessages = [...messages];
      const targetMessage = updatedMessages[index];

      if (Array.isArray(targetMessage.text)) {
        // Update only the specific section being edited
        targetMessage.text[sectionIndex] = editedData.text[0];
      }

      setMessages(updatedMessages);
      await saveNote(notebookId, tabId, updatedMessages);
    } catch (error) {
      console.error("Error updating message:", error);
      setMessages(messages);
    }
  };

  const handleMessageDelete = async (index: number, sectionIndex: number) => {
    try {
      const updatedMessages = [...messages];
      const targetMessage = updatedMessages[index];

      if (Array.isArray(targetMessage.text)) {
        // Only remove the specific section
        targetMessage.text.splice(sectionIndex, 1);

        // If there are no sections left, remove the entire message
        if (targetMessage.text.length === 0) {
          updatedMessages.splice(index, 1);
        }
      } else {
        // For non-array text messages, remove the entire message
        updatedMessages.splice(index, 1);
      }

      setMessages(updatedMessages);
      await saveNote(notebookId, tabId, updatedMessages);
    } catch (error) {
      console.error("Error deleting message section:", error);
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

  // Modify the screen size useEffect
  useEffect(() => {
    const handleResize = () => {
      const newIsSmallScreen = window.innerWidth < 1068;
      setIsSmallScreen(newIsSmallScreen);
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

  const handleComponentSelect = (component: string) => {
    setDropdownOpen(false);
    setIsDrawerOpen(true);
    
    // First, always reset all fullscreen states when switching components
    setIsChatFullscreen(false);
    setIsQuizFullscreen(false);
    setIsStudyCardsFullscreen(false);
    setIsStudyGuidesFullscreen(false);
    
    // Then handle the specific component logic
    if (component === "studyGuide") {
      // If we're already showing study guides, toggle it off
      // Otherwise turn study guides on and turn everything else off
      if (showStudyGuides) {
        setShowStudyGuides(false);
      } else {
        setShowStudyGuides(true);
        setShowStudyCards(false);
        setShowChat(false);
        setShowQuiz(false);
      }
    } else if (component === "studyCards") {
      // If we're already showing study cards, toggle it off
      // Otherwise turn study cards on and turn everything else off
      if (showStudyCards) {
        setShowStudyCards(false);
      } else {
        setShowStudyCards(true);
        setShowStudyGuides(false);
        setShowChat(false);
        setShowQuiz(false);
      }
    } else if (component === "quiz") {
      // If we're already showing quiz, toggle it off
      // Otherwise turn quiz on and turn everything else off
      if (showQuiz) {
        setShowQuiz(false);
      } else {
        setShowQuiz(true);
        setShowStudyCards(false);
        setShowStudyGuides(false);
        setShowChat(false);
      }
    } else if (component === "chat") {
      // If we're already showing chat, toggle it off
      // Otherwise turn chat on and turn everything else off
      if (showChat) {
        setShowChat(false);
      } else {
        setShowChat(true);
        setShowQuiz(false);
        setShowStudyCards(false);
        setShowStudyGuides(false);
      }
    }
  };

  // Add this function to handle drawer close
  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
    // Reset all fullscreen states when drawer closes
    setIsChatFullscreen(false);
    setIsQuizFullscreen(false);
    setIsStudyCardsFullscreen(false);
    setIsStudyGuidesFullscreen(false);
    // Reset all component states when drawer closes
    setShowStudyGuides(false);
    setShowStudyCards(false);
    setShowQuiz(false);
    setShowChat(false);
  };

  // Update the handlers for side panel components to make notebook fullscreen when they toggle off
  const handleChatFullscreen = () => {
    setIsChatFullscreen(!isChatFullscreen);
    if (!isChatFullscreen) {
      setIsQuizFullscreen(false);
      setIsStudyCardsFullscreen(false);
      setIsStudyGuidesFullscreen(false);
    }
  };

  const handleQuizFullscreen = () => {
    setIsQuizFullscreen(!isQuizFullscreen);
    if (!isQuizFullscreen) {
      setIsChatFullscreen(false);
      setIsStudyCardsFullscreen(false);
      setIsStudyGuidesFullscreen(false);
    }
  };

  const handleStudyCardsFullscreen = () => {
    setIsStudyCardsFullscreen(!isStudyCardsFullscreen);
    if (!isStudyCardsFullscreen) {
      setIsChatFullscreen(false);
      setIsQuizFullscreen(false);
      setIsStudyGuidesFullscreen(false);
    }
  };

  const handleStudyGuidesFullscreen = () => {
    setIsStudyGuidesFullscreen(!isStudyGuidesFullscreen);
    if (!isStudyGuidesFullscreen) {
      setIsChatFullscreen(false);
      setIsQuizFullscreen(false);
      setIsStudyCardsFullscreen(false);
    }
  };

  // Add handler for sidechat resize
  const handleSideChatResize = () => {
    setIsSideChatExpanded(!isSideChatExpanded);
  };

  return (
    <div className="flex flex-col md:flex-row h-full  w-full items-center  rounded-xl">
      {/* Show loading overlay when processing or updating database */}

      <div className="flex flex-col bg-white w-full mx-0 md:mx-2 h-full">
        <div className="flex flex-row items-center justify-between w-full py-1 md:py-2 px-2 md:px-0">
          <div className="flex flex-row gap-2 items-center md:pl-8 ">
            <Button
              onClick={() => setShowUploadModal(true)}
              className={` bg-white text-xs md:text-sm shadow-none border border-slate-400 hover:border-[#94b347] hover:text-[#94b347] hover:bg-white text-slate-500 w-fit px-4 md:px-4 rounded-full`}
            >
              Uploads
            </Button>
          </div>

          <div className="hidden md:flex flex-row items-center justify-center w-fit mx-8 gap-4 my-4">
            <Button
              onClick={() => handleComponentSelect("studyGuide")}
              className="text-slate-500 px-4 py-2 bg-white hover:border-[#94b347] hover:text-[#94b347] hover:bg-white rounded-2xl w-fit font-semibold border border-slate-400 shadow-none"
            >
              Study guide
            </Button>
            <Button
              onClick={() => handleComponentSelect("studyCards")}
              className="text-slate-500 px-4 py-2 bg-white hover:border-[#94b347] hover:text-[#94b347] hover:bg-white rounded-2xl w-fit font-semibold border border-slate-400 shadow-none"
            >
              Study cards
            </Button>
            <Button
              onClick={() => handleComponentSelect("quiz")}
              className="text-slate-500 px-4 py-2 bg-white hover:border-[#94b347] hover:text-[#94b347] hover:bg-white rounded-2xl w-fit font-semibold  border border-slate-400 shadow-none"
            >
              Quiz Me
            </Button>
            <Button
              onClick={() => handleComponentSelect("chat")}
              className="text-slate-500 md:px-4 py-2 bg-white hover:border-[#94b347] hover:text-[#94b347] hover:bg-white rounded-2xl w-fit font-semibold  border border-slate-400 shadow-none"
            >
              Chat
            </Button>
          </div>

          {/* Mobile hamburger menu */}
          <div className="md:hidden my-4">
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="mr-4 rounded-full bg-white hover:bg-white hover:border-[#94b347] hover:text-[#94b347]"
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 bg-white hover:bg-white text-slate-500"
                onCloseAutoFocus={(event) => {
                  event.preventDefault();
                }}
              >
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    handleComponentSelect("studyGuide");
                  }}
                  className="cursor-pointer hover:bg-white hover:text-[#94b347] hover:border-[#94b347] hover:border"
                >
                  Study guide
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    handleComponentSelect("studyCards");
                  }}
                  className="cursor-pointer hover:bg-white hover:text-[#94b347] hover:border-[#94b347] hover:border"
                >
                  Study cards
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    handleComponentSelect("quiz");
                  }}
                  className="cursor-pointer hover:bg-white hover:text-[#94b347] hover:border-[#94b347] hover:border"
                >
                  Quiz Me
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    handleComponentSelect("chat");
                  }}
                  className="cursor-pointer hover:bg-white hover:text-[#94b347] hover:border-[#94b347] hover:border"
                >
                  Chat
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-start w-full h-[calc(100%-3rem)] overflow-hidden">
          <ResizablePanelGroup
            direction={isSmallScreen ? "vertical" : "horizontal"}
            className="w-full"
          >
            {/* Notebook panel - show as full width when no side panel is active */}
            {!(isChatFullscreen || isQuizFullscreen || isStudyCardsFullscreen || isStudyGuidesFullscreen) && (
              <ResizablePanel
                className={`relative min-w-0 p-0 m-0 flex items-center justify-center
                  w-full p-1 md:p-2
                  flex flex-col gap-1 md:gap-2 h-full overflow-hidden md:min-w-[400px]`}
                defaultSize={(showChat || showQuiz || showStudyCards || showStudyGuides) ? 50 : 100}
              >
                {/* Messages Container */}
                <div className="flex flex-col overflow-y-auto rounded-2xl w-full h-full">
                  {/* This ParagraphEditor should append content at the beginning of the document */}
                  <ParagraphEditor
                    onSave={(data) => {
                      // Create a new message if there are no messages yet
                      if (messages.length === 0) {
                        setMessages([
                          {
                            user: "AI",
                            text: data.text,
                          },
                        ]);
                      } else {
                        // Get the first message
                        const firstMessage = messages[0];
                        // If the first message is from AI and has text array, prepend to it
                        if (
                          firstMessage.user === "AI" &&
                          Array.isArray(firstMessage.text)
                        ) {
                          const updatedMessages = [...messages];
                          // Add the new paragraph at the beginning of the text array
                          updatedMessages[0] = {
                            ...firstMessage,
                            text: [...data.text, ...firstMessage.text],
                          };
                          setMessages(updatedMessages);
                        } else {
                          // If first message isn't from AI or doesn't have text array,
                          // create a new message and make it the first one
                          setMessages([
                            {
                              user: "AI",
                              text: data.text,
                            },
                            ...messages,
                          ]);
                        }
                      }
                    }}
                    messageIndex={0}
                  />

                  {messages.map((msg, index) => {
                    if (msg.user === "AI") {
                      return (
                        <div key={`message-${index}`}>
                          {Array.isArray(msg.text) ? (
                            msg.text.map((section, sectionIndex) => (
                              <React.Fragment key={`section-${sectionIndex}`}>
                                <ResponseMessage
                                  msg={{ ...msg, text: [section] }}
                                  index={index}
                                  handleSectionClick={(section) =>
                                    handleSectionClick(
                                      section,
                                      setPrimeSentence,
                                      setShowChat
                                    )
                                  }
                                  handleParagraphSave={handleParagraphSave}
                                  onEdit={() =>
                                    handleMessageEdit(null, index, sectionIndex)
                                  }
                                  onDelete={() =>
                                    handleMessageDelete(index, sectionIndex)
                                  }
                                  onSave={(data) =>
                                    handleMessageEdit(data, index, sectionIndex)
                                  }
                                />
                                {!isSaving && (
                                  <ParagraphEditor
                                    onSave={(data) =>
                                      handleParagraphSave(
                                        data,
                                        index,
                                        sectionIndex
                                      )
                                    }
                                    messageIndex={index}
                                  />
                                )}
                              </React.Fragment>
                            ))
                          ) : (
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
                              handleParagraphSave={handleParagraphSave}
                              onEdit={() => handleMessageEdit(null, index, 0)}
                              onDelete={() => handleMessageDelete(index, 0)}
                              onSave={(data) => handleMessageEdit(data, index, 0)}
                            />
                          )}
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </ResizablePanel>
            )}

            {/* Resizable handle - show only when notebook is not in fullscreen and at least one sidebar component is visible */}
            {!isChatFullscreen && 
              !(isQuizFullscreen || isStudyCardsFullscreen || isStudyGuidesFullscreen) &&
              (showQuiz || showChat || showStudyCards || showStudyGuides) && (
                <ResizableHandle className="bg-slate-300 m-2 ml-5" />
            )}

            {/* Side panels container - show when any sidebar component is visible or in fullscreen mode */}
            {(showChat || showQuiz || showStudyCards || showStudyGuides || 
              isChatFullscreen || isQuizFullscreen || isStudyCardsFullscreen || isStudyGuidesFullscreen) && (
              <ResizablePanel
                className={`relative ${
                  (showChat || showQuiz || showStudyCards || showStudyGuides || 
                   isChatFullscreen || isQuizFullscreen || isStudyCardsFullscreen || isStudyGuidesFullscreen)
                    ? "hidden md:block translate-x-0 my-2 md:my-4 transition-transform duration-1000 ease-in-out transform rounded-none mx-1 md:mx-2 w-full min-w-[280px] md:min-w-[400px]"
                    : "hidden"
                }`}
                defaultSize={
                  isChatFullscreen || isQuizFullscreen || isStudyCardsFullscreen || isStudyGuidesFullscreen ? 100 : 50
                }
              >
                {/* Chat Panel */}
                {(showChat || isChatFullscreen) && 
                 !isQuizFullscreen && !isStudyCardsFullscreen && !isStudyGuidesFullscreen && (
                  <ResizablePanel
                    className={`relative ${
                      showChat || isChatFullscreen
                        ? "translate-x-0 overflow-hidden bg-white h-full transition-transform duration-300 ease-in-out transform rounded-xl md:rounded-2xl w-full"
                        : "hidden"
                    }`}
                    defaultSize={isChatFullscreen || isSideChatExpanded ? 100 : 50}
                  >
                    {/* Fullscreen button */}
                    <FullscreenButton
                      isFullscreen={isChatFullscreen}
                      toggleFullscreen={handleChatFullscreen}
                      className="absolute top-2 right-2 z-50 rounded-full bg-white"
                    />
                    
                    {/* Add resize button */}
                    
                    
                    <SideChat
                      notebookId={notebookId}
                      pageId={tabId}
                      primeSentence={primeSentence}
                      setPrimeSentence={setPrimeSentence}
                    />
                  </ResizablePanel>
                )}

                {/* Quiz Panel */}
                {(showQuiz || isQuizFullscreen) &&
                 !isChatFullscreen && !isStudyCardsFullscreen && !isStudyGuidesFullscreen && (
                  <ResizablePanel
                    className={`relative ${
                      showQuiz || isQuizFullscreen
                        ? "translate-x-0 min-h-[500px] h-full transition-transform overflow-y-auto duration-1000 ease-in-out transform rounded-2xl w-full min-w-[400px]"
                        : "hidden"
                    }`}
                    defaultSize={isQuizFullscreen ? 100 : 50}
                  >
                    <FullscreenButton
                      isFullscreen={isQuizFullscreen}
                      toggleFullscreen={handleQuizFullscreen}
                    />
                    <QuizPanel notebookId={notebookId} pageId={tabId} />
                  </ResizablePanel>
                )}

                {/* Study Cards Panel */}
                {(showStudyCards || isStudyCardsFullscreen) &&
                 !isChatFullscreen && !isQuizFullscreen && !isStudyGuidesFullscreen && (
                  <ResizablePanel
                    className={`relative ${
                      showStudyCards || isStudyCardsFullscreen
                        ? "translate-x-0 h-full transition-transform duration-1000 ease-in-out transform rounded-2xl w-full min-w-[400px]"
                        : "hidden"
                    }`}
                    defaultSize={isStudyCardsFullscreen ? 100 : 50}
                  >
                    <FullscreenButton
                      isFullscreen={isStudyCardsFullscreen}
                      toggleFullscreen={handleStudyCardsFullscreen}
                    />
                    <div className="h-full overflow-hidden">
                      <div className="h-full overflow-y-auto px-2">
                        <StudyCards notebookId={notebookId} pageId={tabId} />
                      </div>
                    </div>
                  </ResizablePanel>
                )}

                {/* Study Guides Panel */}
                {(showStudyGuides || isStudyGuidesFullscreen) &&
                 !isChatFullscreen && !isQuizFullscreen && !isStudyCardsFullscreen && (
                  <ResizablePanel
                    className={`relative ${
                      showStudyGuides || isStudyGuidesFullscreen
                        ? "translate-x-0 h-full transition-transform duration-1000 ease-in-out transform rounded-2xl w-full min-w-[400px]"
                        : "hidden"
                    }`}
                    defaultSize={isStudyGuidesFullscreen ? 100 : 50}
                  >
                    <FullscreenButton
                      isFullscreen={isStudyGuidesFullscreen}
                      toggleFullscreen={handleStudyGuidesFullscreen}
                    />
                    <StudyGuide notebookId={notebookId} pageId={tabId} />
                  </ResizablePanel>
                )}
              </ResizablePanel>
            )}
          </ResizablePanelGroup>
        </div>
      </div>
      {isSmallScreen && (
        <Drawer
          open={isDrawerOpen}
          onOpenChange={(open: boolean) => {
            if (!open) {
              handleDrawerClose();
            }
          }}
        >
          <DrawerContent className="h-[85vh] bg-white">
            <DrawerHeader className="p-4 pb-0 border-b border-gray-100">
              <DrawerTitle className="text-lg font-semibold text-center text-[#94b347]">
                {showStudyGuides && "Study Guide"}
                {showStudyCards && "Study Cards"}
                {showQuiz && "Quiz"}
                {showChat && "Talk to Notes"}
              </DrawerTitle>
              <DrawerDescription className="text-sm text-center text-slate-500 pb-2">
                {showStudyGuides && "Create and review study guides"}
                {showStudyCards && "Create and review study cards"}
                {showQuiz && "Create and review quizzes"}
                {showChat && "Chat with your selected text"}
              </DrawerDescription>
            </DrawerHeader>
            <div className="h-full overflow-y-auto">
              {showChat && (
                <SideChat
                  notebookId={notebookId}
                  pageId={tabId}
                  primeSentence={primeSentence}
                  setPrimeSentence={setPrimeSentence}
                />
              )}
              {showQuiz && <QuizPanel notebookId={notebookId} pageId={tabId} />}
              {showStudyCards && (
                <StudyCards notebookId={notebookId} pageId={tabId} />
              )}
              {showStudyGuides && (
                <StudyGuide notebookId={notebookId} pageId={tabId} />
              )}
            </div>
          </DrawerContent>
        </Drawer>
      )}

      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="w-full max-w-[340px] md:max-w-[625px] bg-white p-6 h-fit flex flex-col items-start justify-start rounded-2xl">
          <DialogHeader>
            <DialogTitle hidden>Upload Files</DialogTitle>
          </DialogHeader>
          <UploadArea
            messages={messages}
            files={files}
            showUpload={true}
            fileInputRef={fileInputRef as RefObject<HTMLInputElement>}
            handleFileUpload={(event) => handleFileUpload(event, setFiles)}
            handleSendMessage={() => {
              handleSendMessage();
              setShowUploadModal(false);
            }}
            handleClear={() => {
              handleClear();
              setShowUploadModal(false);
            }}
            setShowUpload={setShowUpload}
            isProcessing={isProcessing}
            setIsProcessing={setIsProcessing}
            isDatabaseUpdating={isDatabaseUpdating}
            progress={progress}
            totalSections={totalSections}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatClient;
