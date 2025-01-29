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
  Timestamp,
} from "firebase/firestore";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./button";

interface RecentQuizzesProps {
  pageId: string;
  onQuizSelect: (quiz: QuizState) => void;
}

interface SerializedTimestamp {
  seconds: number;
  nanoseconds: number;
}

const RecentQuizzes: React.FC<RecentQuizzesProps> = ({
  pageId,
  onQuizSelect,
}) => {
  const [quizzes, setQuizzes] = useState<QuizState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCompletedQuiz, setSelectedCompletedQuiz] =
    useState<QuizState | null>(null);

  const getTimestamp = (timestamp: Timestamp | SerializedTimestamp | undefined): Timestamp => {
    if (!timestamp) return Timestamp.now();
    
    if (timestamp instanceof Timestamp) {
      return timestamp;
    }
    
    if ('seconds' in timestamp) {
      return new Timestamp(timestamp.seconds, timestamp.nanoseconds);
    }
    
    return Timestamp.now();
  };

  const formatDate = (timestamp: Timestamp | SerializedTimestamp | undefined) => {
    const date = getTimestamp(timestamp).toDate();
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString()
    };
  };

  useEffect(() => {
    setIsLoading(true);

    try {
      const quizzesQuery = query(
        collection(db, "quizzes"),
        where("pageId", "==", pageId)
      );

      const unsubscribe = onSnapshot(quizzesQuery, {
        next: (snapshot) => {
          const updatedQuizzes = snapshot.docs
            .map((doc) => {
              const data = doc.data();
              return {
                ...data,
                id: doc.id,
                startedAt: getTimestamp(data.startedAt),
                lastUpdatedAt: getTimestamp(data.lastUpdatedAt),
                createdAt: getTimestamp(data.createdAt || data.startedAt),
                userId: data.userId || "",
                notebookId: data.notebookId || "",
                pageId: data.pageId || "",
                quizData: data.quizData || [],
                currentQuestionIndex: data.currentQuestionIndex || 0,
                score: data.score || 0,
                totalQuestions: data.totalQuestions || 0,
                isComplete: data.isComplete || false,
                userAnswers: data.userAnswers || [],
                evaluationResults: data.evaluationResults || [],
                incorrectAnswers: data.incorrectAnswers || []
              } satisfies QuizState;
            })
            .sort((a, b) => {
              return b.lastUpdatedAt.toMillis() - a.lastUpdatedAt.toMillis();
            });

          setQuizzes(updatedQuizzes);
          setIsLoading(false);

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
      onQuizSelect(quiz);
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
    
        <>
          <h3 className="text-lg font-semibold text-slate-700 mb-4">
            Recent Quizzes
          </h3>
          <div className="space-y-4 w-full">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className={`bg-slate-50 border border-slate-400 rounded-lg p-4 flex items-center justify-between cursor-pointer
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
                      {formatDate(quiz.startedAt).date} at{" "}
                      {formatDate(quiz.startedAt).time}
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
      
    </div>
  );
};

export default RecentQuizzes;
