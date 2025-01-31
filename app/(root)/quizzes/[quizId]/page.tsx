"use client";

import { Button } from "@/components/ui/button";
import PageQuiz from "@/components/ui/PageQuiz";
import { getQuiz } from "@/lib/firebase/firestore";

import { QuizState } from "@/types/quiz";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function QuizPage() {
  const params = useParams();
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuiz = async () => {
      if (params.quizId) {
        try {
          const quizData = await getQuiz(params.quizId as string);
          setQuiz(quizData);
        } catch (error) {
          console.error("Error fetching quiz:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchQuiz();
  }, [params.quizId]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!quiz || !quiz.quizData) {
    return <div>Quiz not found</div>;
  }

  return (
    <div className="mx-auto p-16 flex flex-col items-center justify-start  h-full" >
      <div className="mb-6 flex flex-row justify-between w-full">
        <Link href="/">
          <Button variant="ghost" className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
           </Link>
           <h1 className="text-2xl font-bold ">Quiz:<span className="text-[#999]">{quiz.quizData.title}</span></h1>
           <Button variant="ghost" className="gap-2 rounded-full border border-slate-400">
              Create New Quiz
           </Button>
        </div>
        <div className="flex flex-col items-center justify-start w-full">
           
        </div>
      <PageQuiz
        data={quiz.quizData}
        notebookId={quiz.notebookId}
        pageId={quiz.pageId}
        initialState={quiz}
      />
    
    </div>
  );
} 