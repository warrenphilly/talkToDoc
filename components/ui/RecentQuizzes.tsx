import QuizSummary from "@/components/ui/QuizSummary";
import { db } from "@/firebase";
import { deleteQuiz, getRecentQuizzes } from "@/lib/firebase/firestore";
import type { QuizState } from "@/types/quiz";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./button";

interface RecentQuizzesProps {
  pageId: string;
  onQuizSelect: (quiz: QuizState) => void;
}

const RecentQuizzes: React.FC<RecentQuizzesProps> = ({
  pageId,
  onQuizSelect,
}) => {
  const [quizzes, setQuizzes] = useState<QuizState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCompletedQuiz, setSelectedCompletedQuiz] =
    useState<QuizState | null>(null);

  useEffect(() => {
    setIsLoading(true);

    try {
      // Simpler query that doesn't require an index
      const quizzesQuery = query(
        collection(db, "quizzes"),
        where("pageId", "==", pageId)
      );

      // Set up real-time listener
      const unsubscribe = onSnapshot(quizzesQuery, {
        next: (snapshot) => {
          const updatedQuizzes = snapshot.docs
            .map((doc) => {
              const data = doc.data();
              return {
                ...data,
                id: doc.id,
                startedAt: data.startedAt?.toDate(),
                lastUpdatedAt: data.lastUpdatedAt?.toDate(),
              } as QuizState;
            })
            // Sort in memory instead of using orderBy
            .sort((a, b) => {
              const dateA = a.lastUpdatedAt?.getTime() || 0;
              const dateB = b.lastUpdatedAt?.getTime() || 0;
              return dateB - dateA; // descending order
            });

          setQuizzes(updatedQuizzes);
          setIsLoading(false);

          // Update selected quiz if it was modified
          if (selectedCompletedQuiz) {
            const updatedSelectedQuiz = updatedQuizzes.find(
              (quiz) => quiz.id === selectedCompletedQuiz.id
            );
            if (updatedSelectedQuiz) {
              setSelectedCompletedQuiz(updatedSelectedQuiz);
            }
          }
        },
        error: (error) => {
          console.error("Error listening to quizzes:", error);
          setIsLoading(false);
          setQuizzes([]);
        },
      });

      // Cleanup listener on unmount
      return () => unsubscribe();
    } catch (error) {
      console.error("Error setting up quiz listener:", error);
      setIsLoading(false);
      setQuizzes([]);
    }
  }, [pageId, selectedCompletedQuiz?.id]);

  const handleQuizClick = (quiz: QuizState) => {
    if (quiz.isComplete) {
      setSelectedCompletedQuiz(quiz);
    } else {
      onQuizSelect(quiz);
    }
  };

  const handleDelete = async (quizId: string) => {
    try {
      await deleteQuiz(quizId);
      if (selectedCompletedQuiz?.id === quizId) {
        setSelectedCompletedQuiz(null);
      }
    } catch (error) {
      console.error("Error deleting quiz:", error);
    }
  };

  if (isLoading) {
    return <div className="text-slate-500">Loading recent quizzes...</div>;
  }

  if (quizzes.length === 0) {
    return <div className="text-slate-500">No recent quizzes found.</div>;
  }

  return (
    <div className="mt-6 w-full">
      {selectedCompletedQuiz ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-700">
              Quiz Summary
            </h3>
            <Button
              variant="outline"
              onClick={() => setSelectedCompletedQuiz(null)}
              className="bg-slate-100 border border-slate-400 hover:bg-slate-200 rounded-full"
            >
              Back to Recent Quizzes
            </Button>
          </div>
          <QuizSummary
            quiz={selectedCompletedQuiz}
            onClose={() => setSelectedCompletedQuiz(null)}
          />
        </div>
      ) : (
        <>
          <h3 className="text-lg font-semibold text-slate-700 mb-4">
            Recent Quizzes
          </h3>
          <div className="space-y-4 w-full">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className={`bg-white border border-slate-400 rounded-lg p-4 flex items-center justify-between cursor-pointer
                  ${
                    quiz.isComplete
                      ? "hover:bg-slate-200"
                      : "hover:bg-slate-200"
                  }`}
                onClick={() => handleQuizClick(quiz)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-slate-700">
                      Score: {quiz.score}/{quiz.totalQuestions}
                    </span>
                    <span className="text-sm text-slate-500">
                      {new Date(quiz.startedAt).toLocaleDateString()} at{" "}
                      {new Date(quiz.startedAt).toLocaleTimeString()}
                    </span>
                    <span
                      className={`text-sm px-2 py-1 rounded ${
                        quiz.isComplete
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {quiz.isComplete ? "Completed" : "In Progress"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(quiz.id);
                    }}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default RecentQuizzes;
