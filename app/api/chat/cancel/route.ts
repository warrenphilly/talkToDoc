import { NextRequest, NextResponse } from "next/server";
import { abortStreamRequest } from "@/lib/streamManager";

export async function POST(req: NextRequest) {
  try {
    const { notebookId, tabId } = await req.json();
    
    if (!notebookId || !tabId) {
      return NextResponse.json(
        { error: "Missing notebook or tab ID" },
        { status: 400 }
      );
    }
    
    // Abort any ongoing streams for this notebook/tab
    const streamId = `${notebookId}-${tabId}`;
    const wasAborted = abortStreamRequest(streamId);
    
    return NextResponse.json({ success: true, wasAborted });
  } catch (error) {
    console.error("Error cancelling generation:", error);
    return NextResponse.json(
      { error: "Failed to cancel generation" },
      { status: 500 }
    );
  }
} 