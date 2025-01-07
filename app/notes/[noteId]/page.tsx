import { BrowserTabs } from "@/components/browser-tabs";
import ChatClient from "@/components/shared/chat/ChatClient";
import { db } from "@/firebase";
import { Notebook, type Page } from "@/lib/firebase/firestore";
import { doc, getDoc } from "firebase/firestore";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

interface PageProps {
  params: { noteId: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  return {
    title: `Note ${params.noteId}`,
  };
}

async function getNotebookData(noteId: string): Promise<Notebook | null> {
  try {
    console.log("Fetching notebook with ID:", noteId);
    const docRef = doc(db, "notebooks", noteId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.log("Notebook not found");
      return null;
    }

    const data = {
      id: docSnap.id,
      ...docSnap.data(),
    } as Notebook;

    console.log("Found notebook:", data);
    return data;
  } catch (error) {
    console.error("Error fetching notebook:", error);
    return null;
  }
}

const NotePage = async ({ params, searchParams }: PageProps) => {
  console.log("Received params:", { noteId: params.noteId });
  const notebook = await getNotebookData(params.noteId);

  if (!notebook) {
    console.log("Notebook not found, redirecting to 404");
    notFound();
  }

  console.log("Creating tabs from notebook:", notebook);

  const tabs = notebook.pages.map((page: Page) => ({
    id: page.id,
    title: page.title,
    content: (
      <ChatClient title={page.title} tabId={page.id} notebookId={notebook.id} />
    ),
  }));

  return (
    <div className="flex flex-col h-screen w-full bg-slate-200 p-4">
      <BrowserTabs notebookId={notebook.id} initialTabs={tabs} />
    </div>
  );
};

export default NotePage;
