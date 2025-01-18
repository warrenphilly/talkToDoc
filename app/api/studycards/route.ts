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

    const { notebookId, pageId, numberOfCards } = JSON.parse(messageStr);

    // Get the notebook document
    console.log('Fetching notebook:', notebookId);
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

    // Fetch content from markdown files
    let allContent = '';
    if (page.markdownRefs && page.markdownRefs.length > 0) {
      console.log("Found markdownRefs:", page.markdownRefs.length);
      for (const markdownRef of page.markdownRefs) {
        try {
          // Remove 'gs://bucket-name/' from the path if it exists
          const cleanPath = markdownRef.path.replace(/^gs:\/\/[^\/]+\//, '');
          console.log("Processing markdown file:", cleanPath);

          const bucket = adminStorage.bucket();
          const file = bucket.file(cleanPath);
          
          const [exists] = await file.exists();
          if (!exists) {
            console.error('File does not exist:', cleanPath);
            continue;
          }

          const [content] = await file.download();
          const contentStr = content.toString();
          console.log('Content length:', contentStr.length);
          
          allContent += cleanMarkdownContent(contentStr) + '\n\n';
        } catch (error) {
          console.error(`Error fetching markdown file ${markdownRef.path}:`, error);
          console.error('Full error:', error);
        }
      }
    }

    if (!allContent.trim()) {
      throw new Error("No content found in the documents");
    }

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
            content: `You are a knowledgeable teacher creating study cards from the following document content:

${allContent}

Instructions:
1. Generate ${numberOfCards} study cards based on the most important concepts from the document.
2. Each card should have:
   - A clear, concise question or concept title
   - A detailed but focused explanation (1-2 sentences)
3. Cover different aspects of the material
4. Ensure explanations are accurate and directly based on the document content
5. Format cards from easiest to most complex concepts

Respond with a valid JSON array of cards in this format:
{
  "cards": [
    {
      "title": "Question or key concept",
      "content": "Clear, concise explanation"
    }
  ]
}

Make the cards comprehensive but concise. Do not include any text outside of the JSON object.`
          }
        ],
        max_tokens: 4000,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      console.error("Invalid API response structure:", data);
      throw new Error("Invalid response from AI service");
    }

    const cardsData = JSON.parse(data.choices[0].message.content);

    return NextResponse.json(cardsData);

  } catch (error) {
    console.error('Study card generation error:', error);
    return NextResponse.json({ 
      error: "Failed to generate study cards",
      message: error instanceof Error ? error.message : "Unknown error occurred"
    }, { status: 500 });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}; 