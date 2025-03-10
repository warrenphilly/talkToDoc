import { adminDb, adminStorage } from "@/lib/firebase/firebaseAdmin";
import { cleanMarkdownContent } from "@/lib/markdownUtils";
import { writeFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { getUserByClerkId } from "@/lib/firebase/firestore";
import { auth } from "@clerk/nextjs/server";


export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const firestoreUser = await getUserByClerkId(userId);
    const language = firestoreUser?.language || "English";

    const formData = await req.formData();
    const userMessage = formData.get("userMessage") as string;
    const systemMessage = formData.get("systemMessage") as string;
    const notebookId = formData.get("notebookId") as string;
    const pageId = formData.get("pageId") as string;
    const files = formData.getAll("files");
    const contextSections = formData.get("contextSections") as string;

    // Debug logs
    console.log("Received parameters:", {
      userMessage,
      notebookId,
      pageId,
      contextSections,
      systemMessage: systemMessage?.slice(0, 50) + "...",
    });

    // Validate required inputs with more specific error messages
    if (!userMessage?.trim()) {
      return NextResponse.json(
        {
          reply: "Please provide a message.",
        },
        { status: 400 }
      );
    }

    if (!notebookId?.trim()) {
      return NextResponse.json(
        {
          reply: "Missing notebook ID.",
        },
        { status: 400 }
      );
    }

    if (!pageId?.trim()) {
      return NextResponse.json(
        {
          reply: "Missing page ID.",
        },
        { status: 400 }
      );
    }

    // Get the notebook document
    console.log("Fetching notebook:", notebookId);
    const notebookRef = adminDb.collection("notebooks").doc(notebookId);
    const notebookSnap = await notebookRef.get();

    if (!notebookSnap.exists) {
      console.log("Notebook not found:", notebookId);
      return NextResponse.json(
        {
          reply: "Notebook not found.",
        },
        { status: 404 }
      );
    }

    const notebookData = notebookSnap.data();
    if (!notebookData) {
      console.log("Notebook data is empty");
      return NextResponse.json(
        {
          reply: "Notebook data is empty.",
        },
        { status: 404 }
      );
    }

    const page = notebookData.pages?.find((p: any) => p.id === pageId);
    if (!page) {
      console.log("Page not found:", pageId);
      return NextResponse.json(
        {
          reply: "Page not found.",
        },
        { status: 404 }
      );
    }

    // Fetch content from markdown files
    let allContent = "";
    if (page.markdownRefs && page.markdownRefs.length > 0) {
      console.log("Found markdownRefs:", page.markdownRefs.length);
      for (const markdownRef of page.markdownRefs) {
        try {
          const cleanPath = markdownRef.path.replace(/^gs:\/\/[^\/]+\//, "");
          console.log("Processing markdown file:", cleanPath);

          const bucket = adminStorage.bucket();
          const file = bucket.file(cleanPath);

          const [exists] = await file.exists();
          if (!exists) {
            console.error("File does not exist:", cleanPath);
            continue;
          }

          const [content] = await file.download();
          const contentStr = content.toString();
          allContent += cleanMarkdownContent(contentStr) + "\n\n";
        } catch (error) {
          console.error(
            `Error fetching markdown file ${markdownRef.path}:`,
            error
          );
        }
      }
    }

    // Handle file uploads and convert to base64
    const uploadedFiles = await Promise.all(
      files.map(async (file: any) => {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filename = `${Date.now()}-${file.name}`;
        const filepath = path.join(
          process.cwd(),
          "public",
          "uploads",
          filename
        );
        await writeFile(filepath, buffer);
        const base64Image = buffer.toString("base64");
        return {
          path: `/uploads/${filename}`,
          base64: `data:${file.type};base64,${base64Image}`,
        };
      })
    );

    // Create messages for OpenAI API with prioritized context
    const messages = [
      {
        role: "system",
        content: `You are a helpful Teacher. Your primary focus is to explain and discuss the following specific context in ${language}:

${contextSections || "No specific context provided."}

Additional document context is available if needed:
${allContent}

Instructions:
1. Always prioritize explaining and answering questions about the specific context provided.
2. If the specific context is insufficient to fully answer the question:
   - First, provide what you can explain from the specific context
   - Then, clearly indicate when you're supplementing with information from the broader document
   - Use phrases like "Additionally, from the broader document..." or "To provide more context..."
3. If the question is completely unrelated to the specific context:
   - Acknowledge this fact
   - Suggest refocusing on the provided context
   - Only if necessary, provide an answer using the broader document content

Remember to:
- Break down complex concepts into simple terms
- Provide relevant examples when appropriate
- Respond in clear, complete paragraphs
- Always maintain focus on the specific context when possible
- unless told otherwise, keep reponses as short as possible without losing information`,
      },
      { role: "user", content: userMessage },
    ];

    // Add system message if provided
    if (systemMessage) {
      messages.push({ role: "system", content: systemMessage });
    }

    console.log("Sending request to OpenAI");
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages,
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      return NextResponse.json(
        {
          reply: "Sorry, there was an error processing your request.",
        },
        { status: 500 }
      );
    }

    const data = await response.json();
    console.log("Received response from OpenAI");

    if (!data.choices?.[0]?.message?.content) {
      console.error("Invalid API response structure:", data);
      return NextResponse.json(
        {
          reply: "Invalid response from AI service.",
        },
        { status: 500 }
      );
    }

    // Add metadata about context usage to the response
    const aiResponse = data.choices[0].message.content;
    const usedExternalContext = aiResponse.toLowerCase().includes("from the broader document");

    return NextResponse.json({
      reply: aiResponse,
      usedExternalContext,
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      {
        reply: "An error occurred while processing your request. Please try again.",
      },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
