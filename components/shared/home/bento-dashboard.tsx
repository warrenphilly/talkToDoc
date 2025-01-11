import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUserId } from "@/lib/auth";
import {
  getNotebooksByFirestoreUserId,
  getUserByClerkId,
  Notebook,
} from "@/lib/firebase/firestore";
import CircularProgress from "@mui/material/CircularProgress";
import { MessageSquare, FileText } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function BentoDashboard({ listType }: { listType: string }) {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);

  useEffect(() => {
    const fetchNotebooks = async () => {
      try {
        // Get Clerk ID
        const clerkUserId = await getCurrentUserId();
        if (!clerkUserId) return;

        // Get Firestore user
        const firestoreUser = await getUserByClerkId(clerkUserId);
        // if (!firestoreUser) return;

        // // Get notebooks using Firestore user ID
        if (!firestoreUser) return;
        const userNotebooks = await getNotebooksByFirestoreUserId(
          firestoreUser.id
        );
        setNotebooks(userNotebooks);
      } catch (error) {
        console.error("Error fetching notebooks:", error);
      }
    };

    fetchNotebooks();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-slate-400">
        {listType === "all" ? "All Notebooks" : "Recent Notebooks"}
      </h1>
      <div className="flex flex-wrap gap-4 items-center justify-start md:p-5">
        {notebooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full w-full gap-2">
            <div className="text-slate-400 text-xl font-semibold">
              Loading your notebooks...
            </div>
            <CircularProgress
              sx={{
                color: "#94b347",
              }}
            />
          </div>
        ) : (
          notebooks.map((notebook) => (
            <Link key={notebook.id} href={`/notes/${notebook.id}`}>
              <Card className="h-full transition-transform hover:scale-105 bg-slate-200 shadow-md border-none w-[800px] md:w-[400px] mx-4">
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="p-2 rounded-full w-fit bg-[#94b347]">
                    <FileText className="h-6 w-6 text-white" />
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
          ))
        )}
      </div>
    </div>
  );
}
