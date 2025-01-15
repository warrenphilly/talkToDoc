import { deleteQuiz, getRecentQuizzes } from "@/lib/firebase/firestore";
import type { QuizState } from "@/types/quiz";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./button";

interface RecentQuizzesProps {
  pageId: string;
  onQuizSelect: (quiz: QuizState) => void;
}

const RecentQuizzes: React.FC<RecentQuizzesProps> = ({ pageId, onQuizSelect }) => {
  const [quizzes, setQuizzes] = useState<QuizState[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadQuizzes = async () => {
    try {
      const recentQuizzes = await getRecentQuizzes(pageId);
      setQuizzes(recentQuizzes);
    } catch (error) {
      console.error("Error loading quizzes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (quizId: string) => {
    try {
      await deleteQuiz(quizId);
      setQuizzes(quizzes.filter((quiz) => quiz.id !== quizId));
    } catch (error) {
      console.error("Error deleting quiz:", error);
    }
  };

  useEffect(() => {
    loadQuizzes();
  }, [pageId]);

  if (isLoading) {
    return <div className="text-slate-500">Loading recent quizzes...</div>;
  }

  if (quizzes.length === 0) {
    return <div className="text-slate-500">No recent quizzes found.</div>;
  }

  return (
    <div className="mt-6 w-full">
      <h3 className="text-lg font-semibold text-slate-700 mb-4">
        Recent Quizzes
      </h3>
      <div className="space-y-4 w-full">
        {quizzes.map((quiz) => (
          <div
            key={quiz.id}
            className="bg-slate-100 border border-slate-400 hover:border-[#94b347] hover:text-[#94b347] hover:bg-slate-50 rounded-lg  p-4 flex items-center justify-between  cursor-pointer"
            onClick={() => onQuizSelect(quiz)}
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
                  e.stopPropagation(); // Prevent quiz selection when deleting
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
    </div>
  );
};

export default RecentQuizzes;
