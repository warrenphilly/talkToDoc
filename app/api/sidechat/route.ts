import { writeFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const userMessage = formData.get("userMessage") as string;
    const systemMessage = formData.get("systemMessage") as string;
    const context = formData.get("context") as string;
    const files = formData.getAll("files");

    // Validate inputs
    if (!userMessage || userMessage.trim() === "") {
      return NextResponse.json(
        {
          reply: "Please provide a message to process.",
        },
        { status: 400 }
      );
    }

    // Handle file uploads and convert to base64
    const uploadedFiles = await Promise.all(
      files.map(async (file: any) => {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create unique filename
        const filename = `${Date.now()}-${file.name}`;
        const filepath = path.join(
          process.cwd(),
          "public",
          "uploads",
          filename
        );

        // Save file
        await writeFile(filepath, buffer);

        // Convert to base64 for OpenAI API
        const base64Image = buffer.toString("base64");
        return {
          path: `/uploads/${filename}`,
          base64: `data:${file.type};base64,${base64Image}`,
        };
      })
    );

    // Create a combined prompt that includes both context and message
    const combinedPrompt = userMessage;

    console.log("combinedPrompt", combinedPrompt);

    // Prepare messages for OpenAI API
    const messages = [
      {
        role: "system",
        content: `You are a helpful Teacher. When explaining content, first understand the context provided, 
        then address the user's specific request. Provide detailed yet concise explanations that are easy to understand. 
        If you're asked to explain something, make sure to break it down into simple terms and provide relevant examples 
        when appropriate. Please respond in complete paragraphs.`,
      },
      { role: "user", content: userMessage },
      { role: "system", content: systemMessage },
    ];
    console.log("messages", messages);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
        max_tokens: 4500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();

    // Ensure we have a valid response
    if (!data.choices?.[0]?.message?.content) {
      throw new Error("Invalid API response structure");
    }

    // Return the response content directly
    return NextResponse.json({
      reply: data.choices[0].message.content,
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      {
        reply:
          "I apologize, but I encountered an error processing your request. Please try again.",
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
