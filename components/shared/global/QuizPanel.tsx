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
import { Image, Upload, Volume2, VolumeOff, Mic, MicOff, BookOpen, Plus, ChevronDown, ChevronRight, Loader2 } from "lucide-react"; // Import icons
import React, { useEffect, useRef, useState, MutableRefObject } from "react";
import { saveQuizState } from "@/lib/firebase/firestore";

// import { Quiz } from "@/components/ui/Quiz";
import RecentQuizzes from "@/components/ui/RecentQuizzes";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { QuizData, QuizState } from "@/types/quiz";
import { CircularProgress } from "@mui/material";
import FormUpload from "../study/formUpload";
import { Notebook } from "@/types/notebooks";
import { getAllNotebooks } from "@/lib/firebase/firestore";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { db } from "@/firebase";
import { collection, onSnapshot, orderBy, query, where, addDoc, deleteDoc, doc } from "firebase/firestore";
import { Timestamp } from "firebase/firestore";
import { toast } from "react-hot-toast";

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
interface SerializedQuizState extends Omit<QuizState, 'startedAt' | 'lastUpdatedAt'> {
  startedAt: SerializedTimestamp;
  lastUpdatedAt: SerializedTimestamp;
}

const QuizPanel = ({ notebookId, pageId }: QuizPanelProps) => {
  // Quiz state
  const [quizzes, setQuizzes] = useState<QuizState[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<SerializedQuizState | null>(null);
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

  // Document selection state
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [selectedPages, setSelectedPages] = useState<{[notebookId: string]: string[]}>({});
  const [expandedNotebooks, setExpandedNotebooks] = useState<{[key: string]: boolean}>({});
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null) as MutableRefObject<HTMLInputElement>;

  // Update the Firestore query
  useEffect(() => {
    if (!notebookId) return;

    const quizzesRef = collection(db, "quizzes");
    let q;

    if (pageId) {
      q = query(
        quizzesRef,
        where("notebookId", "==", notebookId),
        where("pageId", "==", pageId)
      );
    } else {
      q = query(quizzesRef, where("notebookId", "==", notebookId));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const quizList = snapshot.docs.map((doc) => {
        const data = doc.data();
        let startedAtDate: Date;
        let lastUpdatedAtDate: Date;
        
        // Handle startedAt timestamp
        if (data.startedAt instanceof Timestamp) {
          startedAtDate = (data.startedAt as unknown as { toDate(): Date }).toDate();
        } else if (data.startedAt?.seconds) {
          startedAtDate = new Date(data.startedAt.seconds * 1000);
        } else {
          startedAtDate = new Date();
        }

        // Handle lastUpdatedAt timestamp
        if (data.lastUpdatedAt instanceof Timestamp) {
          lastUpdatedAtDate = (data.lastUpdatedAt as unknown as { toDate(): Date }).toDate();
        } else if (data.lastUpdatedAt?.seconds) {
          lastUpdatedAtDate = new Date(data.lastUpdatedAt.seconds * 1000);
        } else {
          lastUpdatedAtDate = startedAtDate;
        }

        return {
          ...data,
          id: doc.id,
          startedAt: startedAtDate,
          notebookId: data.notebookId || '',
          pageId: data.pageId || '',
          quizData: data.quizData || null,
          currentQuestionIndex: data.currentQuestionIndex || 0,
          answers: data.answers || [],
          score: data.score || 0,
          completed: data.completed || false,
          lastUpdatedAt: lastUpdatedAtDate,
          userId: data.userId || '',
          userAnswers: data.userAnswers || [],
          evaluationResults: data.evaluationResults || [],
          totalQuestions: data.totalQuestions || 0,
          isComplete: data.isComplete || false,
          incorrectAnswers: data.incorrectAnswers || []
        } as unknown as QuizState;
      });

      // Sort by startedAt
      quizList.sort((a, b) => {
        // Convert timestamps to milliseconds safely
        const timeA = a.startedAt instanceof Date ? 
          a.startedAt.getTime() : 
          (a.startedAt as unknown as { toDate(): Date }).toDate().getTime();
        
        const timeB = b.startedAt instanceof Date ? 
          b.startedAt.getTime() : 
          (b.startedAt as unknown as { toDate(): Date }).toDate().getTime();
        
        return timeB - timeA;
      });

      setQuizzes(quizList);
    });

    return () => unsubscribe();
  }, [notebookId, pageId]);

  // Fetch notebooks
  useEffect(() => {
    const loadNotebooks = async () => {
      const fetchedNotebooks = await getAllNotebooks();
      setNotebooks(fetchedNotebooks);
    };
    loadNotebooks();
  }, []);

  const toggleNotebook = (notebookId: string) => {
    setExpandedNotebooks(prev => ({
      ...prev,
      [notebookId]: !prev[notebookId]
    }));
  };

  const togglePageSelection = (notebookId: string, pageId: string) => {
    setSelectedPages(prev => {
      const currentPages = prev[notebookId] || [];
      const newPages = currentPages.includes(pageId)
        ? currentPages.filter(id => id !== pageId)
        : [...currentPages, pageId];
      
      return {
        ...prev,
        [notebookId]: newPages
      };
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
          console.log("Convert response:", convertData);

          if (!convertData.path && !convertData.text) {
            throw new Error(`No content returned for converted file ${file.name}`);
          }

          uploadedDocs.push({
            path: convertData.path,
            text: convertData.text,
            name: file.name,
            type: file.type
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
        quizName
      };

      console.log("Quiz generation payload:", message);

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
      console.log("Quiz generation response:", data);

      // Ensure required fields are present
      if (!notebookId) {
        throw new Error("Notebook ID is required");
      }

      // Create a new quiz state with required fields
      const newQuiz: Omit<QuizState, 'id'> = {
        notebookId: notebookId,
        pageId: pageId || '',  // Provide empty string fallback
        currentQuestionIndex: 0,
        score: 0,
        userAnswers: {},
        evaluationResults: {},
        incorrectAnswers: [],
        isComplete: false,
        startedAt: Timestamp.now(),
        lastUpdatedAt: Timestamp.now(),
        totalQuestions: data.quiz.questions.length,
        quizData: data.quiz
      };

      // Save to Firestore
      const docRef = await addDoc(collection(db, "quizzes"), newQuiz);
      console.log("Quiz saved with ID:", docRef.id);

      setShowQuizForm(false);

    } catch (error) {
      console.error("Error generating quiz:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate quiz");
    } finally {
      setIsGenerating(false);
    }
  };

  // Function to handle quiz selection
  const handleQuizSelect = (quiz: QuizState) => {
    console.log("Selected quiz:", quiz);
    if (quiz.quizData) {
      // Convert timestamps to serializable format
      const serializedQuiz: SerializedQuizState = {
        ...quiz,
        startedAt: quiz.startedAt instanceof Date ? 
          { seconds: Math.floor(quiz.startedAt.getTime() / 1000), nanoseconds: 0 } : 
          { seconds: quiz.startedAt.seconds, nanoseconds: quiz.startedAt.nanoseconds },
        lastUpdatedAt: quiz.lastUpdatedAt instanceof Date ? 
          { seconds: Math.floor(quiz.lastUpdatedAt.getTime() / 1000), nanoseconds: 0 } : 
          { seconds: quiz.lastUpdatedAt.seconds, nanoseconds: quiz.lastUpdatedAt.nanoseconds }
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
      startedAt: new Timestamp(serializedQuiz.startedAt.seconds, serializedQuiz.startedAt.nanoseconds),
      lastUpdatedAt: new Timestamp(serializedQuiz.lastUpdatedAt.seconds, serializedQuiz.lastUpdatedAt.nanoseconds)
    };
  };

  const handleDeleteQuiz = async (quizId: string) => {
    try {
      await deleteDoc(doc(db, "quizzes", quizId));
      toast.success("Quiz deleted successfully");
    } catch (error) {
      console.error("Error deleting quiz:", error);
      toast.error("Failed to delete quiz");
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4">
      {/* Header with Create Quiz button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Quizzes</h2>
        {!selectedQuiz && !showQuizForm && (
          <Button
            onClick={() => setShowQuizForm(true)}
            className="bg-[#94b347] hover:bg-[#7a943a]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Quiz
          </Button>
        )}
        {(selectedQuiz || showQuizForm) && (
          <Button
            onClick={handleBackToList}
            variant="outline"
            className="mr-2"
          >
            Back to List
          </Button>
        )}
      </div>

      {/* Quiz List */}
      {!showQuizForm && !selectedQuiz && (
        <div className="space-y-4">
          {quizzes.map((quiz) => (
            <Card 
              key={quiz.id} 
              className="bg-white cursor-pointer hover:bg-gray-50 transition-colors shadow-none border border-gray-400"
            >
              <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle>{quiz.quizData?.title || "Untitled Quiz"}</CardTitle>
                <Button
                  variant="ghost"
                  className="text-red-500 hover:text-red-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteQuiz(quiz.id);
                  }}
                >
                  Delete
                </Button>
              </CardHeader>
              <CardContent onClick={() => handleQuizSelect(quiz)}>
                <div className="items-center flex flex-row justify-between">
                  <p className="text-sm text-gray-600">
                    Questions: {quiz.totalQuestions}
                  </p>
                  <p className="text-sm text-gray-600">
                    Created: {quiz.startedAt instanceof Date ? 
                      quiz.startedAt.toLocaleDateString() : 
                      new Date(quiz.startedAt.seconds * 1000).toLocaleDateString()}
                  </p>
                  {quiz.isComplete && (
                    <p className="text-sm text-gray-600">
                      Score: {quiz.score}/{quiz.totalQuestions}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {quizzes.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No quizzes found. Create one to get started!
            </div>
          )}
        </div>
      )}

      {/* Quiz Generation Form */}
      {showQuizForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>Create New Quiz</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quiz Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Quiz Name
                </label>
                <Input
                  value={quizName}
                  onChange={(e) => setQuizName(e.target.value)}
                  placeholder="Enter quiz name"
                />
              </div>

              {/* Number of Questions */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Number of Questions
                </label>
                <Select
                  value={numberOfQuestions.toString()}
                  onValueChange={(value) => setNumberOfQuestions(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select number of questions" />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 15, 20].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} questions
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Question Types */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Question Types
                </label>
                <div className="space-y-2">
                  {Object.entries(selectedQuestionTypes).map(([type, selected]) => (
                    <div key={type} className="flex items-center">
                      <Checkbox
                        checked={selected}
                        onCheckedChange={(checked) =>
                          setSelectedQuestionTypes(prev => ({
                            ...prev,
                            [type]: checked === true
                          }))
                        }
                        id={type}
                      />
                      <label htmlFor={type} className="ml-2 text-sm text-slate-600">
                        {type.replace(/([A-Z])/g, ' $1').trim()}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notebook Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Content
                </label>
                <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                  {notebooks.map((notebook) => (
                    <div key={notebook.id} className="mb-2">
                      <div
                        className="flex items-center cursor-pointer hover:bg-slate-50 p-2 rounded"
                        onClick={() => toggleNotebook(notebook.id)}
                      >
                        {expandedNotebooks[notebook.id] ? (
                          <ChevronDown className="w-4 h-4 mr-2" />
                        ) : (
                          <ChevronRight className="w-4 h-4 mr-2" />
                        )}
                        <span className="font-medium">{notebook.title}</span>
                      </div>
                      {expandedNotebooks[notebook.id] && notebook.pages && (
                        <div className="ml-6 space-y-1">
                          {notebook.pages.map((page) => (
                            <div key={page.id} className="flex items-center">
                              <Checkbox
                                checked={selectedPages[notebook.id]?.includes(page.id)}
                                onCheckedChange={() => togglePageSelection(notebook.id, page.id)}
                                id={`${notebook.id}-${page.id}`}
                              />
                              <label
                                htmlFor={`${notebook.id}-${page.id}`}
                                className="ml-2 text-sm text-slate-600"
                              >
                                {page.title}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Upload Additional Files
                </label>
                <FormUpload
                  files={files}
                  handleFileUpload={(e) => {
                    if (e.target.files) {
                      setFiles(Array.from(e.target.files));
                    }
                  }}
                  handleClear={() => setFiles([])}
                  fileInputRef={fileInputRef}
                  messages={[]}
                  handleSendMessage={() => {}}
                  showUpload={true}
                  setShowUpload={() => {}}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowQuizForm(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerateQuiz}
                disabled={isGenerating || (!Object.values(selectedQuestionTypes).some(Boolean) || (!files.length && !Object.keys(selectedPages).length))}
                className="bg-[#94b347] hover:bg-[#7a943a]"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Quiz"
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Quiz Display */}
      {selectedQuiz && quizData && !showQuizForm && (
        <div>
          <Quiz
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
