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
import { db } from "@/firebase";
import { uploadLargeFile } from "@/lib/fileUpload";

import { QuizState } from "@/types/quiz";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { Loader2, RefreshCw } from "lucide-react";
import React, { MutableRefObject, useState } from "react";
import { toast } from "react-hot-toast";
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
  setIsGenerating: (isGenerating: boolean) => void;
  setShowQuizForm: (show: boolean) => void;
  renderNotebookList: () => React.ReactNode;
  selectedPages: { [notebookId: string]: string[] };
  setSelectedPages: React.Dispatch<
    React.SetStateAction<{ [notebookId: string]: string[] }>
  >;
  user: any;
  onQuizCreated?: (quiz: QuizState) => void;
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
  setIsGenerating,
  setShowQuizForm,
  renderNotebookList,
  selectedPages,
  setSelectedPages,
  user,
  onQuizCreated,
}: QuizFormProps) => {
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleGenerateQuiz = async () => {
    if (!quizName.trim()) return;
    if (!user) {
      setUploadError("User not authenticated");
      return;
    }
    setUploadError(null);

    try {
      setIsGenerating(true);

      // Process uploaded files first
      const processedFiles = [];
      for (const file of files) {
        try {
          const downloadURL = await uploadLargeFile(file);
          if (!downloadURL) {
            throw new Error("File upload failed");
          }

          const response = await fetch("/api/convert-from-storage", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              fileUrl: downloadURL,
              fileName: file.name,
              fileType: file.type,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              errorData.message || `Failed to convert file: ${file.name}`
            );
          }

          const data = await response.json();
          processedFiles.push({
            name: file.name,
            text: data.text,
            path: downloadURL,
          });
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          setUploadError(`Failed to process ${file.name}. Please try again.`);
          return;
        }
      }

      // Create the message object with actual user ID
      const message = {
        userId: user.id,
        quizName,
        numberOfQuestions,
        questionTypes: Object.entries(selectedQuestionTypes)
          .filter(([_, selected]) => selected)
          .map(([type]) => type),
        selectedPages,
        uploadedDocs: processedFiles,
        format: "json",
      };

      // Create FormData and append the message
      const formData = new FormData();
      formData.append("message", JSON.stringify(message));

      // Send quiz generation request
      const response = await fetch("/api/quiz", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to generate quiz");
      }

      const quizData = await response.json();

      const now = Timestamp.now();
      const newQuiz = {
        id: crypto.randomUUID(),
        notebookId: Object.keys(selectedPages)[0] || "",
        pageId: Object.values(selectedPages)[0]?.[0] || "",
        quizData: {
          title: quizName,
          questions: quizData.quiz.questions,
        },
        currentQuestionIndex: 0,
        userAnswers: {},
        evaluationResults: {},
        score: 0,
        totalQuestions: quizData.quiz.questions.length,
        startedAt: now,
        lastUpdatedAt: now,
        createdAt: now,
        isComplete: false,
        incorrectAnswers: [],
        userId: user.id,
        title: quizName,
      };

      // Create a serializable version of the quiz
      const serializableQuiz = {
        ...newQuiz,
        startedAt: {
          seconds: newQuiz.startedAt.seconds,
          nanoseconds: newQuiz.startedAt.nanoseconds,
        },
        lastUpdatedAt: {
          seconds: newQuiz.lastUpdatedAt.seconds,
          nanoseconds: newQuiz.lastUpdatedAt.nanoseconds,
        },
        createdAt: {
          seconds: newQuiz.createdAt.seconds,
          nanoseconds: newQuiz.createdAt.nanoseconds,
        },
      };

      // Save to Firestore directly
      const docRef = await addDoc(collection(db, "quizzes"), newQuiz);
      const newQuizWithId = { ...newQuiz, id: docRef.id } as QuizState;

      // Update local state
      if (onQuizCreated) {
        onQuizCreated(newQuizWithId);
      }

      // Clear form and close modal
      setShowQuizForm(false);
      setQuizName("");
      setFiles([]);
      setSelectedPages({});

      toast.success("Quiz generated successfully!");
    } catch (error) {
      console.error("Error generating quiz:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate quiz"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-600/30 opacity-100 backdrop-blur-sm flex items-center justify-center z-40 w-full ">
      <div className="bg-white p-6 rounded-lg h-full  w-full overflow-y-hidden max-w-2xl pt-16 max-h-[85vh]">
        <div className="flex flex-row justify-center items-center">
          <CardTitle className="text-[#94b347] text-xl font-bold">
            Create New Quiz
          </CardTitle>
        </div>
<div className="overflow-y-auto h-full pb-8 pt-4">
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
           <div className="max-h-72 overflow-y-auto ">
            {renderNotebookList()}
            </div>
        </div>

        {uploadError && (
          <div className="mt-2 p-2 text-sm text-red-600 bg-red-50 rounded-md">
            {uploadError}
          </div>
        )}

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
    </div>
  );
};

export default QuizForm;
