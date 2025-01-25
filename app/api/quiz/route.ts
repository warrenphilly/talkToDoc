import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/firebase/firebaseAdmin';
import { cleanMarkdownContent, splitIntoChunks } from '@/lib/markdownUtils';

interface QuizMessage {
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
    const messageStr = formData.get('message') as string;
    if (!messageStr) {
      throw new Error("No message provided");
    }

    const message = JSON.parse(messageStr) as QuizMessage;
    console.log("Received message:", message);

    let allContent = '';

    // Process uploaded documents
    if (message.uploadedDocs?.length > 0) {
      for (const doc of message.uploadedDocs) {
        console.log("Processing uploaded doc:", doc);

        try {
          if (doc.text) {
            // If the converted text is already available, use it
            allContent += `\n\n--- From ${doc.name} ---\n\n${doc.text}`;
          } else if (doc.path) {
            // Otherwise, fetch from storage
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

    // Process selected notebook pages
    if (message.selectedPages && Object.keys(message.selectedPages).length > 0) {
      for (const [notebookId, pageIds] of Object.entries(message.selectedPages)) {
        if (!pageIds.length) continue;

        try {
          // Get notebook data
          const notebookRef = adminDb.collection('notebooks').doc(notebookId);
          const notebookSnap = await notebookRef.get();
          
          if (!notebookSnap.exists) {
            console.warn(`Notebook ${notebookId} not found`);
            continue;
          }

          // Process each selected page
          for (const pageId of pageIds) {
            const markdownQuery = await adminDb
              .collection('markdownFiles')
              .where('notebookId', '==', notebookId)
              .where('pageId', '==', pageId)
              .get();

            for (const doc of markdownQuery.docs) {
              const { path } = doc.data();
              try {
                const file = adminStorage.bucket().file(path);
                const [exists] = await file.exists();
                if (!exists) continue;

                const [content] = await file.download();
                allContent += `\n\n${cleanMarkdownContent(content.toString())}`;
              } catch (error) {
                console.error(`Error fetching markdown file ${path}:`, error);
              }
            }
          }
        } catch (error) {
          console.error(`Error processing notebook ${notebookId}:`, error);
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
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a quiz generator. You must return only valid JSON in the specified format, with no additional text or formatting.",
        },
        {
          role: "user",
          content: `Generate a quiz with ${message.numberOfQuestions} questions based on the following content.
          Return ONLY a JSON object with the following structure, and no additional text or formatting:
          {
            "questions": [
              {
                "id": 1,
                "type": "multipleChoice",
                "question": "question text here",
                "options": ["option 1", "option 2", "option 3", "option 4"],
                "correctAnswer": "option 1",
                "explanation": "explanation text here"
              }
            ]
          }
          
          Include a mix of ${message.questionTypes.join(', ')} questions.
          Each question must have an explanation for the correct answer.
          For multiple choice questions, use A, B, C, D for correctAnswer,and save the correct answer as the option "option 1".
          
          Content to generate questions from: ${chunks[0]}`,
        },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    };

    console.log("OpenAI request:", openaiRequestBody);

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(openaiRequestBody),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error("OpenAI API error:", errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
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
      parsedQuiz = typeof content === 'string' ? JSON.parse(content) : content;
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
      quiz: {
        title: message.quizName,
        questions: parsedQuiz.questions.map((q: any, index: number) => ({
          id: index + 1,
          question: q.question || '',
          type: q.type || 'multipleChoice',
          options: q.options || [],
          correctAnswer: q.correctAnswer || '',
          explanation: q.explanation || ''
        }))
      },
      sourceNotebooks: message.selectedPages,
      uploadedDocs: message.uploadedDocs,
      createdAt: new Date().toISOString(),
      name: message.quizName
    };

    console.log("Final quiz data:", quizData);

    // Save quiz to Firestore
    await adminDb.collection('quizzes').add(quizData);

    return NextResponse.json(quizData);

  } catch (error) {
    console.error('Quiz generation error:', error);
    return NextResponse.json({ 
      error: "Failed to generate quiz",
      message: error instanceof Error ? error.message : "Unknown error occurred",
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};