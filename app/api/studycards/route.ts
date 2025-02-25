import { adminDb, adminStorage } from "@/lib/firebase/firebaseAdmin";
import { cleanMarkdownContent } from "@/lib/markdownUtils";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { saveStudyCards } from "@/lib/firebase/firestore";

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

// Helper function to chunk text into optimal sizes
function chunkText(text: string, maxLength: number = 8000): string[] {
  const chunks: string[] = [];
  let currentChunk = "";
  
  // Split by paragraphs
  const paragraphs = text.split('\n\n');
  
  for (const paragraph of paragraphs) {
    if ((currentChunk + paragraph).length > maxLength) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to make OpenAI API call with retries
async function makeOpenAIRequest(content: string, numCards: number, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(
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
                content: `Create ${numCards} study cards from this content. Focus on the most important concepts and key information:
                ${content}
                Format your response as a valid JSON object with this structure:
                {
                  "cards": [
                    {
                      "title": "Question or key concept",
                      "content": "Clear, concise explanation"
                    }
                  ]
                }
                Important: Respond ONLY with the JSON object, no additional text.`,
              },
            ],
            temperature: 0.7,
          }),
        }
      );

      if (response.status === 429) {
        console.log(`Rate limited, attempt ${i + 1}/${retries}. Waiting before retry...`);
        await delay(2000 * (i + 1)); // Exponential backoff
        continue;
      }

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`Error in attempt ${i + 1}/${retries}:`, error);
      await delay(2000 * (i + 1));
    }
  }

  throw new Error("Failed after all retry attempts");
}

// Helper function to clean JSON string from markdown
function cleanJsonResponse(content: string): string {
  // Remove markdown code block syntax if present
  let cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  
  // Trim whitespace
  cleanContent = cleanContent.trim();
  
  return cleanContent;
}

export async function POST(req: NextRequest) {
  try {
    const authInfo = await auth();
    const userId = authInfo.userId;
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Handle form data
    const formData = await req.formData();
    const messageData = formData.get('message');

    if (!messageData) {
      return NextResponse.json(
        { error: "No message data provided" },
        { status: 400 }
      );
    }

    // Parse the message string into JSON
    let requestData;
    try {
      requestData = typeof messageData === 'string' 
        ? JSON.parse(messageData)
        : JSON.parse(messageData.toString());
    } catch (error) {
      console.error("JSON parsing error:", error);
      console.error("Attempted to parse:", messageData);
      return NextResponse.json(
        { 
          error: "Invalid JSON in message data",
          details: error instanceof Error ? error.message : "Unknown parsing error",
          receivedData: messageData
        },
        { status: 400 }
      );
    }

    const { selectedPages, numberOfCards, metadata } = requestData;

    // Validate required fields
    if (!metadata?.name || typeof numberOfCards !== 'number') {
      return NextResponse.json(
        { error: "Missing required fields: name and numberOfCards" },
        { status: 400 }
      );
    }

    // Update the rest of your code to use these new field names
    const setName = metadata.name;
    const numCards = numberOfCards;

    // Validate that either selectedPages or uploadedDocs is provided
    if ((!selectedPages || Object.keys(selectedPages).length === 0) && 
        (!metadata?.uploadedDocs || metadata.uploadedDocs.length === 0)) {
      return NextResponse.json(
        { error: "Either selectedPages or uploadedDocs must be provided" },
        { status: 400 }
      );
    }

    // Debug log the request
    console.log("Received request:", {
      selectedPages,
      setName,
      numCards,
      uploadedDocsCount: metadata?.uploadedDocs?.length
    });

    // Initialize content collection
    let allContent = "";

    // 1. Process uploaded docs if they exist
    if (metadata?.uploadedDocs && metadata.uploadedDocs.length > 0) {
      console.log(`Processing ${metadata.uploadedDocs.length} uploaded documents`);
      
      for (const doc of metadata.uploadedDocs) {
        try {
          // Extract the path from the full URL
          const url = new URL(doc.path);
          const cleanPath = decodeURIComponent(url.pathname.split('/o/')[1].split('?')[0]);
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
    
    // Limit content length if necessary
    const maxContentLength = 4000;
    if (allContent.length > maxContentLength) {
      allContent = allContent.slice(0, maxContentLength);
      console.log("Content truncated to", maxContentLength, "characters");
    }

    const response = await makeOpenAIRequest(allContent, numCards);
    const cleanedResponse = cleanJsonResponse(response.choices[0].message.content);
    const parsedResponse = JSON.parse(cleanedResponse);

    return NextResponse.json({
      cards: parsedResponse.cards,
      success: true
    });

  } catch (error) {
    console.error("Error in studycards API:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to generate study cards",
        details: error instanceof Error ? error.stack : undefined
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
