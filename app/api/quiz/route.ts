import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/firebase/firebaseAdmin';
import { cleanMarkdownContent } from '@/lib/markdownUtils';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const messageStr = formData.get('message') as string;
    if (!messageStr) {
      throw new Error("No message provided");
    }

    console.log('Received message:', messageStr); // Debug log

    const { notebookId, pageId, format, numberOfQuestions, questionTypes } = JSON.parse(messageStr);
    
    console.log('Looking for notebook:', notebookId); // Debug log
    console.log('Looking for page:', pageId); // Debug log

    // Get the notebook document
    const notebookRef = adminDb.collection('notebooks').doc(notebookId);
    const notebookSnap = await notebookRef.get();

    if (!notebookSnap.exists) {
      throw new Error("Notebook not found");
    }

    const notebookData = notebookSnap.data();
    if (!notebookData) {
      throw new Error("Notebook data is empty");
    }

    const page = notebookData.pages?.find((p: any) => p.id === pageId);
    if (!page) {
      throw new Error("Page not found");
    }

    console.log('Found page with markdownRefs:', page.markdownRefs); // Debug log

    // Fetch content from markdown files
    let allContent = '';
    if (page.markdownRefs && page.markdownRefs.length > 0) {
      for (const markdownRef of page.markdownRefs) {
        try {
          // Remove 'gs://studiyo-cf523/' from the path if it exists
          const cleanPath = markdownRef.path.replace(/^gs:\/\/[^\/]+\//, '');
          console.log('Attempting to fetch file from path:', cleanPath); // Debug log

          const bucket = adminStorage.bucket();
          const file = bucket.file(cleanPath);
          
          // Check if file exists
          const [exists] = await file.exists();
          if (!exists) {
            console.error('File does not exist:', cleanPath);
            continue;
          }

          const [content] = await file.download();
          const contentStr = content.toString();
          console.log('Content length:', contentStr.length); // Debug log
          
          allContent += cleanMarkdownContent(contentStr) + '\n\n';
        } catch (error) {
          console.error(`Error fetching markdown file ${markdownRef.path}:`, error);
          console.error('Full error:', error);
        }
      }
    } else {
      throw new Error("No markdown references found for this page");
    }

    if (!allContent.trim()) {
      throw new Error("No content found to generate quiz from");
    }

    console.log('Total content length:', allContent.length); // Debug log

    // Make the OpenAI API call
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a quiz generator. You must respond with a valid JSON object only. Generate a quiz based on this content:

${allContent}

Create ${numberOfQuestions} questions using these types: ${questionTypes.join(', ')}.

Your response must be a valid JSON object with this exact structure:
{
  "questions": [
    {
      "question": "Question text here",
      "type": "trueFalse|multipleChoice|shortAnswer",
      "options": ["option1", "option2"],
      "correctAnswer": "The correct answer",
      "explanation": "Explanation of the answer"
    }
  ]
}

Do not include any text outside of the JSON object.`
          }
        ],
        max_tokens: 4500,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    
    // Parse the response content as JSON
    let quizData;
    try {
      quizData = typeof data.choices[0].message.content === 'string' 
        ? JSON.parse(data.choices[0].message.content)
        : data.choices[0].message.content;
    } catch (error) {
      console.error('Failed to parse quiz data:', error);
      throw new Error('Invalid quiz response format');
    }

    return NextResponse.json({
      quiz: quizData,
      metadata: {
        format,
        numberOfQuestions,
        questionTypes,
      }
    });

  } catch (error) {
    console.error('Quiz generation error:', error);
    return NextResponse.json({ 
      error: "Failed to generate quiz",
      message: error instanceof Error ? error.message : "Unknown error occurred"
    }, { status: 500 });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};