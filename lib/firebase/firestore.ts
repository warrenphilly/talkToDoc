import { Message } from "@/lib/types";
import { db } from "@/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { collection, getDocs } from "firebase/firestore";

export interface Page {
  id: string;
  title: string;
  content: string;
  messages: Message[];
}

export interface Notebook {
  id: string;
  title: string;
  createdAt: Date;
  pages: Page[];
}

export const saveNote = async (noteId: string, messages: Message[]) => {
  try {
    const noteDocRef = doc(db, "notebooks", noteId);
    await updateDoc(noteDocRef, {
      content: messages,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error("Error saving chat:", error);
    throw error;
  }
};

export const getNote = async (noteId: string): Promise<Message[]> => {
  try {
    const noteDocRef = doc(db, "notebooks", noteId);
    const docSnap = await getDoc(noteDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.content || [];
    }
    return [];
  } catch (error) {
    console.error("Error getting note:", error);
    throw error;
  }
};

export const createNewNotebook = async (title: string): Promise<string> => {
  try {
    const notebookId = `notebook_${Date.now()}`;
    const firstPageId = `page_${Date.now()}`;
    
    const notebookData: Notebook = {
      id: notebookId,
      title,
      createdAt: new Date(),
      pages: [{
        id: firstPageId,
        title: "Page 1",
        content: "",
        messages: []
      }]
    };

    await setDoc(doc(db, "notebooks", notebookId), notebookData);
    return notebookId;
  } catch (error) {
    console.error("Error creating notebook:", error);
    throw error;
  }
};

export const getAllNotebooks = async (): Promise<Notebook[]> => {
  try {
    const notesCollection = collection(db, "notebooks");
    const querySnapshot = await getDocs(notesCollection);
    const notebooks = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Notebook[];
    return notebooks.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error("Error getting notebooks:", error);
    throw error;
  }
};

export const addPageToNotebook = async (notebookId: string, pageTitle: string): Promise<Page> => {
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
      messages: []
    };
    
    const updatedPages = [...notebook.pages, newPage];
    await updateDoc(notebookRef, { 
      pages: updatedPages 
    });
    
    return newPage;
  } catch (error) {
    console.error("Error adding page:", error);
    throw error;
  }
};
