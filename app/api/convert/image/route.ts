import { NextRequest, NextResponse } from "next/server";
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY as string,
});

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

// export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const totalChunks = formData.get("totalChunks");
    const chunkIndex = formData.get("chunkIndex");

    // If this is a chunk, acknowledge receipt
    if (totalChunks && chunkIndex) {
      console.log(`Received chunk ${chunkIndex} of ${totalChunks} for image conversion`);
      return NextResponse.json({
        success: true,
        isChunk: true,
        chunkIndex
      });
    }

    console.log(`Processing complete image: ${file.name}, size: ${file.size}, type: ${file.type}`);

    // Convert image to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');
    const mimeType = file.type;
    const dataURI = `data:${mimeType};base64,${base64Image}`;

    // Analyze image with OpenAI
    console.log('Sending image to OpenAI for analysis...');
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert at analyzing images and providing detailed, accurate descriptions. Focus on key details, context, and any text visible in the image. Provide a comprehensive analysis that includes both visual elements and any text content. If you see any text in the image, make sure to include it verbatim in your analysis."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze this image and provide a detailed description. Include any text you can see in the image, making sure to transcribe it exactly as it appears."
            },
            {
              type: "image_url",
              image_url: {
                url: dataURI,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    });

    const imageAnalysis = response.choices[0]?.message?.content;
    
    if (!imageAnalysis) {
      throw new Error('No analysis generated for image');
    }

    console.log("Successfully analyzed image");
    return NextResponse.json({ 
      text: imageAnalysis,
      success: true 
    });

  } catch (err) {
    const error = err as Error;
    console.error("Image conversion error:", {
      error,
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      { 
        error: true,
        details: error.message || "Unknown error occurred",
        text: null
      },
      { status: 500 }
    );
  }
} 