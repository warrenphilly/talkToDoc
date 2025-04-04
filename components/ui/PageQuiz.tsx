"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/firebase";
import { saveQuizState } from "@/lib/firebase/firestore";
import type { QuizData, QuizState } from "@/types/quiz";
import { doc, onSnapshot, Timestamp, updateDoc } from "firebase/firestore";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Mic,
  MicOff,
  ThumbsDown,
  ThumbsUp,
  Trophy,
  Volume,
  Volume2,
  VolumeOff,
  XCircle,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import QuizSummary from "./QuizSummary";

interface QuizProps {
  data: QuizData;
  notebookId: string;
  pageId: string;
  initialState?: QuizState | null;
}

const PageQuiz: React.FC<QuizProps> = ({
  data,
  notebookId,
  pageId,
  initialState,
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(
    initialState?.currentQuestionIndex || 0
  );
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState<number>(initialState?.score || 0);
  const [showResults, setShowResults] = useState<boolean>(
    initialState?.isComplete || false
  );
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>(
    initialState?.userAnswers || {}
  );
  const [evaluationResults, setEvaluationResults] = useState<
    Record<number, boolean>
  >(initialState?.evaluationResults || {});
  const [incorrectAnswers, setIncorrectAnswers] = useState<number[]>(
    initialState?.incorrectAnswers || []
  );
  const [gptFeedback, setGptFeedback] = useState<string>(
    initialState?.gptFeedback || ""
  );
  const [quizId] = useState<string>(
    initialState?.id ||
      `quiz_${pageId}_${new Date().toISOString().split("T")[0]}`
  );
  const [userId] = useState<string>(initialState?.userId || "");
  const [isLoading, setIsLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(true);
  const [aiVoice, setAiVoice] = useState(false);
  const [selectedCompletedQuiz, setSelectedCompletedQuiz] =
    useState<QuizState | null>(null);
  const [vocalAnswer, setVocalAnswer] = useState(false);
  const [isChangingQuestion, setIsChangingQuestion] = useState(false);

  const questionsWithIds = data.questions.map((question, index) => ({
    ...question,
    id: question.id || index,
  }));

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

  const handleAnswer = async (answer: string) => {
    console.log("Handling answer:", answer);
    console.log("Current question index:", currentQuestionIndex);
    console.log("User answers:", userAnswers);
    console.log("Current question:", data.questions[currentQuestionIndex]);
    console.log("Is last question:", isLastQuestion);
    console.log("Quiz ID:", quizId);
    console.log("Evaluation results:", evaluationResults);
    console.log("Incorrect answers:", incorrectAnswers);
    console.log("GPT feedback:", gptFeedback);
    console.log("Score:", score);
    setSelectedAnswer(answer);
    const currentQuestion = data.questions[currentQuestionIndex];

    let isCorrect = false;

    if (currentQuestion.type === "shortAnswer") {
      setIsLoading(true);
      try {
        const feedbackResponse = await getGPTFeedback(
          currentQuestion.question,
          answer,
          currentQuestion.correctAnswer,
          isLastQuestion,
          currentQuestion.type
        );

        console.log("Feedback response:", feedbackResponse);

        isCorrect = feedbackResponse.isCorrect;
        const feedback = feedbackResponse.feedback;

        setGptFeedback(feedback);
        setIsCorrect(isCorrect);
        setShowExplanation(true);

        // Update database
        const quizRef = doc(db, "quizzes", quizId);
        await updateDoc(quizRef, {
          [`userAnswers.${currentQuestionIndex}`]: answer,
          [`evaluationResults.${currentQuestionIndex}`]: isCorrect,
          score: isCorrect ? score + 1 : score,
          lastUpdatedAt: new Date(),
          incorrectAnswers: isCorrect
            ? incorrectAnswers.filter((i) => i !== currentQuestionIndex)
            : [...new Set([...incorrectAnswers, currentQuestionIndex])],
          gptFeedback: feedback,
        });
      } catch (error) {
        console.error("Error processing short answer:", error);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Handle multiple choice and true/false questions
      console.log("Current question:", currentQuestion);
      console.log("Answer:", answer);
      console.log("Correct answer:", currentQuestion.correctAnswer);

      if (
        currentQuestion.type === "multipleChoice" &&
        currentQuestion.options
      ) {
        // Get the index of the selected answer in the options array
        const answerIndex = currentQuestion.options.indexOf(answer);
        // Convert index to letter (0 = 'A', 1 = 'B', etc.)
        const answerLetter = String.fromCharCode(65 + answerIndex);
        isCorrect = answerLetter === currentQuestion.correctAnswer;

        console.log("Answer index:", answerIndex);
        console.log("Answer letter:", answerLetter);
        console.log("Correct answer letter:", currentQuestion.correctAnswer);
        console.log("Is correct:", isCorrect);
      } else if (currentQuestion.type === "trueFalse") {
        // For true/false questions, compare the actual boolean values
        // Convert string "True"/"False" to boolean true/false for comparison
        const userAnswerBool = answer.toLowerCase() === "true";
        const correctAnswerBool =
          typeof currentQuestion.correctAnswer === "string"
            ? currentQuestion.correctAnswer.toLowerCase() === "true"
            : !!currentQuestion.correctAnswer;

        isCorrect = userAnswerBool === correctAnswerBool;
      }

      setIsCorrect(isCorrect);
      setShowExplanation(true);

      try {
        const quizRef = doc(db, "quizzes", quizId);
        await updateDoc(quizRef, {
          [`userAnswers.${currentQuestionIndex}`]: answer,
          [`evaluationResults.${currentQuestionIndex}`]: isCorrect,
          score: isCorrect ? score + 1 : score,
          lastUpdatedAt: new Date(),
          incorrectAnswers: isCorrect
            ? incorrectAnswers.filter((i) => i !== currentQuestionIndex)
            : [...new Set([...incorrectAnswers, currentQuestionIndex])],
        });
      } catch (error) {
        console.error("Error updating quiz answer:", error);
      }
    }
  };

  const nextQuestion = async () => {
    setIsChangingQuestion(true);
    const newIndex = currentQuestionIndex + 1;

    // Update local state
    setCurrentQuestionIndex(newIndex);
    setSelectedAnswer("");
    setGptFeedback("");
    setShowExplanation(false);

    try {
      const quizRef = doc(db, "quizzes", quizId);
      await updateDoc(quizRef, {
        currentQuestionIndex: newIndex,
        lastUpdatedAt: new Date(),
      });
    } catch (error) {
      console.error("Error updating current question:", error);
    } finally {
      setTimeout(() => {
        setIsChangingQuestion(false);
      }, 100);
    }
  };

  useEffect(() => {
    // When changing questions, check if there's an existing answer
    if (userAnswers[currentQuestionIndex] !== undefined) {
      setSelectedAnswer(userAnswers[currentQuestionIndex]);
      setIsCorrect(evaluationResults[currentQuestionIndex]);
      setShowExplanation(true);
    } else {
      // Reset states for new questions
      setSelectedAnswer("");
      setIsCorrect(null);
      setShowExplanation(false);
      setGptFeedback("");
    }
  }, [currentQuestionIndex, userAnswers, evaluationResults]);

  // Update the real-time listener useEffect to include gptFeedback
  useEffect(() => {
    if (!quizId) return;

    const quizRef = doc(db, "quizzes", quizId);
    const unsubscribe = onSnapshot(
      quizRef,
      (doc) => {
        if (doc.exists() && !isChangingQuestion) {
          const data = doc.data() as QuizState;
          setScore(data.score);
          setCurrentQuestionIndex(data.currentQuestionIndex);
          setUserAnswers(data.userAnswers);
          setEvaluationResults(data.evaluationResults);
          setIncorrectAnswers(data.incorrectAnswers);
          setGptFeedback(data.gptFeedback || "");
          setShowResults(data.isComplete);

          // If there's an answer for the current question, show the explanation
          if (data.userAnswers[data.currentQuestionIndex] !== undefined) {
            setSelectedAnswer(data.userAnswers[data.currentQuestionIndex]);
            setIsCorrect(data.evaluationResults[data.currentQuestionIndex]);
            setShowExplanation(true);
          }
        }
      },
      (error) => {
        console.error("Error listening to quiz updates:", error);
      }
    );

    return () => unsubscribe();
  }, [quizId, isChangingQuestion]);

  const currentQuestion = data.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === data.questions.length - 1;
  const scorePercentage = (score / data.questions.length) * 100;

  const getGPTFeedback = async (
    question: string,
    userAnswer: string,
    correctAnswer: string,
    isLastQ: boolean,
    questionType: string
  ): Promise<{
    isCorrect: boolean;
    feedback: string;
    score: number;
    improvements?: string[];
  }> => {
    try {
      console.log("Sending feedback request:", {
        question,
        userAnswer,
        correctAnswer,
        questionType,
      }); // Debug log

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

      if (!response.ok) {
        throw new Error(`Failed to get feedback: ${response.status}`);
      }

      const feedbackData = await response.json();
      console.log("Received feedback data:", feedbackData); // Debug log
      return feedbackData;
    } catch (error) {
      console.error("Error getting feedback:", error);
      throw error;
    }
  };

  const QuestionSummary = ({
    question,
    userAnswer,
    formatEquation,
  }: {
    question: (typeof questionsWithIds)[0];
    userAnswer?: string;
    formatEquation: (text: string) => string;
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const isAnswered = userAnswer !== undefined;

    // Fix for multiple choice and true/false questions
    let isCorrectAnswer = false;
    if (question.type === "shortAnswer") {
      isCorrectAnswer = !incorrectAnswers.includes(question.id);
    } else if (question.type === "trueFalse") {
      // For true/false, convert both to boolean for comparison
      const userAnswerBool = userAnswer?.toLowerCase() === "true";
      const correctAnswerBool =
        typeof question.correctAnswer === "string"
          ? question.correctAnswer.toLowerCase() === "true"
          : !!question.correctAnswer;
      isCorrectAnswer = userAnswerBool === correctAnswerBool;
    } else if (question.type === "multipleChoice" && question.options) {
      // For multiple choice, we need to convert the user's text answer to a letter
      // and then compare with the correct answer letter
      const answerIndex = question.options.indexOf(userAnswer || "");
      if (answerIndex !== -1) {
        // Convert index to letter (0 = 'A', 1 = 'B', etc.)
        const answerLetter = String.fromCharCode(65 + answerIndex);
        isCorrectAnswer = answerLetter === question.correctAnswer;
      }
    } else {
      // Fallback for any other case
      isCorrectAnswer = userAnswer === question.correctAnswer;
    }

    return (
      <div
        key={`summary-question-${question.id}`}
        className="border rounded-lg mb-2 p-4"
      >
        <Button
          onClick={() => setIsOpen(!isOpen)}
          variant="ghost"
          className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 "
        >
          <div className="flex items-center gap-3 ">
            {isAnswered &&
              (isCorrectAnswer ? (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              ))}
            <span
              className="font-medium text-slate-500 text-wrap"
              dangerouslySetInnerHTML={{
                __html: formatEquation(question.question),
              }}
            />
          </div>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </Button>
        {isOpen && (
          <div className="p-4 bg-gray-50">
            {isAnswered ? (
              <>
                <div className="mb-2">
                  <span className="font-medium text-slate-500">
                    Your answer:{" "}
                  </span>
                  <span
                    className={
                      isCorrectAnswer ? "text-green-600" : "text-red-600"
                    }
                    dangerouslySetInnerHTML={{
                      __html: formatEquation(userAnswer || ""),
                    }}
                  />
                </div>
                <div className="mb-2">
                  <span className="font-medium text-slate-500">
                    Correct answer:{" "}
                  </span>
                  <span
                    className="text-green-600"
                    dangerouslySetInnerHTML={{
                      __html: formatEquation(
                        question.type === "multipleChoice" && question.options
                          ? (() => {
                              // Convert letter (A, B, C, D) to index (0, 1, 2, 3)
                              const correctIndex =
                                question.correctAnswer.charCodeAt(0) - 65;
                              return (
                                question.options[correctIndex] ||
                                question.correctAnswer
                              );
                            })()
                          : String(question.correctAnswer)
                      ),
                    }}
                  />
                </div>
                {question.type === "shortAnswer" &&
                  evaluationResults[question.id] !== undefined && (
                    <div className="mt-2">
                      <span className="font-medium text-slate-500">
                        AI Feedback:{" "}
                      </span>
                      <span className="text-slate-500">{gptFeedback}</span>
                    </div>
                  )}
              </>
            ) : (
              <div className="mb-2 text-gray-500 italic">Not answered yet</div>
            )}
            <div className="mt-2">
              <span className="font-medium text-slate-500">Explanation: </span>
              <span
                className="text-slate-500"
                dangerouslySetInnerHTML={{
                  __html: formatEquation(question.explanation),
                }}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleViewResults = async () => {
    setShowResults(true);
    setShowSummary(true);

    try {
      const quizRef = doc(db, "quizzes", quizId);
      await updateDoc(quizRef, {
        isComplete: true,
        lastUpdatedAt: new Date(),
      });
    } catch (error) {
      console.error("Error marking quiz as complete:", error);
    }
  };

  // Add a handler specifically for returning from results view
  const handleBackFromResults = () => {
    setShowResults(false);
    setShowSummary(true); // Keep summary expanded when returning to the quiz

    // Ensure we're still at the last question
    if (currentQuestionIndex !== data.questions.length - 1) {
      setCurrentQuestionIndex(data.questions.length - 1);
    }
  };

  return (
    <div className="flex flex-col bg-white items-center justify-start w-full h-full ">
      <div className="bg-white w-full  rounded-xl px-4 md:px-8 ">
        {showResults ? (
          <>
            <div className="bg-white text-center p-4 md:p-6 rounded-lg">
              <h3 className="text-xl md:text-2xl font-bold text-slate-500 mb-2">
                Quiz Completed!
              </h3>
            </div>
            <QuizSummary
              quiz={{
                id: quizId,
                title: data.title || "Quiz",
                userId: userId,
                notebookId,
                pageId,
                startedAt: new Timestamp(new Date().getTime() / 1000, 0),
                lastUpdatedAt: new Timestamp(new Date().getTime() / 1000, 0),
                currentQuestionIndex,
                score,
                totalQuestions: data.questions.length,
                userAnswers,
                evaluationResults,
                incorrectAnswers,
                isComplete: true,
                gptFeedback,
                quizData: data,
                createdAt: new Timestamp(new Date().getTime() / 1000, 0),
              }}
              onClose={handleBackFromResults}
            />
          </>
        ) : (
          <div className="flex flex-col bg-white sm:flex-row justify-center items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <span className="font-medium text-slate-500">
                Score: {score}/{data.questions.length} |{" "}
                {Math.round((score / data.questions.length) * 100)}%
              </span>
            </div>
          </div>
        )}
        {!showResults && (
          <div className="flex flex-col items-center justify-center w-full">
            <div className="mb-6 w-full">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                <span className="text-sm font-medium text-gray-500">
                  Question {currentQuestionIndex + 1} of {data.questions.length}
                </span>
                <div className="h-2 w-full sm:flex-1 sm:mx-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#94b347] transition-all duration-300"
                    style={{
                      width: `${
                        ((currentQuestionIndex + 1) / data.questions.length) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
              <div className="w-full flex flex-col items-center justify-center">
                <h2
                  className="text-lg md:text-xl font-semibold text-gray-800 mb-6 text-center px-2"
                  dangerouslySetInnerHTML={{
                    __html: formatEquation(
                      questionsWithIds[currentQuestionIndex].question
                    ),
                  }}
                ></h2>
              </div>
              <div className="w-full flex flex-col items-center justify-center gap-4">
                {currentQuestion.type === "trueFalse" ? (
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 w-full sm:w-fit justify-center">
                    {["True", "False"].map((answer) => (
                      <Button
                        key={answer}
                        onClick={() => !selectedAnswer && handleAnswer(answer)}
                        disabled={!!selectedAnswer}
                        variant="outline"
                        className={`w-full sm:w-32 justify-between ${
                          selectedAnswer === answer
                            ? isCorrect
                              ? "border-green-600 bg-green-50 text-green-600 shadow-lg"
                              : "border-red-500 bg-red-50 text-red-500"
                            : "border border-slate-400 text-slate-400 bg-white"
                        }`}
                      >
                        {answer === "True" ? (
                          <span className="font-medium">
                            <ThumbsUp className="w-5 h-5 " />
                          </span>
                        ) : (
                          <span className="font-medium">
                            <ThumbsDown className="w-5 h-5 " />
                          </span>
                        )}
                        <span className="font-medium">{answer}</span>
                        {selectedAnswer === answer &&
                          (isCorrect ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          ))}
                      </Button>
                    ))}
                  </div>
                ) : currentQuestion.type === "multipleChoice" ? (
                  <div className="flex flex-col  items-center justify-center w-full max-w-2xl p-2 sm:p-4">
                    {(currentQuestion.options || []).map((option) => (
                      <Button
                        key={option}
                        onClick={() => !selectedAnswer && handleAnswer(option)}
                        disabled={!!selectedAnswer}
                        variant="outline"
                        className={`w-full   text-wrap min-h-[48px] h-fit p-3 sm:p-4  hover:bg-slate-300 justify-center my-1 ${
                          selectedAnswer === option
                            ? isCorrect
                              ? "border-green-500 bg-green-50 text-green-500 shadow-lg"
                              : "border-red-500 bg-red-50 text-red-500 shadow-none"
                            : "border border-slate-400 text-slate-400 bg-white "
                        } `}
                      >
                        <span className="font-medium text-left  line-clamp-2 ">{option}

                       
                        </span>
                        <div className="flex items-center justify-center  w-fit">
                        {selectedAnswer === option &&
                          (isCorrect ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500 " />
                            ))}
                          </div>
                      </Button>
                    ))}
                  </div>
                ) : currentQuestion.type === "shortAnswer" ? (
                  <div className="space-y-4 w-full max-w-md px-4">
                    <Input
                      type="text"
                      placeholder="Type your answer here..."
                      value={
                        userAnswers[currentQuestionIndex] ||
                        selectedAnswer ||
                        ""
                      }
                      onChange={(e) => setSelectedAnswer(e.target.value)}
                      disabled={
                        isLoading ||
                        userAnswers[currentQuestionIndex] !== undefined
                      }
                      className={`w-full p-2 text-slate-500 ${
                        userAnswers[currentQuestionIndex] !== undefined
                          ? "bg-gray-100 cursor-not-allowed"
                          : ""
                      }`}
                    />
                    {selectedAnswer &&
                      !isLoading &&
                      !userAnswers[currentQuestionIndex] && (
                        <Button
                          onClick={(e) => {
                            e.preventDefault();
                            handleAnswer(selectedAnswer);
                          }}
                          disabled={
                            isLoading ||
                            selectedAnswer === "" ||
                            showExplanation
                          }
                          className="w-full bg-[#94b347] hover:bg-[#a5c05f] text-slate-100"
                        >
                          Submit Answer
                        </Button>
                      )}
                    {isLoading && (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-[#94b347]" />
                        <span className="text-slate-600">
                          Evaluating your answer...
                        </span>
                      </div>
                    )}
                    {currentQuestion.type === "shortAnswer" &&
                      gptFeedback &&
                      currentQuestion.correctAnswer !== null &&
                      selectedAnswer &&
                      showExplanation && (
                        <div className="p-4 rounded-lg bg-slate-50 mt-4 ">
                          <div className="flex items-center gap-2 mb-2">
                            {isCorrect ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-500" />
                            )}
                            <span
                              className={`font-medium ${
                                isCorrect ? "text-green-700" : "text-red-700"
                              }`}
                            >
                              {isCorrect ? "Correct!" : "Needs Improvement"}
                            </span>
                          </div>
                          <p className="text-slate-700 whitespace-pre-line text-sm md:text-base">
                            {gptFeedback}
                          </p>
                        </div>
                      )}
                  </div>
                ) : null}
              </div>
            </div>
            {showExplanation && currentQuestion.type !== "shortAnswer" && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg w-full max-w-2xl shadow-lg">
                <h3 className="font-semibold text-gray-700 mb-2">
                  Explanation:
                </h3>
                <p
                  className="text-gray-600 text-sm md:text-base"
                  dangerouslySetInnerHTML={{
                    __html: formatEquation(currentQuestion.explanation),
                  }}
                ></p>
              </div>
            )}
            {selectedAnswer && showExplanation && !isLastQuestion ? (
              <div className="w-full flex justify-center mt-6 ">
                <Button
                  onClick={nextQuestion}
                  className="w-full sm:w-fit bg-[#94b347] hover:bg-[#a5c05f] px-6"
                >
                  <span className="text-slate-100">Next Question</span>
                  <ArrowRight className="w-4 h-4 ml-2 text-slate-100" />
                </Button>
              </div>
            ) : (
              isLastQuestion &&
              selectedAnswer && (
                <div className="w-full flex justify-center mt-6 ">
                  <Button
                    onClick={handleViewResults}
                    className="w-full sm:w-fit bg-[#94b347] hover:bg-[#a5c05f] px-6"
                  >
                    <span className="text-slate-100">View Results</span>
                    <ArrowRight className="w-4 h-4 ml-2 text-slate-100" />
                  </Button>
                </div>
              )
            )}
          </div>
        )}
      </div>
      {!showResults && (
        <>
          <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-gray-500 my-2 p-4">
            <h3 className="font-semibold text-gray-800 mb-2 sm:mb-0">
              Question Summary
            </h3>
            <Button
              onClick={() => setShowSummary(!showSummary)}
              variant="outline"
              className="w-full sm:w-fit bg-slate-50 hover:bg-slate-200"
            >
              <BookOpen className="w-5 h-5 mr-2" />
              <span>{showSummary ? "Hide" : "Show"} Question Summary</span>
              {showSummary ? (
                <ChevronUp className="w-5 h-5 ml-2" />
              ) : (
                <ChevronDown className="w-5 h-5 ml-2" />
              )}
            </Button>
          </div>
          {showSummary && (
            <div className="mb-6 p-4 bg-white rounded-lg w-full">
              <div className="space-y-2">
                {questionsWithIds.map((question, index) => (
                  <div key={`question-${question.id}`}>
                    <QuestionSummary
                      question={question}
                      userAnswer={userAnswers[index]}
                      formatEquation={formatEquation}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PageQuiz;
