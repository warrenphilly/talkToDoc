import { adminDb, adminStorage } from "@/lib/firebase/firebaseAdmin";
import { cleanMarkdownContent } from "@/lib/markdownUtils";
import { writeFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const userMessage = formData.get("userMessage") as string;
    const systemMessage = formData.get("systemMessage") as string;
    const notebookId = formData.get("notebookId") as string;
    const pageId = formData.get("pageId") as string;
    const files = formData.getAll("files");

    // Debug logs
    console.log("Received parameters:", {
      userMessage,
      notebookId,
      pageId,
      systemMessage: systemMessage?.slice(0, 50) + "...", // Log first 50 chars of system message
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

    // Create messages for OpenAI API with context
    const messages = [
      {
        role: "system",
        content: `You are a helpful Teacher. Use the following content as context for answering questions:

${allContent}

When explaining content, first understand the context provided, then address the user's specific request. 
Provide detailed yet concise explanations that are easy to understand. If you're asked to explain something, 
make sure to break it down into simple terms and provide relevant examples when appropriate. 
Please respond in complete paragraphs.`,
      },
      { role: "user", content: userMessage },
      { role: "system", content: systemMessage },
    ];

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
        max_tokens: 4500,
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

    return NextResponse.json({
      reply: data.choices[0].message.content,
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      {
        reply:
          "An error occurred while processing your request. Please try again.",
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
