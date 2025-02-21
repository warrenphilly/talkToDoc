"use client";

import FormUpload from "@/components/shared/study/formUpload";
import { StudyCardCarousel } from "@/components/shared/study/StudyCardCarousel";
import { StudyCardList } from "@/components/shared/study/StudyCardList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { storage } from "@/firebase";
import { getCurrentUserId } from "@/lib/auth";
import {
  getAllNotebooks,
  getNotebooksByFirestoreUserId,
  getStudyCardSet,
  getUserByClerkId,
  saveStudyCardSet,
} from "@/lib/firebase/firestore";
import { Message } from "@/lib/types";
import { Notebook } from "@/types/notebooks";
import { StudyCardSet } from "@/types/studyCards";
import { User } from "@/types/users";
import { useAuth } from "@clerk/nextjs";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  MutableRefObject,
  RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";

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
  handleFileUpload: (
    event: React.ChangeEvent<HTMLInputElement>,
    setFiles: (files: File[]) => void
  ) => void;
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
          <div className="bg-white p-6 rounded-lg h-full max-h-[60vh] w-full  max-w-xl">
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
                  handleFileUpload={(event) =>
                    handleFileUpload(event, setFiles)
                  }
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

            <div className="flex justify-between gap-2 mt-4 w-full">
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
                  (filesToUpload.length === 0 &&
                    Object.keys(selectedPages).length === 0)
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
  const [selectedPages, setSelectedPages] = useState<{
    [notebookId: string]: string[];
  }>({});
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [isLoadingNotebooks, setIsLoadingNotebooks] = useState(false);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [expandedNotebooks, setExpandedNotebooks] = useState<Set<string>>(
    new Set()
  );
  const fileInputRef = useRef<HTMLInputElement>(
    null
  ) as MutableRefObject<HTMLInputElement>;
  const { userId } = useAuth();
  const [firestoreUser, setFirestoreUser] = useState<User | null>(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  useEffect(() => {
    loadStudySet();
  }, [studyCardId, userId]);

  useEffect(() => {
    const loadFirestoreUser = async () => {
      if (!userId) return null;

      const user = await getUserByClerkId(userId);

      setFirestoreUser(user);

      if (user?.id) {
        const userNotebooks = await getNotebooksByFirestoreUserId(user?.id);
        setNotebooks(userNotebooks);
      }
    };

    loadFirestoreUser();
  }, [userId]);

  const loadStudySet = async () => {
    try {
      if (!studyCardId) {
        console.log("No study card ID:", studyCardId);
        setError("No study card ID provided");
        return;
      }

      console.log("Fetching study set with ID:", studyCardId);
      const set = await getStudyCardSet(studyCardId);
      console.log("Fetched study set:", set);

      if (!set) {
        setError("Study set not found");
        return;
      }

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

  const handleGenerateCardsClick = async () => {
    try {
      if (!setName.trim()) {
        toast.error("Please enter a name for the study set");
        return;
      }

      // Check if we have either uploaded files or selected pages
      const hasSelectedPages = Object.values(selectedPages).some(
        (pages) => pages.length > 0
      );
      if (filesToUpload.length === 0 && !hasSelectedPages) {
        toast.error("Please either upload files or select notebook pages");
        return;
      }

      setIsGenerating(true);

      // Get the current user ID
      if (!firestoreUser?.id) {
        throw new Error("User not authenticated");
      }

      // Get the first selected notebook and page for storage path
      const firstNotebookId = Object.keys(selectedPages).find(
        (notebookId) => selectedPages[notebookId]?.length > 0
      );
      const firstPageId = firstNotebookId
        ? selectedPages[firstNotebookId][0]
        : null;

      // Generate random IDs if using only uploaded files
      const pageIdToUse = firstPageId || `page_${uuidv4()}`;
      const notebookIdToUse = firstNotebookId || `notebook_${uuidv4()}`;

      // Handle file uploads if any
      let uploadedDocsMetadata = [];
      if (filesToUpload.length > 0) {
        for (const file of filesToUpload) {
          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch("/api/convert", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`Failed to convert file: ${file.name}`);
          }

          const data = await response.json();
          if (data.text) {
            const timestamp = new Date().getTime();
            const path = `studydocs/${notebookIdToUse}/${pageIdToUse}_${timestamp}.md`;
            const storageRef = ref(storage, path);
            await uploadString(storageRef, data.text, "raw", {
              contentType: "text/markdown",
            });

            const url = await getDownloadURL(storageRef);
            uploadedDocsMetadata.push({
              path,
              url,
              name: file.name,
              timestamp: timestamp.toString(),
            });
          }
        }
      }

      // Prepare metadata for the API
      const sourceNotebooks = await Promise.all(
        Object.entries(selectedPages).map(async ([notebookId, pageIds]) => {
          const notebook = notebooks.find((n) => n.id === notebookId);
          if (!notebook) return null;

          return {
            notebookId,
            notebookTitle: notebook.title,
            pages: pageIds.map((pageId) => {
              const page = notebook.pages.find((p) => p.id === pageId);
              return {
                pageId,
                pageTitle: page?.title || "Unknown Page",
              };
            }),
          };
        })
      );

      const metadata = {
        name: setName,
        createdAt: new Date(),
        sourceNotebooks: sourceNotebooks.filter((n) => n !== null),
        cardCount: numCards,
        userId: firestoreUser.id,
      };

      // Call the API to generate cards
      const formData = new FormData();
      const messageData = {
        selectedPages: hasSelectedPages ? selectedPages : undefined,
        numberOfCards: numCards,
        metadata,
        uploadedDocs:
          uploadedDocsMetadata.length > 0 ? uploadedDocsMetadata : undefined,
      };

      formData.append("message", JSON.stringify(messageData));

      const response = await fetch("/api/studycards", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Failed to generate cards");
      }

      const data = await response.json();

      // Save the study card set with user ID
      await saveStudyCardSet(data.cards, metadata, firestoreUser.id);

      // Reset form state
      setShowNotebookModal(false);
      setSetName("");
      setFilesToUpload([]);
      setFiles([]);
      setSelectedPages({});

      // Refresh the study set list
      await loadStudySet();

      toast.success("Study cards generated successfully!");
    } catch (error: any) {
      console.error("Error generating cards:", error);
      toast.error(error.message || "Failed to generate cards");
    } finally {
      setIsGenerating(false);
    }
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
    setSelectedPages((prev) => ({
      ...prev,
      [notebookId]: isSelected ? [pageId] : [],
    }));
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

      const userNotebooks = await getNotebooksByFirestoreUserId(
        firestoreUser.id
      );

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
    <div className="  ">
      <div className="flex justify-between my-8 pt-5 md:pt-0 px-5">
        <Link href="/">
          <Button
            variant="ghost"
            className="gap-2 text-slate-600 flex items-center justify-center w-fit  rounded-full hover:bg-slate-100"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
        <Button
          onClick={() => setShowNotebookModal(true)}
          className="bg-white md:px-4 px-2 border border-slate-600 text-slate-600  hover:bg-white hover:border-[#94b347] rounded-full hover:text-[#94b347]"
        >
          <Plus className="w-4 h-4 " />
          <span className="hidden md:block">Create Study Cards</span>
        </Button>
      </div>
      <div className="p-6 rounded-lg w-full h-[calc(100vh-8rem)] overflow-y-auto bg-white">
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
          handleGenerateCards={handleGenerateCardsClick}
          isGenerating={isGenerating}
          selectedPages={selectedPages}
          filesToUpload={filesToUpload}
        />

        {studySet && studySet.cards && studySet.cards.length > 0 ? (
          <>
            <StudyCardCarousel
              studySet={studySet}
              onCardChange={setActiveCardIndex}
            />
            <StudyCardList
              studySet={studySet}
              onUpdate={handleStudySetUpdate}
              activeCardIndex={activeCardIndex}
            />
          </>
        ) : (
          <div className="text-center py-8 text-slate-600">
            No study cards found in this set.
          </div>
        )}
      </div>
    </div>
  );
}
