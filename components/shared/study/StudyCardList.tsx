import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/firebase";
import { StudyCardSet } from "@/types/studyCards";
import {
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { Plus, PlusCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

interface StudyCardListProps {
  studySet: StudyCardSet;
  onUpdate: (updatedStudySet: StudyCardSet) => void;
  activeCardIndex?: number;
}

export function StudyCardList({
  studySet,
  onUpdate,
  activeCardIndex,
}: StudyCardListProps) {
  const [showListAnswer, setShowListAnswer] = useState<{
    [key: number]: boolean;
  }>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardContent, setNewCardContent] = useState("");
  const [localStudySet, setLocalStudySet] = useState(studySet);

  // Listen to real-time updates from Firestore
  useEffect(() => {
    if (!studySet.id) return;

    const studyCardRef = doc(db, "studyCards", studySet.id);
    const unsubscribe = onSnapshot(
      studyCardRef,
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          const updatedSet = {
            ...studySet,
            ...data,
            cards: data.cards || [],
            updatedAt:
              data.updatedAt?.toDate?.().toISOString() ||
              new Date().toISOString(),
          };
          setLocalStudySet(updatedSet);
          onUpdate(updatedSet);
        }
      },
      (error) => {
        console.error("Error listening to study set updates:", error);
      }
    );

    return () => unsubscribe();
  }, [studySet.id]);

  // Update local state when studySet prop changes
  useEffect(() => {
    setLocalStudySet(studySet);
  }, [studySet]);

  const toggleListAnswer = (index: number) => {
    setShowListAnswer((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleAddCard = async () => {
    try {
      if (!newCardTitle.trim() || !newCardContent.trim()) return;

      const studyCardRef = doc(db, "studyCards", studySet.id);
      const newCard = {
        title: newCardTitle,
        content: newCardContent,
      };

      const updatedCards = [
        ...localStudySet.cards.map((card) => ({
          title: card.title,
          content: card.content,
        })),
        newCard,
      ];

      // Update Firestore
      await updateDoc(studyCardRef, {
        cards: updatedCards,
        updatedAt: serverTimestamp(),
      });

      // Reset form and close modal
      setNewCardTitle("");
      setNewCardContent("");
      setShowAddModal(false);

      toast.success("Card added successfully!");
    } catch (error) {
      console.error("Error adding card:", error);
      toast.error("Failed to add card");
    }
  };

  return (
    <>
      <Card className="max-w-4xl mx-auto shadow-none border-none h-fit bg-white">
        <CardHeader className="flex flex-row  justify-between items-center">
          <CardTitle className="text-2xl font-bold text-slate-600">
            All Study Cards ({localStudySet.cards.length})
          </CardTitle>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-white border border-slate-600 text-slate-600 hover:bg-white hover:border-[#94b347] hover:text-[#94b347] rounded-full md:px-4 shadow-none  px-2"
          >
            <Plus className="w-24 h-24 md:w-4 md:h-4 md:mr-2" />
            <span className="hidden md:block">Add New Card</span>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {localStudySet.cards.map((card, index) => (
              <div
                key={`${localStudySet.id}-card-${index}-${card.title}`}
                className={`bg-white border rounded-xl p-4 hover:bg-slate-50 transition-colors ${
                  activeCardIndex === index
                    ? "border-[#94b347] border-1 shadow-lg"
                    : "border-slate-100 "
                }`}
              >
                <h3 className="font-semibold text-[#94b347]">
                  {index + 1}. {card.title}
                </h3>
                <div
                  className={`mt-2 text-slate-600 ${
                    showListAnswer[index] ? "block" : "hidden"
                  }`}
                >
                  <p>{card.content}</p>
                </div>
                <button
                  onClick={() => toggleListAnswer(index)}
                  className="text-sm text-slate-500 mt-2 hover:text-[#94b347]"
                >
                  {showListAnswer[index] ? "Hide Answer" : "Show Answer"}
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-700">
                Add New Study Card
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddModal(false);
                  setNewCardTitle("");
                  setNewCardContent("");
                }}
                className="text-slate-500 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Question/Title
                </label>
                <Input
                  value={newCardTitle}
                  onChange={(e) => setNewCardTitle(e.target.value)}
                  placeholder="Enter the question or concept"
                  className="w-full border-slate-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Answer/Content
                </label>
                <Textarea
                  value={newCardContent}
                  onChange={(e) => setNewCardContent(e.target.value)}
                  placeholder="Enter the answer or explanation"
                  className="w-full border-slate-300"
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewCardTitle("");
                    setNewCardContent("");
                  }}
                  className="rounded-full bg-white border border-red-400 text-red-400 hover:bg-red-100 hover:border-red-400 hover:text-red-500"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddCard}
                  disabled={!newCardTitle.trim() || !newCardContent.trim()}
                  className="rounded-full bg-white border border-slate-400 text-slate-600 hover:bg-white hover:border-[#94b347] hover:text-[#94b347]"
                >
                  Add Card
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
