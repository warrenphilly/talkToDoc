import fs from "fs";
import { NextResponse } from "next/server";
import path from "path";
import { saveMarkdownToStorage } from "@/lib/firebase/firestore";

export async function POST(request: Request) {
  try {
    const { section, filename, createNew, notebookId, pageId } = await request.json();
    
    // Clean up the section text
    const cleanedSection = section
      .trim()
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ');

    if (!cleanedSection && !createNew) return NextResponse.json({ success: true });

    // Save to Firebase Storage
    const { url, path } = await saveMarkdownToStorage(
      notebookId,
      pageId,
      cleanedSection,
      createNew
    );

    return NextResponse.json({ 
      success: true, 
      url,
      path
    });
  } catch (error) {
    console.error("Error saving markdown:", error);
    return NextResponse.json(
      { message: "Error saving markdown" },
      { status: 500 }
    );
  }
}

