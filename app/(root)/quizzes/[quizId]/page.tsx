"use client";

import QuizForm from "@/components/shared/global/QuizForm";
import { Button } from "@/components/ui/button";
import PageQuiz from "@/components/ui/PageQuiz";
import { getQuiz, getUserByClerkId, Notebook } from "@/lib/firebase/firestore";

import { db, storage } from "@/firebase";
import { getNotebooksByFirestoreUserId } from "@/lib/firebase/firestore";
import { QuizState } from "@/types/quiz";
import { User } from "@/types/users";
import { useUser } from "@clerk/nextjs";
import { doc, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const { user } = useUser();

  const [loading, setLoading] = useState(true);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [quizName, setQuizName] = useState("");
  const [numberOfQuestions, setNumberOfQuestions] = useState(10);
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState({
    multipleChoice: true,
    trueFalse: true,
    shortAnswer: true,
  });
  const [files, setFiles] = useState<File[]>([]);
  const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(
    null
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPages, setSelectedPages] = useState<{
    [notebookId: string]: string[];
  }>({});
  const [isLoadingNotebooks, setIsLoadingNotebooks] = useState(true);
  const [firestoreUser, setFirestoreUser] = useState<User | null>(null);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [expandedNotebooks, setExpandedNotebooks] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    const fetchFirestoreUser = async () => {
      if (user) {
        try {
          const firestoreUser = await getUserByClerkId(user.id);
          setFirestoreUser(firestoreUser);
        } catch (error) {
          console.error("Error fetching user:", error);
          toast.error("Failed to load user data");
        }
      }
    };
    fetchFirestoreUser();
  }, [user]);

  useEffect(() => {
    const fetchNotebooks = async () => {
      if (firestoreUser) {
        try {
          setIsLoadingNotebooks(true);
          const fetchedNotebooks = await getNotebooksByFirestoreUserId(
            firestoreUser.id
          );
          console.log("Fetched notebooks:", fetchedNotebooks); // Debug log
          setNotebooks(fetchedNotebooks);
        } catch (error) {
          console.error("Error fetching notebooks:", error);
          toast.error("Failed to load notebooks");
        } finally {
          setIsLoadingNotebooks(false);
        }
      }
    };

    fetchNotebooks();
  }, [firestoreUser]);

  useEffect(() => {
    const fetchQuiz = async () => {
      if (params.quizId) {
        try {
          const quizData = await getQuiz(params.quizId as string);
          setQuiz(quizData);
        } catch (error) {
          console.error("Error fetching quiz:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchQuiz();
  }, [params.quizId]);

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

      const firstNotebookId = Object.keys(selectedPages)[0];
      const firstPageId = selectedPages[firstNotebookId]?.[0];

      if (!firstNotebookId || !firstPageId) {
        throw new Error("No notebook or page selected");
      }

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
            const path = `quizdocs/${firstNotebookId}/${firstPageId}_${timestamp}.md`;
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

      const newQuiz: QuizState = {
        id: `quiz_${crypto.randomUUID()}`,
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

      const quizRef = doc(db, "quizzes", newQuiz.id);
      await setDoc(quizRef, {
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

      router.push(`/quizzes/${newQuiz.id}`);
    } catch (error: any) {
      console.error("Error generating quiz:", error);
      toast.error(error.message || "Failed to generate quiz");
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!quiz || !quiz.quizData) {
    return <div>Quiz not found</div>;
  }

  const renderNotebookList = () => {
    console.log("Rendering notebooks:", notebooks);
    console.log("Loading state:", isLoadingNotebooks);

    if (isLoadingNotebooks) {
      return (
        <div className="flex w-full items-center justify-center p-4">
          <RefreshCw className="h-6 w-6 animate-spin" />
        </div>
      );
    }

    if (!notebooks || notebooks.length === 0) {
      return (
        <div className="text-center p-4 text-gray-500">
          No notebooks found. Please create a notebook first.
        </div>
      );
    }

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
      return pages.every((page) =>
        selectedPages[notebookId]?.includes(page.id)
      );
    };

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
    <div className="mx-auto p-16 flex flex-col items-center justify-start  h-full max-h-screen">
      <div className="mb-6 flex flex-row justify-between w-full">
        <Link href="/">
          <Button variant="ghost" className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>

        <Button
          variant="ghost"
          className="gap-2 rounded-full border border-slate-400"
          onClick={() => setShowQuizForm(true)}
        >
          Create New Quiz
        </Button>
      </div>

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
          fileInputRef={
            fileInputRef as unknown as React.RefObject<HTMLInputElement>
          }
          isGenerating={isGenerating}
          handleGenerateQuiz={handleGenerateQuiz}
          setShowQuizForm={setShowQuizForm}
          renderNotebookList={renderNotebookList}
          selectedPages={selectedPages}
        />
      )}

      <div className="flex flex-col items-center justify-start w-full max-w-8xl overflow-y-auto px-16">
        <div></div>
        <div className="flex p-4 flex-col items-start justify-between w-full">
          <h1 className="text-2xl font-bold ">
            <span className="text-[#94b347]">{quiz.quizData.title}</span>
          </h1>
          <p className="text-sm text-slate-500">
            Created:{" "}
            {quiz.startedAt instanceof Timestamp
              ? quiz.startedAt.toDate().toLocaleDateString()
              : new Date(quiz.startedAt.seconds * 1000).toLocaleDateString()}
          </p>
        </div>
        <PageQuiz
          data={quiz.quizData}
          notebookId={quiz.notebookId}
          pageId={quiz.pageId}
          initialState={quiz}
        />
      </div>
    </div>
  );
}
