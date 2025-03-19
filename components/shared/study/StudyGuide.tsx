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
  getNotebooksByFirestoreUserId,
  getStudyCards,
  getStudyCardSets,
  getUserByClerkId,
  saveStudyCard,
  saveStudyCardSet,
  saveStudyGuide,
  updateStudyGuideTitle,
} from "@/lib/firebase/firestore";
import { Notebook, Page } from "@/types/notebooks";
import { StudyCard, StudyCardSet, StudySetMetadata } from "@/types/studyCards";
import {
  collection,
  deleteDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
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
import { useEffect, useRef, useState } from "react";

import FormUpload from "@/components/shared/study/formUpload";
import StudyGuide from "@/components/shared/study/StudyGuide";
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
import { storage } from "@/firebase";
import { Message } from "@/lib/types";
import { fileUpload } from "@/lib/utils";
import { StudyGuideSection } from "@/types/studyGuide";
import { User } from "@/types/users";
import { useUser } from "@clerk/nextjs";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import { RefObject } from "react";
import { toast } from "react-hot-toast";
import { StudyGuideCard } from "./StudyGuideCard";
import StudyGuideModal from "./StudyGuideModal";
// Export the interfaces so they can be imported by StudyGuideCard
export interface StudyGuideSubtopic {
  title: string;
  description: string;
  keyPoints: string[];
  examples?: string[];
  studyTips?: string[];
}

export interface StudyGuide {
  id: string;
  title: string;
  content: StudyGuideSection[];

  createdAt: Date;
  userId: string;
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
  const [selectedGuide, setSelectedGuide] = useState<StudyGuide | null>(null);
  const [firestoreUser, setFirestoreUser] = useState<User | null>(null);

  // Update the state to track expanded sections for each guide
  const [expandedSections, setExpandedSections] = useState<{
    [guideId: string]: number[];
  }>({});

  // Add state to track which guide is being edited in the list
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListTitle, setEditingListTitle] = useState<string>("");

  // Add state for selected guide view
  const [selectedGuideView, setSelectedGuideView] = useState<StudyGuide | null>(
    null
  );

  const user = useUser();
  const userId = user?.user?.id;

  useEffect(() => {
    setFilesToUpload([...filesToUpload, ...files]);
  }, [files]);

  useEffect(() => {
    loadCardSets();
  }, [pageId]);

  useEffect(() => {
    if (showNotebookModal) {
      fetchNotebooks();
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

  {
    /* error zone*/
  }

  useEffect(() => {
    const fetchFirestoreUser = async () => {
      if (user?.user?.id) {
        // Check for user ID specifically
        try {
          const firestoreUser = await getUserByClerkId(user.user.id);
          setFirestoreUser(firestoreUser);
        } catch (error) {
          console.error("Error fetching user:", error);
          toast.error("Failed to load user data");
        }
      }
    };
    fetchFirestoreUser();
  }, [user?.user?.id]); // Only depend on the user ID

  const handleClear = () => {
    setMessages([]);
    setFiles([]);
  };

  const fetchNotebooks = async () => {
    if (firestoreUser) {
      try {
        setIsLoadingNotebooks(true);
        const fetchedNotebooks = await getNotebooksByFirestoreUserId(
          firestoreUser.id
        );

        setNotebooks(fetchedNotebooks);
      } catch (error) {
        console.error("Error fetching notebooks:", error);
        toast.error("Failed to load notebooks");
      } finally {
        setIsLoadingNotebooks(false);
      }
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
        createdAt: new Date().toISOString(),
        sourceNotebooks: sourceNotebooks.filter(
          (n): n is NonNullable<typeof n> => n !== null
        ),
        cardCount: numCards,
        userId: userId || "",
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
      await saveStudyCardSet(data.cards, metadata, userId || "");

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
    return <div className="space-y-4">{renderNotebookList()}</div>;
  };

  const handleGenerateGuide = async () => {
    try {
      if (!guideName.trim()) {
        alert("Please enter a name for the study guide");
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
        selectedPages:
          Object.keys(selectedPages).length > 0 ? selectedPages : undefined,
        guideName,
        uploadedDocs:
          uploadedDocsMetadata.length > 0 ? uploadedDocsMetadata : undefined,
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
        content: data.content,
        createdAt: new Date(),
        userId: userId || "",
      };

      // Save to the studyGuides collection
      const studyGuideRef = doc(db, "studyGuides", newStudyGuide.id);
      await setDoc(studyGuideRef, {
        ...newStudyGuide,
        createdAt: serverTimestamp(),
      });

      // Refresh the study guides list
      await loadStudyGuides();

      // Automatically open the new guide
      setSelectedGuideView(newStudyGuide);

      // Close modal and reset state
      setShowNotebookModal(false);
      setGuideName("");
      setFilesToUpload([]);
      setFiles([]);
      setMessages([]);
      setSelectedPages({});

      // Show success message
      toast.success("Study guide generated successfully!");
    } catch (error) {
      console.error("Error generating study guide:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to generate study guide"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const loadStudyGuides = async () => {
    try {
      const studyGuidesRef = collection(db, "studyGuides");
      let querySnapshot;

      try {
        // Try to use the compound query
        const q = query(
          studyGuidesRef,
          where("userId", "==", userId),
          orderBy("createdAt", "desc")
        );
        querySnapshot = await getDocs(q);
      } catch (error) {
        // Fallback to unordered query if index doesn't exist
        const q = query(studyGuidesRef, where("userId", "==", userId));
        querySnapshot = await getDocs(q);
      }

      const guides = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          content: data.content,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          userId: data.userId || "",
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
      if (
        !window.confirm("Are you sure you want to delete this study guide?")
      ) {
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

  // Update the handleSectionToggle function
  const handleSectionToggle = (guideId: string, sectionIndex: number) => {
    setExpandedSections((prev) => {
      const currentExpanded = prev[guideId] || [];
      const isCurrentlyExpanded = currentExpanded.includes(sectionIndex);

      if (isCurrentlyExpanded) {
        return {
          ...prev,
          [guideId]: currentExpanded.filter((index) => index !== sectionIndex),
        };
      } else {
        return {
          ...prev,
          [guideId]: [...currentExpanded, sectionIndex],
        };
      }
    });
  };

  // Add a new function to handle title updates
  const handleUpdateTitle = async (guideId: string, newTitle: string) => {
    try {
      // Update in your database
      await updateStudyGuideTitle(guideId, newTitle);

      // Update local state
      setStudyGuides((prevGuides) =>
        prevGuides.map((guide) =>
          guide.id === guideId ? { ...guide, title: newTitle } : guide
        )
      );

      // If there's a selected guide, update it too
      if (selectedGuide?.id === guideId) {
        setSelectedGuide((prev) =>
          prev ? { ...prev, title: newTitle } : null
        );
      }
    } catch (error) {
      console.error("Failed to update study guide title:", error);
      // Handle error (show toast notification, etc.)
    }
  };

  const handleGuideCreated = (newGuide: StudyGuide) => {
    setSelectedGuideView(newGuide);
    setShowNotebookModal(false);
    setGuideName("");
    setFilesToUpload([]);
    setFiles([]);
    setMessages([]);
    setSelectedPages({});
  };

  return (
    <Card className="h-full bg-white border-none shadow-none overflow-y-auto">
      <CardContent className=" bg-white h-full md:p-4">
        {!selectedGuideView && (
          <CardHeader className="flex flex-col items-center justify-center  p-0 mb-4 md:p-4">
            <CardTitle className="hidden md:block text-2xl font-bold text-[#94b347]">
              Study Guides
            </CardTitle>
            <CardDescription className="hidden md:block ">Create and review study guides</CardDescription>
            <div className="flex flex-col justify-center items-center p-3 ">
              <Button
                onClick={() => setShowNotebookModal(true)}
                className="flex items-center gap-2 md:m-5 bg-white border border-slate-400 text-slate-600 hover:bg-white hover:border-[#94b347] hover:text-[#94b347] rounded-full"
              >
                <PlusCircle className="h-4 w-4" />
                Generate Study Guide
              </Button>
            </div>
          </CardHeader>
        )}

        {selectedGuideView ? (
          <StudyGuideCard
            guide={selectedGuideView}
            onDelete={handleDeleteStudyGuide}
            onUpdateTitle={handleUpdateTitle}
            onBack={() => setSelectedGuideView(null)}
          />
        ) : (
          <div className="space-y-4">
            {showNotebookModal && (
              <StudyGuideModal
                guideName={guideName}
                setGuideName={setGuideName}
                files={files}
                handleFileUpload={handleFileUpload}
                handleClear={handleClear}
                fileInputRef={fileInputRef}
                messages={messages}
                handleSendMessage={handleSendMessage}
                showUpload={showUpload}
                setShowUpload={setShowUpload}
                renderNotebookSelection={renderNotebookSelection}
                onClose={() => setShowNotebookModal(false)}
                handleGenerateGuide={handleGenerateGuide}
                isGenerating={isGenerating}
                filesToUpload={filesToUpload}
                selectedPages={selectedPages}
                setIsGenerating={setIsGenerating}
                onGuideCreated={handleGuideCreated}
              />
            )}

            {/* Study Guides List */}
            <div className="w-full mx-auto bg-white rounded-xl shadow-sm overflow-hidden">
              {studyGuides.map((guide, index) => (
                <div
                  key={guide.id}
                  className={`border-t border-slate-100 hover:bg-slate-50 transition-all duration-200 cursor-pointer ${index === 0 ? 'border-t-0' : ''}`}
                  onClick={() => setSelectedGuideView(guide)}
                >
                  <div className="py-5 px-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between w-full gap-2">
                      <div className="flex flex-col md:flex-row md:items-center md:gap-4">
                        <h3 className="font-medium text-slate-700 text-lg">
                 
                          <span className="text-[#94b347] font-semibold">
                            {guide.title}
                          </span>
                        </h3>
                        
                        <div className="hidden md:flex items-center gap-4">
                         
                          
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between gap-3 mt-1 md:mt-0">
                        <p className="text-sm text-slate-400">
                          {new Date(guide.createdAt).toLocaleDateString()}
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
                                Delete Study Guide?
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-center">
                                This will permanently delete this study guide and all associated data.
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
                                  handleDeleteStudyGuide(guide.id);
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

              {studyGuides.length === 0 && (
                <div className="text-center py-16 px-4">
                  <BookOpen className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                  <h3 className="text-slate-700 font-medium mb-2">No study guides yet</h3>
                  <p className="text-slate-500 text-sm max-w-md mx-auto">
                    Create your first study guide to start learning.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
