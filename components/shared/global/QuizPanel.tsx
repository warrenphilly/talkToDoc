"use client";
import { Button } from "@/components/ui/button";
import Quiz from "@/components/ui/Quiz";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  getQuizzesByFirestoreUserId,
  saveQuizState,
} from "@/lib/firebase/firestore";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Image,
  Loader2,
  Mic,
  MicOff,
  Plus,
  PlusCircle,
  RefreshCw,
  Trash,
  Upload,
  Volume2,
  VolumeOff,
  Pencil,
  X,
  ChevronUp,
  Trophy,
} from "lucide-react"; // Import icons
import React, { MutableRefObject, useEffect, useRef, useState } from "react";

// import { Quiz } from "@/components/ui/Quiz";
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
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { db } from "@/firebase";
import {
  getAllNotebooks,
  getUserByClerkId,
  Notebook,
  Page,
} from "@/lib/firebase/firestore";
import { QuizData, QuizState } from "@/types/quiz";
import { useUser } from "@clerk/nextjs";
import { CircularProgress } from "@mui/material";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { ArrowLeft } from "lucide-react";
import { toast } from "react-hot-toast";
import FormUpload from "../study/formUpload";
import QuizForm from "./QuizForm";
import PageQuiz from "@/components/ui/PageQuiz";

// First, let's define our message types
interface Sentence {
  id: number;
  text: string;
}

interface Section {
  title: string;
  sentences: Sentence[];
}

interface Message {
  user: string;
  text: string | Section[];
  files?: string[];
}

interface QuizPanelProps {
  notebookId?: string;
  pageId?: string;
}

// Add interface for serialized timestamp
interface SerializedTimestamp {
  seconds: number;
  nanoseconds: number;
}

// Add interface for serialized quiz state
interface SerializedQuizState
  extends Omit<QuizState, "startedAt" | "lastUpdatedAt"> {
  startedAt: SerializedTimestamp;
  lastUpdatedAt: SerializedTimestamp;
}

