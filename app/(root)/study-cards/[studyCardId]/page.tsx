"use client";

import { useEffect, useState, useRef, MutableRefObject, RefObject } from "react";
import { useParams } from "next/navigation";
import { getStudyCardSet, getAllNotebooks, getUserByClerkId, getNotebooksByFirestoreUserId } from "@/lib/firebase/firestore";
import { StudyCardSet } from "@/types/studyCards";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, ChevronRight, ChevronDown, Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import FormUpload from "@/components/shared/study/formUpload";
import { Message } from "@/lib/types";
import { Notebook } from "@/types/notebooks";
import { StudyCardCarousel } from "@/components/shared/study/StudyCardCarousel";
import { StudyCardList } from "@/components/shared/study/StudyCardList";
import { getCurrentUserId } from "@/lib/auth";
import { useAuth } from "@clerk/nextjs";
import { User } from "@/types/users";

// Add CreateCardModal component
interface CreateCardModalProps {
  showNotebookModal: boolean;
  setShowNotebookModal: (show: boolean) => void;
  setName: string;
  setSetName: (name: string) => void;
  numCards: number;
  setNumCards: (num: number) => void;
  messages: Message[];
  files: File[];
  showUpload: boolean;
  fileInputRef: RefObject<HTMLInputElement>;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>, setFiles: (files: File[]) => void) => void;
  handleSendMessage: () => void;
  handleClear: () => void;
  setShowUpload: (show: boolean) => void;
  setFiles: (files: File[]) => void;
  renderNotebookList: () => React.ReactNode;
  handleGenerateCards: () => Promise<void>;
  isGenerating: boolean;
  selectedPages: { [notebookId: string]: string[] };
  filesToUpload: File[];
}

