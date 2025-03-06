import { db, storage } from "@/firebase";
import {
  deleteStudyCardSet,
  getStudyCardsByClerkId,
  getStudyCardSets,
  getUserByClerkId,
  saveStudyCardSet,
} from "@/lib/firebase/firestore";
import { fileUpload } from "@/lib/utils";
import { Notebook, Page } from "@/types/notebooks";
import { StudySetMetadata } from "@/types/studyCards";
import { UserResource } from "@clerk/types";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import { toast } from "react-hot-toast";
import { uploadLargeFile } from "../fileUpload";
import { Timestamp } from "firebase/firestore";

interface ExtendedNotebook extends Omit<Notebook, 'createdAt' | 'updatedAt'> {
  createdAt: Timestamp | { seconds: number; nanoseconds: number } | string | number;
  updatedAt?: Timestamp | { seconds: number; nanoseconds: number } | string | number;
}

interface GenerateCardsParams {
  setName: string;
  numCards: number;
  selectedPages: { [notebookId: string]: string[] };
  filesToUpload: File[];
  notebooks: Notebook[];
  userId: string;
}

export const toggleAnswer = (
  showAnswer: Record<string, boolean>,
  cardIndex: number
) => {
  return {
    ...showAnswer,
    [cardIndex]: !showAnswer[cardIndex],
  };
};

export const handleDeleteSet = async (
  notebookId: string,
  pageId: string,
  setId: string,
  selectedSetId: string | null,
  loadCardSets: () => Promise<void>,
  setSelectedSet: (set: any) => void
) => {
  try {
    if (window.confirm("Are you sure you want to delete this study set?")) {
      await deleteStudyCardSet(notebookId, pageId, setId);
      await loadCardSets();
      if (selectedSetId === setId) {
        setSelectedSet(null);
      }
    }
  } catch (error) {
    console.error("Error deleting study card set:", error);
  }
};

export const toggleNotebookExpansion = (
  notebookId: string,
  expandedNotebooks: Set<string>
) => {
  const newSet = new Set(expandedNotebooks);
  if (newSet.has(notebookId)) {
    newSet.delete(notebookId);
  } else {
    newSet.add(notebookId);
  }
  return newSet;
};

export const isNotebookFullySelected = (
  notebookId: string,
  pages: any[],
  selectedPages: { [notebookId: string]: string[] }
) => {
  return pages.every((page) => selectedPages[notebookId]?.includes(page.id));
};

export const handleNotebookSelection = (
  notebookId: string,
  pages: Page[],
  isSelected: boolean,
  selectedPages: { [notebookId: string]: string[] }
) => {
  return {
    ...selectedPages,
    [notebookId]: isSelected ? pages.map((p) => p.id) : [],
  };
};

export const handleUpdateTitle = async (
  setId: string,
  newTitle: string,
  loadCardSets: () => Promise<void>,
  setEditingListId: (id: string | null) => void
) => {
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

export const loadCardSets = (
  pageId: string,
  setCardSets: (sets: any[]) => void,
  clerkUserId: string
) => {
  return async () => {
    try {
      const sets = await getStudyCardSets(pageId);
      const userStudyCards = await getStudyCardsByClerkId(clerkUserId);
      setCardSets(userStudyCards);
    } catch (error) {
      console.error("Error loading study card sets:", error);
    }
  };
};

export const handleFileUpload = (
  event: React.ChangeEvent<HTMLInputElement>,
  setFiles: (files: File[]) => void
) => {
  fileUpload(event, setFiles);
};

export const handleClear = (
  setMessages: (messages: any[]) => void,
  setFiles: (files: File[]) => void
) => {
  setMessages([]);
  setFiles([]);
};

export const loadAllNotebooks = async (
  setIsLoadingNotebooks: (loading: boolean) => void,
  setNotebooks: (notebooks: ExtendedNotebook[]) => void,
  user: any
) => {
  try {
    setIsLoadingNotebooks(true);

    if (!user) {
      console.log("No user found");
      setNotebooks([]);
      return;
    }

    const firestoreUser = await getUserByClerkId(user.id);

    console.log("User IDs:", {
      clerkUserId: user.id,
      firestoreUserId: firestoreUser?.id,
    });

    if (!firestoreUser) {
      console.error("No Firestore user found for Clerk ID:", user.id);
      return;
    }

    const notebooksRef = collection(db, "notebooks");

    const allNotebooks = await getDocs(collection(db, "notebooks"));
    console.log(
      "All notebooks:",
      allNotebooks.docs.map((doc) => ({
        notebookId: doc.id,
        userId: doc.data().userId,
        title: doc.data().title,
      }))
    );

    const q = query(notebooksRef, where("userId", "==", firestoreUser.id));
    const querySnapshot = await getDocs(q);

    console.log("Query results for Firestore userId:", {
      firestoreUserId: firestoreUser.id,
      matchCount: querySnapshot.docs.length,
    });

    const fetchedNotebooks: ExtendedNotebook[] = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || "",
        userId: data.userId || "",
        pages: data.pages || [],
        createdAt: data.createdAt?.toDate() || new Date(),
      };
    });

    console.log("Final processed notebooks:", fetchedNotebooks);
    setNotebooks(fetchedNotebooks);
  } catch (error) {
    console.error("Error loading notebooks:", error);
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
      });
    }
  } finally {
    setIsLoadingNotebooks(false);
  }
};