const QuizPanel = ({ notebookId, pageId }: QuizPanelProps) => {
  // Quiz state
  const [quizzes, setQuizzes] = useState<QuizState[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<SerializedQuizState | null>(
    null
  );
  const [quizData, setQuizData] = useState<QuizData | null>(null);

  // Form state
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [quizName, setQuizName] = useState("");
  const [numberOfQuestions, setNumberOfQuestions] = useState(5);
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState({
    multipleChoice: true,
    trueFalse: false,
    shortAnswer: false,
  });

  const [showSummary, setShowSummary] = useState(false);

  // Document selection state
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [expandedNotebooks, setExpandedNotebooks] = useState<Set<string>>(
    new Set()
  );
  const [selectedPages, setSelectedPages] = useState<{
    [notebookId: string]: string[];
  }>({});
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(
    null
  ) as MutableRefObject<HTMLInputElement>;

  // Add these new state variables
  const [isLoadingNotebooks, setIsLoadingNotebooks] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [currentTitle, setCurrentTitle] = useState("");

  // Add the user hook
  const { user } = useUser();

  // Update the Firestore query
  useEffect(() => {
    const loadUserQuizzes = async () => {
      if (user) {
        const userQuizzes = await getQuizzesByFirestoreUserId(user.id);
        setQuizzes(userQuizzes);
      }
    };
    loadUserQuizzes();
  }, [notebookId, pageId]);

  // Update useEffect to depend on user
  useEffect(() => {
    if (user) {
      // Only load notebooks when user is available
      loadAllNotebooks();
    }
  }, [user]); // Add user to dependency array

  const loadAllNotebooks = async () => {
    try {
      setIsLoadingNotebooks(true);

      if (!user) {
        console.log("No user found");
        throw new Error("No authenticated user");
      }

      // First get the Firestore user
      const firestoreUser = await getUserByClerkId(user.id);

      if (!firestoreUser) {
        console.error("No Firestore user found for Clerk ID:", user.id);
        return;
      }

      // Get reference to notebooks collection
      const notebooksRef = collection(db, "notebooks");

      // Get ALL notebooks for debugging
      const allNotebooks = await getDocs(collection(db, "notebooks"));

      // Query using Firestore user ID
      const q = query(notebooksRef, where("userId", "==", firestoreUser.id));
      const querySnapshot = await getDocs(q);

      const fetchedNotebooks: Notebook[] = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || "",
          userId: data.userId || "",
          pages: data.pages || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
      });

      setNotebooks(fetchedNotebooks);
    } catch (error) {
      console.error("Error loading notebooks:", error);
      if (error instanceof Error) {
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
        });
      }
    } finally {
      setIsLoadingNotebooks(false);
    }
  };

  // Add these helper functions
  const toggleNotebookExpansion = (notebookId: string) => {
    setExpandedNotebooks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(notebookId)) {
        newSet.delete(notebookId);
      } else {
        newSet.add(notebookId);
      }
      return newSet;
    });
  };

  const isNotebookFullySelected = (notebookId: string, pages: Page[]) => {
    return pages.every((page) => selectedPages[notebookId]?.includes(page.id));
  };

  const handleNotebookSelection = (
    notebookId: string,
    pages: Page[],
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
    setSelectedPages((prev) => {
      const updatedPages = { ...prev };
      if (!updatedPages[notebookId]) {
        updatedPages[notebookId] = [];
      }

      if (isSelected) {
        updatedPages[notebookId] = [...updatedPages[notebookId], pageId];
      } else {
        updatedPages[notebookId] = updatedPages[notebookId].filter(
          (id) => id !== pageId
        );
      }

      return updatedPages;
    });
  };

  const handleGenerateQuiz = async () => {
    try {
      setIsGenerating(true);

      // Handle file uploads first
      const uploadedDocs = [];
      if (files.length > 0) {
        for (const file of files) {
          const formData = new FormData();
          formData.append("file", file);

          const convertResponse = await fetch("/api/convert", {
            method: "POST",
            body: formData,
          });

          if (!convertResponse.ok) {
            throw new Error(`Failed to convert file ${file.name}`);
          }

          const convertData = await convertResponse.json();

          if (!convertData.path && !convertData.text) {
            throw new Error(
              `No content returned for converted file ${file.name}`
            );
          }

          uploadedDocs.push({
            path: convertData.path,
            text: convertData.text,
            name: file.name,
            type: file.type,
          });
        }
      }

      // Prepare quiz generation request
      const quizFormData = new FormData();
      const message = {
        format: "quiz",
        numberOfQuestions,
        questionTypes: Object.entries(selectedQuestionTypes)
          .filter(([_, selected]) => selected)
          .map(([type]) => type),
        selectedPages,
        uploadedDocs,
        notebookId,
        pageId,
        quizName,
      };

      quizFormData.append("message", JSON.stringify(message));

      const response = await fetch("/api/quiz", {
        method: "POST",
        body: quizFormData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to generate quiz");
      }

      const data = await response.json();

      // Ensure required fields are present
      if (!notebookId) {
        throw new Error("Notebook ID is required");
      }

      // Create a new quiz state with required fields
      const newQuiz: Omit<QuizState, "id"> = {
        notebookId: notebookId,
        pageId: pageId || "",
        currentQuestionIndex: 0,
        score: 0,
        userAnswers: {},
        evaluationResults: {},
        incorrectAnswers: [],
        isComplete: false,
        startedAt: Timestamp.now(),
        lastUpdatedAt: Timestamp.now(),
        totalQuestions: data.quiz.questions.length,
        quizData: data.quiz,
        userId: user?.id || "",
        createdAt: Timestamp.now(),
        title: data.quiz.title,
      };

      // Save to Firestore
      const docRef = await addDoc(collection(db, "quizzes"), newQuiz);

      // Get the newly created quiz with its ID
      const newQuizWithId = { ...newQuiz, id: docRef.id } as QuizState;

      // Update local state
      setQuizzes((prevQuizzes) => [...prevQuizzes, newQuizWithId]);

      // Automatically select and open the new quiz
      const serializedQuiz: SerializedQuizState = {
        ...newQuizWithId,
        startedAt: {
          seconds: newQuizWithId.startedAt.seconds,
          nanoseconds: newQuizWithId.startedAt.nanoseconds,
        },
        lastUpdatedAt: {
          seconds: newQuizWithId.lastUpdatedAt.seconds,
          nanoseconds: newQuizWithId.lastUpdatedAt.nanoseconds,
        },
      };

      setSelectedQuiz(serializedQuiz);
      setQuizData(data.quiz);
      setShowQuizForm(false);

      // Clear form state
      setQuizName("");
      setFiles([]);
      setSelectedPages({});

      toast.success("Quiz generated successfully!");
    } catch (error) {
      console.error("Error generating quiz:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate quiz"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Function to handle quiz selection
  const handleQuizSelect = (quiz: QuizState) => {
    if (quiz.quizData) {
      // Convert timestamps to serializable format
      const serializedQuiz: SerializedQuizState = {
        ...quiz,
        startedAt:
          quiz.startedAt instanceof Date
            ? {
                seconds: Math.floor(quiz.startedAt.getTime() / 1000),
                nanoseconds: 0,
              }
            : {
                seconds: quiz.startedAt.seconds,
                nanoseconds: quiz.startedAt.nanoseconds,
              },
        lastUpdatedAt:
          quiz.lastUpdatedAt instanceof Date
            ? {
                seconds: Math.floor(quiz.lastUpdatedAt.getTime() / 1000),
                nanoseconds: 0,
              }
            : {
                seconds: quiz.lastUpdatedAt.seconds,
                nanoseconds: quiz.lastUpdatedAt.nanoseconds,
              },
      };

      setSelectedQuiz(serializedQuiz);
      setQuizData(quiz.quizData);
    } else {
      console.error("Selected quiz has no quiz data");
    }
  };

  // Function to handle returning to quiz list
  const handleBackToList = () => {
    setSelectedQuiz(null);
    setQuizData(null);
  };

  // Convert SerializedQuizState back to QuizState
  const getQuizState = (serializedQuiz: SerializedQuizState): QuizState => {
    return {
      ...serializedQuiz,
      startedAt: new Timestamp(
        serializedQuiz.startedAt.seconds,
        serializedQuiz.startedAt.nanoseconds
      ),
      lastUpdatedAt: new Timestamp(
        serializedQuiz.lastUpdatedAt.seconds,
        serializedQuiz.lastUpdatedAt.nanoseconds
      ),
    };
  };

  // Add real-time listener for quizzes
  useEffect(() => {
    if (!user) return;

    const quizzesRef = collection(db, "quizzes");
    const q = query(quizzesRef, where("userId", "==", user.id));

    // Set up real-time listener
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updatedQuizzes: QuizState[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        updatedQuizzes.push({
          ...data,
          id: doc.id,
          startedAt: data.startedAt,
          lastUpdatedAt: data.lastUpdatedAt,
          createdAt: data.createdAt,
        } as QuizState);
      });

      setQuizzes(updatedQuizzes);

      // If the currently selected quiz was deleted, clear the selection
      if (
        selectedQuiz &&
        !updatedQuizzes.find((quiz) => quiz.id === selectedQuiz.id)
      ) {
        setSelectedQuiz(null);
        setQuizData(null);
      }
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [user]);

  // Add delete quiz function
  const handleDeleteQuiz = async (quizId: string) => {
    try {
      await deleteDoc(doc(db, "quizzes", quizId));
      toast.success("Quiz deleted successfully");
    } catch (error) {
      console.error("Error deleting quiz:", error);
      toast.error("Failed to delete quiz");
    }
  };

  const handleQuizCreated = (newQuiz: QuizState) => {
    // Convert timestamps to serializable format without functions
    const serializedQuiz: SerializedQuizState = {
      ...newQuiz,
      startedAt: {
        seconds:
          newQuiz.startedAt instanceof Timestamp
            ? newQuiz.startedAt.seconds
            : Math.floor(new Date(newQuiz.startedAt as any).getTime() / 1000),
        nanoseconds:
          newQuiz.startedAt instanceof Timestamp
            ? newQuiz.startedAt.nanoseconds
            : 0,
      },
      lastUpdatedAt: {
        seconds:
          newQuiz.lastUpdatedAt instanceof Timestamp
            ? newQuiz.lastUpdatedAt.seconds
            : Math.floor(
                new Date(newQuiz.lastUpdatedAt as any).getTime() / 1000
              ),
        nanoseconds:
          newQuiz.lastUpdatedAt instanceof Timestamp
            ? newQuiz.lastUpdatedAt.nanoseconds
            : 0,
      },
    };

    setSelectedQuiz(serializedQuiz);
    setQuizData(newQuiz.quizData);
    setShowQuizForm(false);
  };

  // Update title states when selected quiz changes
  useEffect(() => {
    if (selectedQuiz?.quizData?.title) {
      setCurrentTitle(selectedQuiz.quizData.title);
      setEditedTitle(selectedQuiz.quizData.title);
    }
  }, [selectedQuiz]);

  const handleSaveTitle = async () => {
    if (!selectedQuiz) return;

    if (editedTitle.trim() === "") {
      toast.error("Title cannot be empty");
      return;
    }

    try {
      const quizRef = doc(db, "quizzes", selectedQuiz.id);
      await updateDoc(quizRef, {
        "quizData.title": editedTitle.trim(),
        lastUpdatedAt: serverTimestamp(),
      });

      setIsEditingTitle(false);
      setCurrentTitle(editedTitle.trim());

      // Update the local state
      setSelectedQuiz((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          quizData: {
            ...prev.quizData,
            title: editedTitle.trim(),
          },
        };
      });

      toast.success("Title updated successfully");
    } catch (error) {
      console.error("Error updating title:", error);
      setEditedTitle(currentTitle);
      setIsEditingTitle(false);
      toast.error("Failed to update title. Please try again.");
    }
  };

  const handleCancelEdit = () => {
    setEditedTitle(currentTitle);
    setIsEditingTitle(false);
  };

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
    <div className="w-full max-w-7xl mx-auto md:p-2 sm:p-4 h-full overflow-y-auto auto-scroll">
      {/* Header with Create Quiz button */}
      {!selectedQuiz && (
        <div className="flex justify-between items-center  md:mb-4 sm:mb-6">
          <div className="flex flex-col justify-center items-center  w-full gap-2 sm:gap-4 mb-4 md:mb-0">
            <h2 className="text-xl sm:text-2xl font-bold text-[#94b347] hidden md:block">
              Quiz Me
            </h2>
            <p className="text-slate-600 text-sm sm:text-base text-center hidden md:block">
              Create and review quizzes
            </p>

            <Button
              onClick={() => setShowQuizForm(true)}
              className="bg-white border border-slate-400 text-slate-800 mb-4 md:mb-0 hover:bg-white rounded-full my-2 sm:my-4 shadow-none hover:border-[#94b347] hover:text-[#94b347] text-sm sm:text-base w-full sm:w-auto"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Quiz
            </Button>
          </div>
        </div>
      )}

      {/* Quiz List */}
      {!showQuizForm && !selectedQuiz && (
        <div className="w-full max-w-lg mx-auto">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="relative">
              <Card
                className="cursor-pointer hover:bg-slate-50 bg-white shadow-none rounded-none border-x-0 border-t border-b-0 border-slate-200"
                onClick={() => {
                  const serializedQuiz: SerializedQuizState = {
                    ...quiz,
                    startedAt: {
                      seconds: quiz.startedAt.seconds,
                      nanoseconds: quiz.startedAt.nanoseconds,
                    },
                    lastUpdatedAt: {
                      seconds: quiz.lastUpdatedAt.seconds,
                      nanoseconds: quiz.lastUpdatedAt.nanoseconds,
                    },
                  };
                  setSelectedQuiz(serializedQuiz);
                  setQuizData(quiz.quizData);
                }}
              >
                <CardContent className="flex justify-between items-center p-4">
                  <div>
                    <h3 className="font-medium text-slate-800">{quiz.title}</h3>
                    <p className="text-sm text-gray-500">
                      Questions: {quiz.totalQuestions}
                    </p>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="hover:bg-red-100 hover:text-red-500 p-2 rounded-full"
                    >
                      <Trash className="h-4 w-4" />
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-white">
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently
                          delete your quiz and remove your data from our
                          servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel
                          onClick={(e) => e.stopPropagation()}
                          className="bg-white rounded-full border border-red-500 text-red-500 hover:bg-red-100 hover:text-red-500"
                        >
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteQuiz(quiz.id);
                          }}
                          className="bg-white rounded-full border border-slate-400 text-slate-800 hover:bg-slate-100 hover:text-slate-800 hover:border-slate-800"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            </div>
          ))}

          {quizzes.length === 0 && (
            <div className="text-center p-4 text-gray-500 text-sm sm:text-base">
              No quizzes found. Please create a quiz first.
            </div>
          )}
        </div>
      )}

      {/* Quiz Generation Form */}
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
          fileInputRef={fileInputRef}
          isGenerating={isGenerating}
          setIsGenerating={setIsGenerating}
          setShowQuizForm={setShowQuizForm}
          renderNotebookList={renderNotebookList}
          selectedPages={selectedPages}
          setSelectedPages={setSelectedPages}
          user={user}
          onQuizCreated={handleQuizCreated}
        />
      )}

      {/* Quiz Display */}
      {selectedQuiz && quizData && !showQuizForm && (
        <div className="space-y-2 sm:space-y-4">
          <Button
            onClick={handleBackToList}
            variant="ghost"
            className="text-slate-400 hover:text-slate-600 m-0 p-0 hover:bg-transparent text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to List
          </Button>
          <div className="flex flex-col justify-between items-start my-2">
            <div className="flex items-center gap-2">
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="border border-slate-300 rounded-md px-2 py-1 text-[#94b347] focus:outline-none focus:border-[#94b347] text-base sm:text-lg font-semibold"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveTitle}
                    className="p-1 hover:bg-green-100 rounded-full"
                  >
                    <Check className="h-4 w-4 text-green-600" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="p-1 hover:bg-red-100 rounded-full"
                  >
                    <X className="h-4 w-4 text-red-600" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-base sm:text-lg font-semibold text-[#94b347] break-words">
                    {currentTitle}
                  </p>
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="p-1 hover:bg-slate-100 rounded-full"
                  >
                    <Pencil className="h-4 w-4 text-slate-400 hover:text-[#94b347]" />
                  </button>
                </div>
              )}
            </div>
            <div className="flex flex-row justify-center items-center text-sm sm:text-base">
              <p>Questions: {selectedQuiz.totalQuestions}</p>
            </div>
          </div>

          <PageQuiz
            data={quizData}
            notebookId={notebookId || ""}
            pageId={pageId || ""}
            initialState={getQuizState(selectedQuiz)}
          />
      
        </div>
      )}
    </div>
  );
};

export default QuizPanel;
