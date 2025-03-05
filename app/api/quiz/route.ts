import { adminDb, adminStorage } from "@/lib/firebase/firebaseAdmin";
import { cleanMarkdownContent, splitIntoChunks } from "@/lib/markdownUtils";
import { NextRequest, NextResponse } from "next/server";

interface QuizMessage {
  userId: string;
  format: string;
  numberOfQuestions: number;
  questionTypes: string[];
  selectedPages: { [notebookId: string]: string[] };
  uploadedDocs: Array<{
    path?: string;
    text?: string;
    name: string;
  }>;
  notebookId?: string;
  pageId?: string;
  quizName: string;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const messageStr = formData.get("message") as string;
    if (!messageStr) {
      throw new Error("No message provided");
    }

    const message = JSON.parse(messageStr) as QuizMessage;
    console.log("Received message:", message);

    let allContent = "";

    // Process uploaded documents
    if (message.uploadedDocs?.length > 0) {
      for (const doc of message.uploadedDocs) {
        console.log("Processing uploaded doc:", doc);

        try {
          if (doc.text) {
            allContent += `\n\n--- From ${doc.name} ---\n\n${doc.text}`;
          } else if (doc.path) {
            const file = adminStorage.bucket().file(doc.path);
            const [exists] = await file.exists();
            if (!exists) {
              console.warn(`File does not exist in storage: ${doc.path}`);
              continue;
            }

            const [content] = await file.download();
            const cleanedContent = cleanMarkdownContent(content.toString());
            allContent += `\n\n--- From ${doc.name} ---\n\n${cleanedContent}`;
          }
        } catch (error) {
          console.error(`Error processing doc ${doc.name}:`, error);
        }
      }
    }

