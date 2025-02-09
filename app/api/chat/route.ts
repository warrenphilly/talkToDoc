import { NextRequest, NextResponse } from "next/server";
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY as string,
});

interface Sentence {
  id: number;
  text: string;
}

interface Section {
  title: string;
  sentences: Sentence[];
}

interface ChunkResponse {
  sections: Section[];
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const message = data.message;

    console.log("Processing message length:", message.length);

    // Define the expected structure for the response
    const functions = [
      {
        name: "generate_sections",
        description: "Generates a structured response with sections and cohesive sentences",
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
                        text: { type: "string" },
                      },
                      required: ["id", "text"],
                    },
                  },
                },
                required: ["title", "sentences"],
              },
            },
          },
          required: ["sections"],
        },
      },
    ];

    // Split long text into chunks
    const MAX_CHUNK_LENGTH = 4000;
    const textChunks: string[] = [];
    
    for (let i = 0; i < message.length; i += MAX_CHUNK_LENGTH) {
      textChunks.push(message.slice(i, i + MAX_CHUNK_LENGTH));
    }

    console.log(`Split message into ${textChunks.length} chunks`);

    let allSections: Section[] = [];

    // Process each chunk
    for (const chunk of textChunks) {
      const messages = [
        {
          role: "system" as const,
          content: `You are an Expert Document Analyzer. Analyze the following content and break it down into clear sections with at least 7 related sentences per section. Focus on the main points and key information.`,
        },
        {
          role: "user" as const,
          content: chunk,
        },
      ];

      console.log("Processing chunk of length:", chunk.length);

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        temperature: 0.7,
        max_tokens: 1500,
        functions,
        function_call: { name: "generate_sections" },
      });

      const functionCall = response.choices[0]?.message?.function_call;
      
      if (!functionCall?.arguments) {
        console.error("No function call arguments in response");
        continue;
      }

      try {
        const chunkResponse = JSON.parse(functionCall.arguments) as ChunkResponse;
        if (chunkResponse.sections) {
          allSections = [...allSections, ...chunkResponse.sections];
        }
      } catch (parseError) {
        console.error("Error parsing chunk response:", parseError);
      }
    }

    console.log(`Generated ${allSections.length} total sections`);

    if (allSections.length === 0) {
      throw new Error("No sections were generated from the content");
    }

    return NextResponse.json({
      replies: allSections,
    });

  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json({
      replies: [{
        title: "Error",
        sentences: [{
          id: 1,
          text: error instanceof Error ? error.message : "An unexpected error occurred"
        }]
      }]
    }, { status: 500 });
  }
}