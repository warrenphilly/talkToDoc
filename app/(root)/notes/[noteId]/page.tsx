"use server"
import { BrowserTabs } from "@/components/browser-tabs";
import ChatClient from "@/components/shared/chat/ChatClient";
import { db } from "@/firebase";
import { Notebook, type Page } from "@/lib/firebase/firestore";
import { doc, getDoc } from "firebase/firestore";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ noteId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> | undefined;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  return {
    title: `Note ${resolvedParams.noteId}`,
  };
}

async function getNotebookData(noteId: string): Promise<Notebook | null> {
  try {
    // console.log("Fetching notebook with ID:", noteId);
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

    // console.log("Found notebook:", data);
    return data;
  } catch (error) {
    console.error("Error fetching notebook:", error);
    return null;
  }
}

const NotePage = async ({ params, searchParams }: PageProps) => {
  const resolvedParams = await params;
  // console.log("Received params:", { noteId: resolvedParams.noteId });
  const notebook = await getNotebookData(resolvedParams.noteId);

  if (!notebook) {
    console.log("Notebook not found, redirecting to 404");
    notFound();
  }

  // console.log("Creating tabs from notebook:", notebook);

  const tabs = notebook.pages.map((page: Page) => ({
    id: page.id,
    title: page.title,
    content: (
      <ChatClient title={page.title} tabId={page.id} notebookId={notebook.id} />
    ),
    isOpen: page.isOpen,
    messages: page.messages || []
  }));

  return (
    <div className="flex flex-col h-full w-full bg-white">
      {/* Main content container with responsive padding */}
      <div className="flex-1 w-full max-w-[100vw] mx-auto px-2 sm:px-4 md:px-6">
        {/* Responsive container for BrowserTabs */}
        <div className="h-[calc(100vh-2rem)] sm:h-[calc(100vh-4rem)] w-full overflow-hidden rounded-lg">
          <BrowserTabs 
            notebookId={notebook.id} 
            notebookTitle={notebook.title}
            initialTabs={tabs}
            className="h-full w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default NotePage;
