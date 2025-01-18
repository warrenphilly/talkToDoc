"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle, RefreshCw, Trash2, BookOpen, ArrowLeft } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { getStudyCards, saveStudyCard, saveStudyGuide, getStudyCardSets, saveStudyCardSet, deleteStudyCardSet } from "@/lib/firebase/firestore"
import { StudyCard, StudyCardSet } from "@/types/studyCards"

interface StudyMaterialTabsProps {
  notebookId: string;
  pageId: string;
}

const StudyCards = ({ notebookId, pageId }: StudyMaterialTabsProps) => {
  const [cardSets, setCardSets] = useState<StudyCardSet[]>([]);
  const [selectedSet, setSelectedSet] = useState<StudyCardSet | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [numCards, setNumCards] = useState(5);
  const [showAnswer, setShowAnswer] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadCardSets();
  }, [pageId]);

  const loadCardSets = async () => {
    try {
      const sets = await getStudyCardSets(pageId);
      setCardSets(sets);
    } catch (error) {
      console.error("Error loading study card sets:", error);
    }
  };

  const handleGenerateCards = async () => {
    try {
      setIsGenerating(true);
      const formData = new FormData();
      formData.append('message', JSON.stringify({
        notebookId,
        pageId,
        numberOfCards: numCards,
      }));

      const response = await fetch('/api/studycards', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to generate cards');

      const data = await response.json();
      
      // Save the card set to the database
      await saveStudyCardSet(notebookId, pageId, data.cards);
      await loadCardSets();
      
    } catch (error) {
      console.error("Error generating study cards:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleAnswer = (cardIndex: number) => {
    setShowAnswer(prev => ({
      ...prev,
      [cardIndex]: !prev[cardIndex]
    }));
  };

  const handleDeleteSet = async (setId: string) => {
    try {
      if (window.confirm('Are you sure you want to delete this study set?')) {
        await deleteStudyCardSet(notebookId, pageId, setId);
        await loadCardSets(); // Reload the list after deletion
        if (selectedSet?.id === setId) {
          setSelectedSet(null); // Clear selection if deleted set was selected
        }
      }
    } catch (error) {
      console.error("Error deleting study card set:", error);
    }
  };

  return (
    <Card className="bg-slate-50 flex flex-col gap-4 p-4 items-center justify-center">
      <CardHeader className="flex flex-col items-center justify-center">
        <CardTitle className="text-2xl font-bold text-[#94b347]">Study Cards</CardTitle>
        <CardDescription>Create and review study card sets</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Generate</span>
            <select
              value={numCards}
              onChange={(e) => setNumCards(Number(e.target.value))}
              className="border rounded p-1"
            >
              {[3, 5, 10, 15, 20].map(num => (
                <option key={num} value={num}>{num} cards</option>
              ))}
            </select>
          </div>
          <Button 
            onClick={handleGenerateCards}
            className="hover:text-[#94b347] hover:bg-slate-100 hover:border-[#a5c05f] rounded-full text-slate-600 bg-slate-100 border border-slate-400 shadow-none "
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <PlusCircle className="mr-2 h-4 w-4" />
                Generate New Set
              </>
            )}
          </Button>
        </div>

        {!selectedSet ? (
          // Show list of card sets
          <div className="space-y-2">
            {cardSets.map((set) => (
              <div key={set.id} className="flex items-center gap-2">
                <Button
                  onClick={() => setSelectedSet(set)}
                  variant="outline"
                  className="w-full justify-between hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    <span>{set.title}</span>
                  </div>
                  <span className="text-sm text-slate-500">
                    {set.cards.length} cards
                  </span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSet(set.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          // Show selected set's cards
          <div>
            <div className="flex items-center justify-between mb-4">
              <Button
                onClick={() => setSelectedSet(null)}
                variant="ghost"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Sets
              </Button>
              <Button
                variant="ghost"
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => handleDeleteSet(selectedSet.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Set
              </Button>
            </div>
            <div className="space-y-2">
              {selectedSet.cards.map((card: { title: string; content: string; }, index: number) => (
                <div
                  key={index}
                  onClick={() => toggleAnswer(index)}
                  className="bg-secondary p-4 rounded cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <h3 className="font-bold">{card.title}</h3>
                  <div className={`mt-2 ${showAnswer[index] ? 'block' : 'hidden'}`}>
                    <p>{card.content}</p>
                  </div>
                  {!showAnswer[index] && (
                    <p className="text-sm text-slate-500 mt-2">
                      Click to reveal answer
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const StudyGuide = ({ notebookId, pageId }: StudyMaterialTabsProps) => {
  const [content, setContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const handleSaveGuide = async () => {
    try {
      await saveStudyGuide(notebookId, pageId, content);
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving study guide:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Study Guide</CardTitle>
        <CardDescription>Your personalized study guide</CardDescription>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[200px]"
            />
            <div className="flex gap-2">
              <Button onClick={handleSaveGuide}>Save Guide</Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="bg-secondary p-4 rounded">
            {content ? (
              <p>{content}</p>
            ) : (
              <p className="text-muted-foreground">No study guide available.</p>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={() => setIsEditing(true)} className="w-full">
          {content ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4" /> Edit Study Guide
            </>
          ) : (
            <>
              <PlusCircle className="mr-2 h-4 w-4" /> Create Study Guide
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

export default function StudyMaterialTabs({ notebookId, pageId }: StudyMaterialTabsProps) {
  return (
    <div className="flex flex-col w-full max-w-3xl mx-auto">
      <div className="flex flex-row items-center justify-center">
        <h1 className="text-xl font-semibold text-[#94b347] mb-8 mt-2">Study Material</h1>
      </div>
      <Tabs defaultValue="studycards" className="w-full max-w-3xl mx-auto">
        <TabsList className="grid w-full grid-cols-2 bg-slate-100 rounded-md">
          <TabsTrigger value="studycards">Study Cards</TabsTrigger>
        <TabsTrigger value="studyguide">Study Guide</TabsTrigger>
      </TabsList>
      <TabsContent value="studycards">
        <StudyCards notebookId={notebookId} pageId={pageId} />
      </TabsContent>
      <TabsContent value="studyguide">
        <StudyGuide notebookId={notebookId} pageId={pageId} />
      </TabsContent>
    </Tabs>
    </div>
  )
}

