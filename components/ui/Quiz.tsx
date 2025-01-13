"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { QuizData } from "@/types/quiz";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Trophy,
  XCircle,
} from "lucide-react";
import React, { useState } from "react";

interface QuizProps {
  data: QuizData;
}

const Quiz: React.FC<QuizProps> = ({ data }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [gptFeedback, setGptFeedback] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [incorrectAnswers, setIncorrectAnswers] = useState<number[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});

  const currentQuestion = data.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === data.questions.length - 1;
  const scorePercentage = (score / data.questions.length) * 100;

  const getGPTFeedback = async (
    question: string,
    userAnswer: string,
    correctAnswer: string,
    isLastQ: boolean,
    questionType: string
  ) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
          userAnswer,
          correctAnswer,
          isLastQuestion: isLastQ,
          score,
          totalQuestions: data.questions.length,
          incorrectAnswers,
          questionType,
        }),
      });

      const feedbackData = await response.json();
      setGptFeedback(feedbackData.feedback);
    } catch (error) {
      console.error("Error getting feedback:", error);
      setGptFeedback("Unable to get AI feedback at this time.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = async (answer: string) => {
    if (currentQuestion.type === "shortAnswer") {
      // For short answers, don't update score or user answers until after AI evaluation
      setIsLoading(true);
      try {
        const response = await fetch("/api/feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: currentQuestion.question,
            userAnswer: answer,
            correctAnswer: currentQuestion.correctAnswer,
            isLastQuestion: false,
            questionType: "shortAnswer",
          }),
        });

        const data = await response.json();

        // Update selected answer and show explanation
        setSelectedAnswer(answer);
        setShowExplanation(true);

        // Update score and answers after AI evaluation
        setUserAnswers((prev) => ({ ...prev, [currentQuestion.id]: answer }));

        if (data.isCorrect) {
          setScore((prev) => prev + 1);
        } else {
          setIncorrectAnswers((prev) => [...prev, currentQuestion.id]);
        }

        setGptFeedback(data.feedback);
      } catch (error) {
        console.error("Error evaluating answer:", error);
      } finally {
        setIsLoading(false);
      }
    } else {
      // For multiple choice and true/false, evaluate immediately
      setSelectedAnswer(answer);
      setShowExplanation(true);
      setUserAnswers((prev) => ({ ...prev, [currentQuestion.id]: answer }));

      const isAnswerCorrect =
        answer.toLowerCase() === currentQuestion.correctAnswer.toLowerCase();
      if (isAnswerCorrect) {
        setScore((prev) => prev + 1);
      } else {
        setIncorrectAnswers((prev) => [...prev, currentQuestion.id]);
      }
    }

    // Only get final feedback at the end of the quiz
    if (isLastQuestion) {
      await getGPTFeedback(
        currentQuestion.question,
        answer,
        currentQuestion.correctAnswer,
        true,
        currentQuestion.type
      );
    }
  };

  const nextQuestion = () => {
    setCurrentQuestionIndex((prev) => prev + 1);
    setSelectedAnswer(null);
    setGptFeedback("");
    setShowExplanation(false);
  };

  const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

  const QuestionSummary = ({
    question,
    userAnswer,
  }: {
    question: typeof currentQuestion;
    userAnswer?: string;
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const isAnswered = userAnswer !== undefined;
    const isCorrectAnswer = userAnswer === question.correctAnswer;

    return (
      <div className="border rounded-lg mb-2">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          variant="ghost"
          className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            {isAnswered &&
              (isCorrectAnswer ? (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              ))}
            <span className="font-medium">{question.question}</span>
          </div>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </Button>
        {isOpen && (
          <div className="p-4 border-t bg-gray-50">
            {isAnswered ? (
              <>
                <div className="mb-2">
                  <span className="font-medium">Your answer: </span>
                  <span
                    className={
                      isCorrectAnswer ? "text-green-600" : "text-red-600"
                    }
                  >
                    {userAnswer}
                  </span>
                </div>
                <div className="mb-2">
                  <span className="font-medium">Correct answer: </span>
                  <span className="text-green-600">
                    {question.correctAnswer}
                  </span>
                </div>
              </>
            ) : (
              <div className="mb-2 text-gray-500 italic">Not answered yet</div>
            )}
            <div className="mt-2">
              <span className="font-medium">Explanation: </span>
              <span className="text-gray-700">{question.explanation}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl w-full">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <span className="font-medium">
            Score: {score}/{currentQuestionIndex + 1}
          </span>
        </div>
        <div className="text-sm text-gray-500">
          {Math.round((score / (currentQuestionIndex + 1)) * 100)}% correct
        </div>
      </div>

      <Button
        onClick={() => setShowSummary(!showSummary)}
        variant="outline"
        className="w-full mb-6"
      >
        <BookOpen className="w-5 h-5 mr-2" />
        <span>{showSummary ? "Hide" : "Show"} Question Summary</span>
        {showSummary ? (
          <ChevronUp className="w-5 h-5 ml-2" />
        ) : (
          <ChevronDown className="w-5 h-5 ml-2" />
        )}
      </Button>

      {showSummary && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-4">Question Summary</h3>
          <div className="space-y-2">
            {data.questions.map((question) => (
              <QuestionSummary
                key={question.id}
                question={question}
                userAnswer={userAnswers[question.id]}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-medium text-gray-500">
            Question {currentQuestionIndex + 1} of {data.questions.length}
          </span>
          <div className="h-2 flex-1 mx-4 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#94b347] transition-all duration-300"
              style={{
                width: `${
                  ((currentQuestionIndex + 1) / data.questions.length) * 100
                }%`,
              }}
            />
          </div>
        </div>
        <h2 className="text-xl font-semibold text-gray-800 mb-6">
          {currentQuestion.question}
        </h2>

        <div className="space-y-3">
          {currentQuestion.type === "trueFalse" ? (
            ["True", "False"].map((answer) => (
              <Button
                key={answer}
                onClick={() => !selectedAnswer && handleAnswer(answer)}
                disabled={!!selectedAnswer}
                variant="outline"
                className={`w-full justify-between ${
                  selectedAnswer === answer
                    ? isCorrect
                      ? "border-green-500 bg-green-50"
                      : "border-red-500 bg-red-50"
                    : ""
                }`}
              >
                <span className="font-medium">{answer}</span>
                {selectedAnswer === answer &&
                  (isCorrect ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  ))}
              </Button>
            ))
          ) : currentQuestion.type === "multipleChoice" ? (
            currentQuestion.options.map((option) => (
              <Button
                key={option}
                onClick={() => !selectedAnswer && handleAnswer(option)}
                disabled={!!selectedAnswer}
                variant="outline"
                className={`w-full justify-between ${
                  selectedAnswer === option
                    ? isCorrect
                      ? "border-green-500 bg-green-50"
                      : "border-red-500 bg-red-50"
                    : ""
                }`}
              >
                <span className="font-medium">{option}</span>
                {selectedAnswer === option &&
                  (isCorrect ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  ))}
              </Button>
            ))
          ) : currentQuestion.type === "shortAnswer" ? (
            <div className="space-y-4">
              <Input
                type="text"
                placeholder="Type your answer here..."
                value={selectedAnswer || ""}
                onChange={(e) => setSelectedAnswer(e.target.value)}
                disabled={isLoading}
                className="w-full p-2 text-slate-500"
              />
              {selectedAnswer && !isLoading && (
                <Button
                  onClick={() => handleAnswer(selectedAnswer)}
                  className="w-full bg-[#94b347] hover:bg-[#a5c05f]"
                >
                  Submit Answer
                </Button>
              )}
              {isLoading && (
                <div className="flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-[#94b347]" />
                  <span className="ml-2">Evaluating your answer...</span>
                </div>
              )}
              {gptFeedback && (
                <div className={`p-4 rounded-lg bg-slate-50`}>
                  <div className="flex items-center gap-2 mb-2">
                    {userAnswers[currentQuestion.id] &&
                    !incorrectAnswers.includes(currentQuestion.id) ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <span
                      className={`font-medium ${
                        userAnswers[currentQuestion.id] &&
                        !incorrectAnswers.includes(currentQuestion.id)
                          ? "text-green-700"
                          : "text-red-700"
                      }`}
                    >
                      {userAnswers[currentQuestion.id] &&
                      !incorrectAnswers.includes(currentQuestion.id)
                        ? "Correct!"
                        : "Incorrect"}
                    </span>
                  </div>
                  <p className="text-slate-700 whitespace-pre-line">
                    {gptFeedback}
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {showExplanation && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-700 mb-2">Explanation:</h3>
          <p className="text-gray-600">{currentQuestion.explanation}</p>
        </div>
      )}

      {/* {isLoading ? (
        <div className="mt-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#94b347]" />
          <span className="ml-2 text-gray-600">Getting AI feedback...</span>
        </div>
      ) : (
        gptFeedback && (
          <div className="mt-6 p-4 bg-slate-50 rounded-lg">
            <h3 className="font-semibold text-slate-900 mb-2">AI Feedback:</h3>
            <p className="text-slate-700 whitespace-pre-line">{gptFeedback}</p>
          </div>
        )
      )} */}

      {selectedAnswer && !isLastQuestion && (
        <Button
          onClick={nextQuestion}
          className="mt-6 w-full bg-[#94b347] hover:bg-[#a5c05f]"
        >
          <span>Next Question</span>
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      )}

      {selectedAnswer && isLastQuestion && (
        <div className="mt-6 text-center p-6 bg-green-50 rounded-lg">
          <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-green-800 mb-2">
            Quiz Completed! 🎉
          </h3>
          <p className="text-green-700 mb-2">
            Final Score: {score} out of {data.questions.length}
          </p>
          <p className="text-green-700">
            Accuracy: {Math.round(scorePercentage)}%
          </p>
        </div>
      )}
    </div>
  );
};

export default Quiz;
