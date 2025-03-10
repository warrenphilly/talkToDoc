"use server";

import { StudyGuide } from "@/components/shared/study/StudyGuide";
import { db, storage } from "@/firebase";
import { ContextSection, Message } from "@/lib/types";
import type { QuizState } from "@/types/quiz";
import { StudyCard, StudyCardSet, StudySetMetadata } from "@/types/studyCards";
import { auth, currentUser } from "@clerk/nextjs/server";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  FieldValue,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  Transaction,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import { getCurrentUserId } from "../auth";

export interface Page {
  id: string;
  title: string;
  content: string;
  messages: Message[];
  isOpen: boolean;
  markdownRefs?: {
    url: string;
    path: string;
    timestamp: string;
  }[];
  studyGuide?: {
    content: string;
    updatedAt: Date;
  };
  studyCardSetRefs?: string[];
  studyDocs?: {
    url: string;
    path: string;
    name: string;
    timestamp: string;
  }[];
  quizzes?: QuizState[];
}

export interface Notebook {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  pages: Page[];
}

export interface ClerkUser {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  imageUrl?: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface FirestoreUser {
  id: string;
  clerkId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  notebooks: string[]; // Array of notebook IDs
  metadata?: Record<string, any>;
  creditBalance: number;
  language?: string;
}

interface SideChat {
  id: string;
  notebookId: string;
  pageId: string;
  contextSections: ContextSection[];
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

// export const notebooksCollection = collection(db, "notebooks");

export const saveNote = async (
  notebookId: string,
  pageId: string,
  messages: Message[]
) => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("User not authenticated");

    const notebookRef = doc(db, "notebooks", notebookId);
    const notebookSnap = await getDoc(notebookRef);

    if (!notebookSnap.exists()) {
      throw new Error("Notebook not found");
    }

    const notebook = notebookSnap.data() as Notebook;
    const pageIndex = notebook.pages.findIndex((p) => p.id === pageId);

    if (pageIndex === -1) {
      throw new Error("Page not found in notebook");
    }

    notebook.pages[pageIndex].messages = messages;

    await updateDoc(notebookRef, {
      pages: notebook.pages,
    });
  } catch (error) {
    console.error("Error saving messages:", error);
    throw error;
  }
};

// Add interfaces for serialized types
interface SerializedTimestamp {
  seconds: number;
  nanoseconds: number;
}

interface TimestampLike {
  seconds: number;
  nanoseconds: number;
  toDate?: () => Date;
}

interface SerializedStudyGuide {
  content: string;
  updatedAt: SerializedTimestamp | null;
}

interface SerializedMarkdownRef {
  url: string;
  path: string;
  timestamp: string | SerializedTimestamp;
}

interface SerializedStudyDoc {
  url: string;
  path: string;
  name: string;
  timestamp: string | SerializedTimestamp;
}

interface SerializedPage
  extends Omit<Page, "studyGuide" | "markdownRefs" | "studyDocs"> {
  studyGuide?: SerializedStudyGuide;
  markdownRefs?: SerializedMarkdownRef[];
  studyDocs?: SerializedStudyDoc[];
}

export const getNote = async (
  notebookId: string,
  pageId: string
): Promise<SerializedPage | null> => {
  try {
    const notebookRef = doc(db, "notebooks", notebookId);
    const notebookSnap = await getDoc(notebookRef);

    if (!notebookSnap.exists()) {
      return null;
    }

    const notebook = notebookSnap.data() as Notebook;
    const page = notebook.pages.find((p) => p.id === pageId);

    if (!page) return null;

    // Serialize timestamps and dates to plain objects
    const serializedPage: SerializedPage = {
      ...page,
      studyGuide: page.studyGuide
        ? {
            content: page.studyGuide.content,
            updatedAt: page.studyGuide.updatedAt
              ? {
                  seconds:
                    page.studyGuide.updatedAt instanceof Date
                      ? Math.floor(page.studyGuide.updatedAt.getTime() / 1000)
                      : (page.studyGuide.updatedAt as TimestampLike).seconds,
                  nanoseconds:
                    page.studyGuide.updatedAt instanceof Date
                      ? 0
                      : (page.studyGuide.updatedAt as TimestampLike)
                          .nanoseconds || 0,
                }
              : null,
          }
        : undefined,
      markdownRefs: page.markdownRefs?.map((ref) => ({
        url: ref.url,
        path: ref.path,
        timestamp:
          typeof ref.timestamp === "string"
            ? ref.timestamp
            : {
                seconds: Math.floor(new Date(ref.timestamp).getTime() / 1000),
                nanoseconds: 0,
              },
      })),
      studyDocs: page.studyDocs?.map((doc) => ({
        url: doc.url,
        path: doc.path,
        name: doc.name,
        timestamp:
          typeof doc.timestamp === "string"
            ? doc.timestamp
            : {
                seconds: Math.floor(new Date(doc.timestamp).getTime() / 1000),
                nanoseconds: 0,
              },
      })),
    };

    return serializedPage;
  } catch (error) {
    console.error("Error getting note:", error);
    throw error;
  }
};

export const createNewNotebook = async (title: string): Promise<string> => {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) throw new Error("User not authenticated");

    // Get or create user document
    let user = await getUserByClerkId(clerkUser.id);

    if (!user) {
      user = await getUserByClerkId(clerkUser.id);
      if (!user) throw new Error("Failed to create user");
    }

    const notebookId = `notebook_${crypto.randomUUID()}`;
    const firstPageId = `page_${crypto.randomUUID()}`;
    const now = new Date().toISOString(); // Use ISO string for dates

    const notebookData: Notebook = {
      id: notebookId,
      title,
      createdAt: now,
      updatedAt: now,
      userId: user.id,
      pages: [
        {
          id: firstPageId,
          title: "Untitled Page",
          content: "",
          messages: [],
          isOpen: true,
        },
      ],
    };

    // Create the notebook
    await setDoc(doc(db, "notebooks", notebookId), {
      ...notebookData,
      createdAt: serverTimestamp(), // Use server timestamp for Firestore
      updatedAt: serverTimestamp(),
    });

    // Update user's notebooks array
    await updateDoc(doc(db, "users", user.id), {
      notebooks: [...(user.notebooks || []), notebookId],
      updatedAt: serverTimestamp(),
    });

    // Return the serialized notebook data
    return notebookId;
  } catch (error) {
    console.error("Error creating notebook:", error);
    throw error;
  }
};

