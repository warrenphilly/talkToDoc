import { AccordionDemo } from "@/components/accordion-demo";
import { CreateNotebookModal } from "@/components/shared/home/create-notebook-modal";
import { StudyGuide } from "@/components/shared/study/StudyGuide";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
import { StudyCardSet } from "@/types/studyCards";
import CircularProgress from "@mui/material/CircularProgress";
import { Timestamp } from "firebase/firestore";
import {
  ChevronRight,
  ChevronDown,
  Check,
  FileText,
  MessageCircleQuestion,
  MessageSquare,
  NotebookPen,
  PanelBottom,
  Plus,
  ScrollText,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useRef, MutableRefObject } from "react";
import { toast } from "react-hot-toast";
import { RefreshCw } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import QuizForm from "@/components/shared/global/QuizForm";

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
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [studyCards, setStudyCards] = useState<StudyCardSet[]>([]);
  const [studyGuides, setStudyGuides] = useState<StudyGuide[]>([]);
  const [quizzes, setQuizzes] = useState<QuizState[]>([]);
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

  // const [isLoadingNotebooks, setIsLoadingNotebooks] = useState(true);

  useEffect(() => {
    const fetchNotebooks = async () => {
      try {
        const clerkUserId = await getCurrentUserId();
        console.log("Clerk User ID:", clerkUserId); // Debug log

        if (!clerkUserId) return;

        const firestoreUser = await getUserByClerkId(clerkUserId);
        console.log("Firestore User:", firestoreUser); // Debug log

        if (!firestoreUser) return;

        const userNotebooks = await getNotebooksByFirestoreUserId(
          firestoreUser.id
        );
        const userStudyCards = await getStudyCardsByClerkId(clerkUserId);
        const userStudyGuides = await getStudyGuidesByFirestoreUserId(
          clerkUserId
        );
        const userQuizzes = await getQuizzesByFirestoreUserId(clerkUserId);

        console.log("Firestore User ID:", firestoreUser.id); // Debug log
        console.log("Study Cards Query Result:", userStudyCards);
        console.log("Study Guides Query Result:", userStudyGuides);
        console.log("Quizzes Query Result:", userQuizzes);

        setNotebooks(userNotebooks);
        setStudyCards(userStudyCards);
        setStudyGuides(userStudyGuides);
        setQuizzes(userQuizzes);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching notebooks:", error);
      }
    };

    fetchNotebooks();
  }, []);

  // useEffect(() => {
  //   setTimeout(() => {
  //     setLoading(false);
  //   }, 4000);
  // }, []);

  const handleDeleteNotebook = async (
    e: React.MouseEvent,
    notebookId: string
  ) => {
    e.preventDefault(); // Prevent navigation
    if (window.confirm("Are you sure you want to delete this notebook?")) {
      try {
        await deleteNotebook(notebookId);
        setNotebooks(
          notebooks.filter((notebook) => notebook.id !== notebookId)
        );
      } catch (error) {
        console.error("Error deleting notebook:", error);
      }
    }
  };

  const handleDeleteStudyCard = async (e: React.MouseEvent, cardId: string) => {
    e.preventDefault(); // Prevent navigation
    if (
      window.confirm("Are you sure you want to delete this study card set?")
    ) {
      try {
        const card = studyCards.find((c) => c.id === cardId);
        if (card) {
          await deleteStudyCardSet(card.notebookId, card.pageId, cardId);
          setStudyCards(studyCards.filter((card) => card.id !== cardId));
        }
      } catch (error) {
        console.error("Error deleting study card:", error);
      }
    }
  };

  const handleDeleteQuiz = async (e: React.MouseEvent, quizId: string) => {
    e.preventDefault(); // Prevent navigation
    if (window.confirm("Are you sure you want to delete this quiz?")) {
      try {
        await deleteQuiz(quizId);
        setQuizzes(quizzes.filter((quiz) => quiz.id !== quizId));
      } catch (error) {
        console.error("Error deleting quiz:", error);
      }
    }
  };
  const handleDeleteStudyGuide = async (
    e: React.MouseEvent,
    studyGuideId: string
  ) => {
    e.preventDefault(); // Prevent navigation
    if (window.confirm("Are you sure you want to delete this study guide?")) {
      try {
        await deleteStudyGuide(studyGuideId);
        setStudyGuides(
          studyGuides.filter((studyGuide) => studyGuide.id !== studyGuideId)
        );
      } catch (error) {
        console.error("Error deleting study guide:", error);
      }
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
      // ... rest of quiz generation logic ...
      
    } catch (error: any) {
      console.error("Error generating quiz:", error);
      toast.error(error.message || "Failed to generate quiz");
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
    console.log("Rendering notebooks:", notebooks); // Debug log

    

    if (!notebooks || notebooks.length === 0) {
      return (
        <div className="text-center p-4 text-gray-500">
          No notebooks found. Please create a notebook first.
        </div>
      );
    }

    return (
      <div className="space-y-2 p-2">
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


  return (
    <div className="container mx-auto">
      <div className="flex flex-col items-center justify-center h-full w-full">
        {" "}
        <h1 className="text-3xl font-semibold text-[#94b347]">Dashboard</h1>
      </div>

      <div className="flex flex-col items-center justify-center h-full w-full">
        <div className="flex flex-col sm:flex-row items-center justify-between  w-full gap-4 mb-6">
          <h1 className="text-xl font-semibold text-slate-600">My Notebooks</h1>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="text-slate-900 px-4 py-2 bg-white rounded-full border border-slate-300 shadow-none font-semibold hover:bg-slate-50"
          >
            New Notebook
          </Button>
        </div>
      </div>

      {notebooks.length === 0 ? (
        loading ? (
          <div className="flex flex-col items-center justify-center h-full w-full gap-2">
            <div className="text-slate-400 text-xl font-semibold">
              Loading your notebooks...
            </div>
            <CircularProgress sx={{ color: "#94b347" }} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full w-full gap-2">
            <div className="text-slate-400 text-xl font-semibold">
              No notebooks found
            </div>
          </div>
        )
      ) : (
        <div className="space-y-8">
          {/* Notebooks Section */}
          <section>
            <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {notebooks.map((notebook) => (
                <Link key={notebook.id} href={`/notes/${notebook.id}`}>
                  <Card className="h-full transition-transform hover:scale-105 shadow-none bg-[#c6d996] border border-slate-300 relative">
                    <button
                      onClick={(e) => handleDeleteNotebook(e, notebook.id)}
                      className="absolute top-2 right-2 p-2 hover:bg-red-100 rounded-full transition-colors"
                    >
                      <Trash2 className="h-4 w-4 text-white hover:text-red-500" />
                    </button>
                    <CardContent className="p-8 flex flex-col h-full">
                      <div className="p-3 rounded-full w-fit bg-[#94b347]">
                        <NotebookPen className="h-8 w-8 text-white" />
                      </div>

                      <h2 className="text-xl font-semibold mt-4 text-white">
                        {notebook.title}
                      </h2>
                      <p className=" mt-2 flex-grow text-white">
                        {formatDate(notebook.createdAt)}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
          <div className="w-full h-px bg-slate-200"></div>

          {/* Study Materials Header */}
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-[#94b347]">
              Study Material
            </h2>
            <p className="text-slate-400 text-sm">
              Study cards, study guides, and quizzes. All in one place.
            </p>
          </div>

          {/* Study Materials Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Study Cards Section */}
            <section className=" rounded-lg h-fit">
              <AccordionDemo
                sections={[
                  {
                    id: "study-cards",
                    title: "Study Cards",
                    content: (
                      <div className="space-y-4">
                        {studyCards.map((studyCard) => (
                          <Link
                            key={studyCard.id}
                            href={`/study-cards/${studyCard.id}`}
                          >
                            <Card className="transition-transform shadow-none bg-white border-none relative">
                              <CardContent className="p-4 flex flex-row items-center justify-between border-t hover:bg-slate-50 border-slate-300">
                                <div className="p-2 rounded-full w-fit bg-white">
                                  <PanelBottom className="h-6 w-6 text-[#94b347]" />
                                </div>
                                <div className="flex flex-col items-start flex-grow mx-4">
                                  <h2 className="text-md font-semibold text-slate-600 line-clamp-1">
                                    {studyCard.title}
                                  </h2>
                                  <p className="text-muted-foreground">
                                    {formatDate(studyCard.createdAt)}
                                  </p>
                                </div>
                                <p className="text-muted-foreground text-sm">
                                  {studyCard.cards.length} cards
                                </p>
                                <div className="mx-2">
                                  <button
                                    onClick={(e) =>
                                      handleDeleteStudyCard(e, studyCard.id)
                                    }
                                    className="p-2 hover:bg-red-100 rounded-full transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" />
                                  </button>
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

            {/* Study Guides Section */}
            <section className=" rounded-lg h-fit">
              <AccordionDemo
                sections={[
                  {
                    id: "study-guides",
                    title: "Study Guides",
                    content: (
                      <div className="space-y-4">
                        {studyGuides.map((guide) => (
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
                                  <h3 className="font-medium text-slate-700">
                                    {guide.title}
                                  </h3>

                                  <div className="flex gap-4 text-sm text-slate-500">
                                    <p>
                                      Created: {formatDate(guide.createdAt)}
                                    </p>
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
                        ))}
                      </div>
                    ),
                  },
                ]}
              />
            </section>

            {/* Quizzes Section */}
            <section className=" rounded-lg h-fit">
              <Button 
                onClick={() => setShowQuizForm(true)}
                className="bg-white hover:bg-white rounded-full shadow-none border border-slate-400 text-slate-400 hover:text-[#94b347] hover:border-[#94b347]"
              >
                New Quiz
              </Button>
              <AccordionDemo
                sections={[
                  {
                    id: "quizzes",
                    title: "Quizzes",
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
                                  <h3 className="font-medium text-slate-700">
                                    {quiz.quizData?.title || "Untitled Quiz"}
                                  </h3>
                                  <p className="text-muted-foreground">
                                    {formatDate(quiz.startedAt)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex gap-4 text-sm text-slate-500  w-[100px]">
                                    <p>Questions: {quiz.totalQuestions}</p>

                                    {quiz.isComplete && (
                                      <p>
                                        Score: {quiz.score}/
                                        {quiz.totalQuestions}
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
        </div>
      )}

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
          fileInputRef={fileInputRef as MutableRefObject<HTMLInputElement> }
          isGenerating={isGenerating}
          handleGenerateQuiz={handleGenerateQuiz}
          setShowQuizForm={setShowQuizForm}
          renderNotebookList={renderNotebookList}
          selectedPages={selectedPages}
        />
      )}
    </div>
  );
}
