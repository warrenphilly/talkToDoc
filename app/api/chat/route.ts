import { writeFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

interface Sentence {
  id: number;
  text: string;
}

interface ConversionResponse {
  success: boolean;
  text?: string;
  pageCount?: number;
  error?: string;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const message = formData.get("message") as string;
    const files = formData.getAll("files");

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
        if (file.type.startsWith("image/")) {
          // For images, convert to base64
          const base64Image = buffer.toString("base64");
          return {
            type: "image",
            path: `/uploads/${filename}`,
            base64: `data:${file.type};base64,${base64Image}`,
          };
        } else if (file.type === "application/pdf") {
          // For PDFs, just return the path
          //convert pdf to text with the convert route

          const pdfFormData = new FormData();
          pdfFormData.append("file", file);

          const baseUrl =
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          const pdfText = await fetch(`${baseUrl}/api/convert`, {
            method: "POST",
            body: pdfFormData,
          });

          const data: ConversionResponse = await pdfText.json();

          console.log("pdfText", data.text);
          return {
            type: "pdf",
            path: `/uploads/${filename}`,
            text: data.text,
          };
        }
      })
    );

    // Define the expected structure for the response
    const functions = [
      {
        name: "generate_sections",
        description:
          "Generates a structured response with sections and cohesive sentences",
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

    // Prepare messages for OpenAI API
    const messages = [
      {
        role: "system",
        content: `You are an Expert in all subjects. You have the ability to break down complex topics into simple, easy to understand explanations and find the best way to teach the user. You must ALWAYS respond with ONLY a JSON array of sections, where each section contains an array of sentences. Ensure that each sentence is a complete thought and can be understood on its own, but also ensure that the sentences are related to the title of the section and the corresponding image/file and all other sentences. You must give as much information as possible without overcomplicating the explanation and rambling. When analyzing the uploaded document, do not focus describing to the user what the document is but analyze the content of the document and break it down into sections and cohesive cohesive sentences. use as many sentences as possible to explain the content of the document. each section should contain a cohesive set of at least 9 sentences, more is needed,  that are related to the title of the section and the corresponding image/file and all other sentences. prioritize the information of the document.`,
      },
      {
        role: "user",
        content: [
          { type: "text", text: message },
          ...uploadedFiles
            .filter(
              (file): file is NonNullable<typeof file> => file?.type === "image"
            )
            .map((file) => ({
              type: "image_url",
              image_url: {
                url: file.base64,
              },
            })),
        ],
      },
    ];

    // Add PDF paths to the message if any PDFs were uploaded
    const pdfFiles = uploadedFiles.filter(
      (file): file is NonNullable<typeof file> => file?.type === "pdf"
    );
    if (pdfFiles.length > 0) {
      const userMessage = messages[1].content[0] as {
        type: string;
        text: string;
      };
      userMessage.text += `\n\nPDF files uploaded: ${pdfFiles
        .map((f) => f.path)
        .join(", ")}`;
    }

    // Prepare second message for complex explanation

    // Send the first request
    const response1 = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages,
          max_tokens: 15000,
          temperature: 0.7,
          functions,
          function_call: { name: "generate_sections", strict: true },
        }),
      }
    );

    // Handle responses
    const data1 = await response1.json();

    // Ensure the response structure is correct for both responses
    const choices1 = data1.choices;

    if (!choices1 || !Array.isArray(choices1) || choices1.length === 0) {
      console.error(
        "Invalid OpenAI response structure for first request:",
        JSON.stringify(data1, null, 2)
      );
      throw new Error("Invalid API response structure for first request");
    }

    // Extract the structured data from function_call.arguments for both responses
    const functionCall1 = choices1[0]?.message?.function_call;
    const messageContent1 = functionCall1 ? functionCall1.arguments : null;

    if (!messageContent1) {
      console.error(
        "Invalid OpenAI response structure:",
        JSON.stringify(data1, null, 2)
      );
      throw new Error("Invalid API response structure");
    }

    let finalResponse1, finalResponse2;
    try {
      finalResponse1 = JSON.parse(messageContent1);

      console.log("Parsed response 1:", finalResponse1); // Debug log
      // Debug log

      // Validate the structure for both responses
      if (!Array.isArray(finalResponse1.sections)) {
        throw new Error("Response is not an array of sections");
      }

      // Return the sections directly without additional stringification
      return NextResponse.json({
        replies: [finalResponse1.sections], // Return both responses
      });
    } catch (parseError) {
      console.error("Parsing error:", parseError);
      return NextResponse.json({
        replies: [
          {
            title: "Error",
            sentences: [
              {
                id: 1,
                text: "Failed to parse the AI response.",
              },
            ],
          },
        ],
      });
    }
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      {
        replies: [
          {
            title: "Error",
            sentences: [
              {
                id: 1,
                text: "An error occurred while processing your request.",
              },
            ],
          },
        ],
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