function CreateCardModal({
  showNotebookModal,
  setShowNotebookModal,
  setName,
  setSetName,
  numCards,
  setNumCards,
  messages,
  files,
  showUpload,
  fileInputRef,
  handleFileUpload,
  handleSendMessage,
  handleClear,
  setShowUpload,
  setFiles,
  renderNotebookList,
  handleGenerateCards,
  isGenerating,
  selectedPages,
  filesToUpload,
}: CreateCardModalProps) {
  return (
    <>
      {showNotebookModal && (
        <div className="fixed inset-0 bg-slate-600/30 opacity-100 backdrop-blur-sm flex items-center justify-center z-10 w-full">
          <div className="bg-white p-6 rounded-lg h-full max-h-[60vh] w-full overflow-y-auto max-w-xl">
            <div className="flex flex-col gap-2 items-center justify-center">
              <h2 className="text-xl font-bold mb-4 text-[#94b347]">
                Create Study Cards
              </h2>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Card Set Name
                </label>
                <Input
                  type="text"
                  value={setName}
                  onChange={(e) => setSetName(e.target.value)}
                  placeholder="Enter a name for this study set"
                  className="w-full border rounded-md p-2 border-slate-600 text-slate-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Cards
                </label>
                <select
                  value={numCards}
                  onChange={(e) => setNumCards(Number(e.target.value))}
                  className="w-full border rounded-md p-2 border-slate-600 text-slate-600"
                >
                  {[3, 5, 10, 15, 20, 25, 30].map((num) => (
                    <option key={num} value={num}>
                      {num} cards
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-6">
                <div className="font-semibold text-gray-500 w-full flex items-center justify-center text-lg">
                  <h3>Select notes or upload files to study</h3>
                </div>
                <FormUpload
                  messages={messages}
                  files={files}
                  showUpload={showUpload}
                  fileInputRef={fileInputRef}
                  handleFileUpload={(event) => handleFileUpload(event, setFiles)}
                  handleSendMessage={handleSendMessage}
                  handleClear={handleClear}
                  setShowUpload={setShowUpload}
                />
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Notes
                </label>
                {renderNotebookList()}
              </div>
            </div>

            <div className="flex justify-center gap-2 mt-4 w-full">
              <Button
                variant="outline"
                className="rounded-full bg-white border border-red-400 text-red-400 hover:bg-red-100 hover:border-red-400 hover:text-red-500"
                onClick={() => {
                  setShowNotebookModal(false);
                  setSetName("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerateCards}
                className="rounded-full bg-white border border-slate-400 text-slate-600 hover:bg-white hover:border-[#94b347] hover:text-[#94b347]"
                disabled={
                  isGenerating ||
                  !setName.trim() ||
                  (filesToUpload.length === 0 && Object.keys(selectedPages).length === 0)
                }
              >
                {isGenerating ? "Generating..." : "Generate Cards"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function StudyCardPage() {
  const params = useParams();
  const studyCardId = params?.studyCardId as string;
  const [studySet, setStudySet] = useState<StudyCardSet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Add states for CreateCardModal
  const [showNotebookModal, setShowNotebookModal] = useState(false);
  const [setName, setSetName] = useState("");
  const [numCards, setNumCards] = useState(5);
  const [messages, setMessages] = useState<Message[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPages, setSelectedPages] = useState<{ [notebookId: string]: string[] }>({});
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [isLoadingNotebooks, setIsLoadingNotebooks] = useState(false);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [expandedNotebooks, setExpandedNotebooks] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null) as MutableRefObject<HTMLInputElement>;
  const { userId } = useAuth();
  const [firestoreUser, setFirestoreUser] = useState<User | null>(null);
  useEffect(() => {
    loadStudySet();
  }, [studyCardId]);

  useEffect(() => {
    const loadFirestoreUser = async () => {
      console.log("Loading user...");
      if (!userId) return null;
      
      const user = await getUserByClerkId(userId);
      console.log("User loaded:", user?.id);
      setFirestoreUser(user);
      console.log("User loaded:", user?.id);
      if (user?.id) {
        const userNotebooks = await getNotebooksByFirestoreUserId(
          user?.id
        );
        setNotebooks(userNotebooks);
        console.log("Notebooks loaded:", userNotebooks);
      }
    };

    
    loadFirestoreUser();
   
   
    console.log("Notebooks loaded:", notebooks);
    
  }, [userId]);

  const loadStudySet = async () => {
    try {
      if (!studyCardId) {
        setError("No study card ID provided");
        return;
      }

      console.log("Fetching study card set with ID:", studyCardId);
      const set = await getStudyCardSet(studyCardId);
      
      if (!set) {
        setError("Study set not found");
        return;
      }

      console.log("Retrieved study set:", set);
      setStudySet(set);
    } catch (error) {
      console.error("Error loading study set:", error);
      setError("Error loading study set");
    } finally {
      setIsLoading(false);
    }
  };

  // Add handlers for CreateCardModal
  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    setFiles: (files: File[]) => void
  ) => {
    const files = Array.from(event.target.files || []);
    setFiles(files);
    setFilesToUpload(files);
  };

  const handleSendMessage = () => {
    console.log("Sending message");
  };

  const handleClear = () => {
    setMessages([]);
    setFiles([]);
  };

  const handleGenerateCards = async () => {
    setIsGenerating(true);
    // Implement your card generation logic here
    setIsGenerating(false);
  };

  const toggleNotebookExpansion = (notebookId: string) => {
    setExpandedNotebooks((prev) => {
      const next = new Set(prev);
      if (next.has(notebookId)) {
        next.delete(notebookId);
      } else {
        next.add(notebookId);
      }
      return next;
    });
  };

  const handleNotebookSelection = (
    notebookId: string,
    pages: any[],
    isSelected: boolean
  ) => {
    setSelectedPages((prev) => ({
      ...prev,
      [notebookId]: isSelected ? pages.map((p) => p.id) : [],
    }));
  };

  const handlePageSelection = (
    notebookId: string,
    pageId: string,
    isSelected: boolean
  ) => {
    setSelectedPages((prev) => ({ ...prev, [notebookId]: isSelected ? [pageId] : [] }));
  };

  const isNotebookFullySelected = (notebookId: string, pages: any[]) => {
    return pages.every((page) => selectedPages[notebookId]?.includes(page.id));
  };

  const isPageFullySelected = (notebookId: string, pageId: string) => {
    return selectedPages[notebookId]?.includes(pageId);
  };
  


  const loadAllNotebooks = async () => {
    if (!firestoreUser) return;
    
    try {
      setIsLoadingNotebooks(true);
      console.log("Loading notebooks for user:", firestoreUser.id);
      const userNotebooks = await getNotebooksByFirestoreUserId(
        firestoreUser.id
      );
      console.log("Fetched notebooks:", userNotebooks);
      
      setNotebooks(userNotebooks);
    } catch (error) {
      console.error("Failed to load notebooks:", error);
    } finally {
      setIsLoadingNotebooks(false);
    }
  };




  useEffect(() => {
    if (showNotebookModal && userId) {
      loadAllNotebooks();
    }
  }, [showNotebookModal, userId]);

  // Add debug rendering for notebooks
  const renderNotebookList = () => {
    if (isLoadingNotebooks) {
      return (
        <div className="flex w-full items-center justify-center p-4">
          <RefreshCw className="h-6 w-6 animate-spin" />
        </div>
      );
    }

    if (notebooks.length === 0) {
      return (
        <div className="text-center p-4 text-gray-500">
          No notebooks found. Please create a notebook first.
        </div>
      );
    }

    return (
      <div className="space-y-2 p-2 ">
        {notebooks.map((notebook) => (
          <div
            key={notebook.id}
            className="border rounded-xl  p-1  bg-white border-slate-400"
          >
            <div className="flex items-center justify-between p-3 bg-white text-slate-600">
              <div className="flex items-center gap-2 ">
                <button
                  onClick={() => toggleNotebookExpansion(notebook.id)}
                  className="p-1 hover:bg-slate-200 rounded"
                >
                  {expandedNotebooks.has(notebook.id) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                <span className="font-medium">{notebook.title}</span>
              </div>
              <button
                onClick={() =>
                  handleNotebookSelection(
                    notebook.id,
                    notebook.pages,
                    !isNotebookFullySelected(notebook.id, notebook.pages)
                  )
                }
                className={`flex items-center gap-1 px-2 py-1 rounded ${
                  isNotebookFullySelected(notebook.id, notebook.pages)
                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                    : "bg-white hover:bg-slate-100"
                }`}
              >
                {isNotebookFullySelected(notebook.id, notebook.pages) ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                <span className="text-sm">
                  {isNotebookFullySelected(notebook.id, notebook.pages)
                    ? "Added"
                    : "Add All"}
                </span>
              </button>
            </div>

            {expandedNotebooks.has(notebook.id) && notebook.pages && (
              <div className="pl-8 pr-3 py-2 space-y-1 border-t text-slate-600">
                {notebook.pages.map((page) => (
                  <div
                    key={page.id}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-sm">{page.title}</span>
                    <button
                      onClick={() =>
                        handlePageSelection(
                          notebook.id,
                          page.id,
                          !selectedPages[notebook.id]?.includes(page.id)
                        )
                      }
                      className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${
                        selectedPages[notebook.id]?.includes(page.id)
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-white hover:bg-slate-200"
                      }`}
                    >
                      {selectedPages[notebook.id]?.includes(page.id) ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Plus className="h-3 w-3" />
                      )}
                      <span>
                        {selectedPages[notebook.id]?.includes(page.id)
                          ? "Added"
                          : "Add"}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const handleStudySetUpdate = (updatedStudySet: StudyCardSet) => {
    setStudySet(updatedStudySet);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#94b347]" />
      </div>
    );
  }

  if (error || !studySet) {
    return (
      <div className="flex flex-col items-center justify-center  min-h-screen gap-4">
        <p className="text-slate-600">{error || "Study set not found"}</p>
        <Link href="/notes">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to Notes
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 h-full ">
      <div className="flex justify-end mb-4">
        <Button
          onClick={() => setShowNotebookModal(true)}
          className="bg-white border border-slate-400 text-slate-600 hover:bg-white hover:border-[#94b347] hover:text-[#94b347]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Study Cards
        </Button>
      </div>

      <CreateCardModal
        showNotebookModal={showNotebookModal}
        setShowNotebookModal={setShowNotebookModal}
        setName={setName}
        setSetName={setSetName}
        numCards={numCards}
        setNumCards={setNumCards}
        messages={messages}
        files={files}
        showUpload={showUpload}
        fileInputRef={fileInputRef}
        handleFileUpload={handleFileUpload}
        handleSendMessage={handleSendMessage}
        handleClear={handleClear}
        setShowUpload={setShowUpload}
        setFiles={setFiles}
        renderNotebookList={renderNotebookList}
        handleGenerateCards={handleGenerateCards}
        isGenerating={isGenerating}
        selectedPages={selectedPages}
        filesToUpload={filesToUpload}
      />
      
      <StudyCardCarousel studySet={studySet} />
      <StudyCardList studySet={studySet} onUpdate={handleStudySetUpdate} />
    </div>
  );
}