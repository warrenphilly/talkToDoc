import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { updateStudyCardSetTitle } from "@/lib/firebase/firestore";
import { StudyCardSet } from "@/types/studyCards";
import {
  Check,
  ChevronLeftIcon,
  ChevronRightIcon,
  Pencil,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

interface StudyCardCarouselProps {
  studySet: StudyCardSet;
  onTitleUpdate?: (newTitle: string) => void;
  onCardChange?: (index: number) => void;
}

export function StudyCardCarousel({
  studySet,
  onTitleUpdate,
  onCardChange,
}: StudyCardCarouselProps) {
  const [showAnswer, setShowAnswer] = useState<{ [key: number]: boolean }>({});
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(studySet.metadata?.name);
  const [currentTitle, setCurrentTitle] = useState(studySet.metadata?.name);

  useEffect(() => {
    console.log("Current study set:", studySet);
    console.log("Current cards:", studySet?.cards);
    console.log("Current card:", studySet?.cards[currentCardIndex]);
    setCurrentTitle(studySet.metadata?.name);
    setEditedTitle(studySet.metadata?.name);
  }, [studySet, currentCardIndex]);

  if (!studySet?.cards || studySet.cards.length === 0) {
    return (
      <Card className="max-w-4xl mx-auto my-0 py-0 shadow-none border-none h-fit bg-white mb-8">
        <CardContent className="flex items-center justify-center p-8">
          <p className="text-slate-500">
            No cards available in this study set.
          </p>
        </CardContent>
      </Card>
    );
  }

  const toggleAnswer = (index: number) => {
    setShowAnswer((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const nextCard = () => {
    if (currentCardIndex < studySet.cards.length - 1) {
      const newIndex = currentCardIndex + 1;
      setCurrentCardIndex(newIndex);
      setShowAnswer({});
      onCardChange?.(newIndex);
    }
  };

  const previousCard = () => {
    if (currentCardIndex > 0) {
      const newIndex = currentCardIndex - 1;
      setCurrentCardIndex(newIndex);
      setShowAnswer({});
      onCardChange?.(newIndex);
    }
  };

  const handleSaveTitle = async () => {
    if (editedTitle.trim() === "") {
      toast.error("Title cannot be empty");
      return;
    }

    try {
      await updateStudyCardSetTitle(studySet.id, editedTitle.trim());
      setIsEditing(false);
      setCurrentTitle(editedTitle.trim());
      if (onTitleUpdate) {
        onTitleUpdate(editedTitle.trim());
      }
      toast.success("Title updated successfully");
    } catch (error) {
      console.error("Error updating title:", error);
      setEditedTitle(currentTitle);
      setIsEditing(false);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update title. Please try again."
      );
    }
  };

  const handleCancelEdit = () => {
    setEditedTitle(currentTitle);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveTitle();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  return (
    <Card className="max-w-4xl mx-auto my-0 py-0 shadow-none border-none h-fit bg-white mb-8">
      <CardHeader className="flex flex-row py-0 my-0 items-center justify-between h-fit">
        <div className="flex flex-col w-full items-center justify-center ">
          <div className="flex flex-row items-center justify-center w-full ">
            <CardTitle className="text-2xl  text-[#94b347] flex items-center gap-2 ">
             
              {isEditing ? (
                 <div className="flex items-center gap-2">
                 <input
                   type="text"
                   value={editedTitle}
                   onChange={(e) => setEditedTitle(e.target.value)}
                   className="border border-slate-300 rounded-md px-2 py-1 text-[#94b347] focus:outline-none focus:border-[#94b347] text-base sm:text-lg font-semibold"
                   autoFocus
                 />
                 <button
                   onClick={handleSaveTitle}
                   className="p-1 hover:bg-green-100 rounded-full"
                 >
                   <Check className="h-4 w-4 text-green-600" />
                 </button>
                 <button
                   onClick={handleCancelEdit}
                   className="p-1 hover:bg-red-100 rounded-full"
                 >
                   <X className="h-4 w-4 text-red-600" />
                 </button>
                </div>
              ) : (
                  <>
                Study Deck:{" "}
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 font-bold">{currentTitle}</span>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1 hover:bg-slate-100 rounded-full"
                  >
                    <Pencil className="h-4 w-4 text-slate-400 hover:text-[#94b347]" />
                  </button>
                    </div>
                    </>
              )}
              
            </CardTitle>
          </div>

          <div className="flex w-full flex-row items-center justify-center gap-2 my-4  ">
            <p className="text-md text-slate-500 ">
              Created: {new Date(studySet.createdAt).toLocaleDateString()}
            </p>
            <div className="w-px h-full bg-slate-600 border border-slate-600"></div>
            <p className="text-md text-slate-500  ">
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

        {studySet.cards[currentCardIndex] && (
          <div
            onClick={() => toggleAnswer(currentCardIndex)}
            className="bg-white shadow-lg border border-slate-100 h-fit  min-h-48 md:min-h-72  w-full p-4 flex flex-col justify-center items-center  rounded-xl cursor-pointer transition-colors"
          >
            <h3 className="font-bold text-[#94b347] text-lg md:text-2xl text-center" >
              {studySet.cards[currentCardIndex].title}
            </h3>
            {showAnswer[currentCardIndex] && (
              <div className="mt-4 w-full h-px bg-[#94b347]"></div>
            )}
            <div
              className={`mt-5 text-center  mx-5 text-md md:text-xl text-[#94b347] ${
                showAnswer[currentCardIndex] ? "block" : "hidden"
              }`}
            >
              <p>{studySet.cards[currentCardIndex].content}</p>
            </div>
            <p className="text-slate-500 mt-4 md:mt-10 text-sm md:text-lg">
              {!showAnswer[currentCardIndex]
                ? "Click to reveal answer"
                : "Click to hide answer"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
