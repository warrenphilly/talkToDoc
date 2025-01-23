import { adminDb, adminStorage } from "@/lib/firebase/firebaseAdmin";
import { cleanMarkdownContent } from "@/lib/markdownUtils";
import { NextRequest, NextResponse } from "next/server";

interface StudyGuideSection {
  title: string;
  text: string;
  show: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const messageStr = formData.get("message") as string;
    if (!messageStr) {
      throw new Error("No message provided");
    }

    const { selectedPages, guideName, uploadedDocs } = JSON.parse(messageStr);

    // Initialize content collection
    let allContent = "";

    // 1. Process uploaded docs if they exist
    if (uploadedDocs && uploadedDocs.length > 0) {
      console.log(`Processing ${uploadedDocs.length} uploaded documents`);
      
      for (const doc of uploadedDocs) {
        try {
          const cleanPath = doc.path.replace(/^gs:\/\/[^\/]+\//, "");
          const bucket = adminStorage.bucket();
          const file = bucket.file(cleanPath);

          const [exists] = await file.exists();
          if (!exists) continue;

          const [content] = await file.download();
          const contentStr = content.toString();
          allContent += `\n\nDocument: ${doc.name}\n${cleanMarkdownContent(contentStr)}`;
        } catch (error) {
          console.error(`Error fetching uploaded file ${doc.path}:`, error);
        }
      }
    }

    // 2. Process selected notebook pages
    if (selectedPages && Object.keys(selectedPages).length > 0) {
      for (const notebookId of Object.keys(selectedPages)) {
        const pageIds = selectedPages[notebookId];
        const notebookRef = adminDb.collection("notebooks").doc(notebookId);
        const notebookSnap = await notebookRef.get();

        if (!notebookSnap.exists) continue;

        const notebookData = notebookSnap.data();
        if (!notebookData) continue;

        for (const pageId of pageIds) {
          const page = notebookData.pages?.find((p: any) => p.id === pageId);
          if (!page) continue;

          allContent += `\n\nNotebook Page: ${page.title}\n${page.content}`;

          // Process any markdown references if they exist
          if (page.markdownRefs?.length > 0) {
            for (const ref of page.markdownRefs) {
              try {
                const bucket = adminStorage.bucket();
                const file = bucket.file(ref.path);
                const [exists] = await file.exists();
                if (!exists) continue;

                const [content] = await file.download();
                allContent += `\n${cleanMarkdownContent(content.toString())}`;
              } catch (error) {
                console.error(`Error processing markdown ref ${ref.path}:`, error);
              }
            }
          }
        }
      }
    }

    // 3. Generate comprehensive study guide using OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a skilled educator and study guide creator. Create a structured study guide that identifies and organizes the main topics and concepts.
            
            Format your response as follows:
            1. Each main topic should start with "Topic: [Topic Name]"
            2. Under each topic, list 2-3 key subtopics prefixed with "Subtopic: "
            3. For each subtopic, provide 2-3 bullet points of essential information
            4. Use clear, concise language
            5. Focus on the most important concepts and their relationships
            6. Include relevant examples where appropriate`
          },
          {
            role: "user",
            content: `Create a study guide titled "${guideName}" from the following content:\n\n${allContent}`
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const studyGuideContent = data.choices[0].message.content;

    // Parse the content into sections based on Topics
    const sections = studyGuideContent.split(/(?=Topic:)/)
      .filter((section: string) => section.trim())
      .map((section: string) => {
        const lines = section.split('\n');
        const title = lines[0].replace(/^Topic:\s*/, '').trim();
        const text = lines.slice(1).join('\n').trim();
        return {
          title,
          text,
          show: false
        } as StudyGuideSection;
      })
      .filter((section: StudyGuideSection) => section.title && section.text); // Remove any empty sections

    return NextResponse.json({
      title: guideName,
      content: sections,
      rawContent: studyGuideContent
    });

  } catch (error) {
    console.error("Study guide generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate study guide",
        details: error instanceof Error ? error.message : "Unknown error occurred",
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