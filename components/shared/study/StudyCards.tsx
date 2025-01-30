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
import { StudyCard, StudyCardSet, StudySetMetadata } from "@/types/studyCards";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  PlusCircle,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, MutableRefObject } from "react";
import { toast } from "react-hot-toast";

import FormUpload from "@/components/shared/study/formUpload";
import StudyGuide from "@/components/shared/study/StudyGuide";
import { Separator } from "@/components/ui/separator";
import { storage } from "@/firebase";
import { Message } from "@/lib/types";
import { fileUpload } from "@/lib/utils";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import { RefObject } from "react";
import CreateCardModal from "./CreateCardModal";

interface StudyMaterialTabsProps {
  notebookId: string;
  pageId: string;
}

export default function StudyCards({
  notebookId,
  pageId,
}: StudyMaterialTabsProps) {
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
  const fileInputRef = useRef<HTMLInputElement>(null) as MutableRefObject<HTMLInputElement>;
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListTitle, setEditingListTitle] = useState("");

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
    try {
      if (!setName.trim()) {
        alert("Please enter a name for the study set");
        return;
      }

      // Check if we have either uploaded files or selected pages
      if (
        filesToUpload.length === 0 &&
        Object.keys(selectedPages).length === 0
      ) {
        alert("Please either upload files or select notebook pages");
        return;
      }

      setIsGenerating(true);
      const allText: string[] = [];

      // Process uploaded files if they exist
      let uploadedDocs = [];
      if (filesToUpload.length > 0) {
        for (const file of filesToUpload) {
          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch("/api/convert", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`Failed to convert file: ${file.name}`);
          }

          const data = await response.json();
          if (data.text) {
            allText.push(`# ${file.name}\n\n${data.text}`);
          }
        }

        // Save uploaded files to storage
        if (allText.length > 0) {
          const combinedText = allText.join("\n\n---\n\n");
          const timestamp = new Date().getTime();
          const markdownPath = `studydocs/${notebookId}/${pageId}_${timestamp}.md`;

          const storageRef = ref(storage, markdownPath);
          await uploadString(storageRef, combinedText, "raw", {
            contentType: "text/markdown",
            customMetadata: {
              notebookId,
              pageId,
              setName,
              timestamp: timestamp.toString(),
            },
          });

          const downloadUrl = await getDownloadURL(storageRef);
          uploadedDocs.push({
            url: downloadUrl,
            path: markdownPath,
            name: setName,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Prepare metadata for study card generation
      const sourceNotebooks = await Promise.all(
        Object.entries(selectedPages).map(async ([notebookId, pageIds]) => {
          const notebook = notebooks.find((n) => n.id === notebookId);
          if (!notebook) return null;

          return {
            notebookId,
            notebookTitle: notebook.title,
            pages: pageIds.map((pageId) => {
              const page = notebook.pages.find((p) => p.id === pageId);
              return {
                pageId,
                pageTitle: page?.title || "Unknown Page",
              };
            }),
          };
        })
      );

      const metadata: StudySetMetadata = {
        name: setName,
        createdAt: new Date(),
        sourceNotebooks: sourceNotebooks.filter(
          (n): n is NonNullable<typeof n> => n !== null
        ),
        cardCount: numCards,
        
      };

      // Send to API for card generation
      const formData = new FormData();
      const messageData = {
        selectedPages:
          Object.keys(selectedPages).length > 0 ? selectedPages : undefined,
        numberOfCards: numCards,
        metadata,
        uploadedDocs: uploadedDocs.length > 0 ? uploadedDocs : undefined,
      };

      formData.append("message", JSON.stringify(messageData));

      const response = await fetch("/api/studycards", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Failed to generate cards");
      }

      const data = await response.json();

      // Save study card set and update notebook
      await saveStudyCardSet(notebookId, pageId, data.cards, metadata);

      // Update the page with study docs references if we have uploaded files
      if (uploadedDocs.length > 0) {
        const notebookRef = doc(db, "notebooks", notebookId);
        const notebookSnap = await getDoc(notebookRef);

        if (notebookSnap.exists()) {
          const notebook = notebookSnap.data() as Notebook;
          const pageIndex = notebook.pages.findIndex((p) => p.id === pageId);

          if (pageIndex !== -1) {
            if (!notebook.pages[pageIndex].studyDocs) {
              notebook.pages[pageIndex].studyDocs = [];
            }
            notebook.pages[pageIndex].studyDocs.push(...uploadedDocs);

            await updateDoc(notebookRef, {
              pages: notebook.pages,
            });
          }
        }
      }

      // Cleanup and refresh
      await loadCardSets();
      setShowNotebookModal(false);
      setSelectedPages({});
      setSetName("");
      setFilesToUpload([]);
      setFiles([]);
      setMessages([]);
    } catch (error) {
      console.error("Error generating study cards:", error);
      alert(
        error instanceof Error ? error.message : "Failed to generate cards"
      );
    } finally {
      setIsGenerating(false);
    }
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

  const handleUpdateTitle = async (setId: string, newTitle: string) => {
    try {
      const setRef = doc(db, "studyCardSets", setId);
      await updateDoc(setRef, {
        title: newTitle,
        updatedAt: serverTimestamp(),
      });
      setEditingListId(null);
      await loadCardSets(); // Refresh the list
    } catch (error) {
      console.error("Error updating title:", error);
      toast.error("Failed to update title");
    }
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
      <div className="space-y-2 p-2 ">
        {notebooks.map((notebook) => (
          <div
            key={notebook.id}
            className="border rounded-xl  p-1  bg-white border-slate-400"
          >
            <div className="flex items-center justify-between p-3 bg-white text-slate-600">
              <div className="flex items-center gap-2 ">
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
                    : "bg-white hover:bg-slate-100"
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
              <div className="pl-8 pr-3 py-2 space-y-1 border-t text-slate-600">
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
                          : "bg-white hover:bg-slate-200"
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
    <Card className=" shadow-none border-none w-full bg-white flex flex-col gap-4 p-4 items-center justify-center">
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

        <CreateCardModal
          showNotebookModal={showNotebookModal}
          setShowNotebookModal={setShowNotebookModal}
          setName={setName}
          setSetName={setSetName}
          numCards={numCards}
          setNumCards={setNumCards}
          messages={messages}
          files={files}
          showUpload={showUpload}
          fileInputRef={fileInputRef}
          handleFileUpload={handleFileUpload}
          handleSendMessage={handleSendMessage}
          handleClear={handleClear}
          setShowUpload={setShowUpload}
          setFiles={setFiles}
          renderNotebookList={renderNotebookList}
          handleGenerateCards={handleGenerateCards}
          isGenerating={isGenerating}
          selectedPages={selectedPages}
          filesToUpload={filesToUpload}
        />

        {!selectedSet ? (
          // Show list of card sets
          <div className="w-full max-w-2xl mx-auto">
            {cardSets.map((set) => (
              <div
                key={set.id}
                className="flex flex-row justify-between items-center"
              >
                <Card className="bg-white cursor-pointer hover:bg-gray-50 transition-colors w-full shadow-none border border-gray-400">
                  <CardContent className="py-2 my-0">
                    {editingListId === set.id ? (
                      // Edit mode
                      <div className="flex-1 flex items-center gap-2">
                        <Input
                          value={editingListTitle}
                          onChange={(e) => setEditingListTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleUpdateTitle(set.id, editingListTitle);
                            } else if (e.key === "Escape") {
                              setEditingListId(null);
                            }
                          }}
                          className="text-slate-700"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              handleUpdateTitle(set.id, editingListTitle);
                            }}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingListId(null)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // View mode
                      <div className="items-center flex flex-row justify-between">
                        <div className="flex flex-row items-center">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingListId(set.id);
                              setEditingListTitle(set.title);
                            }}
                            className="text-slate-500 text-sm bg-white shadow-none rounded-full hover:bg-white hover:text-[#94b347]"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <h3
                            className="font-medium text-slate-700 hover:text-[#94b347] cursor-pointer"
                            onClick={() => setSelectedSet(set)}
                          >
                            {set.title}
                          </h3>
                          <p className="text-sm text-slate-500 mx-5">
                            {new Date(set.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex flex-row justify-end items-center gap-2">
                          <p className="text-sm text-slate-500">
                            Cards: {set.cards.length}
                          </p>
                          <Separator
                            orientation="vertical"
                            className="h-full bg-slate-300"
                          />
                          <Button
                            variant="ghost"
                            className="text-red-500 hover:text-red-600 bg-white hover:bg-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSet(set.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}

            {cardSets.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No study card sets found. Create one to get started!
              </div>
            )}
          </div>
        ) : (
          // Show selected set's cards
          <div className="w-full">
            <div className="flex items-center justify-between mb-4 max-w-7xl mx-auto">
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
            <div className="space-y-2 w-full ">
              {selectedSet.cards.map(
                (card: { title: string; content: string }, index: number) => (
                  <div
                    key={index}
                    onClick={() => toggleAnswer(index)}
                    className="bg-white border border-slate-400  p-4 rounded cursor-pointer hover:bg-slate-100 transition-colors w-full  max-w-4xl mx-auto"
                  >
                    <h3 className="font-bold text-[#94b347]">{card.title}</h3>
                    <div
                      className={`mt-2 text-slate-600 ${
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
}
