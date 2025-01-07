import { Message } from "@/lib/types";
import { db } from "@/firebase";
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
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

export const saveNote = async (notebookId: string, pageId: string, messages: Message[]) => {
  try {
    const notebookRef = doc(db, "notebooks", notebookId);
    const notebookSnap = await getDoc(notebookRef);
    
    if (!notebookSnap.exists()) {
      throw new Error("Notebook not found");
    }

    const notebook = notebookSnap.data() as Notebook;
    const pageIndex = notebook.pages.findIndex(p => p.id === pageId);
    
    if (pageIndex === -1) {
      throw new Error("Page not found in notebook");
    }

    // Update the messages for the specific page
    notebook.pages[pageIndex].messages = messages;

    await updateDoc(notebookRef, {
      pages: notebook.pages
    });
  } catch (error) {
    console.error("Error saving messages:", error);
    throw error;
  }
};

export const getNote = async (notebookId: string, pageId: string): Promise<Page | null> => {
  try {
    const notebookRef = doc(db, "notebooks", notebookId);
    const notebookSnap = await getDoc(notebookRef);

    if (!notebookSnap.exists()) {
      return null;
    }

    const notebook = notebookSnap.data() as Notebook;
    const page = notebook.pages.find(p => p.id === pageId);
    
    return page || null;
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
    const updatedPages = notebook.pages.filter(page => page.id !== pageId);
    
    // If this would leave us with no pages, create a new default page
    if (updatedPages.length === 0) {
      const newPage: Page = {
        id: crypto.randomUUID(),
        title: "New Page",
        content: "",
        messages: []
      };
      updatedPages.push(newPage);
    }
    
    // Update the notebook with the filtered pages
    await updateDoc(notebookRef, {
      pages: updatedPages
    });

    // Return the ID of the first page if we need to redirect
    return updatedPages[0].id;
  } catch (error) {
    console.error("Error deleting page:", error);
    throw error;
  }
};