export const handlePageSelection = (
  notebookId: string,
  pageId: string,
  isSelected: boolean,
  selectedPages: { [notebookId: string]: string[] }
) => {
  const updatedPages = { ...selectedPages };
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
};

export const handleSelectAllPages = (
  notebookId: string,
  isSelected: boolean,
  notebooks: ExtendedNotebook[],
  prev: { [notebookId: string]: string[] }
) => {
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
};

export const handleGenerateCards = async (
  setName: string,
  numCards: number,
  selectedPages: { [notebookId: string]: string[] },
  filesToUpload: File[],
  notebooks: ExtendedNotebook[],
  isGenerating: boolean,
  setIsGenerating: (isGenerating: boolean) => void,
  setShowNotebookModal: (show: boolean) => void,
  setSelectedPages: (pages: { [notebookId: string]: string[] }) => void,
  setSetName: (name: string) => void,
  setFilesToUpload: (files: File[]) => void,
  setFiles: (files: File[]) => void,
  setMessages: (messages: any[]) => void,
  userId: string
) => {
  try {
    if (!userId) {
      throw new Error("User not authenticated");
    }

    if (!setName.trim()) {
      throw new Error("Please enter a name for the study set");
    }

    setIsGenerating(true);

    // Process uploaded files
    const processedFiles = [];
    for (const file of filesToUpload) {
      try {
        const downloadURL = await uploadLargeFile(file);
        const response = await fetch("/api/convert-from-storage", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileUrl: downloadURL,
            fileName: file.name,
            fileType: file.type,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to convert file: ${file.name}`);
        }

        const data = await response.json();
        processedFiles.push({
          name: file.name,
          path: downloadURL,
          content: data.text,
        });
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        throw error;
      }
    }

    // Create the request body - following the study guide pattern
    const requestBody = {
      selectedPages, // Pass the raw selectedPages object
      setName,
      numCards,
      uploadedDocs: processedFiles,
    };

    console.log("Sending request to generate cards:", requestBody);

    // Make the API request
    const response = await fetch("/api/studycards", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("API Error Response:", errorData);
      throw new Error(errorData.error || "Failed to generate cards");
    }

    const result = await response.json();
    console.log("Received study cards result:", result);

    if (!result.cards) {
      throw new Error("No cards received from study cards generation");
    }

    // Save to Firestore
    await saveStudyCardSet(
      result.cards,
      {
        name: setName,
        createdAt: new Date().toISOString(),
        cardCount: numCards,
        userId: userId,
        sourceNotebooks: Object.keys(selectedPages).map((notebookId) => ({
          notebookId,
          notebookTitle:
            notebooks.find((n) => n.id === notebookId)?.title || "Untitled",
        })),
      },
      userId
    );

    // Clear form and close modal
    setShowNotebookModal(false);
    setSelectedPages({});
    setSetName("");
    setFilesToUpload([]);
    setFiles([]);
    setMessages([]);

    return result.cards;
  } catch (error) {
    console.error("Error in handleGenerateCards:", error);
    throw error;
  } finally {
    setIsGenerating(false);
  }
};

export const generateCards = async ({
  setName,
  numCards,
  selectedPages,
  filesToUpload,
  notebooks,
  userId
}: GenerateCardsParams) => {
  // ... implementation ...
};
