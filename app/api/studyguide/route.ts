import { adminDb, adminStorage } from "@/lib/firebase/firebaseAdmin";
import {
  getUserByClerkId,
  updateUserCreditBalance,
} from "@/lib/firebase/firestore";
import { cleanMarkdownContent } from "@/lib/markdownUtils";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

interface StudyGuideSection {
  topic: string;
  subtopics: {
    title: string;
    description: string;
    keyPoints: string[];
    examples?: string[];
    studyTips?: string[];
  }[];
  show: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const firestoreUser = await getUserByClerkId(userId);

    if (!firestoreUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user is Pro or has enough credits
    const isPro = firestoreUser.metadata?.isPro || false;
    const creditBalance = firestoreUser.creditBalance || 0;
    const requiredCredits = 150; // Credits needed for study guide

    if (!isPro && creditBalance < requiredCredits) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
          creditBalance,
          requiredCredits,
        },
        { status: 403 }
      );
    }

    const language = firestoreUser?.language || "English";

    const body = await req.json();
    const { selectedPages, guideName, uploadedDocs } = body;

    if (!guideName) {
      throw new Error("No guide name provided");
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
                console.error(
                  `Error processing markdown ref ${ref.path}:`,
                  error
                );
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
            content: `You are a skilled educator and study guide creator. Create a comprehensive study guide that helps students understand and retain key concepts. Return ONLY valid JSON without any markdown formatting or code blocks.

IMPORTANT INSTRUCTIONS FOR FORMATTING MATHEMATICAL EXPRESSIONS IN JSON:
1. DO NOT use LaTeX notation in the JSON response, as it causes parsing issues.
2. For mathematical expressions, use ASCII representations: 
   - Use ^ for superscripts: "x^2" instead of LaTeX power notation
   - Use / for fractions: "a/b" instead of LaTeX fractions
   - Use sqrt() for square roots: "sqrt(x)" instead of LaTeX square root
   - For complex equations, use descriptive text: "the square root of x plus y" 
3. If you need to include Greek letters or special symbols, spell them out: "alpha", "beta", "pi", etc.
4. Describe complex mathematical expressions in plain English.

The response should follow this format:
{
  "sections": [
    {
      "topic": "Main Topic Name",
      "subtopics": [
        {
          "title": "Subtopic Title",
          "description": "Clear, concise explanation of the concept. Include properly formatted mathematical expressions using the rules above.",
          "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
          "examples": ["Relevant example 1", "Relevant example 2"],
          "studyTips": ["Specific study tip for this subtopic", "Memory aid or mnemonic if applicable"]
        }
      ]
    }
  ]
}`,
          },
          {
            role: "user",
            content: `Create a study guide titled "${guideName}" from the following content. When including mathematical concepts, use plain text descriptions or ASCII notation (x^2, a/b, sqrt()) instead of LaTeX notation:\n\n${allContent}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();

    // Clean the response content to remove any markdown formatting
    const cleanContent = data.choices[0].message.content.replace(
      /```json\n|\n```/g,
      ""
    );

    let studyGuideContent;
    try {
      // Try direct parsing first as a simple case
      try {
        studyGuideContent = JSON.parse(cleanContent);
      } catch (initialParseError) {
        console.log("Initial parse failed, attempting to fix LaTeX notation");

        // Create a safer version of the content by directly extracting the JSON structure
        // This approach is more reliable than complex regex replacements
        const jsonMatch = /{[\s\S]*}/.exec(cleanContent);
        if (!jsonMatch) {
          throw new Error("Could not extract JSON from response");
        }

        let jsonContent = jsonMatch[0];

        // First, let's normalize all LaTeX backslashes before JSON parsing
        // This pre-processing step helps avoid common LaTeX escaping issues
        jsonContent = jsonContent
          // Replace all escaped LaTeX commands with placeholders
          .replace(/\\(\\)?([a-zA-Z]+)/g, (match, escaped, command) => {
            return `__LATEX_CMD_${command}__`;
          })
          // Replace LaTeX delimiters with placeholders
          .replace(/\\(\\)?\(/g, "__LATEX_OPEN_PAREN__")
          .replace(/\\(\\)?\)/g, "__LATEX_CLOSE_PAREN__")
          .replace(/\\(\\)?\[/g, "__LATEX_OPEN_BRACKET__")
          .replace(/\\(\\)?\]/g, "__LATEX_CLOSE_BRACKET__")
          // Replace LaTeX special characters
          .replace(/\\(\\)?([^a-zA-Z])/g, (match, escaped, char) => {
            return `__LATEX_CHAR_${char.charCodeAt(0)}__`;
          });

        // Now parse the sanitized JSON
        try {
          studyGuideContent = JSON.parse(jsonContent);

          // Function to restore LaTeX notation in the parsed content
          const restoreLatex = (obj: unknown): unknown => {
            if (typeof obj === "string") {
              return obj
                .replace(/__LATEX_CMD_([a-zA-Z]+)__/g, "\\$1")
                .replace(/__LATEX_OPEN_PAREN__/g, "\\(")
                .replace(/__LATEX_CLOSE_PAREN__/g, "\\)")
                .replace(/__LATEX_OPEN_BRACKET__/g, "\\[")
                .replace(/__LATEX_CLOSE_BRACKET__/g, "\\]")
                .replace(/__LATEX_CHAR_(\d+)__/g, (match, charCode) => {
                  return "\\" + String.fromCharCode(parseInt(charCode));
                });
            } else if (Array.isArray(obj)) {
              return obj.map(restoreLatex);
            } else if (obj !== null && typeof obj === "object") {
              const result: Record<string, unknown> = {};
              for (const key in obj) {
                result[key] = restoreLatex(
                  (obj as Record<string, unknown>)[key]
                );
              }
              return result;
            }
            return obj;
          };

          // Restore LaTeX notation in the parsed content
          studyGuideContent = restoreLatex(studyGuideContent);
        } catch (jsonError) {
          console.error(
            "JSON parsing error with sanitized content:",
            jsonError
          );

          // Last resort: Try a more aggressive approach
          try {
            // Fully encode all problematic characters in the raw JSON
            const fullyEncodedContent = cleanContent.replace(
              /\\./g,
              (match: string) => {
                return `\\u${match
                  .charCodeAt(1)
                  .toString(16)
                  .padStart(4, "0")}`;
              }
            );

            studyGuideContent = JSON.parse(fullyEncodedContent);
          } catch (finalError) {
            console.error("Final parse attempt failed:", finalError);
            throw new Error("Failed to parse study guide content");
          }
        }
      }
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      console.error("Raw Content:", cleanContent);

      // As a last resort, try to manually extract the sections from the raw text
      try {
        // Attempt to extract section data directly using a more flexible approach
        const sections = [];
        const sectionMatches = cleanContent.match(/"topic"\s*:\s*"([^"]+)"/g);

        if (sectionMatches && sectionMatches.length > 0) {
          for (const sectionMatch of sectionMatches) {
            const topicMatch = /"topic"\s*:\s*"([^"]+)"/.exec(sectionMatch);
            if (topicMatch && topicMatch[1]) {
              sections.push({
                topic: topicMatch[1],
                subtopics: [],
                show: false,
              });
            }
          }

          // If we found at least one section, create basic content for the study guide
          if (sections.length > 0) {
            studyGuideContent = { sections };
          } else {
            throw new Error("Could not extract sections from content");
          }
        } else {
          throw new Error("No sections found in content");
        }
      } catch (extractionError) {
        console.error("Extraction error:", extractionError);
        throw new Error("Failed to parse or extract study guide content");
      }
    }

    // Add show property to each section
    const formattedSections = studyGuideContent.sections.map(
      (section: any) => ({
        ...section,
        show: section.show === undefined ? false : section.show,
      })
    );

    // After successful OpenAI response and before returning to client,
    // deduct credits if not Pro
    if (!isPro) {
      const newCreditBalance = creditBalance - requiredCredits;

      // Update the user's credit balance in Firestore
      const updateResult = await updateUserCreditBalance(
        firestoreUser.id,
        newCreditBalance
      );

      if (!updateResult) {
        console.error(
          `Failed to update credit balance for user ${firestoreUser.id}`
        );
      } else {
        console.log(
          `Successfully deducted ${requiredCredits} credits from user ${userId}. New balance: ${newCreditBalance}`
        );
      }

      // Add credit balance to the response
      return NextResponse.json({
        content: formattedSections,
        remainingCredits: newCreditBalance,
      });
    }

    // Original return for Pro users
    return NextResponse.json({
      content: formattedSections,
    });
  } catch (error) {
    console.error("Study guide generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate study guide",
        details:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
