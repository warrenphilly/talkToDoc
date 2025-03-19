"use client";

import CreateCardModal from "@/components/shared/study/CreateCardModal";
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
import { handleGenerateCards as generateCards } from "@/lib/utils/studyCardsUtil";
import { Notebook } from "@/types/notebooks";
import { StudyCardSet } from "@/types/studyCards";
import { User } from "@/types/users";
import { useAuth, useUser } from "@clerk/nextjs";
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
import { useParams, useRouter } from "next/navigation";
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
  setSelectedPages: (pages: { [notebookId: string]: string[] }) => void;
  setIsGenerating: (isGenerating: boolean) => void;
}

export default function StudyCardPage() {
  const params = useParams();
  const studyCardId = params?.studyCardId as string;
  const [studySet, setStudySet] = useState<StudyCardSet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();
  const [showCardModal, setShowCardModal] = useState(false);

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
  const router = useRouter();

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

  const handleClear = (fileIndex?: number) => {
    if (typeof fileIndex === "number") {
      // Remove specific file
      setFiles(files.filter((_, index) => index !== fileIndex));
      setFilesToUpload(filesToUpload.filter((_, index) => index !== fileIndex));
    } else {
      // Clear all files (original behavior)
      setMessages([]);
      setFiles([]);
      setFilesToUpload([]);
    }
  };

  const handleGenerateCards = async () => {
    try {
      if (!user?.id) {
        toast.error("Please sign in to generate study cards");
        return;
      }

      if (!setName.trim()) {
        toast.error("Please enter a name for the study card set");
        return;
      }

      setIsGenerating(true);

      // Convert Firestore notebooks to the expected type format
      const adaptedNotebooks: Notebook[] = notebooks.map((notebook) => ({
        ...notebook,
        // Ensure createdAt is a string as required by the Notebook type
        createdAt: String(notebook.createdAt),
      }));

      // Generate the cards using the existing utility function
      const generatedCards = await generateCards(
        setName,
        numCards,
        selectedPages,
        filesToUpload,
        adaptedNotebooks, // Use the adapted notebooks
        isGenerating, // Pass the boolean value
        (isGenerating: boolean) => setIsGenerating(isGenerating), // Wrap the setter
        (show: boolean) => setShowCardModal(show), // Convert to expected function signature
        (pages: { [notebookId: string]: string[] }) => setSelectedPages(pages), // Fix the type
        (name: string) => setSetName(name), // Wrap the setter
        (files: File[]) => setFilesToUpload(files), // Wrap the setter
        (files: File[]) => setFiles(files), // Wrap the setter
        (messages: any[]) => setMessages(messages), // Wrap the setter
        user.id
      );

      // Clear form and close modal
      setSetName("");
      setNumCards(10);
      setFilesToUpload([]);
      setSelectedPages({});
      setShowCardModal(false);

      toast.success("Study cards generated successfully!");
      router.push("/");
    } catch (error) {
      console.error("Error generating cards:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate cards"
      );
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
      <div className="space-y-2  w-full">
        {notebooks.map((notebook) => (
          <div
            key={notebook.id}
            className="border rounded-xl  p-1   border-slate-400"
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
    <div className="bg-white  ">
      <div className="flex items-center justify-between  py-2 md:pt-0 px-5">
        <Link href="/">
          <Button
            variant="ghost"
            className="gap-2 text-slate-600 flex items-center justify-center w-fit  rounded-full hover:bg-slate-100"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden md:block">Back to Dashboard</span>
            <span className="md:hidden">Back</span>
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
      <div className="p-6 pb-40 md:pb-12 rounded-lg w-full h-[95vh] overflow-y-auto bg-white">
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
          setSelectedPages={setSelectedPages}
          setIsGenerating={setIsGenerating}
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
