"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import FormattedText from "@/components/ui/formatted-text";
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
    <div className="w-full mx-auto h-full py-4">
      <Card className=" border-none w-full h-screen  bg-white pb-24  shadow-none  rounded-xl  overflow-y-hidden  ">
        <div className="flex justify-between items-center mb-6 w-full pb-42">
          <Link href="/">
            <Button
              variant="ghost"
              className="gap-2 text-slate-400 flex items-center justify-center w-fit hover:bg-transparent hover:text-slate-600 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden md:block">Back to Dashboard</span>
              <span className="md:hidden">Back</span>
            </Button>
          </Link>
          <div className="flex flex-row gap-4">
            <Button
              variant="ghost"
              className="gap-2 text-slate-600 flex items-center justify-center w-fit border border-slate-300 rounded-full hover:bg-slate-50 transition-colors"
              onClick={() => setShowModal(true)}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden md:block">Create New Guide</span>
            </Button>
          </div>
        </div>

        <div className="px-4 h-full  bg-white pb-42 overflow-y-hidden">
          <div className="flex flex-row items-center justify-center w-full pb-6 border-b border-slate-100">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="border border-slate-300 rounded-md px-3 py-2 text-[#94b347] focus:outline-none focus:border-[#94b347] text-base sm:text-lg font-semibold"
                  autoFocus
                />
                <button
                  onClick={handleSave}
                  className="p-2 hover:bg-green-100 rounded-full transition-colors"
                >
                  <Check className="h-4 w-4 text-green-600" />
                </button>
                <button
                  onClick={handleCancel}
                  className="p-2 hover:bg-red-100 rounded-full transition-colors"
                >
                  <X className="h-4 w-4 text-red-600" />
                </button>
              </div>
            ) : (
              <div
                className="flex items-center rounded-lg justify-center hover:cursor-pointer"
                onClick={() => setIsEditing(true)}
              >
                <h3 className="text-2xl text-[#94b347] rounded-lg cursor-pointer">
                  Study Guide:{" "}
                  <span className="text-slate-600 font-bold">
                    {guide.title}
                  </span>
                </h3>
                <div
                  className="flex items-center justify-center rounded-lg ml-2 h-8 w-8 hover:bg-slate-100 transition-colors"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-4 w-4 text-slate-500 hover:text-[#7a943a]" />
                </div>
              </div>
            )}
          </div>
<div className="bg-blue-500 overflow-y-auto h-full pb-72">

{guide.content.map((section, sectionIndex) => (
            <div key={sectionIndex} className="rounded-lg py-6 ">
              <div className="text-center mb-6">
                <h4 className="text-xl font-semibold text-slate-800 mb-2">
                  <FormattedText text={section.topic} />
                </h4>
                <p className="text-sm text-gray-500">
                  Created: {guide.createdAt.toLocaleDateString()}
                </p>
              </div>

              <div className="grid gap-6 w-full mx-auto pb-32 md:pb-24">
                {section.subtopics.map((subtopic, subtopicIndex) => (
                  <div
                    key={subtopicIndex}
                    className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
                  >
                    <h5 className="text-lg font-semibold text-[#94b347] mb-3">
                      <FormattedText text={subtopic.title} />
                    </h5>
                    <p className="text-slate-600 mb-4 leading-relaxed">
                      <FormattedText text={subtopic.description} />
                    </p>

                    <div className="mb-4 bg-slate-50 p-4 rounded-lg">
                      <h6 className="text-sm font-semibold text-slate-700 mb-2 flex items-center">
                        <span className="h-1.5 w-1.5 bg-[#94b347] rounded-full mr-2"></span>
                        Key Points:
                      </h6>
                      <ul className="list-disc pl-5 space-y-2">
                        {subtopic.keyPoints.map((point, index) => (
                          <li key={index} className="text-slate-600">
                            <FormattedText text={point} />
                          </li>
                        ))}
                      </ul>
                    </div>

                    {subtopic.examples && subtopic.examples.length > 0 && (
                      <div className="mb-4 bg-slate-50 p-4 rounded-lg">
                        <h6 className="text-sm font-semibold text-slate-700 mb-2 flex items-center">
                          <span className="h-1.5 w-1.5 bg-[#94b347] rounded-full mr-2"></span>
                          Examples:
                        </h6>
                        <ul className="list-disc pl-5 space-y-2">
                          {subtopic.examples.map((example, index) => (
                            <li key={index} className="text-slate-600">
                              <FormattedText text={example} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {subtopic.studyTips && subtopic.studyTips.length > 0 && (
                      <div className="bg-[#eef5db] p-4 rounded-lg mt-4 border-l-4 border-[#94b347]">
                        <h6 className="text-sm font-semibold text-slate-700 mb-2 flex items-center">
                          <span className="h-1.5 w-1.5 bg-[#94b347] rounded-full mr-2"></span>
                          Study Tips:
                        </h6>
                        <ul className="list-disc pl-5 space-y-2">
                          {subtopic.studyTips.map((tip, index) => (
                            <li key={index} className="text-slate-600">
                              <FormattedText text={tip} />
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
          
        </div>

        <div className="w-full mx-auto p-4 mt-4">
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
    </div>
  );
}
