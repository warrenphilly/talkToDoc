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
import { collection, getDocs, orderBy, query, where, deleteDoc, setDoc, serverTimestamp } from "firebase/firestore";
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

import FormUpload from "@/components/shared/study/formUpload";
import StudyGuide from "@/components/shared/study/StudyGuide";
import { storage } from "@/firebase";
import { Message } from "@/lib/types";
import { fileUpload } from "@/lib/utils";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import { RefObject } from "react";

interface StudyGuide {
  id: string;
  title: string;
  content: {
    title: string;
    text: string;
    show: boolean;
  }[];
  notebookId: string;
  pageId: string;
  createdAt: Date;
  updatedAt?: Date;
}

interface StudyMaterialTabsProps {
  notebookId: string;
  pageId: string;
}

export default function StudyGuideComponent({
  notebookId,
  pageId,
}: StudyMaterialTabsProps) {
  const [cardSets, setCardSets] = useState<StudyCardSet[]>([]);
  const [selectedSet, setSelectedSet] = useState<StudyCardSet | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [numCards, setNumCards] = useState(5);
  const [showAnswer, setShowAnswer] = useState<Record<string, boolean>>({});
  const [guideName, setGuideName] = useState<string>("");
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
  ) as RefObject<HTMLInputElement>;
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [studyGuides, setStudyGuides] = useState<StudyGuide[]>([]);

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

  useEffect(() => {
    loadStudyGuides();
  }, [pageId]);

  const loadCardSets = async () => {
    try {
      const sets = await getStudyCardSets(pageId);
      setCardSets(sets);
    } catch (error) {
      console.error("Error loading study card sets:", error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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
        <label className="block text-sm font-medium text-gray-700 ">
                     Select Notes
                   </label>
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

  const renderNotebookSelection = () => {
    return (
      <div className="space-y-4">
        
        {renderNotebookList()}
      </div>
    );
  };

  const handleGenerateGuide = async () => {
    try {
      if (!guideName.trim()) {
        alert("Please enter a name for the study guide");
        return;
      }

      // Check if we have either uploaded files or selected pages
      if (filesToUpload.length === 0 && Object.keys(selectedPages).length === 0) {
        alert("Please either upload files or select notebook pages");
        return;
      }

      setIsGenerating(true);

      // First, upload files if any exist
      let uploadedDocsMetadata = [];
      if (filesToUpload.length > 0) {
        for (const file of filesToUpload) {
          const formData = new FormData();
          formData.append("file", file);

          // Convert file to text first
          const response = await fetch("/api/convert", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`Failed to convert file: ${file.name}`);
          }

          const data = await response.json();
          if (data.text) {
            // Save to Firebase Storage
            const timestamp = new Date().getTime();
            const path = `studydocs/${notebookId}/${pageId}_${timestamp}.md`;
            const storageRef = ref(storage, path);
            await uploadString(storageRef, data.text, "raw", {
              contentType: "text/markdown",
            });

            // Get download URL
            const url = await getDownloadURL(storageRef);

            // Add to metadata array
            uploadedDocsMetadata.push({
              path,
              url,
              name: file.name,
              timestamp: timestamp.toString(),
            });
          }
        }
      }

      // Prepare the form data for study guide generation
      const formData = new FormData();
      const messageData = {
        selectedPages: Object.keys(selectedPages).length > 0 ? selectedPages : undefined,
        guideName,
        uploadedDocs: uploadedDocsMetadata.length > 0 ? uploadedDocsMetadata : undefined,
      };

      formData.append("message", JSON.stringify(messageData));

      // Call the study guide API endpoint
      const response = await fetch("/api/studyguide", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Failed to generate study guide");
      }

      const data = await response.json();

      // Create a new study guide object with formatted content
      const newStudyGuide: StudyGuide = {
        id: `guide_${crypto.randomUUID()}`,
        title: guideName,
        content: data.content, // This will be an array of sections with title, text, and show properties
        notebookId,
        pageId,
        createdAt: new Date()
      };

      // Save to the studyGuides collection
      const studyGuideRef = doc(db, "studyGuides", newStudyGuide.id);
      await setDoc(studyGuideRef, {
        ...newStudyGuide,
        createdAt: serverTimestamp()
      });

      // Refresh the study guides list
      await loadStudyGuides();

      // Close modal and reset state
      setShowNotebookModal(false);
      setGuideName("");
      setFilesToUpload([]);
      setFiles([]);
      setMessages([]);

      // Show success message
      alert("Study guide generated successfully!");
    } catch (error) {
      console.error("Error generating study guide:", error);
      alert(error instanceof Error ? error.message : "Failed to generate study guide");
    } finally {
      setIsGenerating(false);
    }
  };

  const loadStudyGuides = async () => {
    try {
      const studyGuidesRef = collection(db, "studyGuides");
      let querySnapshot;

      try {
        // Try the ordered query first
        const q = query(
          studyGuidesRef,
          where("pageId", "==", pageId),
          where("notebookId", "==", notebookId),
          orderBy("createdAt", "desc")
        );
        querySnapshot = await getDocs(q);
      } catch (error) {
        console.warn("Falling back to unordered query while index builds");
        // Fallback to unordered query if index doesn't exist
        const q = query(
          studyGuidesRef,
          where("pageId", "==", pageId),
          where("notebookId", "==", notebookId)
        );
        querySnapshot = await getDocs(q);
      }

      const guides = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date()
        } as StudyGuide;
      });

      // Sort manually if using fallback query
      guides.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      setStudyGuides(guides);
    } catch (error) {
      console.error("Error loading study guides:", error);
    }
  };

  const handleDeleteStudyGuide = async (guideId: string) => {
    try {
      if (!window.confirm("Are you sure you want to delete this study guide?")) {
        return;
      }

      // Delete from studyGuides collection
      await deleteDoc(doc(db, "studyGuides", guideId));

      // Refresh the list
      await loadStudyGuides();
    } catch (error) {
      console.error("Error deleting study guide:", error);
      alert("Failed to delete study guide");
    }
  };

  return (
    <Card className="h-full border-none shadow-none ">
      
      <CardContent className=" bg-white h-full p-4">
      <CardHeader className="flex flex-col items-center justify-center">
         <CardTitle className="text-2xl font-bold text-[#94b347] ">
           Study Guides
         </CardTitle>
         <CardDescription>Create and review study guides</CardDescription>
       </CardHeader>
        {!selectedSet ? (
          <div className="space-y-2 bg-white h-full">
            <div className="flex flex-col justify-center items-center mb-4">
             
              <Button
                onClick={() => setShowNotebookModal(true)}
                className="flex items-center gap-2 m-5 bg-white border border-slate-400 text-slate-600 hover:bg-white hover:border-[#94b347] hover:text-[#94b347] rounded-full"
              >
                <PlusCircle className="h-4 w-4" />
                Generate Study Guide
              </Button>
            </div>

            {showNotebookModal && (
              <div className="fixed inset-0 bg-white flex items-center justify-center z-10 ">
                <Card className="w-full h-full overflow-y-auto bg-white rounded-none border-none shadow-none  max-w-xl">
               
                  <CardContent>
                  <div className="flex flex-col gap-2  my-4 items-center justify-center"><h2 className="text-xl font-bold mb-4 text-[#94b347]">Create Study Guide</h2></div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Study Guide Name</label>
                        <Input
                          placeholder="Study Guide Name"
                          value={guideName}
                          onChange={(e) => setGuideName(e.target.value)}
                          className="text-slate-600"
                        />
                      </div>
                      <div className="font-semibold text-gray-500 w-full flex items-center justify-center text-lg "><h3> Select notes or upload files to study </h3>  </div>
                      <FormUpload
                        files={files}
                        handleFileUpload={handleFileUpload}
                        handleClear={handleClear}
                        fileInputRef={fileInputRef}
                        messages={messages}
                        handleSendMessage={handleSendMessage}
                        showUpload={showUpload}
                        setShowUpload={setShowUpload}
                      />
                      {/* Notebook selection content */}
                     
                      {renderNotebookSelection()}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setShowNotebookModal(false)}
                      className="bg-white border border-red-400 text-red-400 hover:bg-red-100 hover:border-red-400 hover:text-red-500 rounded-full"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleGenerateGuide}
                      disabled={isGenerating || !guideName.trim() || (filesToUpload.length === 0 && Object.keys(selectedPages).length === 0)}
                      className="rounded-full bg-white border border-slate-400 text-slate-600 hover:bg-white hover:border-[#94b347] hover:text-[#94b347]"
                    >
                      {isGenerating ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <BookOpen className="h-4 w-4" />
                      )}
                      {isGenerating ? "Generating..." : "Generate"}
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">{selectedSet.title}</h2>
              <Button
                variant="ghost"
                onClick={() => setSelectedSet(null)}
                className="text-gray-500"
              >
                Back to List
              </Button>
            </div>

            <div className="prose prose-slate max-w-none">
              {selectedSet.cards.map(
                (card: { title: string; content: string }, index: number) => (
                  <div key={index} className="mb-8">
                    <h3 className="text-xl font-semibold mb-4">{card.title}</h3>
                    <div className="whitespace-pre-line pl-4">
                      {card.content}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Study Guides List */}
        <div className="space-y-4 overflow-y-auto">
          {studyGuides.map((guide) => (
            <Card key={guide.id} className="p-4  bg-red-500 h-full">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">{guide.title}</h3>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteStudyGuide(guide.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Created: {guide.createdAt.toLocaleDateString()}
              </p>
              <div className="mt-4 space-y-4">
                {guide.content.map((section, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <button
                      onClick={() => {
                        const updatedGuides = studyGuides.map(g => {
                          if (g.id === guide.id) {
                            return {
                              ...g,
                              content: g.content.map((s, i) => 
                                i === index ? { ...s, show: !s.show } : s
                              )
                            };
                          }
                          return g;
                        });
                        setStudyGuides(updatedGuides);
                      }}
                      className="flex justify-between items-center w-full text-left"
                    >
                      <h4 className="text-md font-medium">{section.title}</h4>
                      <ChevronDown className={`h-5 w-5 transform transition-transform ${section.show ? 'rotate-180' : ''}`} />
                    </button>
                    {section.show && (
                      <div className="mt-2 pl-4 prose prose-sm max-w-none">
                        {section.text}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}

          {studyGuides.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No study guides yet. Create one to get started!
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
