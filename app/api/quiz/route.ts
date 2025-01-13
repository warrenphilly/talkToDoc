import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

interface QuizParams {
  format: string;
  responseType: string;
  numberOfQuestions: string;
  questionTypes: string[];
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const messageStr = formData.get('message') as string;
    const context = formData.get('context') as string;
    const files = formData.getAll('files');

    // Parse the message string into our QuizParams interface
    const quizParams: QuizParams = JSON.parse(messageStr);

    // Create a detailed system prompt based on quiz parameters
    const systemPrompt = `You are a quiz generator. Generate a quiz with the following specifications:
- Format: ${quizParams.format === 'oneAtATime' ? 'One question at a time with immediate feedback' : 'All questions at once with feedback at the end'}
- Number of questions: ${quizParams.numberOfQuestions}
- Question types to include: ${quizParams.questionTypes.join(', ')}
- Response format: ${quizParams.responseType}

For each question:
1. If it's multiple choice, provide 4 options
2. Include the correct answer
3. Provide a brief explanation for the correct answer

Format the response as a JSON object with the following structure:
{
  "questions": [
    {
      "id": number,
      "type": "multipleChoice" | "trueFalse" | "shortAnswer",
      "question": string,
      "options": string[] (for multiple choice),
      "correctAnswer": string,
      "explanation": string
    }
  ]
}`;

    // Handle file uploads (if any)
    const uploadedFiles = await Promise.all(
      files.map(async (file: any) => {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filename = `${Date.now()}-${file.name}`;
        const filepath = path.join(process.cwd(), 'public', 'uploads', filename);
        await writeFile(filepath, buffer);
        const base64Image = buffer.toString('base64');
        return {
          path: `/uploads/${filename}`,
          base64: `data:${file.type};base64,${base64Image}`
        };
      })
    );

    // Prepare messages for OpenAI API
    const messages = [
      { 
        role: 'system', 
        content: systemPrompt
      },
      {
        role: "user",
        content: [
          { type: "text", text: context },
          ...uploadedFiles.map(file => ({
            type: "image_url",
            image_url: {
              url: file.base64
            }
          }))
        ]
      }
    ];

    // Make the API call to OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Updated to use the latest model
        messages,
        max_tokens: 4500,
        temperature: 0.7,
        response_format: { type: "json_object" }, // Ensure JSON response
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Parse and validate the response
    try {
      const quizContent = JSON.parse(data.choices[0].message.content);
      
      // Add metadata to the response
      const finalResponse = {
        quiz: quizContent,
        metadata: {
          format: quizParams.format,
          responseType: quizParams.responseType,
          totalQuestions: quizParams.numberOfQuestions,
          questionTypes: quizParams.questionTypes,
        }
      };

      return NextResponse.json(finalResponse);
    } catch (parseError) {
      console.error('Failed to parse quiz response:', parseError);
      throw new Error('Invalid quiz response format');
    }

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