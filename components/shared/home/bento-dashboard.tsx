import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/firebase";
import { Notebook } from "@/lib/firebase/firestore";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function BentoDashboard({ listType }: { listType: string }) {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);

  useEffect(() => {
    // Create a query to get notebooks ordered by creation date
    const notebooksQuery = query(
      collection(db, "notebooks"),
      orderBy("createdAt", "desc")
    );

    // Set up real-time listener
    const unsubscribe = onSnapshot(notebooksQuery, (snapshot) => {
      const notebooksList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Notebook[];
      setNotebooks(notebooksList);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-slate-400">
        {listType === "all" ? "All Notebooks" : "Recent Notebooks"}
      </h1>
      <div className="flex flex-wrap gap-4 items-center justify-start md:p-5">
        {notebooks.map((notebook) => (
          <Link key={notebook.id} href={`/notes/${notebook.id}`}>
            <Card className="h-full transition-transform hover:scale-105 bg-slate-200 shadow-md border-none w-[800px] md:w-[400px] mx-4">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="p-2 rounded-full w-fit bg-[#94b347]">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-xl font-semibold mt-4 text-slate-600">
                  {notebook.title}
                </h2>
                <p className="text-muted-foreground mt-2 flex-grow">
                  {notebook.createdAt instanceof Date 
                    ? notebook.createdAt.toLocaleDateString()
                    : new Date(notebook.createdAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
