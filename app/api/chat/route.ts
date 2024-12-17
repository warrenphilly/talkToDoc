import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

interface Sentence {
  id: number;
  text: string;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const message = formData.get('message') as string;
    const files = formData.getAll('files');

    // Handle file uploads and convert to base64
    const uploadedFiles = await Promise.all(
      files.map(async (file: any) => {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        // Create unique filename
        const filename = `${Date.now()}-${file.name}`;
        const filepath = path.join(process.cwd(), 'public', 'uploads', filename);
        
        // Save file
        await writeFile(filepath, buffer);

        // Convert to base64 for OpenAI API
        const base64Image = buffer.toString('base64');
        return {
          path: `/uploads/${filename}`,
          base64: `data:${file.type};base64,${base64Image}`
        };
      })
    );

    // Define the expected structure for the response
    const functions = [
      {
        name: "generate_sections",
        description: "Generates a structured response with sections and sentences",
        parameters: {
          type: "object",
          properties: {
            sections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  sentences: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "number" },
                        text: { type: "string" }
                      },
                      required: ["id", "text"]
                    }
                  }
                },
                required: ["title", "sentences"]
              }
            }
          },
          required: ["sections"]
        }
      }
    ];

    // Prepare messages for OpenAI API
    const messages = [
      { 
        role: 'system', 
        content: `You are a helpful Teacher. You must ALWAYS respond with ONLY a JSON array of sections, where each section contains an array of sentences.`
      },
      {
        role: "user",
        content: [
          { type: "text", text: message },
          ...uploadedFiles.map(file => ({
            type: "image_url",
            image_url: {
              url: file.base64
            }
          }))
        ]
      }
    ];

    // Update the API call
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        max_tokens: 5000,
        temperature: 0.7,
        functions,
        function_call: { name: "generate_sections" }
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI complete response:', JSON.stringify(data, null, 2)); // Detailed debug log

    // Ensure the response structure is correct
    const choices = data.choices;
    if (!choices || !Array.isArray(choices) || choices.length === 0) {
      console.error('Invalid OpenAI response structure:', JSON.stringify(data, null, 2));
      throw new Error('Invalid API response structure');
    }

    // Extract the structured data from function_call.arguments
    const functionCall = choices[0]?.message?.function_call;
    const messageContent = functionCall ? functionCall.arguments : null;

    if (!messageContent) {
      console.error('Invalid OpenAI response structure:', JSON.stringify(data, null, 2));
      throw new Error('Invalid API response structure');
    }

    let finalResponse;
    try {
      finalResponse = JSON.parse(messageContent);
      console.log('Parsed response:', finalResponse); // Debug log

      // Validate the structure
      if (!Array.isArray(finalResponse.sections)) {
        throw new Error('Response is not an array of sections');
      }

      // Validate each section
      const validSections = finalResponse.sections.every((section: { title: string; sentences: { id: number; text: string }[] }) => {
        if (!section.title || !section.sentences || !Array.isArray(section.sentences)) {
          console.error('Invalid section structure:', section);
          return false;
        }

        return section.sentences.every((sentence: { id: number; text: string }) => {
          if (!sentence || typeof sentence.id !== 'number' || typeof sentence.text !== 'string') {
            console.error('Invalid sentence structure:', sentence);
            return false;
          }
          return true;
        });
      });

      if (!validSections) {
        throw new Error('Invalid section or sentence structure');
      }

      return NextResponse.json({ reply: JSON.stringify(finalResponse.sections) });

    } catch (parseError) {
      console.error('Parsing error:', parseError);
      return NextResponse.json({
        reply: JSON.stringify([{
          title: "Error",
          sentences: [{
            id: 1,
            text: "Failed to parse the AI response."
          }]
        }])
      });
    }
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({
      reply: JSON.stringify([{
        title: "Error",
        sentences: [{
          id: 1,
          text: "An error occurred while processing your request."
        }]
      }])
    }, { status: 500 });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};