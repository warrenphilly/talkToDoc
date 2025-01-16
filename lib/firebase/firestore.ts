"use server";

import { db, storage } from "@/firebase";
import { Message, ContextSection } from "@/lib/types";
import type { QuizState } from "@/types/quiz";
import { auth, currentUser } from "@clerk/nextjs/server";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
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

export const getNote = async (
  notebookId: string,
  pageId: string
): Promise<Page | null> => {
  try {
    const notebookRef = doc(db, "notebooks", notebookId);
    const notebookSnap = await getDoc(notebookRef);

    if (!notebookSnap.exists()) {
      return null;
    }

    const notebook = notebookSnap.data() as Notebook;
    const page = notebook.pages.find((p) => p.id === pageId);

    return page || null;
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

    const notesCollection = collection(db, "notebooks");
    const querySnapshot = await getDocs(notesCollection);
    const notebooks = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Notebook[];

    // Filter notebooks by userId
    const userNotebooks = notebooks.filter(
      (notebook) => notebook.userId === userId
    );

    return userNotebooks.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error("Error getting notebooks:", error);
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
    await deleteDoc(doc(db, "notebooks", notebookId));
  } catch (error) {
    console.error("Error deleting notebook:", error);
    throw error;
  }
};

export const deletePage = async (notebookId: string, pageId: string) => {
  try {
    const notebookRef = doc(db, "notebooks", notebookId);
    const notebookSnap = await getDoc(notebookRef);

    if (!notebookSnap.exists()) {
      throw new Error("Notebook not found");
    }

    const notebook = notebookSnap.data() as Notebook;
    const updatedPages = notebook.pages.filter((page) => page.id !== pageId);

    // If this would leave us with no pages, create a new default page
    if (updatedPages.length === 0) {
      const newPage: Page = {
        id: crypto.randomUUID(),
        title: "New Page",
        content: "",
        messages: [],
        isOpen: true,
      };
      updatedPages.push(newPage);
    }

    // Update the notebook with the filtered pages
    await updateDoc(notebookRef, {
      pages: updatedPages,
    });

    // Return the ID of the first page if we need to redirect
    return updatedPages[0].id;
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

    if (pageIndex === -1) {
      throw new Error("Page not found");
    }

    notebook.pages[pageIndex].isOpen = isOpen;
    await updateDoc(notebookRef, { pages: notebook.pages });
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

export const getSideChat = async (notebookId: string, pageId: string): Promise<SideChat | null> => {
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
    updatedAt: data.updatedAt
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

export const saveQuizState = async (quizState: QuizState): Promise<string> => {
  try {
    // Add validation
    if (!quizState.notebookId || !quizState.pageId) {
      throw new Error("Missing required fields: notebookId or pageId");
    }

    // Deep clone and sanitize the quiz state
    const sanitizedQuizState = {
      ...quizState,
      startedAt: quizState.startedAt || new Date(),
      lastUpdatedAt: new Date(),
      currentQuestionIndex: quizState.currentQuestionIndex ?? 0,
      score: quizState.score ?? 0,
      totalQuestions: quizState.totalQuestions ?? 0,
      userAnswers: quizState.userAnswers ?? {},
      evaluationResults: quizState.evaluationResults ?? {},
      incorrectAnswers: quizState.incorrectAnswers ?? [],
      isComplete: quizState.isComplete ?? false,
      gptFeedback: quizState.gptFeedback ?? "",
    };

    const quizRef = doc(db, "quizzes", sanitizedQuizState.id);
    
    // Use setDoc with merge option to update existing document or create if it doesn't exist
    await setDoc(quizRef, sanitizedQuizState, { merge: true });

    return sanitizedQuizState.id;
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

export const getRecentQuizzes = async (pageId: string): Promise<QuizState[]> => {
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
