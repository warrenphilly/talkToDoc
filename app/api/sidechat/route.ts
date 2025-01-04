import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const message = formData.get('message') as string;
    const context = formData.get('context') as string;
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

    // Prepare messages for OpenAI API
    const messages = [
      { 
        role: 'system', 
        content: `You are a helpful Teacher. You must elaborate to the best of your ability, while ensuring that the response is concise and to the point yet full of detail and digestible.please respond in complete paragraphs.`
      },
      {
        role: "user",
        content: [
          { type: "text", text: context },
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

    // Update the OpenAI API call
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        max_tokens: 4500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    // Parse the JSON response
    const data = await response.json();
    console.log('OpenAI API response:', data.choices[0].message.content); // Detailed debug log

    // Extract and concatenate the text content
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Unexpected API response structure:', JSON.stringify(data, null, 2));
      throw new Error('Invalid API response structure');
    }

    // Assuming the content is structured, concatenate it into a single paragraph
    const structuredContent = data.choices[0].message.content;
    const plainTextResponse = Array.isArray(structuredContent)
      ? structuredContent.map(section => section.sentences.join(' ')).join(' ')
      : structuredContent;

    // Return the plain text response as a single paragraph
    return NextResponse.json({ reply: data.choices[0].message.content });
  } catch (error) {
    console.error('Response validation error:', error);
    // Return a properly formatted fallback response
    return NextResponse.json({ reply: "The response was not in the expected format. Please try again." });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};