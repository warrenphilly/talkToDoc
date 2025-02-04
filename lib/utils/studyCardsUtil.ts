import { Page, Notebook } from "@/types/notebooks";
import { doc, updateDoc, serverTimestamp, collection, getDocs, orderBy, query, getDoc, where } from "firebase/firestore";
import { db, storage } from "@/firebase";
import { toast } from "react-hot-toast";
import { deleteStudyCardSet, getStudyCardsByClerkId, getStudyCardSets, getUserByClerkId, saveStudyCardSet } from "@/lib/firebase/firestore";
import { fileUpload } from "@/lib/utils";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import { StudySetMetadata } from "@/types/studyCards";
import { UserResource } from "@clerk/types";

export const toggleAnswer = (showAnswer: Record<string, boolean>, cardIndex: number) => {
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
  pages: Page[],
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

export const loadCardSets = (pageId: string, setCardSets: (sets: any[]) => void, clerkUserId: string) => {
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
  setIsLoadingNotebooks: (isLoading: boolean) => void, 
  setNotebooks: (notebooks: Notebook[]) => void, 
  user: UserResource | null | undefined
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

    const fetchedNotebooks: Notebook[] = querySnapshot.docs.map((doc) => {
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
  notebooks: Notebook[],
  selectedPages: { [notebookId: string]: string[] }
) => {
  const updatedPages = { ...selectedPages };
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
  filesToUpload: File[],
  selectedPages: { [notebookId: string]: string[] },
  numCards: number,
  notebooks: Notebook[],
  notebookId: string,
  pageId: string,
  setIsGenerating: (generating: boolean) => void,
  loadCardSets: () => Promise<void>,
  setShowNotebookModal: (show: boolean) => void,
  setSelectedPages: (pages: { [notebookId: string]: string[] }) => void,
  setSetName: (name: string) => void,
  setFilesToUpload: (files: File[]) => void,
  setFiles: (files: File[]) => void,
  setMessages: (messages: any[]) => void
) => {
  try {
    if (!setName.trim()) {
      alert("Please enter a name for the study set");
      return;
    }

    if (filesToUpload.length === 0 && Object.keys(selectedPages).length === 0) {
      alert("Please either upload files or select notebook pages");
      return;
    }

    setIsGenerating(true);
    const allText: string[] = [];
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

    await saveStudyCardSet(notebookId, pageId, data.cards, metadata);

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