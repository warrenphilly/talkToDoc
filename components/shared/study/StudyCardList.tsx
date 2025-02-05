import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudyCardSet } from "@/types/studyCards";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, X } from "lucide-react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase";
import { toast } from "react-hot-toast";

interface StudyCardListProps {
  studySet: StudyCardSet;
  onUpdate: (updatedStudySet: StudyCardSet) => void;
}

export function StudyCardList({ studySet, onUpdate }: StudyCardListProps) {
  const [showListAnswer, setShowListAnswer] = useState<{ [key: number]: boolean }>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardContent, setNewCardContent] = useState("");

  const toggleListAnswer = (index: number) => {
    setShowListAnswer(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleAddCard = async () => {
    try {
      if (!newCardTitle.trim() || !newCardContent.trim()) return;

      const studyCardRef = doc(db, "studyCardSets", studySet.id);
      const newCard = {
        front: newCardTitle,
        back: newCardContent
      };
      
      const updatedCards = [
        ...studySet.cards.map((card) => {
          return {
            front: card.front,
            back: card.back
          } as { front: string; back: string };
        }),
        newCard
      ];

      await updateDoc(studyCardRef, {
        cards: updatedCards,
        updatedAt: serverTimestamp(),
      });

      onUpdate({
        ...studySet,
        cards: updatedCards,
      });

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
            All Study Cards
          </CardTitle>
          <Button
              onClick={() => setShowAddModal(true)}
              className="bg-white border border-slate-400 text-slate-600 hover:bg-white hover:border-[#94b347] hover:text-[#94b347] rounded-full"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Add New Card
            </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {studySet.cards.map((card, index) => (
              <div
                key={index}
                className="bg-white border border-slate-200 p-4 rounded hover:bg-slate-50 transition-colors"
              >
                <h3 className="font-semibold text-[#94b347]">
                  {index + 1}. {card.front}
                </h3>
                <div className={`mt-2 text-slate-600 ${showListAnswer[index] ? 'block' : 'hidden'}`}>
                  <p>{card.back}</p>
                </div>
                <button 
                  onClick={() => toggleListAnswer(index)}
                  className="text-sm text-slate-500 mt-2 hover:text-[#94b347]"
                >
                  {showListAnswer[index] ? 'Hide Answer' : 'Show Answer'}
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-6">
            
          </div>
        </CardContent>
      </Card>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-700">Add New Study Card</h3>
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