import { QuizState } from "@/types/quiz";
import { CheckCircle, XCircle } from "lucide-react";

interface QuizSummaryProps {
  quiz: QuizState;
  onClose: () => void;
}

const QuizSummary: React.FC<QuizSummaryProps> = ({ quiz, onClose }) => {
  return (
    <div className="bg-white rounded-lg  p-6">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-xl font-semibold text-slate-800">
              Final Score: {quiz.score}/{quiz.totalQuestions}
            </h4>
            <p className="text-slate-500">
              Completed on {new Date(quiz.lastUpdatedAt).toLocaleDateString()}
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
                className={`p-4 rounded-lg border ${
                  isCorrect
                    ? "border-green-200 bg-green-50"
                    : "border-red-200 bg-red-50"
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

   
      </div>
    </div>
  );
};

export default QuizSummary;
