"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getStudyCardSet } from "@/lib/firebase/firestore";
import { StudyCardSet } from "@/types/studyCards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function StudyCardPage() {
  const params = useParams();
  const router = useRouter();
  const studyCardId = params?.studyCardId as string;
  const [studySet, setStudySet] = useState<StudyCardSet | null>(null);
  const [showAnswer, setShowAnswer] = useState<{ [key: number]: boolean }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  useEffect(() => {
    const loadStudySet = async () => {
      try {
        if (!studyCardId) {
          setError("No study card ID provided");
          return;
        }

        console.log("Fetching study card set with ID:", studyCardId);
        const set = await getStudyCardSet(studyCardId);
        
        if (!set) {
          setError("Study set not found");
          return;
        }

        console.log("Retrieved study set:", set);
        setStudySet(set);
      } catch (error) {
        console.error("Error loading study set:", error);
        setError("Error loading study set");
      } finally {
        setIsLoading(false);
      }
    };

    loadStudySet();
  }, [studyCardId]);

  const toggleAnswer = (index: number) => {
    setShowAnswer(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const nextCard = () => {
    if (studySet && currentCardIndex < studySet.cards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
      setShowAnswer({});  // Reset answer visibility when changing cards
    }
  };

  const previousCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(prev => prev - 1);
      setShowAnswer({});  // Reset answer visibility when changing cards
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#94b347]" />
      </div>
    );
  }

  if (error || !studySet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-slate-600">{error || "Study set not found"}</p>
        <Link href="/notes">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to Notes
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 h-full">
      <Card className="max-w-4xl mx-auto shadow-none border-none h-fit bg-white mb-8">
        <CardHeader className="flex flex-row items-center justify-between h-fit">
          <div>
            <CardTitle className="text-4xl font-bold text-[#94b347] ">
               Study Card Set: <span className="text-slate-500">{studySet.title}</span>
            </CardTitle>
            <p className="text-sm text-slate-500 mt-2">
              Created: {new Date(studySet.createdAt).toLocaleDateString()}
            </p>
          </div>
       
        </CardHeader>

        <CardContent className="space-y-4 h-full">
          <div className="flex items-center justify-between mb-4">
            <Button 
              onClick={previousCard} 
              disabled={currentCardIndex === 0}
              variant="outline"
            >
              Previous
            </Button>
            <span className="text-slate-500">
              Card {currentCardIndex + 1} of {studySet.cards.length}
            </span>
            <Button 
              onClick={nextCard} 
              disabled={currentCardIndex === studySet.cards.length - 1}
              variant="outline"
            >
              Next
            </Button>
          </div>

          <div
            onClick={() => toggleAnswer(currentCardIndex)}
            className="bg-white border border-slate-400 p-4 flex flex-col justify-center items-center py-8 rounded cursor-pointer hover:bg-slate-100 transition-colors"
          >
            <h3 className="font-bold text-[#94b347] text-2xl">
              {studySet.cards[currentCardIndex].title}
            </h3>
            <div
              className={`mt-2 text-xl text-slate-600 ${
                showAnswer[currentCardIndex] ? "block" : "hidden"
              }`}
            >
              <p>{studySet.cards[currentCardIndex].content}</p>
            </div>
            {!showAnswer[currentCardIndex] && (
              <p className="text-sm text-slate-500 mt-2 text-xl">
                Click to reveal answer
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-4xl mx-auto shadow-none border-none h-fit bg-white">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-slate-600">
            All Study Cards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {studySet?.cards.map((card, index) => (
              <div
                key={index}
                onClick={() => {
                  setCurrentCardIndex(index);
                  setShowAnswer({});
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="bg-white border border-slate-200 p-4 rounded cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <h3 className="font-semibold text-[#94b347]">
                  {index + 1}. {card.title}
                </h3>
                <div className={`mt-2 text-slate-600 ${showAnswer[index] ? 'block' : 'hidden'}`}>
                  <p>{card.content}</p>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleAnswer(index);
                  }}
                  className="text-sm text-slate-500 mt-2 hover:text-[#94b347]"
                >
                  {showAnswer[index] ? 'Hide Answer' : 'Show Answer'}
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}