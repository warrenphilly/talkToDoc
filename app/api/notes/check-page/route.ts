import { getNote } from "@/lib/firebase/firestore";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const notebookId = url.searchParams.get("notebookId");
    const pageId = url.searchParams.get("pageId");

    if (!notebookId || !pageId) {
      return NextResponse.json(
        { error: "Missing notebookId or pageId" },
        { status: 400 }
      );
    }

    // Use getNote function to check if the page exists
    const page = await getNote(notebookId, pageId);
    
    // If page is null, it doesn't exist
    return NextResponse.json({ exists: page !== null });
  } catch (error) {
    console.error("Error checking page existence:", error);
    return NextResponse.json(
      { error: "Failed to check page existence" },
      { status: 500 }
    );
  }
} 