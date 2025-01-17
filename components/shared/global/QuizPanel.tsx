"use client";
import { Button } from "@/components/ui/button";
import Quiz from "@/components/ui/Quiz";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Image, Upload } from "lucide-react"; // Import icons
import React, { useEffect, useRef, useState } from "react";
import { saveQuizState } from "@/lib/firebase/firestore";

// import { Quiz } from "@/components/ui/Quiz";
import RecentQuizzes from "@/components/ui/RecentQuizzes";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { QuizData, QuizState } from "@/types/quiz";
import { CircularProgress } from "@mui/material";
// First, let's define our message types
interface Sentence {
  id: number;
  text: string;
}

interface Section {
  title: string;
  sentences: Sentence[];
}

interface Message {
  user: string;
  text: string | Section[];
  files?: string[];
}

interface QuizPanelProps {
  notebookId: string;
  pageId: string;
}

const QuizPanel = ({ notebookId, pageId }: QuizPanelProps) => {
  // Add state for all user selections
  const [testFormat, setTestFormat] = useState<string>("");
  const [responseType, setResponseType] = useState<string>("");
  const [questionCount, setQuestionCount] = useState<string>("");
  const [questionScope, setQuestionScope] = useState<string>("");
  const [questionTypes, setQuestionTypes] = useState({
    trueFalse: false,
    multipleChoice: false,
    shortAnswer: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizState | null>(null);

  const generateQuiz = async () => {
    setIsLoading(true);
    try {
      const message = {
        format: "allAtOnce",
        responseType: "text",
        numberOfQuestions: questionCount,
        questionTypes: Object.entries(questionTypes)
          .filter(([_, enabled]) => enabled)
          .map(([type]) => type),
        notebookId,
        pageId,
      };

      const formData = new FormData();
      formData.append("message", JSON.stringify(message));

      const response = await fetch("/api/quiz", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to generate quiz");
      }

      const data = await response.json();
      // Generate a deterministic quiz ID based on pageId and timestamp
      const timestamp = new Date().toISOString().split('T')[0]; // Get current date YYYY-MM-DD
      const quizId = `quiz_${pageId}_${timestamp}`;
      
      const initialQuizState: QuizState = {
        id: quizId,
        notebookId,
        pageId,
        startedAt: new Date(),
        lastUpdatedAt: new Date(),
        currentQuestionIndex: 0,
        score: 0,
        totalQuestions: data.quiz.questions.length,
        userAnswers: {},
        evaluationResults: {},
        incorrectAnswers: [],
        isComplete: false,
        gptFeedback: "",
        quizData: data.quiz
      };
      
      await saveQuizState(initialQuizState);
      setQuizData(data.quiz);
      
    } catch (error) {
      console.error("Error generating quiz:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuizSelect = (quiz: QuizState) => {
    setSelectedQuiz(quiz);
    setQuizData(quiz.quizData);
  };


  return (
    <div
      className={` h-full bg-slate-100 rounded-xl p-6 w-full overflow-y-auto`}
    >
      <div className="flex flex-col items-center mb-4">
        <h1 className="text-2xl font-semibold text-slate-500">Quiz Panel</h1>
      </div>

      <div
        className={`w-full h-full flex flex-col items-center  ${
          quizData ? "w-full" : ""
        }`}
      >
        <Separator
          className="w-full bg-slate-200 mb-4"
          orientation="horizontal"
        />

        {!quizData ? (
          <div className="flex flex-col gap-5 w-full max-w-[800px] border border-slate-400 bg-slate-200  p-4 rounded-xl">
            <div className="flex flex-col  items-center text-slate-500">
              <h1 className="text-md font-bold">Generate Quiz</h1>
            </div>

            <Select onValueChange={(value) => setQuestionCount(value)}>
              <SelectTrigger className="w-full bg-slate-100 text-slate-500">
                <SelectValue placeholder="How many Questions?" />
              </SelectTrigger>
              <SelectContent className="bg-slate-100">
                <SelectItem
                  value="5"
                  className="text-slate-500 hover:bg-slate-300"
                >
                  5
                </SelectItem>
                <SelectItem
                  value="10"
                  className="text-slate-500 hover:bg-slate-300"
                >
                  10
                </SelectItem>
                <SelectItem
                  value="15"
                  className="text-slate-500 hover:bg-slate-300"
                >
                  15
                </SelectItem>
                <SelectItem
                  value="20"
                  className="text-slate-500 hover:bg-slate-300"
                >
                  20
                </SelectItem>
                <SelectItem
                  value="25"
                  className="text-slate-500 hover:bg-slate-300"
                >
                  25
                </SelectItem>
              </SelectContent>
            </Select>
            {/* <Select onValueChange={(value) => setQuestionScope(value)}>
              <SelectTrigger className="w-full text-slate-500">
                <SelectValue placeholder="What do you want to be tested on?" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="this page" className="text-slate-500 hover:bg-slate-300">this page</SelectItem>
                <SelectItem value="all pages" className="text-slate-500 hover:bg-slate-300">all pages</SelectItem>
              
              </SelectContent>
            </Select> */}

            <div className="flex flex-col gap-2 items-start text-slate-500">
              <h1 className="text-md font-bold">Question Type</h1>
              <div className="flex flex-row gap-2 items-center">
                <Switch
                  checked={questionTypes.trueFalse}
                  onCheckedChange={(checked) =>
                    setQuestionTypes((prev) => ({
                      ...prev,
                      trueFalse: checked,
                    }))
                  }
                />
                <p className="text-slate-500 font-semibold">True/False</p>
              </div>
              <div className="flex flex-row gap-2 items-center">
                <Switch
                  checked={questionTypes.multipleChoice}
                  onCheckedChange={(checked) =>
                    setQuestionTypes((prev) => ({
                      ...prev,
                      multipleChoice: checked,
                    }))
                  }
                />
                <p className="text-slate-500 font-semibold">Multiple choice</p>
              </div>
              <div className="flex flex-row gap-2 items-center">
                <Switch
                  checked={questionTypes.shortAnswer}
                  onCheckedChange={(checked) =>
                    setQuestionTypes((prev) => ({
                      ...prev,
                      shortAnswer: checked,
                    }))
                  }
                />
                <p className="text-slate-500 font-semibold">Short answer</p>
              </div>
            </div>
            <div className="flex flex-col items-center w-full">
            {isLoading ? (
          <div className="flex flex-col items-center w-full">
            <p className="text-slate-500 font-semibold">Generating...</p>
            <CircularProgress
              sx={{
                color: "#94b347",
              }}
            />
          </div>
        ) : (
          <Button
                onClick={generateQuiz}
                disabled={
                  isLoading ||
                  !questionCount ||
                  (!questionTypes.trueFalse &&
                    !questionTypes.multipleChoice &&
                    !questionTypes.shortAnswer)
                }
                className="shadow-none text-slate-500 bg-slate-100 border border-slate-400 hover:bg-slate-100 hover:border-[#94b347] hover:text-[#94b347] p-3 rounded-full text-lg w-fit cursor-pointer disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                     <div className="text-slate-400 text-xl font-semibold">
              Generating ...
            </div>
        
                  </>
                ) : (
                  "Generate Test"
                )}
              </Button>
              )}
            
            </div>
          </div>
        ) : (
          <div className="w-full">
            <Button
              onClick={() => {
                setQuizData(null);
                  setSelectedQuiz(null);
                  
              }}
              className="mb-4 bg-white shadow-none border border-slate-400 text-red-400 hover:bg-slate-200 hover:border-red-400 p-5 rounded-full hover:text-red-400 text-md"
            >
              Exit Quiz
            </Button>
            <Quiz
              data={quizData}
              notebookId={notebookId}
              pageId={pageId}
              initialState={selectedQuiz}
            />
          </div>
        )}

       
        <RecentQuizzes pageId={pageId} onQuizSelect={handleQuizSelect} />
      </div>
    </div>
  );
};

export default QuizPanel;
