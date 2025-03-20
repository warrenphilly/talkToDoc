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
6. Include mathematical equations and formulas when relevant, formatted properly using LaTeX syntax
7. Explore nuances, exceptions, and alternative perspectives where appropriate
8. For complex sections only: Include a brief "Section Summary" with 2-3 bullet points
9. End the entire content with a comprehensive "Final Summary" that captures all key points
10. In the Final Summary, use 5-7 bullet points to highlight the most important takeaways
11. Do not return empty or incomplete sections. Each section must have a title and at least one sentence with meaningful content.

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
- Format inline mathematical expressions with $...$ (e.g., $E = mc^2$)
- Format block/display mathematical equations with $$...$$ (e.g., $$\\frac{dx}{dt} = v(t)$$)
- Make sure to escape backslashes in LaTeX expressions (use \\\\ instead of \\)
- Use bullet points for lists of related items or in summaries
- Use numbered lists for sequential steps or processes
- Use italic formatting for technical terms, emphasis, or foreign words
- Use bold formatting for key concepts and important definitions
- Use heading format for subsection titles and for "Section Summary" and "Final Summary" headings

Each section should be comprehensive and detailed while remaining accessible. Generate one section at a time. Respond in ${language}.

IMPORTANT: Ensure each section has a valid title and at least one sentence. Each sentence must have an id, text content, and format. Properly close all JSON objects and arrays. Never return empty or malformed sections.`;

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

      const transformStream = new TransformStream({
        async start(controller) {
          let allSections: Section[] = [];
          let sectionCounter = 0;

          try {
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
                  const argumentChunk = part.choices[0].delta.function_call.arguments;
                  functionCallBuffer += argumentChunk;
                  
                  // Log significant buffer changes
                  if (argumentChunk.includes("title") || argumentChunk.includes("sentences")) {
                    console.log("Added important chunk:", argumentChunk);
                  }
                  
                  // Add periodic buffer diagnostics
                  if (functionCallBuffer.length % 1000 === 0) {
                    console.log(`Buffer size: ${functionCallBuffer.length}, contains valid JSON: ${isValidJson(functionCallBuffer)}`);
                  }
                  
                  try {
                    // The rest of your validation logic...
                    const match = functionCallBuffer.match(
                      /"title":\s*"[^"]+",\s*"sentences":\s*\[\s*(?:{[^}]+},\s*)*{[^}]+}\s*\]/g
                    );

                    if (match) {
                      for (const sectionStr of match) {
                        try {
                          // Wrap the section in an object to make it valid JSON
                          const sectionJson = `{"section":{${sectionStr}}}`;
                          console.log("Potential section found:", sectionJson.substring(0, 200) + "...");
                          
                          try {
                          const parsed = JSON.parse(sectionJson);

                            // Enhanced section validation
                          if (
                            parsed.section &&
                              typeof parsed.section.title === 'string' && 
                              parsed.section.title.trim() !== '' &&
                              Array.isArray(parsed.section.sentences) &&
                              parsed.section.sentences.length > 0 &&
                              parsed.section.sentences.every((s: Sentence) => typeof s.id === 'number' && typeof s.text === 'string' && s.text.trim() !== '')
                            ) {
                              console.log("Valid section found! Title:", parsed.section.title);
                              // Add detailed logging here
                              console.log("SECTION_DATA:", JSON.stringify({
                                title: parsed.section.title,
                                sentenceCount: parsed.section.sentences.length,
                                firstSentence: parsed.section.sentences[0],
                                hasValidFormats: parsed.section.sentences.every((s: Sentence) => 
                                  !s.format || ["paragraph", "bullet", "numbered", "formula", "italic", "bold", "heading"].includes(s.format)
                                )
                              }, null, 2));
                              
                              // Process valid section
                            sectionCounter++;
                            const sectionData = {
                              type: "section",
                              data: parsed.section,
                              total: sectionCounter,
                            };
                              controller.enqueue(
                                encoder.encode(JSON.stringify(sectionData) + "\n")
                              );
                            } else {
                              console.error("Found section with validation issues:", parsed.section);
                              
                              // Log specific validation failures
                              const validationIssues = {
                                hasSectionObject: !!parsed.section,
                                hasValidTitle: parsed.section && typeof parsed.section.title === 'string' && parsed.section.title.trim() !== '',
                                hasSentencesArray: parsed.section && Array.isArray(parsed.section.sentences),
                                sentencesCount: parsed.section?.sentences?.length || 0,
                                invalidSentences: parsed.section && Array.isArray(parsed.section.sentences) 
                                  ? parsed.section.sentences
                                      .map((s: Sentence, idx: number) => {
                                        const issues = [];
                                        if (typeof s.id !== 'number') issues.push('invalid id');
                                        if (typeof s.text !== 'string') issues.push('invalid text');
                                        if (typeof s.text === 'string' && s.text.trim() === '') issues.push('empty text');
                                        if (issues.length > 0) return { index: idx, issues };
                                        return null;
                                      })
                                      .filter(Boolean)
                                  : ['sentences not an array']
                              };
                              
                              console.log("VALIDATION_ISSUES:", JSON.stringify(validationIssues, null, 2));
                              
                              // Try to fix common issues with the section
                              if (parsed.section) {
                                // Ensure title exists
                                if (!parsed.section.title || parsed.section.title.trim() === '') {
                                  parsed.section.title = "Untitled Section";
                                }
                                
                                // Ensure sentences array exists and has content
                              if (!Array.isArray(parsed.section.sentences) || parsed.section.sentences.length === 0) {
                                parsed.section.sentences = [{
                                  id: 1,
                                    text: "This section couldn't be fully processed. Try regenerating it.",
                                  format: "paragraph"
                                }];
                                } else {
                                  // Fix any invalid sentences
                                  parsed.section.sentences = parsed.section.sentences.map((s: any, idx: number) => {
                                    return {
                                      id: typeof s.id === 'number' ? s.id : idx + 1,
                                      text: typeof s.text === 'string' && s.text.trim() !== '' 
                                        ? s.text 
                                        : "This sentence couldn't be processed correctly.",
                                      format: s.format || "paragraph"
                                    };
                                  });
                                }
                                
                                // Now send the fixed section
                                sectionCounter++;
                                const sectionData = {
                                  type: "section",
                                  data: parsed.section,
                                  total: sectionCounter,
                                };
                                controller.enqueue(
                                  encoder.encode(JSON.stringify(sectionData) + "\n")
                                );
                              }
                            }
                            
                            // Remove the processed section from the buffer regardless
                            functionCallBuffer = functionCallBuffer.replace(
                              sectionStr,
                              ""
                            );
                          } catch (parseError) {
                            console.error("JSON parse error for section:", parseError);
                          }
                        } catch (e) {
                          console.error("Section parsing error:", e);
                        }
                      }
                    }
                  } catch (e) {
                    console.error("Buffer processing error:", e);
                }
              }
            }

              // Process any remaining data in the buffer after the stream completes
            if (functionCallBuffer) {
                console.log("PROCESSING_REMAINING_BUFFER:");
                console.log(`- Buffer size: ${functionCallBuffer.length} bytes`);
                console.log(`- Buffer starts with: ${functionCallBuffer.substring(0, 100)}...`);
                console.log(`- Buffer ends with: ${functionCallBuffer.substring(functionCallBuffer.length - 100)}`);
                
                try {
                  // Clean the buffer to fix common JSON issues
                  let cleanedBuffer = functionCallBuffer
                    .replace(/([{,]\s*)(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '$1"$3":')
                    .replace(/:\s*'([^']*)'/g, ':"$1"')
                    .replace(/\\+"/g, '\\"')
                    .replace(/\n/g, '\\n')
                    .replace(/\r/g, '\\r')
                    .replace(/\t/g, '\\t')
                    .replace(/,\s*([}\]])/g, '$1');
                  
                console.log("Sanitized buffer (first 300 chars):", cleanedBuffer.substring(0, 300));
                
                  // Fix JSON structure if needed
                if (!cleanedBuffer.startsWith('{') && !cleanedBuffer.startsWith('[')) {
                  cleanedBuffer = '{' + cleanedBuffer;
                }
                if (!cleanedBuffer.endsWith('}') && !cleanedBuffer.endsWith(']')) {
                  cleanedBuffer = cleanedBuffer + '}';
                }
                
                  // Balance braces and brackets
                const openBraces = (cleanedBuffer.match(/{/g) || []).length;
                const closeBraces = (cleanedBuffer.match(/}/g) || []).length;
                const openBrackets = (cleanedBuffer.match(/\[/g) || []).length;
                const closeBrackets = (cleanedBuffer.match(/\]/g) || []).length;
                
                if (openBraces > closeBraces) {
                  cleanedBuffer += '}'.repeat(openBraces - closeBraces);
                }
                if (openBrackets > closeBrackets) {
                  cleanedBuffer += ']'.repeat(openBrackets - closeBrackets);
                }
                  
                  // After cleaning, log the results:
                  console.log("CLEANED_BUFFER_INFO:");
                  console.log(`- Cleaned size: ${cleanedBuffer.length} bytes`);
                  console.log(`- Valid JSON? ${isValidJson(cleanedBuffer)}`);
                  console.log(`- Brace balance: ${openBraces}:${closeBraces}, Bracket balance: ${openBrackets}:${closeBrackets}`);
                  
                  try {
                    // Try to parse the cleaned buffer
                  const bufferObject = JSON.parse(cleanedBuffer);

                    // Filter out empty sections that have no properties
                    const validSections = bufferObject.sections.filter((section: any) => {
                      // Check if it's a non-empty object (has at least some properties)
                      return Object.keys(section).length > 0;
                    });
                    
                    console.log(`Found ${bufferObject.sections.length} sections, ${validSections.length} valid after filtering`);
                    
                    // Only process sections that have content
                    for (const section of validSections) {
                      // Validate section structure
                      if (!section.sentences || !Array.isArray(section.sentences)) {
                        console.warn("Fixing invalid section:", section);
                        section.sentences = [];
                      }
                      
                        if (section.sentences.length === 0) {
                          section.sentences.push({
                            id: 1,
                            text: "Content could not be properly formatted.",
                            format: "paragraph"
                          });
                      }
                      
                      sectionCounter++;
                      controller.enqueue(
                        encoder.encode(JSON.stringify({
                          type: "section",
                          data: section,
                          total: sectionCounter
                        }) + "\n")
                      );
                    }
                    
                    // If we filtered out all sections, don't add any error messages
                    if (bufferObject.sections.length > 0 && validSections.length === 0) {
                      console.log("All sections were empty, skipping error generation");
                    }
                  } catch (parseError) {
                    console.error("JSON parse error:", parseError);
                    
                    // Try to extract valid parts from the buffer as a fallback
                  const validPartsPattern = /\{\s*"title"\s*:\s*"[^"]+"\s*,\s*"sentences"\s*:\s*\[\s*(?:\{[^\{\}]*\}\s*,\s*)*\{[^\{\}]*\}\s*\]\s*\}/g;
                  const validParts = cleanedBuffer.match(validPartsPattern);
                  
                    // Only then use it in a condition
                  if (validParts && validParts.length > 0) {
                    console.log("Found", validParts.length, "valid section objects to salvage");
                    
                    for (const validSection of validParts) {
                      try {
                        const section = JSON.parse(validSection);
                        
                          // Validate sentences
                        if (!section.sentences || !Array.isArray(section.sentences) || section.sentences.length === 0) {
                          section.sentences = [{
                            id: 1,
                            text: "This section was recovered but may be incomplete.",
                            format: "paragraph"
                          }];
                        }
                        
                        sectionCounter++;
                          controller.enqueue(
                            encoder.encode(JSON.stringify({
                          type: "section",
                          data: section,
                              total: sectionCounter
                            }) + "\n")
                        );
                      } catch (e) {
                        console.error("Failed to parse seemingly valid section:", e);
                      }
                    }
                  } else {
                      // Last resort - extract any useful text from the buffer
                      console.log("Attempting text extraction fallback...");
                      
                      // Try to extract any meaningful title and content
                      const titleMatch = cleanedBuffer.match(/"title"\s*:\s*"([^"]+)"/);
                      const title = titleMatch ? titleMatch[1] : "Content Processing Error";
                      
                      // Look for text content
                      const textMatches = cleanedBuffer.match(/"text"\s*:\s*"([^"]{20,})"/g);
                      let contentSentences: Array<{id: number, text: string, format: string}> = [];
                      
                      if (textMatches && textMatches.length > 0) {
                        // Extract text content from matches
                        contentSentences = textMatches.map((match: string, idx: number) => {
                          const textContent = match.replace(/"text"\s*:\s*"/, '').replace(/"$/, '');
                          return {
                            id: idx + 1,
                            text: textContent.length > 500 
                              ? textContent.substring(0, 500) + "..." // Truncate very long text
                              : textContent,
                            format: "paragraph"
                          };
                        });
                      }
                      
                      if (contentSentences.length === 0) {
                        // If we couldn't extract any content, use a generic message
                        contentSentences = [{
                          id: 1,
                          text: "We couldn't process the content properly. Please try again with a different input or smaller chunks.",
                          format: "paragraph"
                        }];
                      }
                      
                      sectionCounter++;
                      controller.enqueue(
                        encoder.encode(JSON.stringify({
                          type: "section",
                          data: {
                            title: title,
                            sentences: contentSentences
                          },
                          total: sectionCounter
                        }) + "\n")
                      );
                    }
                  }
                } catch (e) {
                  console.error("Error processing buffer:", e);
                  
                  // Send a generic error section as a last resort
                  sectionCounter++;
                  controller.enqueue(
                    encoder.encode(JSON.stringify({
                      type: "section",
                      data: {
                        title: "Error Processing Content",
                        sentences: [{
                          id: 1,
                          text: "An error occurred while processing your content. Please try again with a smaller or simpler input.",
                          format: "paragraph"
                        }]
                      },
                      total: sectionCounter
                    }) + "\n")
                  );
                }
              }
            }

            // Send completion message AFTER all chunks are processed
          controller.enqueue(
            encoder.encode(
              JSON.stringify({ type: "done", total: sectionCounter }) + "\n"
            )
          );

            // Process credits AFTER all chunks
      if (!isPro) {
        const newCreditBalance = creditBalance - requiredCredits;
              await updateUserCreditBalance(firestoreUser.id, newCreditBalance);
            }
          } catch (error) {
            console.error("Error in streaming process:", error);
            
            // Send error message to client
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "error",
                  message: error instanceof Error ? error.message : "An unexpected error occurred",
                }) + "\n"
              )
            );
          } finally {
            // No explicit close needed - stream closes when the function returns
            console.log("Stream processing completed");
            
            // Always send a final completion message
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "complete",
                  message: "Processing completed",
                  total: sectionCounter
                }) + "\n"
              )
            );
          }
        }
      });

      // Return the stream wrapped in StreamingTextResponse
      return new StreamingTextResponse(transformStream.readable);
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

// Helper function to check if string is valid JSON
function isValidJson(str: string) {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}
