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
  MicOff,
  Mic,
  Volume,
  Volume2,
  VolumeOff,
} from "lucide-react";
import React, { useState } from "react";

interface QuizProps {
  data: QuizData;
  notebookId: string;
  pageId: string;
}

const Quiz: React.FC<QuizProps> = ({ data, notebookId, pageId }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [gptFeedback, setGptFeedback] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [incorrectAnswers, setIncorrectAnswers] = useState<number[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [evaluationResults, setEvaluationResults] = useState<
    Record<number, boolean>
  >({});
  const [aiVoice, setAiVoice] = useState(false);
  const [vocalAnswer, setVocalAnswer] = useState(false);

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
            notebookId,
            pageId,
          }),
        });

        const data = await response.json();

        setSelectedAnswer(answer);
        setShowExplanation(true);
        setUserAnswers((prev) => ({ ...prev, [currentQuestion.id]: answer }));

        if (data.isCorrect) {
          setScore((prev) => prev + data.score);
        } else {
          setIncorrectAnswers((prev) => [...prev, currentQuestion.id]);
        }

        setGptFeedback(data.feedback);

        if (data.improvements) {
          // You might want to add a new state for improvements
          // setImprovements(data.improvements);
        }
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
      <div className="border rounded-lg mb-2 p-4 ">
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
            <span className="font-medium text-slate-500 text-wrap ">
              {question.question}
            </span>
          </div>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </Button>
        {isOpen && (
          <div className="p-4  bg-gray-50">
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
                  >
                    {userAnswer}
                  </span>
                </div>
                <div className="mb-2">
                  <span className="font-medium text-slate-500">
                    Correct answer:{" "}
                  </span>
                  <span className="text-green-600">
                    {question.correctAnswer}
                  </span>
                </div>
              </>
            ) : (
              <div className="mb-2 text-gray-500 italic">Not answered yet</div>
            )}
            <div className="mt-2">
              <span className="font-medium text-slate-500">Explanation: </span>
              <span className="text-slate-500">{question.explanation}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white w-full rounded-xl  p-8  ">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <span className="font-medium text-slate-500">
            Score: {score}/{data.questions.length} |{" "}
            {Math.round((score / data.questions.length) * 100)}%
          </span>
        </div>

        <div className="text-sm flex flex-row items-center gap-2 text-gray-500">
          <Button onClick={() => setAiVoice(!aiVoice)}>
            {aiVoice ? <Volume2 className="w-5 h-5 text-yellow-500" /> : <VolumeOff className="w-5 h-5 text-yellow-500" />}
          </Button>
          <Button onClick={() => setVocalAnswer(!vocalAnswer)}>
            {vocalAnswer ? <Mic className="w-5 h-5 text-yellow-500" /> : <MicOff className="w-5 h-5 text-yellow-500" />}
          </Button>

          <Button
            onClick={() => setShowSummary(!showSummary)}
            variant="outline"
            className="w-fit bg-slate-50 hover:bg-slate-200"
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
      </div>
      <div className="w-full  flex justify-end"></div>
      {showResults && (
        <div className="mt-6 text-center p-6  rounded-lg">
          <h3 className="text-2xl font-bold text-slate-500 mb-2">
            Quiz Completed!
          </h3>
          <p className="text-slate-500 mb-2">
            Final Score: {score} out of {data.questions.length}
          </p>
          <p className="text-slate-500">
            Accuracy: {Math.round(scorePercentage)}%
          </p>
        </div>
      )}

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
      {!showResults && (
        <div className="flex flex-col items-center justify-center ">
          <div className="mb-6 w-full">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-medium text-gray-500  ">
                Question {currentQuestionIndex + 1} of {data.questions.length}
              </span>
              <div className="h-2 flex-1 mx-4 bg-gray-100 rounded-full overflow-hidden">
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
            <div className="w-full flex flex-col items-center justify-center bg-red-">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">
                {currentQuestion.question}
              </h2>
            </div>

            <div className=" w-full flex flex-row  gap-6 items-center justify-center">
              {currentQuestion.type === "trueFalse" ? (
                ["True", "False"].map((answer) => (
                  <Button
                    key={answer}
                    onClick={() => !selectedAnswer && handleAnswer(answer)}
                    disabled={!!selectedAnswer}
                    variant="outline"
                    className={`w-fit justify-between ${
                      selectedAnswer === answer
                        ? isCorrect
                          ? "border-green-600 bg-green-50 text-green-600"
                          : "border-red-500 bg-red-50 text-red-500"
                        : " border border-slate-400 text-slate-400 bg-white"
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
                <div className="grid grid-cols-2 gap-2  w-fit p">
                  {currentQuestion.options.map((option) => (
                    <Button
                      key={option}
                      onClick={() => !selectedAnswer && handleAnswer(option)}
                      disabled={!!selectedAnswer}
                      variant="outline"
                      className={`w-fit   min-w-[270px] p-4 hover:bg-slate-300 justify-between ${
                        selectedAnswer === option
                          ? isCorrect
                            ? "border-green-500 bg-green-50 text-green-500"
                            : "border-red-500 bg-red-50 text-red-500"
                          : " border border-slate-400 text-slate-400 bg-white"
                      }`}
                    >
                      <span className="font-medium">{option}</span>
                      {selectedAnswer === option &&
                        (isCorrect ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500 " />
                        ))}
                    </Button>
                  ))}
                </div>
              ) : currentQuestion.type === "shortAnswer" ? (
                <div className="space-y-4 w-full max-w-md">
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
                      disabled={
                        isLoading || selectedAnswer === "" || showExplanation
                      }
                      className="w-full bg-[#94b347] hover:bg-[#a5c05f] text-slate-100"
                    >
                      Submit Answer
                    </Button>
                  )}
                  {isLoading && (
                    <div className="flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-[#94b347]" />
                      <span className="ml-2 text-slate-600">
                        Evaluating your answer...
                      </span>
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

          {showExplanation && currentQuestion.type !== "shortAnswer" && (
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

          {selectedAnswer && !isLastQuestion ? (
            <div className="w-full flex flex-row items-center justify-center ">
              <Button
                onClick={nextQuestion}
                className="mt-6 w-fit bg-[#94b347] hover:bg-[#a5c05f] self-end"
              >
                <span className="text-slate-100">Next Question</span>
                <ArrowRight className="w-4 h-4 ml-2 text-slate-100" />
              </Button>
            </div>
          ) : (
            isLastQuestion && (
              <div className="w-full flex flex-row items-center justify-end">
                <Button
                  onClick={() => {
                    setShowResults(true);
                    setShowSummary(true);
                  }}
                  className="mt-6 w-fit bg-[#94b347] hover:bg-[#a5c05f] self-end"
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
  );
};

export default Quiz;
