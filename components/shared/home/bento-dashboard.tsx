import { AccordionDemo } from "@/components/accordion-demo";
import { CreateNotebookModal } from "@/components/shared/home/create-notebook-modal";
import { StudyGuide } from "@/components/shared/study/StudyGuide";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { db, storage } from "@/firebase";
import { getCurrentUserId } from "@/lib/auth";
import {
  deleteNotebook,
  deleteQuiz,
  deleteStudyCardSet,
  deleteStudyGuide,
  getNotebooksByFirestoreUserId,
  getQuizzesByFirestoreUserId,
  getStudyCardsByClerkId,
  getStudyGuidesByFirestoreUserId,
  getUserByClerkId,
  Notebook,
  Page,
} from "@/lib/firebase/firestore";
import type { Message } from "@/lib/types";
import type { QuizState } from "@/types/quiz";
import { StudyCardSet, StudySetMetadata } from "@/types/studyCards";
import { useUser } from "@clerk/nextjs";
import CircularProgress from "@mui/material/CircularProgress";
import {
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import {
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  MessageCircleQuestion,
  MessageSquare,
  NotebookPen,
  PanelBottom,
  Plus,
  RefreshCw,
  ScrollText,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MutableRefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "react-hot-toast";

import QuizForm from "@/components/shared/global/QuizForm";
import CreateCardModal from "@/components/shared/study/CreateCardModal";
import StudyGuideModal from "@/components/shared/study/StudyGuideModal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollectionData } from "@/hooks/useCollectionData";
import { saveStudyCardSet } from "@/lib/firebase/firestore";
import { handleGenerateCards as generateCards } from "@/lib/utils/studyCardsUtil";
import { Notebook as NotebookType } from "@/types/notebooks";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { BookOpen } from "lucide-react";

interface StudyCardData {
  title: string;
  content: string;
}

interface StudyCardMetadata {
  cardCount: number;
  createdAt: Date;
  name: string;
}

interface StudyCardNotebook {
  notebookId: string;
  notebookTitle: string;
}

interface StudyCardPage {
  pageId: string;
  pageTitle: string;
}

interface SerializedTimestamp {
  seconds: number;
  nanoseconds: number;
}

// Update the formatDate function to handle SerializedTimestamp
const formatDate = (
  timestamp: Timestamp | Date | string | SerializedTimestamp | null | undefined
) => {
  if (!timestamp) return "";

  if (timestamp instanceof Date) {
    return timestamp.toLocaleDateString();
  }

  if (typeof timestamp === "string") {
    return new Date(timestamp).toLocaleDateString();
  }

  // Handle Firestore Timestamp
  if ("toDate" in timestamp) {
    return timestamp.toDate().toLocaleDateString();
  }

  // Handle SerializedTimestamp
  if ("seconds" in timestamp) {
    return new Date(timestamp.seconds * 1000).toLocaleDateString();
  }

  return new Date().toLocaleDateString();
};

export default function BentoDashboard({ listType }: { listType: string }) {
  const { user } = useUser();
  const router = useRouter();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);

  const { data: studyCards, loading: loadingStudyCards } =
    useCollectionData<StudyCardSet>("studyCards");

  const { data: studyGuides, loading: loadingStudyGuides } =
    useCollectionData<StudyGuide>("studyGuides");

  const { data: quizzes, loading: loadingQuizzes, mutate: mutateQuizzes } =
    useCollectionData<QuizState>("quizzes");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [quizName, setQuizName] = useState("");
  const [numberOfQuestions, setNumberOfQuestions] = useState(10);
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState({
    multipleChoice: true,
    trueFalse: true,
    shortAnswer: true,
  });
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPages, setSelectedPages] = useState<{
    [notebookId: string]: string[];
  }>({});
  const [expandedNotebooks, setExpandedNotebooks] = useState<Set<string>>(
    new Set()
  );
  const [showCardModal, setShowCardModal] = useState(false);
  const [setName, setSetName] = useState("");
  const [numCards, setNumCards] = useState(10);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showUpload, setShowUpload] = useState(true);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const cardFileInputRef = useRef<HTMLInputElement>(null);
  const [showStudyGuideModal, setShowStudyGuideModal] = useState(false);
  const [guideName, setGuideName] = useState("");
  const [studyGuideFiles, setStudyGuideFiles] = useState<File[]>([]);
  const studyGuideFileInputRef = useRef<HTMLInputElement>(null);
  const [isGeneratingGuide, setIsGeneratingGuide] = useState(false);
  const [showDeleteCardAlert, setShowDeleteCardAlert] = useState<string | null>(
    null
  );
  const [showDeleteNotebookAlert, setShowDeleteNotebookAlert] = useState<
    string | null
  >(null);
  const [showDeleteGuideAlert, setShowDeleteGuideAlert] = useState<
    string | null
  >(null);
  const [showDeleteQuizAlert, setShowDeleteQuizAlert] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNotebooks = async () => {
      try {
        const clerkUserId = await getCurrentUserId();
        if (!clerkUserId) return;

        const firestoreUser = await getUserByClerkId(clerkUserId);
        if (!firestoreUser) return;

        const userNotebooks = await getNotebooksByFirestoreUserId(
          firestoreUser.id
        );
        setNotebooks(userNotebooks);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching notebooks:", error);
        setLoading(false);
      }
    };

    fetchNotebooks();
  }, []);

  const handleDeleteNotebook = async (
    e: React.MouseEvent,
    notebookId: string
  ) => {
    e.preventDefault();
    setShowDeleteNotebookAlert(notebookId);
  };
  const handleDeleteQuiz2 = async (quizId: string) => {
    try {
      const quizRef = doc(db, "quizzes", quizId);
      
      await deleteDoc(quizRef);
      
      const updatedQuizzes = quizzes.filter(quiz => quiz.id !== quizId);
      mutateQuizzes(updatedQuizzes);
      
      toast.success("Quiz deleted successfully");
    } catch (error) {
      console.error("Error deleting quiz:", error);
      toast.error("Failed to delete quiz");
    }
  };

  const handleDeleteStudyCard = async (e: React.MouseEvent, cardId: string) => {
    e.preventDefault();
    setShowDeleteCardAlert(cardId);
  };

  const handleDeleteQuiz = async (e: React.MouseEvent, quizId: string) => {
    e.preventDefault();
    setShowDeleteQuizAlert(quizId);
  };

  const handleDeleteStudyGuide = async (
    e: React.MouseEvent,
    guideId: string
  ) => {
    e.preventDefault();
    setShowDeleteGuideAlert(guideId);
  };

  const handleConfirmDeleteCard = async (cardId: string) => {
    try {
      const cardRef = doc(db, "studyCards", cardId);
      await deleteDoc(cardRef);
      toast.success("Study card set deleted successfully");
    } catch (error) {
      console.error("Error deleting study card:", error);
      toast.error("Failed to delete study card set");
    } finally {
      setShowDeleteCardAlert(null);
    }
  };

  const handleGenerateQuiz = async () => {
    try {
      if (!quizName.trim()) {
        toast.error("Please enter a name for the quiz");
        return;
      }

      if (files.length === 0 && Object.keys(selectedPages).length === 0) {
        toast.error("Please either upload files or select notebook pages");
        return;
      }

      setIsGenerating(true);

      // Get the first notebook and page IDs if they exist
      const firstNotebookId = Object.keys(selectedPages)[0] || "";
      const firstPageId = selectedPages[firstNotebookId]?.[0] || "";

      let uploadedDocsMetadata = [];
      if (files.length > 0) {
        for (const file of files) {
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
            // Use a generic path if no notebook is selected
            const path = firstNotebookId
              ? `quizdocs/${firstNotebookId}/${firstPageId}_${timestamp}.md`
              : `quizdocs/uploads/${timestamp}_${file.name.replace(
                  /\s+/g,
                  "_"
                )}.md`;

            const storageRef = ref(storage, path);
            await uploadString(storageRef, data.text, "raw", {
              contentType: "text/markdown",
            });

            const url = await getDownloadURL(storageRef);

            uploadedDocsMetadata.push({
              path,
              url,
              name: file.name,
              content: data.text, // Include content directly
              timestamp: timestamp.toString(),
            });
          }
        }
      }

      const formData = new FormData();
      const messageData = {
        selectedPages:
          Object.keys(selectedPages).length > 0 ? selectedPages : undefined,
        quizName,
        numberOfQuestions,
        questionTypes: Object.entries(selectedQuestionTypes)
          .filter(([_, selected]) => selected)
          .map(([type]) => type),
        uploadedDocs:
          uploadedDocsMetadata.length > 0 ? uploadedDocsMetadata : undefined,
      };

      formData.append("message", JSON.stringify(messageData));

      const response = await fetch("/api/quiz", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Failed to generate quiz");
      }

      const data = await response.json();

      // Create a new quiz document in Firestore
      const quizCollectionRef = collection(db, "quizzes");
      const newQuizRef = doc(quizCollectionRef); // Let Firestore generate the ID

      const newQuiz: QuizState = {
        id: newQuizRef.id, // Use Firestore's generated ID
        notebookId: firstNotebookId,
        pageId: firstPageId,
        quizData: data.quiz,
        currentQuestionIndex: 0,
        startedAt: Timestamp.now(),
        lastUpdatedAt: Timestamp.now(),
        userAnswers: [],
        evaluationResults: [],
        score: 0,
        isComplete: false,
        incorrectAnswers: [],
        totalQuestions: data.quiz.questions.length,
        userId: user?.id || "",
        createdAt: Timestamp.now(),
        title: quizName,
      };

      // Save the quiz using the Firestore-generated ID
      await setDoc(newQuizRef, {
        ...newQuiz,
        startedAt: serverTimestamp(),
        lastUpdatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      setQuizName("");
      setFiles([]);
      setSelectedPages({});
      setShowQuizForm(false);

      toast.success("Quiz generated successfully!");
      router.push(`/quizzes/${newQuizRef.id}`);
    } catch (error: any) {
      console.error("Error generating quiz:", error);
      toast.error(error.message || "Failed to generate quiz");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    setFiles: (files: File[]) => void
  ) => {
    if (event.target.files) {
      setFiles(Array.from(event.target.files));
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
      const adaptedNotebooks: NotebookType[] = notebooks.map((notebook) => ({
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
      [notebookId]: isSelected
        ? [...(prev[notebookId] || []), pageId]
        : (prev[notebookId] || []).filter((id) => id !== pageId),
    }));
  };

  const isNotebookFullySelected = (notebookId: string, pages: any[]) => {
    return pages.every((page) => selectedPages[notebookId]?.includes(page.id));
  };
  const renderNotebookList = () => {
    
    if (!notebooks || notebooks.length === 0) {
      return (
        <div className="text-center p-4 text-gray-500">
          No notebooks found. Please create a notebook first.
        </div>
      );
    }

    return (
      <div className="space-y-2 p-2 w-full">
        {notebooks.map((notebook) => (
          <div
            key={notebook.id}
            className="border rounded-xl p-1 bg-white border-slate-400"
          >
            <div className="flex items-center justify-between p-3 bg-white text-slate-600">
              <div className="flex items-center gap-2">
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

  const handleStudyGuideFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (event.target.files) {
      setStudyGuideFiles(Array.from(event.target.files));
    }
  };
 
  const handleGenerateGuide = async () => {
    try {
      if (!guideName.trim()) {
        toast.error("Please enter a name for the study guide");
        return;
      }

      if (
        studyGuideFiles.length === 0 &&
        Object.keys(selectedPages).length === 0
      ) {
        toast.error("Please either upload files or select notebook pages");
        return;
      }

      setIsGeneratingGuide(true);

      // Get the first selected notebook and page if they exist
      const firstNotebookId = Object.keys(selectedPages)[0] || "";
      const firstPageId = firstNotebookId
        ? selectedPages[firstNotebookId]?.[0]
        : "";

      // Handle file uploads
      let uploadedDocsMetadata = [];
      if (studyGuideFiles.length > 0) {
        for (const file of studyGuideFiles) {
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
            // Use a generic path if no notebook/page is selected
            const path =
              firstNotebookId && firstPageId
                ? `studyguides/${firstNotebookId}/${firstPageId}_${timestamp}.md`
                : `studyguides/uploads/${timestamp}.md`;
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

      const formData = new FormData();
      const messageData = {
        selectedPages:
          Object.keys(selectedPages).length > 0 ? selectedPages : undefined,
        guideName,
        uploadedDocs:
          uploadedDocsMetadata.length > 0 ? uploadedDocsMetadata : undefined,
      };

      formData.append("message", JSON.stringify(messageData));

      const response = await fetch("/api/studyguide", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || "Failed to generate study guide");
      }

      const newStudyGuide = {
        id: `studyguide_${crypto.randomUUID()}`,
        notebookId: firstNotebookId,
        pageId: firstPageId,
        title: guideName,
        content: data.content,
        createdAt: serverTimestamp(),
        userId: user?.id || "",
      };

      const studyGuideRef = doc(db, "studyGuides", newStudyGuide.id);
      await setDoc(studyGuideRef, newStudyGuide);

      setGuideName("");
      setStudyGuideFiles([]);
      setSelectedPages({});
      setShowStudyGuideModal(false);

      toast.success("Study guide generated successfully!");
      router.push(`/study-guides/${newStudyGuide.id}`);
    } catch (error: any) {
      console.error("Error generating study guide:", error);
      toast.error(error.message || "Failed to generate study guide");
    } finally {
      setIsGeneratingGuide(false);
    }
  };

  useEffect(() => {
   
    setIsLoading(false);
  }, [studyCards]);

  const renderStudyCards = useMemo(() => {
    if (loadingStudyCards) {
      return (
        <div className="text-center py-4">
          <RefreshCw className="text-[#94b347] animate-spin" />

        </div>
      );
    }

    return (
      <div className="space-y-2 sm:space-y-4">
        {studyCards.map((studyCard) => (
          <Link key={studyCard.id} href={`/study-cards/${studyCard.id}`}>
            <Card className="transition-transform shadow-none bg-white border-none relative">
              <CardContent className="p-2 sm:p-4 flex flex-row items-center justify-between border-t hover:bg-slate-50 border-slate-300">
                <div className="p-1 sm:p-2 rounded-full w-fit bg-white">
                  <PanelBottom className="h-4 w-4 sm:h-6 sm:w-6 text-[#94b347]" />
                </div>
                <div className="flex flex-col items-start flex-grow mx-2 sm:mx-4">
                  <h2 className="text-xs sm:text-md font-semibold text-slate-600 line-clamp-1">
                    {studyCard.metadata.name}
                  </h2>
                  <p className="text-muted-foreground text-xs">
                    {formatDate(studyCard.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <p className="text-muted-foreground text-xs hidden sm:block">
                    {studyCard.cards?.length || 0} cards
                  </p>
                  <button
                    onClick={(e) => handleDeleteStudyCard(e, studyCard.id)}
                    className="p-1 sm:p-2 hover:bg-red-100 rounded-full transition-colors"
                  >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-slate-400 hover:text-red-500" />
                  </button>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    );
  }, [studyCards, loadingStudyCards]);

  return (
    <div className="container mx-auto px-2 sm:px-6">
      <div className="flex flex-col items-center justify-center h-full w-full">
        <h1 className="text-xl sm:text-3xl font-semibold text-[#94b347] mb-2 sm:mb-4">
          Dashboard
        </h1>
      </div>

      <div className="flex flex-row items-center justify-between w-full gap-2 sm:gap-4 mb-4 sm:mb-6">
        <h1 className="text-base sm:text-xl font-semibold text-slate-600">
          My Notebooks
        </h1>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="w-fit sm:w-auto text-slate-900 px-3 py-1.5 sm:px-4 sm:py-2 bg-white rounded-full border border-slate-300 shadow-none font-semibold hover:bg-slate-50 text-sm sm:text-base"
        >
          <Plus className="h-4 w-4 md:hidden" />
          <span className="hidden md:block">New Notebook</span>
        </Button>
      </div>

      {notebooks.length === 0 ? (
        loading ? (
          <div className="flex flex-col items-center justify-center h-full w-full gap-2 min-h-[200px] sm:min-h-[300px]">
            <div className="text-slate-400 text-lg sm:text-xl font-semibold">
              Loading your notebooks...
            </div>
            <RefreshCw className="text-[#94b347] animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full w-full gap-2 min-h-[200px] sm:min-h-[300px]">
            <div className="text-slate-400 text-lg sm:text-xl font-semibold">
              No notebooks found
            </div>
          </div>
        )
      ) : (
        <div className="space-y-4 sm:space-y-8">
          <section className="w-full">
            <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6">
              {notebooks.map((notebook) => (
                <Link key={notebook.id} href={`/notes/${notebook.id}`}>
                  <Card className="h-full transition-transform hover:scale-105 shadow-none bg-[#c6d996] border-none  relative dark:text-black">
                    <button
                      onClick={(e) => handleDeleteNotebook(e, notebook.id)}
                      className="absolute top-2 right-2 p-1.5 sm:p-2 hover:bg-red-100 rounded-full transition-colors"
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-white dark:text-black hover:text-red-500" />
                    </button>

                    <CardContent className="p-3 sm:p-8 flex flex-col h-full">
                      <div className="p-2 sm:p-3 rounded-full w-fit bg-[#94b347]">
                        <NotebookPen className="h-5 w-5 sm:h-8 sm:w-8 text-white" />
                      </div>
                      <h2 className="text-base sm:text-xl font-semibold mt-2 sm:mt-4 text-black dark:text-black">
                        {notebook.title}
                      </h2>
                      <p className="mt-1 sm:mt-2 flex-grow text-black dark:text-black text-xs sm:text-base">
                        {formatDate(notebook.createdAt)}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}

      <div className="w-full mt-6 sm:mt-8">
        <div className="h-px w-full bg-slate-300"></div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-full w-full gap-2 min-h-[200px] sm:min-h-[300px]">
            <div className="text-slate-400 text-lg sm:text-xl font-semibold">
              Loading your Study Material
            </div>
            <RefreshCw className="text-[#94b347] animate-spin" />
          </div>
        ) : (
          <>
            <div className="text-center py-3 sm:py-4">
              <h2 className="text-lg sm:text-2xl font-semibold text-[#94b347]">
                Study Material
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-1">
                Study cards, study guides, and quizzes. All in one place.
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-8 w-full">
              <section className="rounded-lg h-fit">
                <AccordionDemo
                  sections={[
                    {
                      id: "study-cards",
                      title: "Study Cards",
                      loading: loadingStudyCards,
                      button: {
                        label: "New Study Cards",
                        onClick: () => setShowCardModal(true),
                      },
                      content: renderStudyCards,
                    },
                  ]}
                />
              </section>
              <section className="rounded-lg h-fit">
                <AccordionDemo
                  sections={[
                    {
                      id: "study-guides",
                      title: "Study Guides",
                      loading: loadingStudyGuides,
                      button: {
                        label: "New Study Guide",
                        onClick: () => setShowStudyGuideModal(true),
                      },
                      content: (
                        <div className="">
                          {studyGuides.map((guide) => (
                            <div key={guide.id}>
                              <Link
                                key={guide.id}
                                href={`/study-guides/${guide.id}`}
                                className="transition-transform hover:scale-[1.02]"
                              >
                                <Card className="shadow-none bg-white border-none relative">
                                  <CardContent className="p-4 flex flex-row items-center justify-between border-t hover:bg-slate-50 border-slate-300">
                                    <div className="p-2 rounded-full w-fit bg-white">
                                      <ScrollText className="h-6 w-6 text-[#94b347]" />
                                    </div>
                                    <div className="flex flex-col   w-full px-4">
                                      <h3 className="font-medium text-slate-700 line-clamp-1">
                                        {guide.title}
                                      </h3>

                                      <div className="flex gap-4 text-sm text-slate-500">
                                        <p>{formatDate(guide.createdAt)}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={(e) =>
                                          handleDeleteStudyGuide(e, guide.id)
                                        }
                                        className="p-2 hover:bg-red-100 rounded-full transition-colors"
                                      >
                                        <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" />
                                      </button>
                                      <ChevronRight className="h-5 w-5 text-slate-400" />
                                    </div>
                                  </CardContent>
                                </Card>
                              </Link>
                            </div>
                          ))}
                        </div>
                      ),
                    },
                  ]}
                />
              </section>
              <section className="rounded-lg h-fit">
                <AccordionDemo
                  sections={[
                    {
                      id: "quizzes",
                      title: "Quizzes",
                      loading: loadingQuizzes,
                      button: {
                        label: "New Quiz",
                        onClick: () => setShowQuizForm(true),
                      },
                      content: (
                        <div className="space-y-4">
                          {quizzes.map((quiz) => (
                            <Link
                              key={quiz.id}
                              href={`/quizzes/${quiz.id}`}
                              className="transition-transform hover:scale-[1.02]"
                            >
                              <Card className="shadow-none bg-white border-none relative">
                                <CardContent className="p-4 flex flex-row items-center justify-between border-t hover:bg-slate-50 border-slate-300">
                                  <div className="p-2 rounded-full w-fit bg-white">
                                    <MessageCircleQuestion className="h-6 w-6 text-[#94b347]" />
                                  </div>
                                  <div className="flex flex-col  w-full px-4">
                                    <h3 className="font-medium text-slate-700 line-clamp-1">
                                      {quiz.quizData?.title || "Untitled Quiz"}
                                    </h3>
                                    <p className="text-muted-foreground">
                                      {formatDate(quiz.startedAt)}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="flex flex-col text-sm text-slate-500 w-[100px]">
                                      <p>Questions: {quiz.totalQuestions}</p>

                                      {quiz.isComplete ? (
                                        <p>
                                          Score: {quiz.score}/
                                          {quiz.totalQuestions}
                                        </p>
                                      ) : (
                                        <p className="text-green-500">
                                          active
                                        </p>
                                      )}
                                    </div>
                                    <button
                                      onClick={(e) =>
                                        handleDeleteQuiz(e, quiz.id)
                                      }
                                      className="p-2 hover:bg-red-100 rounded-full transition-colors"
                                    >
                                      <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" />
                                    </button>
                                    <ChevronRight className="h-5 w-5 text-slate-400" />
                                  </div>
                                </CardContent>
                              </Card>
                            </Link>
                          ))}
                        </div>
                      ),
                    },
                  ]}
                />
              </section>
            </div>
          </>
        )}
      </div>

      <CreateNotebookModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {showQuizForm && (
        <QuizForm
          quizName={quizName}
          setQuizName={setQuizName}
          numberOfQuestions={numberOfQuestions}
          setNumberOfQuestions={setNumberOfQuestions}
          selectedQuestionTypes={selectedQuestionTypes}
          setSelectedQuestionTypes={setSelectedQuestionTypes}
          files={files}
          setFiles={setFiles}
          fileInputRef={fileInputRef as MutableRefObject<HTMLInputElement>}
          isGenerating={isGenerating}
          setIsGenerating={setIsGenerating}
          setShowQuizForm={setShowQuizForm}
          renderNotebookList={renderNotebookList}
          selectedPages={selectedPages}
          user={user}
          setSelectedPages={setSelectedPages}
        />
      )}

      <CreateCardModal
        showNotebookModal={showCardModal}
        setShowNotebookModal={setShowCardModal}
        setName={setName}
        setSetName={setSetName}
        numCards={numCards}
        setNumCards={setNumCards}
        messages={messages}
        files={filesToUpload}
        showUpload={showUpload}
        fileInputRef={cardFileInputRef as MutableRefObject<HTMLInputElement>}
        handleFileUpload={handleFileUpload}
        handleSendMessage={() => {}}
        handleClear={() => setFilesToUpload([])}
        setShowUpload={setShowUpload}
        setFiles={setFilesToUpload}
        renderNotebookList={renderNotebookList}
        handleGenerateCards={handleGenerateCards}
        isGenerating={isGenerating}
        selectedPages={selectedPages}
        filesToUpload={filesToUpload}
        setIsGenerating={setIsGenerating}
        setSelectedPages={setSelectedPages}
      />

      {showStudyGuideModal && (
        <StudyGuideModal
          guideName={guideName}
          setGuideName={setGuideName}
          files={studyGuideFiles}
          handleFileUpload={handleStudyGuideFileUpload}
          handleClear={() => setStudyGuideFiles([])}
          fileInputRef={
            studyGuideFileInputRef as MutableRefObject<HTMLInputElement>
          }
          messages={messages}
          handleSendMessage={() => {}}
          showUpload={showUpload}
          setShowUpload={setShowUpload}
          renderNotebookSelection={renderNotebookList}
          onClose={() => setShowStudyGuideModal(false)}
          handleGenerateGuide={handleGenerateGuide}
          isGenerating={isGeneratingGuide}
          filesToUpload={studyGuideFiles}
          selectedPages={selectedPages}
          setIsGenerating={setIsGeneratingGuide}
        />
      )}

      <AlertDialog
        open={!!showDeleteCardAlert}
        onOpenChange={() => setShowDeleteCardAlert(null)}
      >
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              study card set.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteCardAlert(null);
              }}
              className="bg-white text-slate-600 rounded-full border border-slate-300 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={async (e) => {
                e.stopPropagation();
                e.preventDefault();
                try {
                  const cardId = showDeleteCardAlert;
                  if (!cardId) return;

                  await handleConfirmDeleteCard(cardId);
                } catch (error) {
                  console.error("Error deleting study card:", error);
                  toast.error("Failed to delete study card set");
                }
              }}
              className="bg-white text-red-600 rounded-full border border-red-500 hover:bg-red-100 hover:text-red-500 transition-colors"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!showDeleteNotebookAlert}
        onOpenChange={() => setShowDeleteNotebookAlert(null)}
      >
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              notebook and all its contents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteNotebookAlert(null);
              }}
              className="bg-white text-slate-600 rounded-full border border-slate-300 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const notebookId = showDeleteNotebookAlert;
                  if (!notebookId) return;

                  await deleteNotebook(notebookId);
                  setNotebooks(
                    notebooks.filter((notebook) => notebook.id !== notebookId)
                  );
                  toast.success("Notebook deleted successfully");
                } catch (error) {
                  console.error("Error deleting notebook:", error);
                  toast.error("Failed to delete notebook");
                } finally {
                  setShowDeleteNotebookAlert(null);
                }
              }}
              className="bg-white text-red-600 rounded-full border border-red-500 hover:bg-red-100 hover:text-red-500 transition-colors"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!showDeleteGuideAlert}
        onOpenChange={() => setShowDeleteGuideAlert(null)}
      >
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              study guide.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteGuideAlert(null);
              }}
              className="bg-white text-slate-600 rounded-full border border-slate-300 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const guideId = showDeleteGuideAlert;
                  if (!guideId) return;

                  await deleteStudyGuide(guideId);
                  toast.success("Study guide deleted successfully");
                } catch (error) {
                  console.error("Error deleting study guide:", error);
                  toast.error("Failed to delete study guide");
                } finally {
                  setShowDeleteGuideAlert(null);
                }
              }}
              className="bg-white text-red-600 rounded-full border border-red-500 hover:bg-red-100 hover:text-red-500 transition-colors"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!showDeleteQuizAlert}
        onOpenChange={() => setShowDeleteQuizAlert(null)}
      >
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              quiz and all its results.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteQuizAlert(null);
              }}
              className="bg-white text-slate-600 rounded-full border border-slate-300 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={async (e) => {
                e.stopPropagation();
                e.preventDefault();
                try {
                  const quizId = showDeleteQuizAlert;
                  if (!quizId) return;

                  await handleDeleteQuiz2(quizId);
                  setShowDeleteQuizAlert(null);
                } catch (error) {
                  console.error("Error deleting quiz:", error);
                  toast.error("Failed to delete quiz");
                }
              }}
              className="bg-white text-red-600 rounded-full border border-red-500 hover:bg-red-100 hover:text-red-500 transition-colors"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
