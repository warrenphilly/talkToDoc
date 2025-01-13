"use client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Image, Upload } from "lucide-react"; // Import icons
import React, { useEffect, useRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { Switch } from "@/components/ui/switch"
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

const QuizPanel = () => {
  // Add state for all user selections
  const [testFormat, setTestFormat] = useState<string>("");
  const [responseType, setResponseType] = useState<string>("");
  const [questionCount, setQuestionCount] = useState<string>("");
  const [questionTypes, setQuestionTypes] = useState({
    trueFalse: false,
    multipleChoice: false,
    shortAnswer: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [quizResponse, setQuizResponse] = useState<string>("");

  const generateQuiz = async () => {
    setIsLoading(true);
    try {
      const message = {
        format: testFormat,
        responseType: responseType,
        numberOfQuestions: questionCount,
        questionTypes: Object.entries(questionTypes)
          .filter(([_, enabled]) => enabled)
          .map(([type]) => type),
      };

      const formData = new FormData();
      formData.append('message', JSON.stringify(message));
      formData.append('context', 'Generate a quiz with the following parameters');

      const response = await fetch('/api/quiz', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setQuizResponse(JSON.stringify(data.quiz, null, 2));
    } catch (error) {
      console.error('Error generating quiz:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full border-3 bg-slate-200 rounded-2xl mb-4 max-h-[90vh] overflow-y-auto">
      <div className="flex flex-col items-center justify-center p-3 gap-4">
        <h1 className="text-xl font-semibold text-[#94b347]">Quiz Me</h1>
        <Button 
          disabled 
          className="bg-white shadow-none border border-slate-400 text-red-500 hover:bg-slate-100 hover:border-[#94b347] p-5 rounded-full hover:text-[#94b347] text-md"
        >
          <h1 className="text-md">Clear Test</h1>
        </Button>
      </div>

      <div className="text-white min-h-[400px] rounded-lg flex flex-col justify-between items-center p-4 m-4">
        <div className="flex flex-col gap-5 w-full max-w-md">
          <Select onValueChange={(value) => setTestFormat(value)}>
            <SelectTrigger className="w-full text-slate-500">
              <SelectValue placeholder="How would you like to be tested?" />
            </SelectTrigger>
            <SelectContent className="bg-slate-100">
              <SelectItem value="oneAtATime" className="text-slate-500 hover:bg-slate-300">
                Ask me one question at a time
              </SelectItem>
              <SelectItem value="allAtOnce" className="text-slate-500 hover:bg-slate-300">
                Ask me all at once
              </SelectItem>
            </SelectContent>
          </Select>

          <Select onValueChange={(value) => setResponseType(value)}>
            <SelectTrigger className="w-full text-slate-500">
              <SelectValue placeholder="Text or Speech?" />
            </SelectTrigger>
            <SelectContent className="bg-slate-100">
              <SelectItem value="text" className="text-slate-500 hover:bg-slate-300">Text</SelectItem>
              <SelectItem value="speech" className="text-slate-500 hover:bg-slate-300">Speech</SelectItem>
            </SelectContent>
          </Select>

          <Select onValueChange={(value) => setQuestionCount(value)}>
            <SelectTrigger className="w-full text-slate-500">
              <SelectValue placeholder="How many Questions?" />
            </SelectTrigger>
            <SelectContent className="bg-slate-100">
              <SelectItem value="5" className="text-slate-500 hover:bg-slate-300">5</SelectItem>
              <SelectItem value="10" className="text-slate-500 hover:bg-slate-300">10</SelectItem>
              <SelectItem value="15" className="text-slate-500 hover:bg-slate-300">15</SelectItem>
              <SelectItem value="20" className="text-slate-500 hover:bg-slate-300">20</SelectItem>
              <SelectItem value="25" className="text-slate-500 hover:bg-slate-300">25</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex flex-col gap-2 items-start text-slate-500">
            <h1 className="text-md font-bold">Question Type</h1>
            <div className="flex flex-row gap-2 items-center">
              <Switch 
                checked={questionTypes.trueFalse}
                onCheckedChange={(checked) => 
                  setQuestionTypes(prev => ({ ...prev, trueFalse: checked }))
                }
              />
              <p>True/False</p>
            </div>
            <div className="flex flex-row gap-2 items-center">
              <Switch 
                checked={questionTypes.multipleChoice}
                onCheckedChange={(checked) => 
                  setQuestionTypes(prev => ({ ...prev, multipleChoice: checked }))
                }
              />
              <p>Multiple choice</p>
            </div>
            <div className="flex flex-row gap-2 items-center">
              <Switch 
                checked={questionTypes.shortAnswer}
                onCheckedChange={(checked) => 
                  setQuestionTypes(prev => ({ ...prev, shortAnswer: checked }))
                }
              />
              <p>Short answer</p>
            </div>
          </div>

          <Button 
            onClick={generateQuiz}
            disabled={isLoading}
            className="bg-[#94b347] hover:bg-[#a5c05f] text-white shadow-none p-5 rounded-lg text-xl w-full"
          >
            {isLoading ? "Generating..." : "Generate Test"}
          </Button>

          {quizResponse && (
            <div className="mt-4 p-4 bg-white rounded-lg text-slate-700">
              <pre className="whitespace-pre-wrap">{quizResponse}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizPanel;
