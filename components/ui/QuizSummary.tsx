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

  // Helper function to format mathematical equations for better readability
  const formatEquation = (text: string): string => {
    if (!text) return "";

    return (
      text
        // Format superscripts (x^2 becomes x²)
        .replace(/\b(\w+)\^(\d+)\b/g, (_, base, exp) => {
          const superscripts: Record<string, string> = {
            "0": "⁰",
            "1": "¹",
            "2": "²",
            "3": "³",
            "4": "⁴",
            "5": "⁵",
            "6": "⁶",
            "7": "⁷",
            "8": "⁸",
            "9": "⁹",
          };
          return `${base}${exp
            .split("")
            .map((d: string) => superscripts[d] || d)
            .join("")}`;
        })
        // Format square roots
        .replace(/sqrt\(([^)]+)\)/g, "√($1)")
        // Format fractions with HTML
        .replace(
          /(\d+)\/(\d+)/g,
          '<span class="inline-block align-middle"><span class="block border-b border-current">$1</span><span class="block">$2</span></span>'
        )
        // Format subscripts (Q_1 becomes Q₁)
        .replace(/(\w+)_(\d+)/g, (_, base, sub) => {
          const subscripts: Record<string, string> = {
            "0": "₀",
            "1": "₁",
            "2": "₂",
            "3": "₃",
            "4": "₄",
            "5": "₅",
            "6": "₆",
            "7": "₇",
            "8": "₈",
            "9": "₉",
          };
          return `${base}${sub
            .split("")
            .map((d: string) => subscripts[d] || d)
            .join("")}`;
        })
        // Format matrices and vectors with special styling
        .replace(/\b(\w+)\^T\b/g, "$1<sup>T</sup>") // Transpose notation
        // Format Greek letters
        .replace(/\balpha\b/g, "α")
        .replace(/\bbeta\b/g, "β")
        .replace(/\bgamma\b/g, "γ")
        .replace(/\bdelta\b/g, "δ")
        .replace(/\bepsilon\b/g, "ε")
        .replace(/\bpi\b/g, "π")
        .replace(/\bsigma\b/g, "σ")
        .replace(/\btheta\b/g, "θ")
        .replace(/\bomega\b/g, "ω")
    );
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
                    <p
                      className="font-medium text-slate-700 mb-2"
                      dangerouslySetInnerHTML={{
                        __html: formatEquation(question.question),
                      }}
                    />
                    <div className="space-y-1 text-sm">
                      <p className="text-slate-600">
                        Your answer:{" "}
                        <span
                          className="font-medium"
                          dangerouslySetInnerHTML={{
                            __html: formatEquation(userAnswer),
                          }}
                        />
                      </p>
                      {!isCorrect && (
                        <p className="text-green-600">
                          Correct answer:{" "}
                          <span
                            className="font-medium"
                            dangerouslySetInnerHTML={{
                              __html: formatEquation(
                                typeof question.correctAnswer === "string"
                                  ? question.correctAnswer
                                  : String(question.correctAnswer)
                              ),
                            }}
                          />
                        </p>
                      )}
                      {question.type === "shortAnswer" && quiz.gptFeedback && (
                        <p className="text-slate-500 mt-2">
                          <span className="font-medium">AI Feedback: </span>
                          <span
                            dangerouslySetInnerHTML={{
                              __html: formatEquation(quiz.gptFeedback),
                            }}
                          />
                        </p>
                      )}
                      {question.explanation && (
                        <p className="text-slate-500 mt-2">
                          <span className="font-medium">Explanation: </span>
                          <span
                            dangerouslySetInnerHTML={{
                              __html: formatEquation(question.explanation),
                            }}
                          />
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
