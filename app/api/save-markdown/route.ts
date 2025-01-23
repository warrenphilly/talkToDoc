import { NextResponse } from "next/server";
import { saveMarkdownToStorage } from "@/lib/firebase/firestore";
import { cleanMarkdownContent, splitIntoChunks } from "@/lib/markdownUtils";

export async function POST(request: Request) {
  try {
    const { text = '', filename, createNew, notebookId, pageId, fileReferences } = await request.json();
    
    // Clean up the text if it exists, otherwise use empty string
    const cleanedText = (text || '')
      .trim()
      .replace(/\n+/g, '\n')
      .replace(/\s+/g, ' ');

    if (!cleanedText && !createNew) return NextResponse.json({ success: true });

    // Save to Firebase Storage
    const { url, path } = await saveMarkdownToStorage(
      notebookId,
      pageId,
      cleanedText,
      fileReferences,
    );

    return NextResponse.json({ 
      path,
      url,
      content: cleanedText
    });
  } catch (error) {
    console.error("Error saving markdown:", error);
    return NextResponse.json(
      { message: "Error saving markdown" },
      { status: 500 }
    );
  }
}

