import { Message } from "@/lib/types";

import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { db } from "../../firebase";

// Add interface for Note type
interface Note {
  id: string;
  createdAt: Date;
  content: string;
  title: string;
}

export const saveNote = async (note: Note) => {
  try {
    // Use a fixed document ID for the current note session
    const noteDocRef = doc(db, "notes", note.id);
    console.log("Saving note:", note);    
    await setDoc(noteDocRef, note, { merge: true });
  } catch (error) {
    console.error("Error saving chat:", error);
    throw error;
  }
};

export const getNote = async (noteId: string) => {
  try {
    const noteDocRef = doc(db, "notes", noteId);
    const docSnap = await getDoc(noteDocRef);

    if (docSnap.exists()) {
      // Convert the object back to an array
      const data = docSnap.data();
      const messagesArray = Object.keys(data)
        .sort((a, b) => Number(a) - Number(b))
        .map((key) => data[key]);
      return messagesArray;
    }
    return [];
  } catch (error) {
    console.error("Error getting note:", error);
    throw error;
  }
};

export const createNewNote = async () => {
  try {
    const noteId = `note_${Date.now()}`; // Create unique ID for each note
    const noteDocRef = doc(db, "notes", noteId);
    await setDoc(noteDocRef, {
      createdAt: new Date(),
      content: "New Note",
      title: "New Note",
    });
    return noteId;
  } catch (error) {
    console.error("Error creating new note:", error);
    throw error;
  }
};

export const getAllNotes = async () => {
  try {
    const notesCollection = collection(db, "notes");
    const querySnapshot = await getDocs(notesCollection);
    const notes = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Note[]; // Type assertion to Note[]
    return notes.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error("Error getting notes:", error);
    throw error;
  }
};
