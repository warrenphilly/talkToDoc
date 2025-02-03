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
  const fileInputRef = useRef<HTMLInputElement>(
    null
  ) as MutableRefObject<HTMLInputElement>;
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListTitle, setEditingListTitle] = useState("");

  useEffect(() => {
    setFilesToUpload([...filesToUpload, ...files]);
  }, [files]);

  // Create a memoized version of loadCardSets with the correct signature
  const loadCardsetsWrapper = loadCardSets(pageId, setCardSets);

  useEffect(() => {
    loadCardsetsWrapper();
  }, [pageId]);

  useEffect(() => {
    if (showNotebookModal) {
      loadAllNotebooks(setIsLoadingNotebooks, setNotebooks);
    }
  }, [showNotebookModal]);

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

  const handleGenerateCardsClick = async () => {
    await handleGenerateCards(
      setName,
      filesToUpload,
      selectedPages,
      numCards,
      notebooks,
      notebookId,
      pageId,
      setIsGenerating,
      loadCardsetsWrapper,
      setShowNotebookModal,
      setSelectedPages,
      setSetName,
      setFilesToUpload,
      setFiles,
      setMessages
    );
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
      <div className="space-y-2 p-2 ">
        {notebooks.map((notebook) => (
          <div
            key={notebook.id}
            className="border rounded-xl  p-1  bg-white border-slate-400"
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
          handleClear={handleClearWrapper}
          setShowUpload={setShowUpload}
          setFiles={setFiles}
          renderNotebookList={renderNotebookList}
          handleGenerateCards={handleGenerateCardsClick}
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
                <Card className="  bg-white border-none   transition-colors w-full shadow-none  rounded-none ">
                  <CardContent className="py-2 border-t hover:bg-slate-50 border-slate-200 my-0 w-full flex items-center justify-between cursor-pointer" onClick={() => setSelectedSet(set)}>
                    <div className="flex flex-col items-start justify-between w-full">
                      <div className="items-center flex flex-row justify-between w-full">
                        <div className="flex flex-row items-center">
                          <h3
                            className="font-medium text-slate-700 "
                            
                          >
                            {set.title}
                          </h3>
                          <p className="text-sm text-slate-500 mx-5">
                            Cards: {set.cards.length}
                          </p>
                        </div>
                        <div className="flex flex-row justify-end items-center gap-2">
                          <Button
                            variant="ghost"
                             className="text-slate-400 hover:text-red-500 transition-colors hover:bg-transparent"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetDeletion(set.id);
                            }}
                          >
                            <Trash   className="w-4 h-4" />
                          </Button>
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
          <div className="w-full">
            <div className="flex items-center justify-between mb-4 max-w-7xl mx-auto">
              <Button onClick={() => setSelectedSet(null)} variant="ghost" className="text-slate-400 hover:text-slate-600 m-0 p-0 hover:bg-transparent">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Sets
              </Button>
              <Button
                variant="ghost"
                className="text-red-500 hover:text-red-700 hover:bg-red-50 "
                onClick={() => handleSetDeletion(selectedSet.id)}
              >
                <Trash className="h-4 w-4 mr-2" />
                Delete Set
              </Button>
            </div>
            <div className="space-y-2 w-full ">
              {selectedSet.cards.map(
                (card: { title: string; content: string }, index: number) => (
                  <div
                    key={index}
                    onClick={() => handleToggleAnswer(index)}
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