export const getAllNotebooks = async (): Promise<Notebook[]> => {
  try {
    const userId = await getCurrentUserId();
    console.log("[getAllNotebooks] Fetching for userId:", userId);

    const notesCollection = collection(db, "notebooks");
    const q = query(
      notesCollection,
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    console.log("[getAllNotebooks] Executing query...");
    const querySnapshot = await getDocs(q);
    console.log("[getAllNotebooks] Total documents found:", querySnapshot.size);

    // Helper function to serialize timestamps and dates
    const serializeTimestamp = (timestamp: any) => {
      if (!timestamp) return null;
      if (timestamp instanceof Date) {
        return timestamp.toISOString();
      }
      if (timestamp?.toDate) {
        return timestamp.toDate().toISOString();
      }
      if (timestamp?.seconds) {
        return new Date(timestamp.seconds * 1000).toISOString();
      }
      return timestamp;
    };

    // Serialize the notebooks data
    const notebooks = querySnapshot.docs.map((doc) => {
      const data = doc.data();

      // Serialize the notebook-level dates
      const serializedNotebook = {
        id: doc.id,
        title: data.title,
        userId: data.userId,
        createdAt: serializeTimestamp(data.createdAt),
        updatedAt: serializeTimestamp(data.updatedAt),
        pages: data.pages.map((page: any) => ({
          ...page,
          // Serialize dates in study guide
          studyGuide: page.studyGuide
            ? {
                ...page.studyGuide,
                updatedAt: serializeTimestamp(page.studyGuide.updatedAt),
              }
            : undefined,
          // Serialize dates in markdown refs
          markdownRefs: page.markdownRefs?.map((ref: any) => ({
            ...ref,
            timestamp: serializeTimestamp(ref.timestamp),
          })),
          // Serialize dates in study docs
          studyDocs: page.studyDocs?.map((doc: any) => ({
            ...doc,
            timestamp: serializeTimestamp(doc.timestamp),
          })),
        })),
      };

      return serializedNotebook;
    });

    // Final safety check to ensure everything is serializable
    const serializedNotebooks = JSON.parse(JSON.stringify(notebooks));

    console.log("[getAllNotebooks] Processed notebooks:", serializedNotebooks);
    return serializedNotebooks;
  } catch (error) {
    console.error("[getAllNotebooks] Error:", error);
    throw error;
  }
};

export const addPageToNotebook = async (
  notebookId: string,
  pageTitle: string
): Promise<Page> => {
  try {
    const notebookRef = doc(db, "notebooks", notebookId);
    const notebookSnap = await getDoc(notebookRef);

    if (!notebookSnap.exists()) {
      throw new Error("Notebook not found");
    }

    const notebook = notebookSnap.data() as Notebook;
    const newPage: Page = {
      id: `page_${Date.now()}`,
      title: pageTitle,
      content: "",
      messages: [],
      isOpen: true,
    };

    const updatedPages = [...notebook.pages, newPage];
    await updateDoc(notebookRef, {
      pages: updatedPages,
    });

    return newPage;
  } catch (error) {
    console.error("Error adding page:", error);
    throw error;
  }
};

export const deleteNotebook = async (notebookId: string) => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("User not authenticated");

    // Delete the notebook document first
    await deleteDoc(doc(db, "notebooks", notebookId));

    // Try to update user document if it exists, but don't fail if it doesn't
    try {
      const userDoc = await getUserById(userId);
      if (userDoc && userDoc.notebooks) {
        const updatedNotebooks = userDoc.notebooks.filter(
          (id) => id !== notebookId
        );
        await updateDoc(doc(db, "users", userId), {
          notebooks: updatedNotebooks,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.warn(
        "Could not update user document, but notebook was deleted:",
        error
      );
    }

    // Delete all associated study card sets
    const studyCardSetsRef = collection(db, "studyCardSets");
    const studyCardSetsQuery = query(
      studyCardSetsRef,
      where("notebookId", "==", notebookId)
    );
    const studyCardSets = await getDocs(studyCardSetsQuery);

    // Use Promise.all to ensure all deletions complete
    await Promise.all(studyCardSets.docs.map((doc) => deleteDoc(doc.ref)));

    // Delete all associated quizzes
    const quizzesRef = collection(db, "quizzes");
    const quizzesQuery = query(
      quizzesRef,
      where("notebookId", "==", notebookId)
    );
    const quizzes = await getDocs(quizzesQuery);

    // Use Promise.all to ensure all deletions complete
    await Promise.all(quizzes.docs.map((doc) => deleteDoc(doc.ref)));
  } catch (error) {
    console.error("Error deleting notebook:", error);
    throw error;
  }
};

export const deletePage = async (
  notebookId: string,
  pageId: string
): Promise<{ newPageId: string; isNewPage: boolean }> => {
  try {
    const notebookRef = doc(db, "notebooks", notebookId);
    const notebookSnap = await getDoc(notebookRef);

    if (!notebookSnap.exists()) {
      throw new Error("Notebook not found");
    }

    const notebook = notebookSnap.data() as Notebook;

    // Create a new array without the deleted page
    const updatedPages = notebook.pages.filter((page) => page.id !== pageId);

    let newPageId: string;
    let isNewPage = false;

    // If this would leave us with no pages, create a new default page
    if (updatedPages.length === 0) {
      const newPage: Page = {
        id: `page_${crypto.randomUUID()}`,
        title: "New Page",
        content: "",
        messages: [],
        isOpen: true,
      };
      updatedPages.push(newPage);
      newPageId = newPage.id;
      isNewPage = true;
    } else {
      // Use the first available page as the redirect target
      newPageId = updatedPages[0].id;
    }

    // Update the notebook document with the new pages array
    await setDoc(
      notebookRef,
      {
        ...notebook,
        pages: updatedPages,
      },
      { merge: true }
    );

    // Delete associated study card sets
    const studyCardSetsRef = collection(db, "studyCardSets");
    const studyCardSetsQuery = query(
      studyCardSetsRef,
      where("pageId", "==", pageId)
    );
    const studyCardSets = await getDocs(studyCardSetsQuery);

    for (const doc of studyCardSets.docs) {
      await deleteDoc(doc.ref);
    }

    // Delete associated quizzes
    const quizzesRef = collection(db, "quizzes");
    const quizzesQuery = query(quizzesRef, where("pageId", "==", pageId));
    const quizzes = await getDocs(quizzesQuery);

    for (const doc of quizzes.docs) {
      await deleteDoc(doc.ref);
    }

    return { newPageId, isNewPage };
  } catch (error) {
    console.error("Error deleting page:", error);
    throw error;
  }
};

export const togglePageOpenState = async (
  notebookId: string,
  pageId: string,
  isOpen: boolean
): Promise<void> => {
  try {
    const notebookRef = doc(db, "notebooks", notebookId);
    const notebookSnap = await getDoc(notebookRef);

    if (!notebookSnap.exists()) {
      throw new Error("Notebook not found");
    }

    const notebook = notebookSnap.data() as Notebook;
    const pageIndex = notebook.pages.findIndex((p) => p.id === pageId);

    // If page is not found, just return without throwing an error
    if (pageIndex === -1) {
      console.warn(`Page ${pageId} not found in notebook ${notebookId}`);
      return;
    }

    // Create a new pages array with the updated page
    const updatedPages = [...notebook.pages];
    updatedPages[pageIndex] = {
      ...updatedPages[pageIndex],
      isOpen: isOpen,
    };

    // Update the notebook document with the new pages array
    await setDoc(
      notebookRef,
      {
        ...notebook,
        pages: updatedPages,
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Error toggling page state:", error);
    throw error;
  }
};

export const updatePageTitle = async (
  notebookId: string,
  pageId: string,
  newTitle: string
): Promise<void> => {
  try {
    const notebookRef = doc(db, "notebooks", notebookId);
    const notebookSnap = await getDoc(notebookRef);

    if (!notebookSnap.exists()) {
      throw new Error("Notebook not found");
    }

    const notebook = notebookSnap.data() as Notebook;
    const pageIndex = notebook.pages.findIndex((p) => p.id === pageId);

    if (pageIndex === -1) {
      throw new Error("Page not found in notebook");
    }

    // Update the title for the specific page
    notebook.pages[pageIndex].title = newTitle;

    // Update the notebook document
    await updateDoc(notebookRef, {
      pages: notebook.pages,
    });
  } catch (error) {
    console.error("Error updating page title:", error);
    throw error;
  }
};

export const createNewUser = async (clerkUser: ClerkUser) => {
  try {
    const userId = `user_${crypto.randomUUID()}`;
    const userRef = doc(db, "users", userId);

    await setDoc(userRef, {
      id: userId,
      clerkId: clerkUser.id,
      email: clerkUser.email,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      username: clerkUser.username,
      imageUrl: clerkUser.imageUrl,
      createdAt: new Date(),
      metadata: clerkUser.metadata || {},
      creditBalance: 5000,
    });

    return userId;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

export const createFirestoreUser = async (clerkUser: {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  imageUrl?: string;
  metadata?: Record<string, any>;
  language?: string;
}) => {
  try {
    // Generate a unique Firestore user ID
    const userId = `user_${crypto.randomUUID()}`;
    const userRef = doc(db, "users", userId);

    const userData: FirestoreUser = {
      id: userId,
      clerkId: clerkUser.id,
      email: clerkUser.email,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      username: clerkUser.username,
      imageUrl: clerkUser.imageUrl,
      createdAt: new Date(),
      updatedAt: new Date(),
      notebooks: [], // Initialize empty notebooks array
      metadata: {
        ...(clerkUser.metadata || {}),
        accountStatus: "Free", // Default account status
        isPro: false, // Default pro status
      },
      creditBalance: 5000, // Default credit balance
      language: clerkUser.language || "English", // Default language
    };

    await setDoc(userRef, {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return userId;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

// Helper function to get a user by their Clerk ID
export const getUserByClerkId = async (clerkId: string) => {
  try {
    const usersRef = collection(db, "users");
    const querySnapshot = await getDocs(usersRef);
    const user = querySnapshot.docs.find(
      (doc) => doc.data().clerkId === clerkId
    );

    if (!user) return null;

    // Helper function to serialize timestamps
    const serializeTimestamp = (timestamp: any) => {
      if (!timestamp) return null;
      if (timestamp instanceof Date) {
        return timestamp.toISOString();
      }
      if (timestamp?.toDate) {
        return timestamp.toDate().toISOString();
      }
      if (timestamp?.seconds) {
        return new Date(timestamp.seconds * 1000).toISOString();
      }
      return timestamp;
    };

    // Get the user data and serialize timestamps
    const userData = user.data();
    const serializedUser = {
      ...userData,
      id: user.id,
      createdAt: serializeTimestamp(userData.createdAt),
      updatedAt: serializeTimestamp(userData.updatedAt),
    };

    // Final safety check to ensure everything is serializable
    return JSON.parse(JSON.stringify(serializedUser)) as FirestoreUser;
  } catch (error) {
    console.error("Error getting user:", error);
    throw error;
  }
};

// Helper function to get a user by their Firestore ID
export const getUserById = async (userId: string) => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return null;
    }

    return { id: userSnap.id, ...userSnap.data() } as FirestoreUser;
  } catch (error) {
    console.error("Error getting user:", error);
    throw error;
  }
};

export const saveSideChat = async (
  notebookId: string,
  pageId: string,
  contextSections: ContextSection[],
  messages: Message[]
) => {
  const sideChatsRef = collection(db, "sideChats");
  const newSideChat: SideChat = {
    id: crypto.randomUUID(),
    notebookId,
    pageId,
    contextSections,
    messages,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await setDoc(doc(sideChatsRef, newSideChat.id), newSideChat);
  return newSideChat.id;
};

export const updateSideChat = async (
  sideChatId: string,
  contextSections: ContextSection[],
  messages: Message[]
) => {
  const sideChatRef = doc(db, "sideChats", sideChatId);
  await updateDoc(sideChatRef, {
    contextSections,
    messages,
    updatedAt: Date.now(),
  });
};

export const getSideChat = async (
  notebookId: string,
  pageId: string
): Promise<SideChat | null> => {
  const sideChatsRef = collection(db, "sideChats");
  const q = query(
    sideChatsRef,
    where("notebookId", "==", notebookId),
    where("pageId", "==", pageId)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const data = snapshot.docs[0].data();
  return {
    id: snapshot.docs[0].id,
    notebookId: data.notebookId,
    pageId: data.pageId,
    contextSections: data.contextSections || [],
    messages: data.messages || [],
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  } as SideChat;
};

export const deleteSideChat = async (sideChatId: string) => {
  try {
    const sideChatRef = doc(db, "sideChats", sideChatId);
    await deleteDoc(sideChatRef);
  } catch (error) {
    console.error("Error deleting side chat:", error);
    throw error;
  }
};
export const getUserNotebooks = async (userId: string) => {
  const notebooksRef = collection(db, "notebooks");
  const q = query(notebooksRef, where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => doc.data()) as Notebook[];
};

export const getNotebooksByFirestoreUserId = async (
  firestoreUserId: string
): Promise<Notebook[]> => {
  try {
    const notesCollection = collection(db, "notebooks");
    const q = query(notesCollection, where("userId", "==", firestoreUserId));

    const querySnapshot = await getDocs(q);

    // Helper function to serialize timestamps
    const serializeTimestamp = (timestamp: any): string => {
      if (!timestamp) return "";
      if (timestamp instanceof Date) {
        return timestamp.toISOString();
      }
      if (timestamp?.toDate) {
        return timestamp.toDate().toISOString();
      }
      if (timestamp?.seconds) {
        return new Date(timestamp.seconds * 1000).toISOString();
      }
      return timestamp;
    };

    // Process and serialize each notebook
    const notebooks = querySnapshot.docs.map((doc) => {
      const data = doc.data();

      // Serialize the notebook-level timestamps
      const serializedNotebook = {
        id: doc.id,
        ...data,
        createdAt: serializeTimestamp(data.createdAt),
        updatedAt: serializeTimestamp(data.updatedAt),
        // Process pages array if it exists
        pages:
          data.pages?.map((page: any) => ({
            ...page,
            createdAt: serializeTimestamp(page.createdAt),
            updatedAt: serializeTimestamp(page.updatedAt),
            // Process any nested timestamps in the page
            messages: page.messages?.map((msg: any) => ({
              ...msg,
              timestamp: serializeTimestamp(msg.timestamp),
            })),
            markdownRefs: page.markdownRefs?.map((ref: any) => ({
              ...ref,
              timestamp: serializeTimestamp(ref.timestamp),
            })),
          })) || [],
      };

      return serializedNotebook;
    });

    // Final safety check to ensure everything is serializable
    const serializedNotebooks = JSON.parse(JSON.stringify(notebooks));

    // Sort by createdAt in descending order
    return serializedNotebooks.sort(
      (a: Notebook, b: Notebook) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error("Error getting notebooks by Firestore user ID:", error);
    throw error;
  }
};

export const saveMarkdownToStorage = async (
  notebookId: string,
  pageId: string,
  content: string,
  createNew: boolean = false
): Promise<{ url: string; path: string }> => {
  try {
    // Ensure we have a valid storage instance
    if (!storage) {
      throw new Error("Storage not initialized");
    }

    // Create a reference to the markdown file in storage
    const timestamp = new Date().getTime();
    const markdownPath = `markdown/${notebookId}/${pageId}_${timestamp}.md`;

    // Create storage reference
    const storageRef = ref(storage, markdownPath);

    // Log for debugging
    console.log("Attempting to save to path:", markdownPath);
    console.log("Storage bucket:", storage.app.options.storageBucket);

    // Upload with metadata
    await uploadString(storageRef, content, "raw", {
      contentType: "text/markdown",
      customMetadata: {
        notebookId,
        pageId,
        timestamp: timestamp.toString(),
      },
    });

    // Get the download URL
    const downloadUrl = await getDownloadURL(storageRef);

    // Update the page in Firestore with the markdown reference
    const notebookRef = doc(db, "notebooks", notebookId);
    const notebookSnap = await getDoc(notebookRef);

    if (!notebookSnap.exists()) {
      throw new Error("Notebook not found");
    }

    const notebook = notebookSnap.data() as Notebook;
    const pageIndex = notebook.pages.findIndex((p) => p.id === pageId);

    if (pageIndex === -1) {
      throw new Error("Page not found");
    }

    // Initialize markdownRefs array if it doesn't exist
    if (!notebook.pages[pageIndex].markdownRefs) {
      notebook.pages[pageIndex].markdownRefs = [];
    }

    // Add new reference to the existing array
    notebook.pages[pageIndex].markdownRefs.push({
      url: downloadUrl,
      path: markdownPath,
      timestamp: new Date().toISOString(),
    });

    await updateDoc(notebookRef, {
      pages: notebook.pages,
    });

    return {
      url: downloadUrl,
      path: markdownPath,
    };
  } catch (error) {
    console.error("Error saving markdown to storage:", error);
    // Add more detailed error information
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        // @ts-ignore
        code: error.code,
        // @ts-ignore
        serverResponse: error.serverResponse,
      });
    }
    throw error;
  }
};

interface QuizAnswer {
  answer: string;
  timestamp?: Date | Timestamp | SerializedTimestamp;
}

interface EvaluationResult {
  correct: boolean;
  timestamp?: Date | Timestamp | SerializedTimestamp;
}

interface SerializedQuizState
  extends Omit<
    QuizState,
    "startedAt" | "lastUpdatedAt" | "userAnswers" | "evaluationResults"
  > {
  startedAt: SerializedTimestamp;
  lastUpdatedAt: SerializedTimestamp;
  userAnswers: Array<{
    answer: string;
    timestamp?: SerializedTimestamp;
  }>;
  evaluationResults: Array<{
    correct: boolean;
    timestamp?: SerializedTimestamp;
  }>;
}

const serializeTimestamp = (
  timestamp: Date | Timestamp | SerializedTimestamp
): SerializedTimestamp => {
  if (timestamp instanceof Date) {
    return {
      seconds: Math.floor(timestamp.getTime() / 1000),
      nanoseconds: 0,
    };
  } else if (timestamp instanceof Timestamp) {
    return {
      seconds: timestamp.seconds,
      nanoseconds: timestamp.nanoseconds,
    };
  }
  return timestamp;
};

export const saveQuizState = async (quizState: QuizState): Promise<void> => {
  try {
    const quizRef = doc(db, "quizzes", quizState.id);

    // Deep clone and serialize the quiz state
    const serializedState: SerializedQuizState = {
      ...quizState,
      startedAt: serializeTimestamp(quizState.startedAt),
      lastUpdatedAt: serializeTimestamp(new Date()),
      // Ensure nested objects are also serialized
      quizData: quizState.quizData
        ? JSON.parse(JSON.stringify(quizState.quizData))
        : null,
      userAnswers: Array.isArray(quizState.userAnswers)
        ? quizState.userAnswers.map((answer: QuizAnswer) => ({
            ...answer,
            timestamp: answer.timestamp
              ? serializeTimestamp(answer.timestamp)
              : undefined,
          }))
        : [],
      evaluationResults: Array.isArray(quizState.evaluationResults)
        ? quizState.evaluationResults.map((result: EvaluationResult) => ({
            ...result,
            timestamp: result.timestamp
              ? serializeTimestamp(result.timestamp)
              : undefined,
          }))
        : [],
    };

    // Remove any undefined or function values
    const cleanedState = JSON.parse(JSON.stringify(serializedState));

    await setDoc(quizRef, cleanedState, { merge: true });
  } catch (error) {
    console.error("Error saving quiz state:", error);
    throw error;
  }
};

export const getQuizState = async (
  quizId: string
): Promise<QuizState | null> => {
  try {
    const quizRef = doc(db, "quizzes", quizId);
    const quizSnap = await getDoc(quizRef);

    if (!quizSnap.exists()) {
      return null;
    }

    return quizSnap.data() as QuizState;
  } catch (error) {
    console.error("Error getting quiz state:", error);
    throw error;
  }
};

export const getRecentQuizzes = async (
  pageId: string
): Promise<QuizState[]> => {
  try {
    const quizzesRef = collection(db, "quizzes");
    let querySnapshot;

    try {
      // Query for quizzes with the specific pageId, ordered by startedAt
      const q = query(
        quizzesRef,
        where("pageId", "==", pageId),
        orderBy("startedAt", "desc"),
        limit(5) // Limit to most recent 5 quizzes
      );
      querySnapshot = await getDocs(q);
    } catch (error) {
      console.warn("Falling back to unordered query while index builds");
      const q = query(quizzesRef, where("pageId", "==", pageId));
      querySnapshot = await getDocs(q);
    }

    return querySnapshot.docs.map((doc) => ({
      ...doc.data(),
      startedAt: doc.data().startedAt?.toDate(),
      lastUpdatedAt: doc.data().lastUpdatedAt?.toDate(),
    })) as QuizState[];
  } catch (error) {
    console.error("Error getting recent quizzes:", error);
    throw error;
  }
};

export const deleteQuiz = async (quizId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, "quizzes", quizId));
  } catch (error) {
    console.error("Error deleting quiz:", error);
    throw error;
  }
};

// New functions for study materials
export const saveStudyCard = async (
  notebookId: string,
  pageId: string,
  title: string,
  content: string
): Promise<string> => {
  try {
    const cardId = `card_${crypto.randomUUID()}`;
    const cardRef = doc(db, "studyCards", cardId);

    // Only include the properties defined in StudyCard interface
    const studyCard: StudyCard = {
      title,
      content,
    };

    // Store additional metadata in a separate object
    const cardData = {
      ...studyCard,
      pageId,
      notebookId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(cardRef, cardData);
    return cardId;
  } catch (error) {
    console.error("Error saving study card:", error);
    throw error;
  }
};

export const getStudyCards = async (pageId: string): Promise<StudyCard[]> => {
  try {
    const cardsRef = collection(db, "studyCards");
    const q = query(cardsRef, where("pageId", "==", pageId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => doc.data() as StudyCard);
  } catch (error) {
    console.error("Error getting study cards:", error);
    throw error;
  }
};

export const saveStudyGuide = async (
  notebookId: string,
  pageId: string,
  content: string
): Promise<void> => {
  try {
    // Validate inputs
    if (!notebookId || !pageId || !content) {
      throw new Error("Missing required parameters");
    }

    // Ensure content is a valid string
    const sanitizedContent =
      typeof content === "string" ? content : JSON.stringify(content);

    const notebookRef = doc(db, "notebooks", notebookId);
    const notebookSnap = await getDoc(notebookRef);

    if (!notebookSnap.exists()) throw new Error("Notebook not found");

    const notebook = notebookSnap.data() as Notebook;
    const pageIndex = notebook.pages.findIndex((p) => p.id === pageId);

    if (pageIndex === -1) throw new Error("Page not found");

    // Add or update study guide with sanitized content
    notebook.pages[pageIndex].studyGuide = {
      content: sanitizedContent,
      updatedAt: new Date(),
    };

    await updateDoc(notebookRef, { pages: notebook.pages });
  } catch (error) {
    console.error("Error saving study guide:", error);
    // Add more context to the error
    throw new Error(
      `Failed to save study guide: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

// Add a new function to get study guide content
export const getStudyGuide = async (
  notebookId: string,
  pageId: string
): Promise<{ content: string; updatedAt: Date } | null> => {
  try {
    const notebookRef = doc(db, "notebooks", notebookId);
    const notebookSnap = await getDoc(notebookRef);

    if (!notebookSnap.exists()) return null;

    const notebook = notebookSnap.data() as Notebook;
    const page = notebook.pages.find((p) => p.id === pageId);

    if (!page || !page.studyGuide) return null;

    return {
      content: page.studyGuide.content,
      updatedAt: page.studyGuide.updatedAt,
    };
  } catch (error) {
    console.error("Error getting study guide:", error);
    throw new Error(
      `Failed to get study guide: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

// Helper function to convert Firestore timestamp to Date
const convertTimestampToDate = (timestamp: any): Date => {
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  return new Date();
};

export const saveStudyCardSet = async (
  cards: any[],
  metadata: any,
  userId: string
) => {
  try {
    const studyCardSetId = `studycards_${crypto.randomUUID()}`;
    const timestamp = serverTimestamp();

    const studyCardSetRef = doc(db, "studyCards", studyCardSetId);

    const studyCardSetData = {
      id: studyCardSetId,
      cards,
      metadata,
      createdAt: timestamp,
      updatedAt: timestamp,
      userId: userId,
    };

    await setDoc(studyCardSetRef, studyCardSetData);

    return studyCardSetId;
  } catch (error) {
    console.error("Error saving study card set:", error);
    throw error;
  }
};

export const getStudyCardSets = async (
  pageId: string
): Promise<StudyCardSet[]> => {
  try {
    const user = await currentUser();
    if (!user) throw new Error("User not authenticated");

    const q = query(
      collection(db, "studyCardSets"),
      where("pageId", "==", pageId),
      where("userId", "==", user.id)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        cards: data.cards.map(({ title, content }: StudyCard) => ({
          title,
          content,
        })),
        metadata: {
          ...data.metadata,
          createdAt: convertTimestampToDate(
            data.metadata.createdAt
          ).toISOString(),
        },
        pageId: data.pageId,
        notebookId: data.notebookId,
        createdAt: convertTimestampToDate(data.createdAt).toISOString(),
        updatedAt: convertTimestampToDate(
          data.updatedAt || data.createdAt
        ).toISOString(),
        userId: data.userId,
      };
    });
  } catch (error) {
    console.error("Error getting study card sets:", error);
    throw error;
  }
};

// Get a specific study card set
export const getStudyCardSet = async (
  setId: string
): Promise<StudyCardSet | null> => {
  try {
    const setRef = doc(db, "studyCards", setId);
    const setSnap = await getDoc(setRef);

    if (!setSnap.exists()) {
      console.log("Study card set not found:", setId);
      return null;
    }

    const data = setSnap.data();
    console.log("Raw study card data:", data);

    // Helper function to safely convert timestamps to ISO strings
    const convertTimestamp = (timestamp: any): string => {
      if (!timestamp) return new Date().toISOString();
      if (timestamp.toDate) {
        return timestamp.toDate().toISOString();
      }
      if (timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toISOString();
      }
      return new Date(timestamp).toISOString();
    };

    // Create a serialized version of the study card set with simpler structure
    const serializedSet = {
      id: setSnap.id,
      title: data.title || "Untitled Set",
      cards: data.cards || [],
      metadata: {
        name: data.metadata.name,
        cardCount: data.metadata.cardCount,
        sourceNotebooks: data.metadata.sourceNotebooks,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
      },
      userId: data.userId,
      // Add any other required fields with fallbacks
      pageId: data.pageId || null,
      notebookId: data.notebookId || null,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt || data.createdAt),
    };

    console.log("Serialized study card set:", serializedSet);
    return JSON.parse(JSON.stringify(serializedSet));
  } catch (error) {
    console.error("Error getting study card set:", error);
    throw error;
  }
};

export const deleteStudyCardSet = async (
  notebookId: string,
  pageId: string,
  setId: string
): Promise<void> => {
  try {
    // Delete the study card set document
    const cardSetRef = doc(db, "studyCardSets", setId);
    await deleteDoc(cardSetRef);

    // Only update notebook if notebookId and pageId are provided
    if (notebookId && pageId) {
      // Remove the reference from the notebook page
      const notebookRef = doc(db, "notebooks", notebookId);
      const notebookSnap = await getDoc(notebookRef);

      if (!notebookSnap.exists()) {
        console.warn("Notebook not found, but study card set was deleted");
        return;
      }

      const notebook = notebookSnap.data() as Notebook;
      const pageIndex = notebook.pages.findIndex((p) => p.id === pageId);

      if (pageIndex === -1) {
        console.warn(
          "Page not found in notebook, but study card set was deleted"
        );
        return;
      }

      // Filter out the deleted set ID from studyCardSetRefs
      notebook.pages[pageIndex].studyCardSetRefs =
        notebook.pages[pageIndex].studyCardSetRefs?.filter(
          (ref) => ref !== setId
        ) || [];

      await updateDoc(notebookRef, { pages: notebook.pages });
    }
  } catch (error) {
    console.error("Error deleting study card set:", error);
    throw error;
  }
};

// Add this function to handle study guide title updates
export const updateStudyGuideTitle = async (
  guideId: string,
  newTitle: string
): Promise<void> => {
  try {
    const studyGuideRef = doc(db, "studyGuides", guideId);

    await updateDoc(studyGuideRef, {
      title: newTitle,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating study guide title:", error);
    throw error;
  }
};

export const getQuiz = async (
  quizId: string
): Promise<
  Omit<QuizState, "startedAt" | "lastUpdatedAt" | "createdAt"> & {
    startedAt: SerializedTimestamp;
    lastUpdatedAt: SerializedTimestamp;
    createdAt: SerializedTimestamp;
  }
> => {
  try {
    const quizRef = doc(db, "quizzes", quizId);
    const quizDoc = await getDoc(quizRef);

    if (!quizDoc.exists()) {
      throw new Error("Quiz not found");
    }

    const quizData = quizDoc.data();

    // Convert Timestamps to plain objects
    const convertTimestamp = (
      timestamp: Timestamp | any
    ): SerializedTimestamp => ({
      seconds: timestamp.seconds,
      nanoseconds: timestamp.nanoseconds,
    });

    const convertedQuiz = {
      ...quizData,
      id: quizDoc.id,
      startedAt: convertTimestamp(quizData.startedAt),
      lastUpdatedAt: convertTimestamp(quizData.lastUpdatedAt),
      createdAt: convertTimestamp(quizData.createdAt),
      quizData: {
        questions: quizData.quizData.questions,
        title: quizData.title,
      },
      userAnswers: quizData.userAnswers || {},
      evaluationResults: quizData.evaluationResults || {},
      incorrectAnswers: quizData.incorrectAnswers || [],
      score: quizData.score || 0,
      currentQuestionIndex: quizData.currentQuestionIndex || 0,
      isComplete: quizData.isComplete || false,
      totalQuestions:
        quizData.totalQuestions || quizData.quizData.questions.length,
      title: quizData.title,
      userId: quizData.userId,
      notebookId: quizData.notebookId || "",
      pageId: quizData.pageId || "",
    };

    return convertedQuiz;
  } catch (error) {
    console.error("Error fetching quiz:", error);
    throw error;
  }
};

export const createQuiz = async (
  quizData: Omit<QuizState, "id">
): Promise<QuizState> => {
  try {
    const quizRef = doc(collection(db, "quizzes")); // Let Firestore generate the ID

    const newQuiz = {
      ...quizData,
      id: quizRef.id, // Use Firestore's generated ID
      createdAt: serverTimestamp(),
      startedAt: serverTimestamp(),
      lastUpdatedAt: serverTimestamp(),
    };

    await setDoc(quizRef, newQuiz);
    return newQuiz as QuizState;
  } catch (error) {
    console.error("Error creating quiz:", error);
    throw error;
  }
};

export const getQuizzesByFirestoreUserId = async (
  userId: string
): Promise<QuizState[]> => {
  try {
    const quizzesRef = collection(db, "quizzes");
    const q = query(quizzesRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data();

      // Create a properly typed QuizState object
      const quizState: QuizState = {
        id: doc.id,
        notebookId: data.notebookId || "",
        pageId: data.pageId || "",
        quizData: data.quizData || {},
        currentQuestionIndex: data.currentQuestionIndex || 0,
        startedAt: data.startedAt?.toDate?.()?.toISOString() || null,
        lastUpdatedAt: data.lastUpdatedAt?.toDate?.()?.toISOString() || null,
        createdAt:
          data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        userAnswers: data.userAnswers || [],
        evaluationResults: data.evaluationResults || [],
        score: data.score || 0,
        isComplete: data.isComplete || false,
        incorrectAnswers: data.incorrectAnswers || [],
        totalQuestions: data.totalQuestions || 0,
        userId: data.userId || userId,
        title: data.title || "",
      };

      return quizState;
    });
  } catch (error) {
    console.error("Error getting quizzes:", error);
    throw error;
  }
};

export const getStudyGuidesByFirestoreUserId = async (
  userId: string
): Promise<StudyGuide[]> => {
  try {
    const studyGuidesRef = collection(db, "studyGuides");
    const q = query(studyGuidesRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data();

      // Helper function to safely convert Firestore timestamps
      const convertTimestamp = (timestamp: any) => {
        if (!timestamp) return null;
        if (timestamp.toDate) {
          return timestamp.toDate().toISOString();
        }
        return timestamp;
      };

      // Convert all timestamp fields
      const serializedData = {
        ...data,
        id: doc.id,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
      };

      // Parse and stringify to ensure complete serialization
      return JSON.parse(JSON.stringify(serializedData)) as StudyGuide;
    });
  } catch (error) {
    console.error("Error getting study guides:", error);
    throw error;
  }
};

export const getStudyCardsByClerkId = async (
  clerkId: string
): Promise<StudyCardSet[]> => {
  try {
    // Change to "studyCards" collection to match where we save the cards
    const studyCardsRef = collection(db, "studyCards");
    const q = query(studyCardsRef, where("userId", "==", clerkId));
    const querySnapshot = await getDocs(q);

    const studyCards = querySnapshot.docs.map((doc) => {
      const data = doc.data();

      // Helper function to safely convert Firestore timestamps
      const convertTimestamp = (timestamp: any) => {
        if (!timestamp) return null;
        if (timestamp.toDate) {
          return timestamp.toDate().toISOString();
        }
        return timestamp;
      };

      // Match the structure of how we save study cards
      const cardData = {
        id: doc.id,
        title: data.metadata.name || "Untitled Set",
        cards: data.cards || [],
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
        userId: data.userId,
      } as StudyCardSet;

      // Parse and stringify to ensure complete serialization
      return JSON.parse(JSON.stringify(cardData));
    });

    console.log("Retrieved study cards:", studyCards);
    return studyCards;
  } catch (error) {
    console.error("Error getting study cards by clerk ID:", error);
    throw error;
  }
};

export const deleteStudyGuide = async (studyGuideId: string): Promise<void> => {
  await deleteDoc(doc(db, "studyGuides", studyGuideId));
};

export const updateStudyCardSetTitle = async (
  setId: string,
  newTitle: string
) => {
  try {
    // Change from 'studyCardSets' to 'studyCards'
    const studyCardRef = doc(db, "studyCards", setId);

    // Check if document exists first
    const docSnap = await getDoc(studyCardRef);
    if (!docSnap.exists()) {
      throw new Error(`Study card set with ID ${setId} not found`);
    }

    await updateDoc(studyCardRef, {
      title: newTitle,
      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error("Error updating study card set title:", error);
    throw error;
  }
};

// Add this new function to save study guides to a separate collection
export const saveGeneratedStudyGuide = async (
  studyGuide: StudyGuide,
  userId: string
) => {
  try {
    console.log("Starting to save study guide:", { studyGuide, userId });

    const studyGuideRef = doc(db, "studyGuides", studyGuide.id);

    // Convert dates to Firestore Timestamp
    const studyGuideData = {
      ...studyGuide,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      userId,
    };

    console.log("Saving study guide data:", studyGuideData);

    await setDoc(studyGuideRef, studyGuideData);
    console.log("Study guide saved successfully");

    return studyGuide.id;
  } catch (error) {
    console.error("Error saving generated study guide:", error);
    throw error;
  }
};

// Update the saveStudyCards function
export async function saveStudyCards(
  userId: string,
  setName: string,
  cards: StudyCard[] | string // Accept either StudyCard array or string
) {
  try {
    // Debug log incoming data
    console.log("saveStudyCards called with:", {
      userId,
      setName,
      cards:
        typeof cards === "string"
          ? "string (length: " + cards.length + ")"
          : (cards as StudyCard[]).length + " cards",
    });

    // Parse cards if they're passed as a string
    const parsedCards: StudyCard[] =
      typeof cards === "string" ? JSON.parse(cards) : cards;

    // Validate input data
    if (!userId || !setName) {
      throw new Error(
        `Missing required fields: userId=${userId}, setName=${setName}`
      );
    }

    // Strict cards validation
    if (!parsedCards) {
      throw new Error("Cards array is undefined");
    }

    if (!Array.isArray(parsedCards)) {
      throw new Error(
        `Cards must be an array, received: ${typeof parsedCards}`
      );
    }

    if (parsedCards.length === 0) {
      throw new Error("Cards array is empty");
    }

    // Create timestamps
    const now = new Date().toISOString();

    // Create document ID
    const studySetId = `studycards_${crypto.randomUUID()}`;

    // Create the complete study set object
    const studySet: StudyCardSet = {
      id: studySetId,
      title: setName.trim(),
      cards: parsedCards,
      createdAt: now,
      updatedAt: now,
      userId: userId,
      metadata: {
        createdAt: now,
        updatedAt: now,
        name: setName,
        cardCount: parsedCards.length,
        sourceNotebooks: [],
      },
      notebookId: null,
      pageId: null,
    };

    // Debug log the final object
    console.log("About to save study set:", JSON.stringify(studySet, null, 2));

    // Save to Firestore
    const studySetRef = doc(db, "studyCards", studySetId);
    await setDoc(studySetRef, studySet);

    console.log("Successfully saved study set:", studySetId);
    return studySet;
  } catch (error) {
    console.error("Error in saveStudyCards:", error);
    throw error;
  }
}

export const updateNotebookTitle = async (
  notebookId: string,
  newTitle: string
): Promise<void> => {
  try {
    const notebookRef = doc(db, "notebooks", notebookId);
    await updateDoc(notebookRef, {
      title: newTitle,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating notebook title:", error);
    throw error;
  }
};

// Add this new interface for user settings updates
export interface UserSettingsUpdate {
  language?: string;
  creditBalance?: number;
  accountStatus?: "Free" | "Pro";
}

// Add this new function to update user settings
export const updateUserSettings = async (
  userId: string,
  settings: UserSettingsUpdate
): Promise<boolean> => {
  try {
    // First get the user to make sure they exist
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.error(`User with ID ${userId} not found`);
      return false;
    }

    // Create an update object with only the fields that are provided
    const updateData: Record<string, any> = {
      updatedAt: serverTimestamp(),
    };

    // Only add fields that are provided in the settings object
    if (settings.language !== undefined) {
      updateData.language = settings.language;
    }

    if (settings.creditBalance !== undefined) {
      updateData.creditBalance = settings.creditBalance;
    }

    if (settings.accountStatus !== undefined) {
      // Store account status in metadata for compatibility
      updateData["metadata.accountStatus"] = settings.accountStatus;
      updateData["metadata.isPro"] = settings.accountStatus === "Pro";
    }

    // Update the user document
    await updateDoc(userRef, updateData);
    return true;
  } catch (error) {
    console.error("Error updating user settings:", error);
    throw error;
  }
};

// Add a function to update just the language preference
export const updateUserLanguage = async (
  userId: string,
  language: string
): Promise<boolean> => {
  try {
    return await updateUserSettings(userId, { language });
  } catch (error) {
    console.error("Error updating user language:", error);
    throw error;
  }
};

// Add a function to update credit balance
export const updateUserCreditBalance = async (
  userId: string,
  creditBalance: number
): Promise<boolean> => {
  try {
    return await updateUserSettings(userId, { creditBalance });
  } catch (error) {
    console.error("Error updating user credit balance:", error);
    throw error;
  }
};

// Add a function to update account status
export const updateUserAccountStatus = async (
  userId: string,
  accountStatus: "Free" | "Pro"
): Promise<boolean> => {
  try {
    return await updateUserSettings(userId, { accountStatus });
  } catch (error) {
    console.error("Error updating user account status:", error);
    throw error;
  }
};
