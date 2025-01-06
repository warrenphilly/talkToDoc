import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Chat {
  id: string;
  createdAt: Timestamp;
  title: string;
}

export default function BentoDashboard() {
  const [notes, setNotes] = useState<Chat[]>([]);

  useEffect(() => {
    // Create a query to get chats ordered by creation date
    const notesQuery = query(
      collection(db, "notes"),
      orderBy("createdAt", "desc")
    );

    // Set up real-time listener
    const unsubscribe = onSnapshot(notesQuery, (snapshot) => {
      const notesList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Chat[];
      setNotes(notesList);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-slate-400">Recent Notebooks</h1>
      <div className="flex flex-wrap gap-4 items-center justify-start md:p-5">
        {notes.map((note) => (
          <Link key={note.id} href={`/note/${note.id}`}>
            <Card className="h-full transition-transform hover:scale-105 bg-slate-200 shadow-md border-none w-[800px] md:w-[400px] mx-4">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="p-2 rounded-full w-fit bg-[#94b347]">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-xl font-semibold mt-4 text-slate-600">
                  {note.title}
                </h2>
                <p className="text-muted-foreground mt-2 flex-grow">
                  {note.createdAt.toDate().toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
