import { db } from "@/firebase";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { notFound } from "next/navigation";
import { TitleEditor } from "@/components/shared/chat/title-editor";
import { BrowserTabs } from "@/components/browser-tabs";

interface PageProps {
  params: {
    noteId: string;
  };
}

interface Note {
  id: string;
  title: string;
  createdAt: Timestamp;
  content: string;
}

async function getNoteData(noteId: string): Promise<Note | null> {
  try {
    console.log("Fetching note with ID:", noteId); // Debug log
    const noteRef = doc(db, "notes", noteId);
    const noteSnap = await getDoc(noteRef);

    if (!noteSnap.exists()) {
      console.log("Note not found"); // Debug log
      return null;
    }

    const data = {
      id: noteSnap.id,
      ...noteSnap.data(),
    } as Note;
    
    console.log("Found note:", data); // Debug log
    return data;
  } catch (error) {
    console.error("Error fetching note:", error);
    return null;
  }
}

export default async function NotePage({ params }: PageProps) {
  const note = await getNoteData(params.noteId);

  if (!note) {
    notFound();
  }

  return (
    <div className="flex flex-col h-screen w-full bg-slate-200 px-4 pb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1 mr-4">
         
        </div>
       
      </div>
      <BrowserTabs initialTabs={[{ id: '1', title: 'Note 1', content: 'Note 1 content' }]} />
    </div>
  );
}