    // Process selected notebook pages and their specific markdown references
    if (
      message.selectedPages &&
      Object.keys(message.selectedPages).length > 0
    ) {
      for (const notebookId of Object.keys(message.selectedPages)) {
        const selectedPageIds = message.selectedPages[notebookId];
        const notebookRef = adminDb.collection("notebooks").doc(notebookId);
        const notebookSnap = await notebookRef.get();

        if (!notebookSnap.exists) {
          console.warn(`Notebook ${notebookId} not found`);
          continue;
        }

        const notebookData = notebookSnap.data();
        if (!notebookData?.pages) {
          console.warn(`No pages found in notebook ${notebookId}`);
          continue;
        }

        // Only process selected pages
        for (const pageId of selectedPageIds) {
          const page = notebookData.pages.find((p: any) => p.id === pageId);
          if (!page) {
            console.warn(`Page ${pageId} not found in notebook ${notebookId}`);
            continue;
          }

          console.log(`Processing page ${page.title} (${pageId})`);

          // Add page content
          allContent += `\n\nNotebook Page: ${page.title}\n${page.content}`;

          // Process markdown references for this specific page
          if (page.markdownRefs?.length > 0) {
            console.log(
              `Processing ${page.markdownRefs.length} markdown refs for page ${pageId}`
            );

            for (const ref of page.markdownRefs) {
              try {
                const bucket = adminStorage.bucket();
                const file = bucket.file(ref.path);
                const [exists] = await file.exists();
                if (!exists) {
                  console.warn(`Markdown ref file does not exist: ${ref.path}`);
                  continue;
                }

                const [content] = await file.download();
                const cleanedContent = cleanMarkdownContent(content.toString());
                allContent += `\n\n--- From ${
                  ref.name || "Referenced Document"
                } ---\n\n${cleanedContent}`;
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

    if (!allContent.trim()) {
      throw new Error("No content found to generate quiz from");
    }

    // Split content into chunks if needed
    const chunks = splitIntoChunks(allContent, 8000);

    // Log the OpenAI request
    const openaiRequestBody = {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a quiz generator. You must return only valid JSON in the specified format, with no additional text or formatting. 
          
For true/false questions:
- Aim for a roughly equal distribution of true and false answers
- Avoid obvious or trivial statements
- Use clear, unambiguous language

For multiple choice questions:
- Randomize which option (A, B, C, or D) is correct
- Make all distractors plausible
- Avoid patterns in correct answer placement
- Ensure options are mutually exclusive
- Keep option lengths relatively consistent

For short answer questions:
- Create clear, specific questions with concise expected answers
- Avoid questions that could have multiple valid interpretations

Return ONLY valid JSON with no additional text.`,
        },
        {
          role: "user",
          content: `Generate a quiz with ${
            message.numberOfQuestions
          } questions based on the following content.
          Return ONLY a JSON object with the following structure:
          {
            "questions": [
              {
                "id": 1,
                "type": "multipleChoice",
                "question": "question text here",
                "options": ["correct answer", "distractor 1", "distractor 2", "distractor 3"],
                "correctAnswer": "A/B/C/D (matching the correct answer's position)",
                "explanation": "explanation text here"
              },
              {
                "id": 2,
                "type": "trueFalse",
                "question": "statement to evaluate",
                "correctAnswer": true/false,
                "explanation": "explanation text here"
              },
              {
                "id": 3,
                "type": "shortAnswer",
                "question": "question requiring a text response",
                "correctAnswer": "expected answer",
                "explanation": "explanation text here"
              }
            ]
          }
          
          IMPORTANT: Include ONLY the following question types: ${message.questionTypes.join(
            ", "
          )}. Do not include any other question types.
          
          Each question must have an explanation for the correct answer.
          
          For multiple choice questions:
          - Randomly place the correct answer in any position (A, B, C, or D)
          - Make all distractors equally plausible
          - Avoid making the correct answer stand out by length or detail
          
          For true/false questions:
          - Aim for approximately 50% true and 50% false answers
          - Make statements specific and unambiguous
          - Avoid absolute terms like "always" or "never"
          
          For short answer questions:
          - Create questions with specific, concise expected answers
          - Provide clear, unambiguous questions
          
          Content to generate questions from: ${chunks[0]}`,
        },
      ],
      temperature: 0.8,
      response_format: { type: "json_object" },
    };

    console.log("OpenAI request:", openaiRequestBody);

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify(openaiRequestBody),
      }
    );

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error("OpenAI API error:", errorData);
      throw new Error(
        `OpenAI API error: ${errorData.error?.message || "Unknown error"}`
      );
    }

    const quizResponse = await openaiResponse.json();
    console.log("OpenAI response:", quizResponse);

    // Validate OpenAI response structure
    if (!quizResponse.choices?.[0]?.message?.content) {
      console.error("Invalid OpenAI response structure:", quizResponse);
      throw new Error("Invalid response from OpenAI");
    }

    let parsedQuiz;
    try {
      const content = quizResponse.choices[0].message.content;
      console.log("Quiz content:", content);

      // Handle both string and object responses
      parsedQuiz = typeof content === "string" ? JSON.parse(content) : content;
      console.log("Parsed quiz:", parsedQuiz);

      // Validate the structure
      if (!parsedQuiz?.questions?.length) {
        throw new Error("Quiz response missing questions array");
      }
    } catch (error) {
      console.error("Failed to parse quiz response:", error);
      console.log("Raw content:", quizResponse.choices[0].message.content);
      throw new Error("Invalid quiz format returned from OpenAI");
    }

    // Create the quiz data with proper structure
    const quizData = {
      userId: message.userId,
      quiz: {
        title: message.quizName,
        questions: parsedQuiz.questions.map((q: any, index: number) => ({
          id: index + 1,
          question: q.question || "",
          type: q.type || "multipleChoice",
          options: q.options || [],
          correctAnswer: q.correctAnswer || "",
          explanation: q.explanation || "",
        })),
      },
      sourceNotebooks: message.selectedPages,
      uploadedDocs: message.uploadedDocs,
      createdAt: new Date().toISOString(),
      name: message.quizName,
    };

    console.log("Final quiz data:", quizData);

    return NextResponse.json(quizData);
  } catch (error) {
    console.error("Quiz generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate quiz",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
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
