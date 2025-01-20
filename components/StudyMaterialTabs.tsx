"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/firebase";
import {
  deleteStudyCardSet,
  getAllNotebooks,
  getStudyCards,
  getStudyCardSets,
  saveStudyCard,
  saveStudyCardSet,
  saveStudyGuide,
} from "@/lib/firebase/firestore";
import { Notebook, Page } from "@/types/notebooks";
import { StudyCard, StudyCardSet } from "@/types/studyCards";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Plus,
  PlusCircle,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import FormUpload from "@/components/shared/global/formUpload";
import { RefObject } from "react";
import { Message } from "@/lib/types";
import { fileUpload } from "@/lib/utils";

interface StudyMaterialTabsProps {
  notebookId: string;
  pageId: string;
}

interface StudySetMetadata {
  name: string;
  createdAt: Date;
  sourceNotebooks: {
    notebookId: string;
    notebookTitle: string;
    pages: {
      pageId: string;
      pageTitle: string;
    }[];
  }[];
  cardCount: number;
}

const StudyCards = ({ notebookId, pageId }: StudyMaterialTabsProps) => {
  const [cardSets, setCardSets] = useState<StudyCardSet[]>([]);
  const [selectedSet, setSelectedSet] = useState<StudyCardSet | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [numCards, setNumCards] = useState(5);
  const [showAnswer, setShowAnswer] = useState<Record<string, boolean>>({});
  const [showNotebookModal, setShowNotebookModal] = useState(false);
  const [selectedPages, setSelectedPages] = useState<{
    [notebookId: string]: string[];
  }>({});
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [isLoadingNotebooks, setIsLoadingNotebooks] = useState(false);
  const [expandedNotebooks, setExpandedNotebooks] = useState<Set<string>>(
    new Set()
  );
  const [setName, setSetName] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalSections, setTotalSections] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);


  useEffect(() => {
    setFilesToUpload([...filesToUpload, ...files]);
  }, [files]);

  useEffect(() => {
    loadCardSets();
  }, [pageId]);

  useEffect(() => {
    if (showNotebookModal) {
      loadAllNotebooks();
    }
  }, [showNotebookModal]);

  const loadCardSets = async () => {
    try {
      const sets = await getStudyCardSets(pageId);
      setCardSets(sets);
    } catch (error) {
      console.error("Error loading study card sets:", error);
    }
  };

  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    setFiles: (files: File[]) => void
  ) => {
    fileUpload(event, setFiles);
  };

  const handleSendMessage = () => {
    console.log("Sending message");
  };

  const handleClear = () => {
    setMessages([]);
    setFiles([]);
  };


  const loadAllNotebooks = async () => {
    try {
      setIsLoadingNotebooks(true);
      console.log("Fetching notebooks...");

      // Get reference to notebooks collection
      const notebooksRef = collection(db, "notebooks");

      // Create query to get all notebooks
      const q = query(notebooksRef, orderBy("createdAt", "desc"));

      // Get notebooks
      const querySnapshot = await getDocs(q);

      // Map the documents to Notebook objects
      const fetchedNotebooks: Notebook[] = querySnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
          } as Notebook)
      );

      console.log("Fetched notebooks:", fetchedNotebooks);
      setNotebooks(fetchedNotebooks);
    } catch (error) {
      console.error("Error loading notebooks:", error);
    } finally {
      setIsLoadingNotebooks(false);
    }
  };

  const handlePageSelection = (
    notebookId: string,
    pageId: string,
    isSelected: boolean
  ) => {
    setSelectedPages((prev) => {
      const updatedPages = { ...prev };
      if (!updatedPages[notebookId]) {
        updatedPages[notebookId] = [];
      }

      if (isSelected) {
        updatedPages[notebookId] = [...updatedPages[notebookId], pageId];
      } else {
        updatedPages[notebookId] = updatedPages[notebookId].filter(
          (id) => id !== pageId
        );
      }

      return updatedPages;
    });
  };

  const handleSelectAllPages = (notebookId: string, isSelected: boolean) => {
    setSelectedPages((prev) => {
      const updatedPages = { ...prev };
      const notebook = notebooks.find((n) => n.id === notebookId);

      if (notebook) {
        if (isSelected) {
          updatedPages[notebookId] = notebook.pages.map((p: Page) => p.id);
        } else {
          updatedPages[notebookId] = [];
        }
      }

      return updatedPages;
    });
  };

  const handleGenerateCards = async () => {
    console.log("filesToUpload yalll imma be king of the pirates", filesToUpload);
    // try {
    //   if (!setName.trim()) {
    //     alert("Please enter a name for the study set");
    //     return;
    //   }

    //   setIsGenerating(true);
    //   console.log("Starting card generation with:", {
    //     selectedPages,
    //     numCards,
    //     setName,
    //   });

    //   // Collect metadata about selected notebooks and pages
    //   const sourceNotebooks = await Promise.all(
    //     Object.entries(selectedPages).map(async ([notebookId, pageIds]) => {
    //       const notebook = notebooks.find((n) => n.id === notebookId);
    //       if (!notebook) return null;

    //       return {
    //         notebookId,
    //         notebookTitle: notebook.title,
    //         pages: pageIds.map((pageId) => {
    //           const page = notebook.pages.find((p) => p.id === pageId);
    //           return {
    //             pageId,
    //             pageTitle: page?.title || "Unknown Page",
    //           };
    //         }),
    //       };
    //     })
    //   );

    //   const metadata: StudySetMetadata = {
    //     name: setName,
    //     createdAt: new Date(),
    //     sourceNotebooks: sourceNotebooks.filter(
    //       (n): n is NonNullable<typeof n> => n !== null
    //     ),
    //     cardCount: numCards,
    //   };

    //   const formData = new FormData();
    //   const messageData = {
    //     selectedPages,
    //     numberOfCards: numCards,
    //     metadata,
    //   };

    //   console.log("Sending data to API:", messageData);
    //   formData.append("message", JSON.stringify(messageData));

    //   const response = await fetch("/api/studycards", {
    //     method: "POST",
    //     body: formData,
    //   });

    //   if (!response.ok) {
    //     const errorData = await response.json();
    //     throw new Error(errorData.details || "Failed to generate cards");
    //   }

    //   const data = await response.json();

    //   // Pass metadata to saveStudyCardSet
    //   await saveStudyCardSet(notebookId, pageId, data.cards, metadata);

    //   await loadCardSets();
    //   setShowNotebookModal(false);
    //   setSelectedPages({});
    //   setSetName("");
    // } catch (error) {
    //   console.error("Error generating study cards:", error);
    //   alert(
    //     error instanceof Error ? error.message : "Failed to generate cards"
    //   );
    // } finally {
    //   setIsGenerating(false);
    // }
  };

  const toggleAnswer = (cardIndex: number) => {
    setShowAnswer((prev) => ({
      ...prev,
      [cardIndex]: !prev[cardIndex],
    }));
  };

  const handleDeleteSet = async (setId: string) => {
    try {
      if (window.confirm("Are you sure you want to delete this study set?")) {
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

  const toggleNotebookExpansion = (notebookId: string) => {
    setExpandedNotebooks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(notebookId)) {
        newSet.delete(notebookId);
      } else {
        newSet.add(notebookId);
      }
      return newSet;
    });
  };

  const isNotebookFullySelected = (notebookId: string, pages: Page[]) => {
    return pages.every((page) => selectedPages[notebookId]?.includes(page.id));
  };

  const handleNotebookSelection = (
    notebookId: string,
    pages: Page[],
    isSelected: boolean
  ) => {
    setSelectedPages((prev) => ({
      ...prev,
      [notebookId]: isSelected ? pages.map((p) => p.id) : [],
    }));
  };

  const renderNotebookList = () => {
    if (isLoadingNotebooks) {
      return (
        <div className="flex w-full items-center justify-center p-4">
          <RefreshCw className="h-6 w-6 animate-spin" />
        </div>
      );
    }

    if (notebooks.length === 0) {
      return (
        <div className="text-center p-4 text-gray-500">
          No notebooks found. Please create a notebook first.
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {notebooks.map((notebook) => (
          <div key={notebook.id} className="border rounded-lg">
            <div className="flex items-center justify-between p-3 bg-slate-50">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleNotebookExpansion(notebook.id)}
                  className="p-1 hover:bg-slate-200 rounded"
                >
                  {expandedNotebooks.has(notebook.id) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                <span className="font-medium">{notebook.title}</span>
              </div>
              <button
                onClick={() =>
                  handleNotebookSelection(
                    notebook.id,
                    notebook.pages,
                    !isNotebookFullySelected(notebook.id, notebook.pages)
                  )
                }
                className={`flex items-center gap-1 px-2 py-1 rounded ${
                  isNotebookFullySelected(notebook.id, notebook.pages)
                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                    : "bg-slate-100 hover:bg-slate-200"
                }`}
              >
                {isNotebookFullySelected(notebook.id, notebook.pages) ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                <span className="text-sm">
                  {isNotebookFullySelected(notebook.id, notebook.pages)
                    ? "Added"
                    : "Add All"}
                </span>
              </button>
            </div>

            {expandedNotebooks.has(notebook.id) && notebook.pages && (
              <div className="pl-8 pr-3 py-2 space-y-1 border-t">
                {notebook.pages.map((page) => (
                  <div
                    key={page.id}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-sm">{page.title}</span>
                    <button
                      onClick={() =>
                        handlePageSelection(
                          notebook.id,
                          page.id,
                          !selectedPages[notebook.id]?.includes(page.id)
                        )
                      }
                      className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${
                        selectedPages[notebook.id]?.includes(page.id)
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-slate-100 hover:bg-slate-200"
                      }`}
                    >
                      {selectedPages[notebook.id]?.includes(page.id) ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Plus className="h-3 w-3" />
                      )}
                      <span>
                        {selectedPages[notebook.id]?.includes(page.id)
                          ? "Added"
                          : "Add"}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className=" shadow-none  w-full bg-white flex flex-col gap-4 p-4 items-center justify-center">
      <CardHeader className="flex flex-col items-center justify-center">
        <CardTitle className="text-2xl font-bold text-[#94b347]">
          Study Cards
        </CardTitle>
        <CardDescription>Create and review study card sets</CardDescription>
      </CardHeader>
      <CardContent className="w-full flex flex-col items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-4 mb-6">
          <Button
            onClick={() => setShowNotebookModal(true)}
            className="hover:text-[#94b347] hover:bg-white hover:border-[#a5c05f] rounded-2xl text-slate-600 bg-white border border-slate-400 shadow-none"
          >
            <BookOpen className="mr-2 h-4 w-4" />
            Select Notes to Study
          </Button>
        </div>

        {showNotebookModal && (
          <div className="fixed p-6 inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Create Study Set</h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Study Set Name
                  </label>
                  <Input
                    type="text"
                    value={setName}
                    onChange={(e) => setSetName(e.target.value)}
                    placeholder="Enter a name for this study set"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Cards
                  </label>
                  <select
                    value={numCards}
                    onChange={(e) => setNumCards(Number(e.target.value))}
                    className="w-full border rounded-md p-2"
                  >
                    {[3, 5, 10, 15, 20, 25, 30].map((num) => (
                      <option key={num} value={num}>
                        {num} cards
                      </option>
                    ))}
                  </select>
                </div>

                <div>

                <FormUpload 
                messages={messages}
                files={files}
                showUpload={showUpload}
                fileInputRef={fileInputRef as RefObject<HTMLInputElement>}
                handleFileUpload={(event) => handleFileUpload(event, setFiles)}
                handleSendMessage={handleSendMessage}
                handleClear={handleClear}
                setShowUpload={setShowUpload}
              />
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Notes
                  </label>
                  {renderNotebookList()}
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowNotebookModal(false);
                    setSelectedPages({});
                    setSetName("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerateCards}
                  disabled={
                    isGenerating ||
                    (Object.keys(selectedPages).length === 0 &&
                      !setName.trim() ||
                      filesToUpload.length === 0)
                  }
                >
                  {isGenerating ? "Generating..." : "Generate Cards"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {!selectedSet ? (
          // Show list of card sets
          <div className="space-y-2 w-full max-w-lg ">
            {cardSets.map((set) => (
              <div key={set.id} className="flex items-center gap-2 p-2 w-full ">
                <Button
                  onClick={() => setSelectedSet(set)}
                  variant="outline"
                  className="w-full justify-between hover:bg-slate-50 text-slate-700 border rounded-md  bg-white p-2 shadow-none"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    <span>{set.title}</span>
                  </div>
                  <span className="text-sm text-slate-400">
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
              <Button onClick={() => setSelectedSet(null)} variant="ghost">
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
              {selectedSet.cards.map(
                (card: { title: string; content: string }, index: number) => (
                  <div
                    key={index}
                    onClick={() => toggleAnswer(index)}
                    className="bg-secondary p-4 rounded cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <h3 className="font-bold">{card.title}</h3>
                    <div
                      className={`mt-2 ${
                        showAnswer[index] ? "block" : "hidden"
                      }`}
                    >
                      <p>{card.content}</p>
                    </div>
                    {!showAnswer[index] && (
                      <p className="text-sm text-slate-500 mt-2">
                        Click to reveal answer
                      </p>
                    )}
                  </div>
                )
              )}
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
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
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
  );
};

export default function StudyMaterialTabs({
  notebookId,
  pageId,
}: StudyMaterialTabsProps) {
  return (
    <div className="flex flex-col w-full mx-auto">
      <div className="flex flex-row items-center justify-center">
        <h1 className="text-xl font-semibold text-[#94b347] mb-8 mt-2">
          Study Material
        </h1>
      </div>
      <Tabs defaultValue="studycards" className="w-full  mx-auto">
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
  );
}
