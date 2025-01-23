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
   Plus,
   PlusCircle,
   RefreshCw,
   Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import FormUpload from "@/components/shared/study/formUpload";
import StudyGuide from "@/components/shared/study/StudyGuide";
import { storage } from '@/firebase';
import { Message } from "@/lib/types";
import { fileUpload } from "@/lib/utils";
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import { RefObject } from "react";


interface StudyGuide {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
}



interface StudyMaterialTabsProps {
   notebookId: string;
   pageId: string;
 }
 


export default function StudyGuideComponent({ notebookId, pageId }: StudyMaterialTabsProps) {
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
   const fileInputRef = useRef<HTMLInputElement>(null) as RefObject<HTMLInputElement>;
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
       if (filesToUpload.length === 0 && Object.keys(selectedPages).length === 0) {
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
           const combinedText = allText.join('\n\n---\n\n');
           const timestamp = new Date().getTime();
           const markdownPath = `studydocs/${notebookId}/${pageId}_${timestamp}.md`;
           
           const storageRef = ref(storage, markdownPath);
           await uploadString(storageRef, combinedText, 'raw', {
             contentType: 'text/markdown',
             customMetadata: {
               notebookId,
               pageId,
               setName,
               timestamp: timestamp.toString(),
             }
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
         selectedPages: Object.keys(selectedPages).length > 0 ? selectedPages : undefined,
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
       alert(error instanceof Error ? error.message : "Failed to generate cards");
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
         {notebooks.map((notebook) => (
           <div key={notebook.id} className="border rounded-xl  p-1  bg-white border-slate-400">
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
                       <span >
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
         <h3 className="text-lg font-semibold">Select Notebooks</h3>
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

       setIsGenerating(true);
       // Add your guide generation logic here
       
       // Close modal after generation
       setShowNotebookModal(false);
       setGuideName("");
     } catch (error) {
       console.error("Error generating study guide:", error);
       alert("Failed to generate study guide");
     } finally {
       setIsGenerating(false);
     }
   };
 
   return (
     <Card className="shadow-md">
       <CardContent className="p-6">
         {!selectedSet ? (



           <div className="space-y-2">




<div className="flex flex-col justify-center items-center mb-4">
              <h3 className="text-lg font-semibold">Study Guides</h3>
              <Button
                onClick={() => setShowNotebookModal(true)}
                className="flex items-center gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                Generate Study Guide
              </Button>
            </div>


            {showNotebookModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <Card className="w-[600px] max-h-[80vh] overflow-y-auto">
                  <CardHeader>
                    <CardTitle>Generate Study Guide</CardTitle>
                    <CardDescription>
                      Enter a name and select content for your study guide
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Input
                          placeholder="Study Guide Name"
                          value={guideName}
                          onChange={(e) => setGuideName(e.target.value)}
                        />
                      </div>
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
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleGenerateGuide}
                      disabled={isGenerating}
                      className="flex items-center gap-2"
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
       </CardContent>
     </Card>
   );
 };