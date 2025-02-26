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

import { Notebook, Page } from "@/types/notebooks";
import { StudyCard, StudyCardSet, StudySetMetadata } from "@/types/studyCards";

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
  Trash,
  Trash2,
  X,
} from "lucide-react";
import { MutableRefObject, useEffect, useRef, useState } from "react";

import { Message } from "@/lib/types";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { saveStudyCardSet } from "@/lib/firebase/firestore";
import {
  handleClear,
  handleDeleteSet,
  handleFileUpload,
  handleGenerateCards,
  handleNotebookSelection,
  handlePageSelection,
  handleSelectAllPages,
  handleUpdateTitle,
  isNotebookFullySelected,
  loadAllNotebooks,
  loadCardSets,
  toggleAnswer,
  toggleNotebookExpansion,
} from "@/lib/utils/studyCardsUtil";
import { useUser } from "@clerk/nextjs";
import { toast } from "react-hot-toast";
import CreateCardModal from "./CreateCardModal";
import { StudyCardCarousel } from "./StudyCardCarousel";
import { StudyCardList } from "./StudyCardList";

interface StudyMaterialTabsProps {
  notebookId: string;
  pageId: string;
}

const getSelectedPagesData = async (
  selectedPages: { [notebookId: string]: string[] },
  notebooks: Notebook[]
) => {
  const selectedPagesData = [];

  for (const notebookId in selectedPages) {
    const notebook = notebooks.find((n) => n.id === notebookId);
    if (notebook) {
      const selectedPageIds = selectedPages[notebookId];
      const selectedPagesInNotebook = notebook.pages
        .filter((page) => selectedPageIds.includes(page.id))
        .map((page) => ({
          notebookId: notebook.id,
          notebookTitle: notebook.title,
          pageId: page.id,
          pageTitle: page.title,
          content: page.content || "",
        }));
      selectedPagesData.push(...selectedPagesInNotebook);
    }
  }

  return selectedPagesData;
};

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
  const fileInputRef = useRef<HTMLInputElement>(
    null
  ) as MutableRefObject<HTMLInputElement>;
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListTitle, setEditingListTitle] = useState("");
  const { user } = useUser();
  const clerkUserId = user?.id || "";

  useEffect(() => {
    setFilesToUpload([...filesToUpload, ...files]);
  }, [files]);

  // Create a memoized version of loadCardSets with the correct signature
  const loadCardsetsWrapper = loadCardSets(pageId, setCardSets, clerkUserId);

  useEffect(() => {
    loadCardsetsWrapper();
  }, [pageId]);

  useEffect(() => {
    if (showNotebookModal && user) {
      loadAllNotebooks(setIsLoadingNotebooks, setNotebooks, user);
    }
  }, [showNotebookModal, user]);

  const handlePageSelect = (
    notebookId: string,
    pageId: string,
    isSelected: boolean
  ) => {
    setSelectedPages((prev) =>
      handlePageSelection(notebookId, pageId, isSelected, prev)
    );
  };

  const handleAllPagesSelect = (notebookId: string, isSelected: boolean) => {
    setSelectedPages((prev) =>
      handleSelectAllPages(notebookId, isSelected, notebooks, prev)
    );
  };

  const handleStudySetUpdate = (updatedStudySet: StudyCardSet) => {
    setSelectedSet(updatedStudySet);
  };

  const handleGenerateCards = async () => {
    try {
      if (!setName.trim()) {
        toast.error("Please enter a set name");
        return;
      }

      setIsGenerating(true);
      const selectedPagesData = await getSelectedPagesData(
        selectedPages,
        notebooks
      );

      const studyCardSet: Partial<StudyCardSet> = {
        title: setName,
        cards: [],
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          name: setName,
          cardCount: 0,
          sourceNotebooks: [],
        },
        userId: clerkUserId,
        notebookId: null,
        pageId: null,
      };

      const response = await fetch("/api/studycards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          setName,
          numCards,
          selectedPages: selectedPagesData,
          files: filesToUpload,
          userId: clerkUserId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate cards");
      }

      const data = await response.json();
      const formattedCards = data.cards.map((card: any) => ({
        title: card.title || card.front || "",
        content: card.content || card.back || "",
      }));

      const finalStudyCardSet = {
        ...studyCardSet,
        cards: formattedCards,
      };

      const setId = await saveStudyCardSet(
        finalStudyCardSet.cards,
        {
          title: setName,
          notebookId: notebookId || null,
          pageId: pageId || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        clerkUserId
      );

      // Reload card sets
      await loadCardsetsWrapper();

      // Find the newly created set from the cardSets state
      const newSet = cardSets.find(
        (set: StudyCardSet) => set.title === setName
      );

      if (newSet) {
        setSelectedSet(newSet);
      }

      setShowNotebookModal(false);
      setSelectedPages({});
      setSetName("");
      setFilesToUpload([]);
      setFiles([]);
      setMessages([]);

      toast.success("Study cards generated successfully!");
    } catch (error) {
      console.error("Error generating cards:", error);
      toast.error("Failed to generate study cards");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleAnswer = (cardIndex: number) => {
    setShowAnswer((prev) => toggleAnswer(prev, cardIndex));
  };

  const handleSetDeletion = async (setId: string) => {
    await handleDeleteSet(
      notebookId,
      pageId,
      setId,
      selectedSet?.id || null,
      loadCardsetsWrapper,
      setSelectedSet
    );
  };

  const handleToggleNotebookExpansion = (notebookId: string) => {
    setExpandedNotebooks((prev) => toggleNotebookExpansion(notebookId, prev));
  };

  const handleTitleUpdate = async (setId: string, newTitle: string) => {
    await handleUpdateTitle(
      setId,
      newTitle,
      loadCardsetsWrapper,
      setEditingListId
    );
  };

  const handleNotebookSelect = (
    notebookId: string,
    pages: Page[],
    isSelected: boolean
  ) => {
    setSelectedPages((prev) =>
      handleNotebookSelection(notebookId, pages, isSelected, prev)
    );
  };

  const handleClearWrapper = () => {
    handleClear(setMessages, setFiles);
  };

  const handleSendMessage = () => {
    console.log("Sending message");
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
      <div className="space-y-2 p-2 overflow-y-auto w-full">
        {notebooks.map((notebook) => (
          <div
            key={notebook.id}
            className="border rounded-xl  p-1   border-slate-400 overflow-y-auto"
          >
            <div className="flex items-center justify-between p-3 bg-white text-slate-600">
              <div className="flex items-center gap-2 ">
                <button
                  onClick={() => handleToggleNotebookExpansion(notebook.id)}
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
                  handleNotebookSelect(
                    notebook.id,
                    notebook.pages,
                    !isNotebookFullySelected(
                      notebook.id,
                      notebook.pages,
                      selectedPages
                    )
                  )
                }
                className={`flex items-center gap-1 px-2 py-1 rounded ${
                  isNotebookFullySelected(
                    notebook.id,
                    notebook.pages,
                    selectedPages
                  )
                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                    : "bg-white hover:bg-slate-100"
                }`}
              >
                {isNotebookFullySelected(
                  notebook.id,
                  notebook.pages,
                  selectedPages
                ) ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                <span className="text-sm">
                  {isNotebookFullySelected(
                    notebook.id,
                    notebook.pages,
                    selectedPages
                  )
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
                        handlePageSelect(
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
    <Card className="shadow-none border-none w-full bg-white flex flex-col gap-4 md:p-4 items-center justify-center">
      {!selectedSet && (
        <>
          <CardHeader className="hidden md:flex flex-col items-center justify-center p-0  md:p-4 ">
            <CardTitle className="text-2xl font-bold text-[#94b347] ">
              Study Cards
            </CardTitle>
            <CardDescription className="">Create and review study card sets</CardDescription>
          </CardHeader>
          <div className="flex flex-col items-center justify-center md:gap-4 ">
            <Button
              onClick={() => setShowNotebookModal(true)}
              className="hover:text-[#94b347] hover:bg-white hover:border-[#a5c05f] rounded-2xl text-slate-600 bg-white border border-slate-400 shadow-none"
            >
              <PlusCircle className="h-4 w-4" />
              Create Study Cards
            </Button>
          </div>
        </>
      )}

      <CardContent className="w-full flex flex-col items-center justify-center h-full overflow-y-auto">
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
          handleClear={handleClearWrapper}
          setShowUpload={setShowUpload}
          setFiles={setFiles}
          renderNotebookList={renderNotebookList}
          handleGenerateCards={handleGenerateCards}
          isGenerating={isGenerating}
          selectedPages={selectedPages}
          filesToUpload={filesToUpload}
          setIsGenerating={setIsGenerating}
          setSelectedPages={setSelectedPages}
          onSetCreated={(newSet) => setSelectedSet(newSet)}
        />

        {!selectedSet ? (
          // Show list of card sets
          <div className="w-full max-w-2xl mx-auto overflow-y-auto h-full">
            {cardSets.map((set) => (
              <div
                key={set.id}
                className="flex flex-row justify-between items-center"
              >
                <Card className="  bg-white border-none   transition-colors w-full shadow-none  rounded-none ">
                  <CardContent
                    className="py-2 border-t hover:bg-slate-50 border-slate-200 my-0 w-full flex items-center justify-between cursor-pointer"
                    onClick={() => setSelectedSet(set)}
                  >
                    <div className="flex flex-col items-start justify-between w-full">
                      <div className="items-center flex flex-row justify-between w-full">
                        <div className="flex flex-row items-center">
                          <h3 className="font-medium text-slate-700 ">
                            {set.title}
                          </h3>
                          <p className="text-sm text-slate-500 mx-5">
                            Cards: {set.cards.length}
                          </p>
                        </div>
                        <div className="flex flex-row justify-end items-center gap-2">
                          <AlertDialog>
                            <AlertDialogTrigger
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              className="hover:bg-red-100 hover:text-red-500 p-2 rounded-full"
                            >
                              <Trash className="h-4 w-4" />
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-white">
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Are you absolutely sure?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will
                                  permanently delete your Study Card Set and
                                  remove your data from our servers.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel
                                  onClick={(e) => e.stopPropagation()}
                                  className="bg-white rounded-full border border-red-500 text-red-500 hover:bg-red-100 hover:text-red-500"
                                >
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSetDeletion(set.id);
                                  }}
                                  className="bg-white rounded-full border border-slate-400 text-slate-800 hover:bg-slate-100 hover:text-slate-800 hover:border-slate-800"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>

                      <p className="text-sm text-slate-500">
                        {" "}
                        created {new Date(
                          set.createdAt
                        ).toLocaleDateString()}{" "}
                      </p>
                    </div>
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
          <div className="w-full h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-4 max-w-7xl mx-auto">
              <Button
                onClick={() => setSelectedSet(null)}
                variant="ghost"
                className="text-slate-400 hover:text-slate-600 m-0 p-0 hover:bg-transparent"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Sets
              </Button>
              
            </div>
            <div className="space-y-2 w-full overflow-y-auto h-full">
              <StudyCardCarousel studySet={selectedSet} />
              <StudyCardList
                studySet={selectedSet}
                onUpdate={handleStudySetUpdate}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
