"use client";

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
import { StudyGuide } from "@/types/studyGuide"; // Make sure to export the interface from StudyGuide.tsx
import { User } from "@/types/users";
import { useAuth, useUser } from "@clerk/nextjs";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast"; // Add this import
import { v4 as uuidv4 } from "uuid"; // Add this for generating pageId
import StudyGuideModal from "./StudyGuideModal";

interface StudyGuidePageProps {
  guide: StudyGuide;
  onDelete: (id: string) => Promise<void>;
  onUpdateTitle: (id: string, newTitle: string) => Promise<void>;
  onGenerateGuide: (
    guideName: string,
    filesToUpload: File[],
    selectedPages: { [key: string]: string[] }
  ) => Promise<any>;
  navigateHome?: () => void;
}

export function StudyGuidePage({
  guide,
  onDelete,
  onUpdateTitle,
  onGenerateGuide,
  navigateHome,
}: StudyGuidePageProps) {
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
      setIsGenerating(true);
      const success = await onGenerateGuide(
        guideName,
        filesToUpload,
        selectedPages
      );

      if (success) {
        // Reset form and close modal
        setGuideName("");
        setFiles([]);
        setFilesToUpload([]);
        setSelectedPages({});
        setShowModal(false);

        // Use the callback from the parent
        if (navigateHome) {
          navigateHome();
        }
      }
    } catch (error) {
      console.error("Error in handleGenerateGuide:", error);
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
    <Card className="py-6 bg-white overflow-hidden shadow-none border-none w-full h-full    mt-12">
      <div className="flex justify-between items-center mb-4 w-full">
        <Link href="/">
          <Button
            variant="ghost"
            className="gap-2 text-slate-600 flex items-center justify-center w-fit hover:bg-slate-100 rounded-full"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden md:block">Back to Dashboard</span>
            <span className="md:hidden">Back</span>
          </Button>
        </Link>
        <div className="flex flex-row gap-4">
          {/* <Button
          variant="ghost"
          className="gap-2 text-red-500 flex items-center justify-center w-fit border border-red-500 rounded-full"
          onClick={() => onDelete(guide.id)}
        >
          <Trash2 className="h-4 w-4" />
          <span className="hidden md:block">Delete Guide</span>
        </Button> */}

          <Button
            variant="ghost"
            className="gap-2 text-slate-600 flex items-center justify-center w-fit border border-slate-600 rounded-full"
            onClick={() => setShowModal(true)}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden md:block">Create New Guide</span>
          </Button>
        </div>
      </div>

      <div className="shadow-none border-none p-4   h-full max-h-[calc(100vh-100px)] overflow-y-auto">
        <div className="flex flex-row items-center justify-between w-full  px-4    pb-2">
          {isEditing ? (
            <div className="flex items-center gap-2 flex-1 mr-4 w-full  ">
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                className="text-slate-500 max-w-56  flex items-center gap-2 border-none shadow-none text-xl border border-slate-300 rounded-lg px-2  font-bold w-full"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSaveTitle}
                  className="text-green-600 hover:text-green-700 "
                >
                  <Check className="h-4 w-4" />
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
            <div className="flex items-center rounded-lg w-fit  justify-center hover:cursor-pointer ">
              <h3 className="text-2xl  text-[#94b347]  rounded-lg cursor-pointer ">
                Study Guide:{" "}
                <span className="text-slate-800 font-bold">{guide.title}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="hover:bg-white"
                >
                  <Pencil className="h-4 w-4 text-slate-600 " />
                </Button>
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
            onClose={() => {
              // setShowModal(false);
              // if (navigateHome) {
              //   navigateHome();
              // }
              router.push("/");
            }}
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
