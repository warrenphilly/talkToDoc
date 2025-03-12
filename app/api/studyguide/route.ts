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

The response should follow this format:
{
  "sections": [
    {
      "topic": "Main Topic Name",
      "subtopics": [
        {
          "title": "Subtopic Title",
          "description": "Clear, concise explanation of the concept",
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
            content: `Create a study guide titled "${guideName}" from the following content:\n\n${allContent}`,
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
      studyGuideContent = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      console.error("Raw Content:", cleanContent);
      throw new Error("Failed to parse study guide content");
    }

    // Add show property to each section
    const formattedSections = studyGuideContent.sections.map(
      (section: any) => ({
        ...section,
        show: false,
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
