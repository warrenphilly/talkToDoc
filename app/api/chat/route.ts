import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

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

// Custom implementation of StreamingTextResponse since the ai package might not have it
class StreamingTextResponse extends Response {
  constructor(stream: ReadableStream) {
    super(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const message = data.message;
    const notebookId = data.notebookId;
    const pageId = data.pageId;
    const streamMode = data.stream === true;

    console.log("Processing message length:", message.length);
    console.log("Stream mode:", streamMode);

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

    // Split long text into chunks
    const MAX_CHUNK_LENGTH = 4000;
    const textChunks: string[] = [];

    for (let i = 0; i < message.length; i += MAX_CHUNK_LENGTH) {
      textChunks.push(message.slice(i, i + MAX_CHUNK_LENGTH));
    }

    console.log(`Split message into ${textChunks.length} chunks`);

    // If streaming is enabled, use the streaming API
    if (streamMode) {
      // Create a TransformStream to process the chunks
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const stream = new TransformStream({
        async start(controller) {
          let allSections: Section[] = [];
          let sectionCounter = 0;

          // Process each chunk
          for (const chunk of textChunks) {
            const messages = [
              {
                role: "system" as const,
                content: `You are an Expert Document Analyzer. Analyze the following content and break it down into clear sections with at least 7 related sentences per section. Focus on the main points and key information. Generate one section at a time.`,
              },
              {
                role: "user" as const,
                content: chunk,
              },
            ];

            console.log("Processing chunk of length:", chunk.length);

            const stream = await openai.chat.completions.create({
              model: "gpt-4o",
              messages,
              temperature: 0.7,
              max_tokens: 1500,
              functions,
              function_call: { name: "generate_sections" },
              stream: true,
            });

            let functionCallBuffer = "";

            for await (const part of stream) {
              if (part.choices[0]?.delta?.function_call?.arguments) {
                functionCallBuffer +=
                  part.choices[0].delta.function_call.arguments;

                // Try to parse complete sections as they come in
                try {
                  // Look for complete section objects in the buffer
                  const match = functionCallBuffer.match(
                    /"title":\s*"[^"]+",\s*"sentences":\s*\[\s*(?:{[^}]+},\s*)*{[^}]+}\s*\]/g
                  );

                  if (match) {
                    for (const sectionStr of match) {
                      try {
                        // Wrap the section in an object to make it valid JSON
                        const sectionJson = `{"section":{${sectionStr}}}`;
                        const parsed = JSON.parse(sectionJson);

                        if (
                          parsed.section &&
                          parsed.section.title &&
                          parsed.section.sentences
                        ) {
                          sectionCounter++;

                          // Send the section to the client
                          const sectionData = {
                            type: "section",
                            data: parsed.section,
                            total: sectionCounter,
                          };

                          controller.enqueue(
                            encoder.encode(JSON.stringify(sectionData) + "\n")
                          );

                          // Remove the processed section from the buffer
                          functionCallBuffer = functionCallBuffer.replace(
                            sectionStr,
                            ""
                          );
                        }
                      } catch (e) {
                        // Ignore parsing errors for incomplete sections
                      }
                    }
                  }
                } catch (e) {
                  // Continue collecting more data
                }
              }
            }

            // Process any remaining data in the buffer
            if (functionCallBuffer) {
              try {
                // Try to parse the complete JSON
                const fullJson = `{${functionCallBuffer}}`;
                const parsed = JSON.parse(fullJson);

                if (parsed.sections) {
                  for (const section of parsed.sections) {
                    sectionCounter++;
                    const sectionData = {
                      type: "section",
                      data: section,
                      total: sectionCounter,
                    };
                    controller.enqueue(
                      encoder.encode(JSON.stringify(sectionData) + "\n")
                    );
                  }
                }
              } catch (e) {
                console.error("Error parsing remaining buffer:", e);
              }
            }
          }

          // Send a completion message
          controller.enqueue(
            encoder.encode(
              JSON.stringify({ type: "done", total: sectionCounter }) + "\n"
            )
          );
        },
      });

      return new StreamingTextResponse(stream.readable);
    } else {
      // Non-streaming mode (original implementation)
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
          const chunkResponse = JSON.parse(
            functionCall.arguments
          ) as ChunkResponse;
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
                text:
                  error instanceof Error
                    ? error.message
                    : "An unexpected error occurred",
              },
            ],
          },
        ],
      },
      { status: 500 }
    );
  }
}
