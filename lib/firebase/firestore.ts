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
  createdAt: Date;
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
      // Create new Firestore user
      // await createFirestoreUser({
      //   id: clerkUser.id,
      //   email: clerkUser.emailAddresses[0]?.emailAddress,
      //   firstName: clerkUser.firstName ?? "",
      //   lastName: clerkUser.lastName ?? "",
      //   imageUrl: clerkUser.imageUrl ?? "",
      // });

      // Fetch the newly created user
      user = await getUserByClerkId(clerkUser.id);
      if (!user) throw new Error("Failed to create user");
    }

    const notebookId = `notebook_${crypto.randomUUID()}`;
    const firstPageId = `page_${crypto.randomUUID()}`;

    const notebookData: Notebook = {
      id: notebookId,
      title,
      createdAt: new Date(),
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
    await setDoc(doc(db, "notebooks", notebookId), notebookData);

    // Update user's notebooks array
    await updateDoc(doc(db, "users", user.id), {
      notebooks: [...(user.notebooks || []), notebookId],
      updatedAt: new Date(),
    });

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

    // Log the raw data of each document
    querySnapshot.forEach((doc) => {
      console.log("[getAllNotebooks] Document data:", {
        id: doc.id,
        userId: doc.data().userId,
        data: doc.data(),
      });
    });

    const notebooks = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Notebook[];

    console.log("[getAllNotebooks] Processed notebooks:", notebooks);
    return notebooks;
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
      metadata: clerkUser.metadata || {},
      creditBalance: 5000,
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
    // user ? ({ id: user.id, ...user.data() } as FirestoreUser) : null;
    if (!user) return null;
    return JSON.parse(JSON.stringify(user.data())) as FirestoreUser;
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
    const notebooks = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Firestore Timestamp to JavaScript Date
        createdAt: data.createdAt?.toDate() || new Date(),
      };
    }) as Notebook[];

    return notebooks.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
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

export const saveQuiz = async (
  quiz: any,
  metadata: {
    selectedPages: { [notebookId: string]: string[] };
    questionTypes: string[];
  },
  files: Array<{ path: string; name: string }>,
  userId: string
) => {
  try {
    const quizRef = doc(db, "quizzes", quiz.id);

    // Convert timestamp objects to Firestore Timestamps
    const firestoreQuiz = {
      ...quiz,
      startedAt: Timestamp.fromMillis(quiz.startedAt.seconds * 1000),
      lastUpdatedAt: Timestamp.fromMillis(quiz.lastUpdatedAt.seconds * 1000),
      createdAt: Timestamp.fromMillis(quiz.createdAt.seconds * 1000),
    };

    await setDoc(quizRef, firestoreQuiz);
    return quiz.id;
  } catch (error) {
    console.error("Error saving quiz:", error);
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
        title: data.title || "Untitled Set",
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
export const getQuiz = async (quizId: string): Promise<QuizState> => {
  const quizDoc = await getDoc(doc(db, "quizzes", quizId));
  if (!quizDoc.exists()) {
    throw new Error("Quiz not found");
  }

  const data = quizDoc.data();

  // Serialize timestamps to ISO strings
  return {
    ...data,
    startedAt: data.startedAt?.toDate?.()?.toISOString() || null,
    lastUpdatedAt: data.lastUpdatedAt?.toDate?.()?.toISOString() || null,
    createdAt:
      data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  } as QuizState;
};

export const updateStudyCardSetTitle = async (
  setId: string,
  newTitle: string
): Promise<void> => {
  try {
    const studyCardSetRef = doc(db, "studyCardSets", setId);

    await updateDoc(studyCardSetRef, {
      title: newTitle,
      updatedAt: serverTimestamp(),
    });
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

// Add this function to save study cards
export async function saveStudyCards(
  userId: string,
  setName: string,
  cards: any
) {
  try {
    const studySetRef = doc(db, "studyCards", `set_${crypto.randomUUID()}`);

    const studySet = {
      id: studySetRef.id,
      userId,
      title: setName,
      cards: cards,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(studySetRef, studySet);
    return studySet;
  } catch (error) {
    console.error("Error saving study cards:", error);
    throw error;
  }
}
