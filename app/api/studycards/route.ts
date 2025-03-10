import { adminDb, adminStorage } from "@/lib/firebase/firebaseAdmin";
import { saveStudyCards } from "@/lib/firebase/firestore";
import { cleanMarkdownContent } from "@/lib/markdownUtils";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getUserByClerkId } from "@/lib/firebase/firestore";



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
  const paragraphs = text.split("\n\n");

  for (const paragraph of paragraphs) {
    if ((currentChunk + paragraph).length > maxLength) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// Helper function to delay execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper function to make OpenAI API call with retries
async function makeOpenAIRequest(
  content: string,
  numCards: number,
  retries = 3
) {
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
        console.log(
          `Rate limited, attempt ${i + 1}/${retries}. Waiting before retry...`
        );
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
  let cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "");

  // Trim whitespace
  cleanContent = cleanContent.trim();

  return cleanContent;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const firestoreUser = await getUserByClerkId(userId);
    const language = firestoreUser?.language || "English";

    const body = await req.json();
    const { selectedPages, setName, numCards, uploadedDocs } = body;

    if (!setName) {
      throw new Error("No set name provided");
    }

    // Initialize content collection
    let allContent = "";

    // 1. Process uploaded docs if they exist
    if (uploadedDocs && uploadedDocs.length > 0) {
      console.log(`Processing ${uploadedDocs.length} uploaded documents`);

      for (const doc of uploadedDocs) {
        try {
          if (doc.content) {
            allContent += `\n\nDocument: ${doc.name}\n${cleanMarkdownContent(
              doc.content
            )}`;
          }
        } catch (error) {
          console.error(`Error processing document ${doc.name}:`, error);
        }
      }
    }

    // 2. Process selected notebook pages
    if (selectedPages && Object.keys(selectedPages).length > 0) {
      console.log("Processing selected pages:", selectedPages);

      for (const notebookId of Object.keys(selectedPages)) {
        const pageIds = selectedPages[notebookId];
        console.log(`Fetching notebook ${notebookId} with pages:`, pageIds);

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
            console.warn(
              `Page ${pageId} not found in notebook ${notebookId}, skipping`
            );
            continue;
          }

          console.log(`Found page ${pageId}:`, {
            title: page.title,
            contentLength: page.content?.length || 0,
          });

          // Add page title and content
          allContent += `\n\n## ${page.title}\n\n`;
          if (page.content) {
            allContent += `${cleanMarkdownContent(page.content)}\n\n`;
          }

          // Process markdown references if they exist
          if (page.markdownRefs?.length > 0) {
            for (const ref of page.markdownRefs) {
              try {
                const bucket = adminStorage.bucket();
                const file = bucket.file(ref.path);
                const [exists] = await file.exists();
                if (!exists) continue;

                const [content] = await file.download();
                allContent += cleanMarkdownContent(content.toString()) + "\n\n";
              } catch (error) {
                console.error(
                  `Error fetching markdown file ${ref.path}:`,
                  error
                );
              }
            }
          }

          // Process study documents
          if (page.studyDocs?.length > 0) {
            for (const studyDoc of page.studyDocs) {
              try {
                const bucket = adminStorage.bucket();
                const file = bucket.file(studyDoc.path);
                const [exists] = await file.exists();
                if (!exists) continue;

                const [content] = await file.download();
                allContent += `## ${studyDoc.name}\n\n${cleanMarkdownContent(
                  content.toString()
                )}\n\n`;
              } catch (error) {
                console.error(
                  `Error fetching study doc ${studyDoc.path}:`,
                  error
                );
              }
            }
          }
        }
      }
    }

    // Validate that we have some content to work with
    if (!allContent.trim()) {
      throw new Error(
        "No content found in uploaded documents or selected pages"
      );
    }

    console.log("Collected content length:", allContent.length);

    // Generate cards using OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
            content: `Create ${numCards} study cards from this content. Respond in ${language}. Focus on the most important concepts and key information:
            ${allContent}
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
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const result = await response.json();
    const cleanedResponse = cleanJsonResponse(
      result.choices[0].message.content
    );
    const parsedResponse = JSON.parse(cleanedResponse);

    return NextResponse.json({
      cards: parsedResponse.cards,
      success: true,
    });
  } catch (error) {
    console.error("Error in studycards API:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate study cards",
        details: error instanceof Error ? error.stack : undefined,
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
