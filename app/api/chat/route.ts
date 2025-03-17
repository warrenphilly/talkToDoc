import {
  getUserByClerkId,
  updateUserCreditBalance,
} from "@/lib/firebase/firestore";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY as string,
});

interface Sentence {
  id: number;
  text: string;
  format?:
    | "paragraph"
    | "bullet"
    | "numbered"
    | "formula"
    | "italic"
    | "bold"
    | "heading";
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
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const firestoreUser = await getUserByClerkId(userId);

  if (!firestoreUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Check if user is Pro or has enough credits
  const isPro = firestoreUser.metadata?.isPro || false;
  const creditBalance = firestoreUser.creditBalance || 0;
  const requiredCredits = 450; // Credits needed for chat

  if (!isPro && creditBalance < requiredCredits) {
    return NextResponse.json(
      {
        error: "Insufficient credits",
        creditBalance,
        requiredCredits,
      },
      { status: 403 }
    );
  }

  const language = firestoreUser?.language || "English";

  try {
    const data = await req.json();
    const message = data.message;
    const notebookId = data.notebookId;
    const pageId = data.pageId;
    const streamMode = data.stream === true;

    console.log("Processing message length:", message.length);
    console.log("Stream mode:", streamMode);
    console.log("Language:", language);

    // Define the expected structure for the response
    const functions = [
      {
        name: "generate_sections",
        description:
          "Generates a structured response with sections and formatted educational content",
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
                        format: {
                          type: "string",
                          description:
                            "Optional formatting type: 'paragraph', 'bullet', 'numbered', 'formula', 'italic', 'bold', 'heading'",
                          enum: [
                            "paragraph",
                            "bullet",
                            "numbered",
                            "formula",
                            "italic",
                            "bold",
                            "heading",
                          ],
                        },
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

    // Update system message to increase length and detail in main sections
    const systemMessage = `You are an Expert Educational Content Creator with a warm, engaging teaching style. Analyze the following content and create comprehensive, well-structured educational notes that sound conversational and human.

Create clear sections with a natural teaching flow. Structure your content as follows:

1. Start each section with a clear, engaging title
2. Begin with a thorough introduction to the topic that sparks interest (2-3 paragraphs)
3. Present concepts in a logical order with rich, detailed explanations
4. Develop each main section with substantial depth (5-8 paragraphs)
5. Use analogies, examples, case studies, and real-world applications to illustrate complex ideas
6. Include mathematical equations and formulas when relevant, formatted properly
7. Explore nuances, exceptions, and alternative perspectives where appropriate
8. For complex sections only: Include a brief "Section Summary" with 2-3 bullet points
9. End the entire content with a comprehensive "Final Summary" that captures all key points
10. In the Final Summary, use 5-7 bullet points to highlight the most important takeaways

Writing style guidelines:
- Write in a conversational, engaging tone as if speaking directly to a student
- Use second-person ("you") occasionally to connect with the reader
- Aim for depth while maintaining clarity - don't oversimplify complex topics
- Include relevant historical context, theoretical foundations, and practical applications
- Vary sentence structure to maintain interest
- Explain complex ideas thoroughly with multiple examples
- Use rhetorical questions occasionally to engage the reader

Formatting guidelines:
- Use the "formula" format for mathematical equations and scientific formulas
- Use bullet points for lists of related items or in summaries
- Use numbered lists for sequential steps or processes
- Use italic formatting for technical terms, emphasis, or foreign words
- Use bold formatting for key concepts and important definitions
- Use heading format for subsection titles and for "Section Summary" and "Final Summary" headings

Each section should be comprehensive and detailed while remaining accessible. Generate one section at a time. Respond in ${language}.`;

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
                content: systemMessage,
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
                          // Ensure each sentence has a format property if not provided
                          parsed.section.sentences =
                            parsed.section.sentences.map(
                              (sentence: Sentence) => {
                                // If no format is specified, default to paragraph
                                if (!sentence.format) {
                                  return { ...sentence, format: "paragraph" };
                                }
                                // If the format is something other than the allowed formats, default to paragraph
                                if (
                                  ![
                                    "paragraph",
                                    "bullet",
                                    "numbered",
                                    "formula",
                                    "italic",
                                    "bold",
                                    "heading",
                                  ].includes(sentence.format)
                                ) {
                                  return { ...sentence, format: "paragraph" };
                                }
                                return sentence;
                              }
                            );

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

      // After successful processing, deduct credits if not Pro
      if (!isPro) {
        const newCreditBalance = creditBalance - requiredCredits;

        // Update the user's credit balance in Firestore
        const updateResult = await updateUserCreditBalance(
          firestoreUser.id,
          newCreditBalance
        );

        if (!updateResult) {
          console.error(
            `Failed to update credit balance for user ${firestoreUser.id}`
          );
        } else {
          console.log(
            `Successfully deducted ${requiredCredits} credits from user ${userId}. New balance: ${newCreditBalance}`
          );
        }
      }

      return new StreamingTextResponse(stream.readable);
    } else {
      // Non-streaming mode (original implementation)
      let allSections: Section[] = [];

      // Process each chunk
      for (const chunk of textChunks) {
        const messages = [
          {
            role: "system" as const,
            content: systemMessage,
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

      // After successful processing, deduct credits if not Pro
      if (!isPro) {
        const newCreditBalance = creditBalance - requiredCredits;

        // Update the user's credit balance in Firestore
        const updateResult = await updateUserCreditBalance(
          firestoreUser.id,
          newCreditBalance
        );

        if (!updateResult) {
          console.error(
            `Failed to update credit balance for user ${firestoreUser.id}`
          );
        } else {
          console.log(
            `Successfully deducted ${requiredCredits} credits from user ${userId}. New balance: ${newCreditBalance}`
          );
        }
      }

      // Original return for non-credit scenarios
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
