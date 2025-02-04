"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, RefreshCw } from "lucide-react";
import React, { MutableRefObject } from "react";
import FormUpload from "../study/formUpload";

interface QuizFormProps {
  quizName: string;
  setQuizName: (name: string) => void;
  numberOfQuestions: number;
  setNumberOfQuestions: (num: number) => void;
  selectedQuestionTypes: {
    multipleChoice: boolean;
    trueFalse: boolean;
    shortAnswer: boolean;
  };
  setSelectedQuestionTypes: React.Dispatch<
    React.SetStateAction<{
      multipleChoice: boolean;
      trueFalse: boolean;
      shortAnswer: boolean;
    }>
  >;
  files: File[];
  setFiles: (files: File[]) => void;
  fileInputRef: MutableRefObject<HTMLInputElement>;
  isGenerating: boolean;
  handleGenerateQuiz: () => void;
  setShowQuizForm: (show: boolean) => void;
  renderNotebookList: () => React.ReactNode;
  selectedPages: { [notebookId: string]: string[] };
}

const QuizForm = ({
  quizName,
  setQuizName,
  numberOfQuestions,
  setNumberOfQuestions,
  selectedQuestionTypes,
  setSelectedQuestionTypes,
  files,
  setFiles,
  fileInputRef,
  isGenerating,
  handleGenerateQuiz,
  setShowQuizForm,
  renderNotebookList,
  selectedPages = {},
}: QuizFormProps) => {
  return (
    <div className="fixed inset-0 bg-slate-600/30 opacity-100 backdrop-blur-sm flex items-center justify-center z-10 w-full">
      <div className="bg-white p-6 rounded-lg h-full max-h-[60vh] w-full overflow-y-auto max-w-xl">
        <div className="flex flex-row justify-center items-center">
          <CardTitle className="text-[#94b347] text-xl font-bold">
            Create New Quiz
          </CardTitle>
        </div>

        {/* Quiz Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Quiz Name
          </label>
          <Input
            value={quizName}
            onChange={(e) => setQuizName(e.target.value)}
            placeholder="Enter quiz name"
            className="text-slate-600 rounded-md"
          />
        </div>

        {/* Number of Questions */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Number of Questions
          </label>
          <Select
            value={numberOfQuestions.toString()}
            onValueChange={(value) => setNumberOfQuestions(Number(value))}
          >
            <SelectTrigger className="text-slate-600 rounded-md">
              <SelectValue placeholder="Select number of questions" />
            </SelectTrigger>
            <SelectContent className="text-slate-600 rounded-md bg-white">
              {[5, 10, 15, 20].map((num) => (
                <SelectItem key={num} value={num.toString()}>
                  {num} questions
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Question Types */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Question Types
          </label>
          <div className="space-y-2">
            {Object.entries(selectedQuestionTypes).map(([type, selected]) => (
              <div key={type} className="flex items-center">
                <Checkbox
                  checked={selected}
                  className="data-[state=checked]:bg-[#94b347] data-[state=checked]:text-white"
                  onCheckedChange={(checked) =>
                    setSelectedQuestionTypes({
                      ...selectedQuestionTypes,
                      [type]: checked === true,
                    })
                  }
                  id={type}
                />
                <label htmlFor={type} className="ml-2 text-sm text-slate-600">
                  {type.replace(/([A-Z])/g, " $1").trim()}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Notebook Selection */}
        <div>
          <div className="font-semibold text-gray-500 w-full flex items-center justify-center text-lg">
            <h3> Select notes or upload files to study </h3>
          </div>
          <FormUpload
            files={files}
            handleFileUpload={(e) => {
              if (e.target.files) {
                setFiles(Array.from(e.target.files));
              }
            }}
            handleClear={() => setFiles([])}
            fileInputRef={fileInputRef}
            messages={[]}
            handleSendMessage={() => {}}
            showUpload={true}
            setShowUpload={() => {}}
          />
          {renderNotebookList()}
        </div>

        <div className="flex justify-end space-x-2 mt-5">
          <div className="flex flex-row justify-between items-center w-full">
            <Button
              variant="outline"
              onClick={() => setShowQuizForm(false)}
              className="text-red-500 bg-white rounded-full border border-red-500 hover:text-red-500 hover:border-red-500 hover:bg-red-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateQuiz}
              disabled={
                isGenerating ||
                !Object.values(selectedQuestionTypes).some(Boolean) ||
                (!files.length &&
                  !Object.values(selectedPages).some(
                    (pages) => pages.length > 0
                  ))
              }
              className="bg-white hover:bg-white rounded-full shadow-none border border-slate-400 text-slate-400 hover:text-[#94b347] hover:border-[#94b347]"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Quiz"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizForm;
