"use client";

import { Button } from "@/components/ui/button";
import Quiz from "@/components/ui/Quiz";
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
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
      <Quiz
        data={quiz.quizData}
        notebookId={quiz.notebookId}
        pageId={quiz.pageId}
        initialState={quiz}
      />
        this is where we build
    </div>
  );
} 