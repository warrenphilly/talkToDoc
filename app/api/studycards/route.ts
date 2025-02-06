import { adminDb, adminStorage } from "@/lib/firebase/firebaseAdmin";
import { cleanMarkdownContent } from "@/lib/markdownUtils";
import { NextRequest, NextResponse } from "next/server";

interface StudySetMetadata {
  name: string;
  createdAt: Date;
  sourceNotebooks: {
    notebookId: string;
    notebookTitle: string;
    pages: {
      pageId: string;
      pageTitle: string;
    }[];
  }[];
  cardCount: number;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const messageStr = formData.get("message") as string;
    if (!messageStr) {
      throw new Error("No message provided");
    }

    const { selectedPages, numberOfCards, metadata, uploadedDocs } = JSON.parse(messageStr);

    // Debug log
    console.log("Processing request with:", {
      selectedPages,
      numberOfCards,
      uploadedDocs
    });

    // Initialize content collection
    let allContent = "";

    // 1. Process uploaded docs if they exist
    if (uploadedDocs && uploadedDocs.length > 0) {
      console.log(`Processing ${uploadedDocs.length} uploaded documents`);
      
      for (const doc of uploadedDocs) {
        try {
          const cleanPath = doc.path.replace(/^gs:\/\/[^\/]+\//, "");
          console.log("Processing uploaded file:", cleanPath);

          const bucket = adminStorage.bucket();
          const file = bucket.file(cleanPath);

          const [exists] = await file.exists();
          if (!exists) {
            console.error("File does not exist:", cleanPath);
            continue;
          }

          const [content] = await file.download();
          const contentStr = content.toString();
          allContent += `## ${doc.name}\n\n${cleanMarkdownContent(contentStr)}\n\n`;
        } catch (error) {
          console.error(`Error fetching uploaded file ${doc.path}:`, error);
        }
      }
    }

    // 2. Process selected pages and their associated documents
    if (selectedPages && Object.keys(selectedPages).length > 0) {
      // Iterate through each notebook
      for (const notebookId of Object.keys(selectedPages)) {
        const pageIds = selectedPages[notebookId];

        // Get the notebook document
        console.log("Fetching notebook:", notebookId);
        const notebookRef = adminDb.collection("notebooks").doc(notebookId);
        const notebookSnap = await notebookRef.get();

        if (!notebookSnap.exists) {
          console.warn(`Notebook ${notebookId} not found, skipping`);
          continue;
        }

        const notebookData = notebookSnap.data();
        if (!notebookData) {
          console.warn(`Notebook ${notebookId} data is empty, skipping`);
          continue;
        }

        // Process each selected page in the notebook
        for (const pageId of pageIds) {
          const page = notebookData.pages?.find((p: any) => p.id === pageId);
          if (!page) {
            console.warn(`Page ${pageId} not found in notebook ${notebookId}, skipping`);
            continue;
          }

          // Add page title and content
          allContent += `## ${page.title}\n\n`;
          if (page.content) {
            allContent += `${page.content}\n\n`;
          }

          // Process markdown references
          if (page.markdownRefs && page.markdownRefs.length > 0) {
            console.log(`Processing ${page.markdownRefs.length} markdown refs for page ${page.title}`);
            for (const markdownRef of page.markdownRefs) {
              try {
                const cleanPath = markdownRef.path.replace(/^gs:\/\/[^\/]+\//, "");
                const bucket = adminStorage.bucket();
                const file = bucket.file(cleanPath);

                const [exists] = await file.exists();
                if (!exists) continue;

                const [content] = await file.download();
                const contentStr = content.toString();
                allContent += cleanMarkdownContent(contentStr) + "\n\n";
              } catch (error) {
                console.error(`Error fetching markdown file ${markdownRef.path}:`, error);
              }
            }
          }

          // Process study documents
          if (page.studyDocs && page.studyDocs.length > 0) {
            console.log(`Processing ${page.studyDocs.length} study docs for page ${page.title}`);
            for (const studyDoc of page.studyDocs) {
              try {
                const cleanPath = studyDoc.path.replace(/^gs:\/\/[^\/]+\//, "");
                const bucket = adminStorage.bucket();
                const file = bucket.file(cleanPath);

                const [exists] = await file.exists();
                if (!exists) continue;

                const [content] = await file.download();
                const contentStr = content.toString();
                allContent += `## ${studyDoc.name}\n\n${cleanMarkdownContent(contentStr)}\n\n`;
              } catch (error) {
                console.error(`Error fetching study doc ${studyDoc.path}:`, error);
              }
            }
          }
        }
      }
    }

    // Validate that we have some content to work with
    if (!allContent.trim()) {
      throw new Error("No content found in uploaded documents or selected pages");
    }

    console.log("Collected content length:", allContent.length);
    console.log("Content preview:", allContent.slice(0, 200) + "...");

    // First, get a summary of the content
    const summaryResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `Summarize the following content, focusing on the key concepts and main points that would be important for study cards. Keep the summary concise but comprehensive:

${allContent}`,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      }
    );

    if (!summaryResponse.ok) {
      const errorText = await summaryResponse.text();
      console.error("OpenAI Summary API error details:", {
        status: summaryResponse.status,
        statusText: summaryResponse.statusText,
        error: errorText,
      });
      throw new Error(`OpenAI Summary API error: ${summaryResponse.status}`);
    }

    const summaryData = await summaryResponse.json();
    const summary = summaryData.choices[0].message.content;

    // Now create study cards from the summary
    const cardsResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
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
              content: `Create EXACTLY ${numberOfCards} study cards from this summarized content. No more, no less.

${summary}

Format your response as a valid JSON object with this exact structure:
{
  "cards": [
    {
      "title": "Question or key concept",
      "content": "Clear, concise explanation"
    }
  ]
}

Important: 
- Create EXACTLY ${numberOfCards} cards
- Respond ONLY with the JSON object
- No additional text or explanations
- Each card must have both title and content fields`,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      }
    );

    if (!cardsResponse.ok) {
      const errorText = await cardsResponse.text();
      console.error("OpenAI Cards API error details:", {
        status: cardsResponse.status,
        statusText: cardsResponse.statusText,
        error: errorText,
      });
      throw new Error(`OpenAI Cards API error: ${cardsResponse.status}`);
    }

    const cardsData = await cardsResponse.json();

    if (!cardsData.choices?.[0]?.message?.content) {
      throw new Error("Invalid response format from OpenAI");
    }

    // Clean the response content by removing markdown code block syntax
    let contentStr = cardsData.choices[0].message.content;

    // Remove markdown code block syntax if present
    contentStr = contentStr.replace(/```json\n?/, "").replace(/```\n?$/, "");

    // Remove any leading/trailing whitespace
    contentStr = contentStr.trim();

    console.log("Cleaned content string:", contentStr);

    try {
      // Parse the cleaned content as JSON
      const finalCardsData = {
        cards: JSON.parse(contentStr).cards,
        metadata: {
          ...metadata,
          createdAt: new Date(metadata.createdAt), // Convert string date back to Date object
        },
      };

      // Validate the structure
      if (!finalCardsData.cards || !Array.isArray(finalCardsData.cards)) {
        throw new Error("Invalid cards data structure");
      }

      return NextResponse.json(finalCardsData);
    } catch (error: unknown) {
      console.error("JSON parsing error:", error);
      console.error("Content that failed to parse:", contentStr);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown JSON parsing error";

      throw new Error(`Failed to parse cards data: ${errorMessage}`);
    }
  } catch (error) {
    console.error("Study card generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate study cards",
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
