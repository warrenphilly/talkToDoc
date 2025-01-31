import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StudyCardSet } from "@/types/studyCards";
import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

interface StudyCardCarouselProps {
  studySet: StudyCardSet;
}

export function StudyCardCarousel({ studySet }: StudyCardCarouselProps) {
  const [showAnswer, setShowAnswer] = useState<{ [key: number]: boolean }>({});
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  const toggleAnswer = (index: number) => {
    setShowAnswer(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const nextCard = () => {
    if (currentCardIndex < studySet.cards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
      setShowAnswer({});
    }
  };

  const previousCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(prev => prev - 1);
      setShowAnswer({});
    }
  };

  return (
    <Card className="max-w-4xl mx-auto shadow-none border-none h-fit bg-white mb-8">
      <CardHeader className="flex flex-row items-center justify-between h-fit">
        <div className="flex flex-col w-full items-center justify-center">
          <CardTitle className="text-4xl my-4 font-bold text-[#94b347]">
            Study Deck: <span className="text-slate-500">{studySet.title}</span>
          </CardTitle>
          <div className="flex w-full  flex-col items-start justify-between gap-5 ">
            <p className="text-md text-slate-500 mt-2">
              Created: {new Date(studySet.createdAt).toLocaleDateString()}
            </p>
            <p className="text-md text-slate-500 mt-2">
              {studySet.cards.length} cards
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 h-full">
        <div className="flex items-center justify-between mb-4">
          <Button 
            onClick={previousCard} 
            disabled={currentCardIndex === 0}
            variant="outline"
            className="bg-white border border-[#94b347] rounded-full w-10 h-10 cursor-pointer hover:bg-slate-100 transition-colors"
          >
           <ChevronLeftIcon className="w-4 h-4 text-[#94b347]" />
          </Button>
          <span className="text-slate-500">
            Card {currentCardIndex + 1} of {studySet.cards.length}
          </span>
          <Button 
            onClick={nextCard} 
            disabled={currentCardIndex === studySet.cards.length - 1}
            variant="outline"
            className="bg-white border border-[#94b347] rounded-full w-10 h-10 cursor-pointer hover:bg-slate-100 transition-colors"
          >
            <ChevronRightIcon className="w-4 h-4 text-[#94b347]" /> 
          </Button>
        </div>

        <div
          onClick={() => toggleAnswer(currentCardIndex)}
          className="bg-white border border-[#94b347] p-4 flex flex-col justify-center items-center py-32 rounded-xl  cursor-pointer  transition-colors"
        >
          <h3 className="font-bold text-[#94b347] text-2xl">
            {studySet.cards[currentCardIndex].title}
          </h3>
          {showAnswer[currentCardIndex] && (
            <div className="mt-4 w-full h-px bg-[#94b347]"></div>
          )}
          <div
            className={`mt-5 px-8 mx-5 text-xl text-[#94b347] ${
              showAnswer[currentCardIndex] ? "block" : "hidden"
            }`}
          >
            <p>{studySet.cards[currentCardIndex].content}</p>
          </div>
          {!showAnswer[currentCardIndex] ? (
            <p className=" text-slate-500 mt-2 text-xl">
              Click to reveal answer
            </p>
          ) : (
            <p className=" text-slate-500 mt-2 text-xl">
              Click to hide answer
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 