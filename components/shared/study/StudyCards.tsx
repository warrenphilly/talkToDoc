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

import { Notebook as ImportedNotebook, Page } from "@/types/notebooks";
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
import {
  MutableRefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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

import { useCollectionData } from "@/hooks/useCollectionData";
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
import { Timestamp } from "firebase/firestore";
import { toast } from "react-hot-toast";
import CreateCardModal from "./CreateCardModal";
import { StudyCardCarousel } from "./StudyCardCarousel";
import { StudyCardList } from "./StudyCardList";

interface StudyMaterialTabsProps {
  notebookId: string;
  pageId: string;
}

interface ExtendedNotebook extends Omit<ImportedNotebook, 'createdAt' | 'updatedAt'> {
  createdAt: Timestamp | { seconds: number; nanoseconds: number } | string | number;
  updatedAt?: Timestamp | { seconds: number; nanoseconds: number } | string | number;
}

const getSelectedPagesData = async (
  selectedPages: { [notebookId: string]: string[] },
  notebooks: ExtendedNotebook[] // Update the type here
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
  const { data: cardSets, loading: loadingCardSets } =
    useCollectionData<StudyCardSet>("studyCards");
  const [selectedSet, setSelectedSet] = useState<StudyCardSet | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [numCards, setNumCards] = useState(5);
  const [showAnswer, setShowAnswer] = useState<Record<string, boolean>>({});
  const [showNotebookModal, setShowNotebookModal] = useState(false);
  const [selectedPages, setSelectedPages] = useState<{
    [notebookId: string]: string[];
  }>({});
  const [notebooks, setNotebooks] = useState<ExtendedNotebook[]>([]);
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
  const [showCardModal, setShowCardModal] = useState(false);
  const { user } = useUser();
  const clerkUserId = user?.id || "";

  useEffect(() => {
    setFilesToUpload([...filesToUpload, ...files]);
  }, [files]);

  // Update the loadCardsetsWrapper function to only handle additional filtering if needed
  const loadCardsetsWrapper = useCallback(async () => {
    if (!user?.id) return;

    // Any additional filtering logic can go here
    // The main data loading is now handled by the useCollectionData hook
  }, [user?.id]);

  useEffect(() => {
    if (showNotebookModal && user) {
      loadAllNotebooks(setIsLoadingNotebooks, setNotebooks, user);
    }
  }, [showNotebookModal, user]);

  useEffect(() => {
    if (selectedSet) {
      setShowNotebookModal(false);
    }
  }, [selectedSet]);

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

  const handleGenerateCardsWrapper = async () => {
    try {
      if (!user?.id) {
        toast.error("Please sign in to generate study cards");
        return;
      }

      if (!setName.trim()) {
        toast.error("Please enter a name for the study set");
        return;
      }

      setIsGenerating(true);

      // First convert to intermediate type with proper Date objects
      const adaptedNotebooks = notebooks.map((notebook: ExtendedNotebook) => {
        const createdAtDate = (() => {
          const createdAt = notebook.createdAt;
          if (typeof createdAt === 'object' && createdAt !== null) {
            if ('toDate' in createdAt && typeof createdAt.toDate === 'function') {
              return createdAt.toDate();
            }
            if ('seconds' in createdAt && 'nanoseconds' in createdAt) {
              return new Date(createdAt.seconds * 1000);
            }
          }
          return new Date(createdAt as string | number);
        })();

        return {
          ...notebook,
          createdAt: createdAtDate.toISOString(), // Convert to ISO string
          updatedAt: notebook.updatedAt ? new Date().toISOString() : undefined,
          userId: notebook.userId || user?.id || ''
        };
      });

      // Then cast to the expected type
      const typedNotebooks = adaptedNotebooks as unknown as ImportedNotebook[];

      const generatedCards = await handleGenerateCards(
        setName,
        numCards,
        selectedPages,
        filesToUpload,
        typedNotebooks,
        isGenerating,
        setIsGenerating,
        setShowNotebookModal,
        setSelectedPages,
        setSetName,
        setFilesToUpload,
        setFiles,
        setMessages,
        user.id
      );

      if (
        generatedCards &&
        generatedCards.cards &&
        Array.isArray(generatedCards.cards)
      ) {
        const newStudySet: StudyCardSet = {
          id: generatedCards.id || crypto.randomUUID(),
          title: generatedCards.title || setName,
          cards: generatedCards.cards.map((card: any) => ({
            title: card.title || "",
            content: card.content || "",
          })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          userId: user.id,
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            name: setName,
            cardCount: generatedCards.cards.length,
            sourceNotebooks: [],
          },
          notebookId: notebookId || null,
          pageId: pageId || null,
        };

        try {
          // Reset form state after successful creation
          setShowNotebookModal(false);
          setShowCardModal(false);
          setSetName("");
          setNumCards(10);
          setFilesToUpload([]);
          setFiles([]);
          setSelectedPages({});
          setMessages([]);

          // The new study set will be automatically added to cardSets via the useCollectionData hook
          // We just need to select it
          setSelectedSet(newStudySet);

          toast.success("Study cards generated successfully!");
        } catch (error) {
          console.error("Error updating card sets:", error);
          toast.error(
            "Cards generated but failed to update list. Please refresh."
          );
        }
      } else {
        toast.error("Failed to generate valid study cards");
      }
    } catch (error) {
      console.error("Error generating cards:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate cards"
      );
    } finally {
      setIsGenerating(false);
      setShowNotebookModal(false);
      setShowCardModal(false);
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

  const handleSetCreated = (newStudySet: StudyCardSet) => {
    console.log("New study set created:", newStudySet);

    // With useCollectionData, we don't need to manually update cardSets
    // Just select the new set to display it
    setSelectedSet(newStudySet);

    // Log for debugging
    console.log("Selected set updated:", newStudySet.id);
  };

  // Update the renderCardSets function to use the data from the hook
  const renderCardSets = useMemo(() => {
    if (loadingCardSets) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4  w-full">
          {[...Array(3)].map((_, i) => (
            <Card
              key={i}
              className="bg-white border-none shadow-none rounded-none"
            >
              <CardContent className="py-2 border-t border-slate-200 my-0">
                <div className="flex flex-col gap-2 animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return (
      <div className="w-full mx-auto bg-white rounded-xl shadow-sm overflow-hidden">
        {cardSets.map((studyCard, index) => (
          <div
            key={studyCard.id}
            className={`border-t border-slate-100 hover:bg-slate-50 transition-all duration-200 cursor-pointer ${index === 0 ? 'border-t-0' : ''}`}
            onClick={() => setSelectedSet(studyCard)}
          >
            <div className="py-5 px-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between w-full gap-2">
                <div className="flex flex-col md:flex-row md:items-center md:gap-4">
                  <h3 className="font-medium text-slate-700 text-lg">
                    <span className="text-[#94b347] font-semibold">
                      {studyCard.metadata.name}
                    </span>
                  </h3>
                  <div className="hidden md:flex items-center gap-4">
                    <div className="h-4 w-px bg-slate-200"></div>
                    <p className="text-sm text-slate-500">
                      {studyCard.cards.length} cards
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between gap-3 mt-1 md:mt-0">
                  <p className="text-sm text-slate-400">
                    {new Date(studyCard.metadata.createdAt).toLocaleDateString()}
                  </p>
                  
                  <AlertDialog>
                    <AlertDialogTrigger
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="p-2 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors ml-2"
                    >
                      <Trash className="h-4 w-4" />
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-white rounded-lg border-none shadow-lg max-w-md mx-auto">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-center">
                          Delete Card Set?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-center">
                          This will permanently delete this study card set and all associated data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex justify-center gap-3 mt-4">
                        <AlertDialogCancel
                          onClick={(e) => e.stopPropagation()}
                          className="bg-white rounded-full border border-red-500 text-red-500 hover:bg-red-50 transition-colors"
                        >
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetDeletion(studyCard.id);
                          }}
                          className="bg-white rounded-full border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          </div>
        ))}

        {cardSets.length === 0 && (
          <div className="text-center py-16 px-4">
            <BookOpen className="h-16 w-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-slate-700 font-medium mb-2">No study cards yet</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              Create your first study card set to start reviewing.
            </p>
          </div>
        )}
      </div>
    );
  }, [cardSets, loadingCardSets]);

  return (
    <Card className="shadow-none border-none w-full bg-white flex flex-col gap-4 m-0 items-center justify-center">
      {!selectedSet && (
        <>
          <CardHeader className="hidden md:flex flex-col items-center justify-center p-0  md:py-4 ">
            <CardTitle className="text-2xl font-bold text-[#94b347] ">
              Study Cards
            </CardTitle>
            <CardDescription className="">
              Create and review study card sets
            </CardDescription>
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

      <CardContent className="w-full  flex flex-col items-center justify-center h-full overflow-y-auto p-0">
        {showNotebookModal && (
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
            handleGenerateCards={handleGenerateCardsWrapper}
            isGenerating={isGenerating}
            selectedPages={selectedPages}
            setSelectedPages={setSelectedPages}
            filesToUpload={filesToUpload}
            setIsGenerating={setIsGenerating}
            onSetCreated={handleSetCreated}
          />
        )}

        {!selectedSet ? (
          renderCardSets
        ) : (
          // Show selected set's cards
          <div className="w-full h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-4  mx-auto">
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
