import { QuizState } from "@/types/quiz";
import { Timestamp } from "firebase/firestore";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { Button } from "../ui/button";

interface QuizSummaryProps {
  quiz: QuizState;
  onClose: () => void;
}

const QuizSummary: React.FC<QuizSummaryProps> = ({ quiz, onClose }) => {
  // Helper function to handle timestamp conversion
  const getFormattedDate = (timestamp: any) => {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toLocaleDateString();
    }
    // Handle serialized timestamp
    if (timestamp && typeof timestamp === "object" && "seconds" in timestamp) {
      return new Date(timestamp.seconds * 1000).toLocaleDateString();
    }
    // Fallback
    return new Date().toLocaleDateString();
  };

  return (
    <div className="rounded-lg p-6">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-xl font-semibold text-slate-800">
              Final Score: {quiz.score}/{quiz.totalQuestions}
            </h4>
            <p className="text-slate-500">
              Completed on {getFormattedDate(quiz.lastUpdatedAt)}
            </p>
          </div>
          <div className="text-2xl font-bold text-slate-700">
            {Math.round((quiz.score / quiz.totalQuestions) * 100)}%
          </div>
        </div>

        <div className="space-y-4">
          {quiz.quizData.questions.map((question, index) => {
            const userAnswer = quiz.userAnswers[index];
            const isCorrect = quiz.evaluationResults[index];

            return (
              <div
                key={`summary-question-${index}-${quiz.id}`}
                className={`p-4 rounded-lg border-none ${
                  isCorrect ? " bg-green-50 shadow-lg" : " bg-red-50 shadow-lg"
                }`}
              >
                <div className="flex items-start gap-3">
                  {isCorrect ? (
                    <CheckCircle className="w-5 h-5 text-green-500 mt-1" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500 mt-1" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-slate-700 mb-2">
                      {question.question}
                    </p>
                    <div className="space-y-1 text-sm">
                      <p className="text-slate-600">
                        Your answer:{" "}
                        <span className="font-medium">{userAnswer}</span>
                      </p>
                      {!isCorrect && (
                        <p className="text-green-600">
                          Correct answer:{" "}
                          <span className="font-medium">
                            {question.correctAnswer}
                          </span>
                        </p>
                      )}
                      {question.type === "shortAnswer" && quiz.gptFeedback && (
                        <p className="text-slate-500 mt-2">
                          <span className="font-medium">AI Feedback: </span>
                          {quiz.gptFeedback}
                        </p>
                      )}
                      {question.explanation && (
                        <p className="text-slate-500 mt-2">
                          <span className="font-medium">Explanation: </span>
                          {question.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Back to Quiz button */}
        <div className="w-full flex justify-center mt-8">
          <Button
            onClick={onClose}
            variant="outline"
            className="text-slate-600 hover:text-slate-800 hover:bg-slate-100 border-slate-300"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Quiz
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QuizSummary;
