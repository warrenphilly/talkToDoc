import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { db, storage } from "@/firebase";
import {
  getNotebooksByFirestoreUserId,
  getUserByClerkId,
  getUserNotebooks,
  saveStudyGuide,
} from "@/lib/firebase/firestore"; // Changed from createStudyGuide
import { Message } from "@/lib/types";
import { Notebook } from "@/types/notebooks"; // Add this import
import { User } from "@/types/users";
import { useAuth, useUser } from "@clerk/nextjs";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  X,
  Trash2,
  Edit2,
  Save,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast"; // Add this import
import { v4 as uuidv4 } from "uuid"; // Add this for generating pageId
import { StudyGuide } from "@/types/studyGuide"; // Make sure to export the interface from StudyGuide.tsx
import StudyGuideModal from "./StudyGuideModal";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { getDoc } from "firebase/firestore";

interface StudyGuidePageProps {
  guide: StudyGuide;
  onDelete: (id: string) => Promise<void>;
  onUpdateTitle: (id: string, newTitle: string) => Promise<void>;
}

export function StudyGuidePage({ guide, onDelete, onUpdateTitle }: StudyGuidePageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(guide.title);
  const [showModal, setShowModal] = useState(false);
  const [guideName, setGuideName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showUpload, setShowUpload] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [selectedPages, setSelectedPages] = useState<{
    [key: string]: string[];
  }>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isLoadingNotebooks, setIsLoadingNotebooks] = useState(true);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [expandedNotebooks, setExpandedNotebooks] = useState<Set<string>>(
    new Set()
  );
  const [firestoreUser, setFirestoreUser] = useState<User | null>(null);
  const { user } = useUser();
  const router = useRouter();
  const params = useParams();
  const [studyGuide, setStudyGuide] = useState<StudyGuide | null>(null);
  const [loading, setLoading] = useState(true);

  const handleSaveTitle = async () => {
    await onUpdateTitle(guide.id, editedTitle);
    setIsEditing(false);
  };

  const handleSave = () => {
    if (editedTitle.trim()) {
      onUpdateTitle(guide.id, editedTitle.trim());
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditedTitle(guide.title);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles(Array.from(event.target.files));
      setFilesToUpload(Array.from(event.target.files));
    }
  };

  const handleClear = () => {
    setFiles([]);
    setFilesToUpload([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleGenerateGuide = async () => {
    try {
      if (!guideName.trim()) {
        toast.error("Please enter a name for the study guide");
        return;
      }

      // Check if we have either uploaded files or selected pages
      const hasSelectedPages = Object.values(selectedPages).some(pages => pages.length > 0);
      if (filesToUpload.length === 0 && !hasSelectedPages) {
        toast.error("Please either upload files or select notebook pages");
        return;
      }

      setIsGenerating(true);

      // Get the first selected notebook and page for storage path
      const firstNotebookId = Object.keys(selectedPages).find(
        notebookId => selectedPages[notebookId]?.length > 0
      );
      const firstPageId = firstNotebookId ? selectedPages[firstNotebookId][0] : null;

      // Generate random IDs if using only uploaded files
      const pageIdToUse = firstPageId || `page_${uuidv4()}`;
      const notebookIdToUse = firstNotebookId || `notebook_${uuidv4()}`;

      // Handle file uploads
      let uploadedDocsMetadata = [];
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
            const timestamp = new Date().getTime();
            const path = `studydocs/${notebookIdToUse}/${pageIdToUse}_${timestamp}.md`;
            const storageRef = ref(storage, path);
            await uploadString(storageRef, data.text, "raw", {
              contentType: "text/markdown",
            });

            const url = await getDownloadURL(storageRef);
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
        selectedPages: hasSelectedPages ? selectedPages : undefined,
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

      // Create a new study guide object with a new ID
      const newStudyGuideId = `guide_${uuidv4()}`;
      const newStudyGuide: StudyGuide = {
        id: newStudyGuideId,
        title: guideName,
        content: data.content,
  
        createdAt: new Date(),
        userId: user?.id || "",
      };

      // Save to Firestore
      const studyGuideRef = doc(db, "studyGuides", newStudyGuide.id);
      await setDoc(studyGuideRef, {
        ...newStudyGuide,
        createdAt: serverTimestamp(),
      });

      // Reset form and close modal
      setGuideName("");
      setFiles([]);
      setFilesToUpload([]);
      setSelectedPages({});
      setShowModal(false);

      toast.success("Study guide generated successfully!");

      // Navigate to the new study guide's URL
      router.push(`/study-guides/${newStudyGuideId}`);
      
    } catch (error: any) {
      console.error("Error generating study guide:", error);
      toast.error(error.message || "Failed to generate study guide");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendMessage = () => {
    // This can be implemented if you need chat functionality
    console.log("Sending message");
  };

  const toggleNotebookExpansion = (notebookId: string) => {
    setExpandedNotebooks((prev) => {
      const next = new Set(prev);
      if (next.has(notebookId)) {
        next.delete(notebookId);
      } else {
        next.add(notebookId);
      }
      return next;
    });
  };

  const handleNotebookSelection = (
    notebookId: string,
    pages: any[],
    isSelected: boolean
  ) => {
    setSelectedPages((prev) => ({
      ...prev,
      [notebookId]: isSelected ? pages.map((p) => p.id) : [],
    }));
  };

  const handlePageSelection = (
    notebookId: string,
    pageId: string,
    isSelected: boolean
  ) => {
    setSelectedPages((prev) => ({
      ...prev,
      [notebookId]: isSelected
        ? [...(prev[notebookId] || []), pageId]
        : (prev[notebookId] || []).filter((id) => id !== pageId),
    }));
  };

  const isNotebookFullySelected = (notebookId: string, pages: any[]) => {
    return pages.every((page) => selectedPages[notebookId]?.includes(page.id));
  };

  useEffect(() => {
    const fetchFirestoreUser = async () => {
      if (user) {
        try {
          const firestoreUser = await getUserByClerkId(user.id);
          setFirestoreUser(firestoreUser);
        } catch (error) {
          console.error("Error fetching user:", error);
          toast.error("Failed to load user data");
        }
      }
    };
    fetchFirestoreUser();
  }, [user]);

  useEffect(() => {
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

    fetchNotebooks();
  }, [firestoreUser]);

  useEffect(() => {
    const fetchStudyGuide = async () => {
      if (params.studyGuideId) {
        try {
          const studyGuideRef = doc(
            db,
            "studyGuides",
            params.studyGuideId as string
          );
          const studyGuideSnap = await getDoc(studyGuideRef);

          if (studyGuideSnap.exists()) {
            const data = studyGuideSnap.data();
            // Convert Firestore Timestamp to Date object
            const createdAtDate = data.createdAt?.toDate?.() || new Date();

            setStudyGuide({
              id: studyGuideSnap.id,
              title: data.title,
              content: data.content,
      // Add notebookId with empty string fallback
 
              createdAt: createdAtDate,
              userId: data.userId || "",
            });
          }
        } catch (error) {
          console.error("Error fetching study guide:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchStudyGuide();
  }, [params.studyGuideId]);

  const renderNotebookList = () => {
   

    if (isLoadingNotebooks) {
      return (
        <div className="flex w-full items-center justify-center p-4">
          <RefreshCw className="h-6 w-6 animate-spin" />
        </div>
      );
    }

    if (!notebooks || notebooks.length === 0) {
      return (
        <div className="text-center p-4 text-gray-500">
          No notebooks found. Please create a notebook first.
        </div>
      );
    }

    return (
      <div className="space-y-2 p-2">
        {notebooks.map((notebook) => (
          <div
            key={notebook.id}
            className="border rounded-xl p-1 bg-white border-slate-400"
          >
            <div className="flex items-center justify-between p-3 bg-white text-slate-600">
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
    <Card className="p-6 bg-white shadow-none border-none w-full h-full max-h-[calc(100vh-100px)]  px-8  mt-12">
      <div className="flex justify-between items-center mb-4 w-full">
        <Link href="/">
          <Button
            variant="ghost"
            className="gap-2 text-slate-600 flex items-center justify-center w-fit"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>

        <Button
          variant="ghost"
          className="gap-2 text-red-500 flex items-center justify-center w-fit border border-red-500 rounded-full"
          onClick={() => onDelete(guide.id)}
        >
          <Trash2 className="h-4 w-4" />
          Delete Guide
        </Button>

        <Button
          variant="ghost"
          className="gap-2 text-slate-600 flex items-center justify-center w-fit border border-slate-600 rounded-full"
          onClick={() => setShowModal(true)}
        >
          + Create New Guide
        </Button>
      </div>

      <div className="shadow-none border-none p-4  h-full max-h-[calc(100vh-100px)] overflow-y-auto">
        <div className="flex flex-row items-center justify-between w-full  px-4    pb-2">
          {isEditing ? (
            <div className="flex items-center gap-2 flex-1 mr-4 w-full  ">
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                className="text-xl font-bold text-[#94b347] p-2 border-none text-center flex items-center justify-center w-fit border border-slate-600 rounded-lg"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSaveTitle}
                  className="text-green-600 hover:text-green-700 "
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="flex items-center rounded-lg w-fit  justify-center hover:cursor-pointer "
              onClick={() => setIsEditing(true)}
            >
              <h3 className="text-2xl font-bold text-[#94b347]  rounded-lg cursor-pointer hover:text-[#7a943a]">
                Study Guide:{" "}
                <span className="text-slate-500">{guide.title}</span>
              </h3>
            </div>
          )}
        </div>

        {guide.content.map((section, sectionIndex) => (
          <div key={sectionIndex} className="  rounded-lg pb-4 ">
            <h4 className="text-lg font-semibold text-slate-800 mb-2 pl-4">
              Topic: {section.topic}
            </h4>
            <p className="text-sm text-gray-500 pl-4 mb-4  ">
              Created: {guide.createdAt.toLocaleDateString()}
            </p>

            <div className="space-y-4">
              {section.subtopics.map((subtopic, subtopicIndex) => (
                <div key={subtopicIndex} className="bg-white p-4 rounded-lg ">
                  <h5 className="text-md font-semibold text-[#94b347] mb-2">
                    {subtopic.title}
                  </h5>
                  <p className="text-slate-600 mb-3">{subtopic.description}</p>

                  {/* Key Points */}
                  <div className="mb-3">
                    <h6 className="text-sm font-semibold text-slate-700 mb-2">
                      Key Points:
                    </h6>
                    <ul className="list-disc pl-5 space-y-1">
                      {subtopic.keyPoints.map((point, index) => (
                        <li key={index} className="text-slate-600">
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Examples */}
                  {subtopic.examples && subtopic.examples.length > 0 && (
                    <div className="mb-3">
                      <h6 className="text-sm font-semibold text-slate-700 mb-2">
                        Examples:
                      </h6>
                      <ul className="list-disc pl-5 space-y-1">
                        {subtopic.examples.map((example, index) => (
                          <li key={index} className="text-slate-600">
                            {example}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Study Tips */}
                  {subtopic.studyTips && subtopic.studyTips.length > 0 && (
                    <div className="bg-[#dae9b6] p-3 rounded-lg mt-3">
                      <h6 className="text-sm font-semibold text-slate-700 mb-2">
                        Study Tips:
                      </h6>
                      <ul className="list-disc pl-5 space-y-1">
                        {subtopic.studyTips.map((tip, index) => (
                          <li key={index} className="text-slate-600">
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="container mx-auto p-10 m-10">
      {showModal && (
        
          <StudyGuideModal
          guideName={guideName}
          setGuideName={setGuideName}
          files={files}
          handleFileUpload={handleFileUpload}
          handleClear={handleClear}
          fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
          messages={messages}
          handleSendMessage={handleSendMessage}
          showUpload={showUpload}
          setShowUpload={setShowUpload}
          renderNotebookSelection={renderNotebookList}
          onClose={() => setShowModal(false)}
          handleGenerateGuide={handleGenerateGuide}
          isGenerating={isGenerating}
          filesToUpload={filesToUpload}
          selectedPages={selectedPages}
          setIsGenerating={setIsGenerating}
        />
      
        
      )}
        </div>
    </Card>
  );
}
