import { NextRequest, NextResponse } from "next/server";

interface Sentence {
  id: number;
  text: string;
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const message = data.message;

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
        content: `You are an Expert in all subjects. You have the ability to break down complex topics into simple, easy to understand explanations and find the best way to teach the user. You must ALWAYS respond with ONLY a JSON array of sections, where each section contains an array of sentences. Ensure that each sentence is a complete thought and can be understood on its own, but also ensure that the sentences are related to the title of the section and all other sentences. You must give as much information as possible without overcomplicating the explanation and rambling. When analyzing the text, do not focus on describing what the text is but analyze the content and break it down into sections and cohesive sentences. Use as many sentences as possible to explain the content. Each section should contain a cohesive set of at least 9 sentences that are related to the title of the section. Prioritize the information of the text.`,
      },
      {
        role: "user",
        content: [{ type: "text", text: message }],
      },
    ];

    // Send request to OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages,
        max_tokens: 15000,
        temperature: 0.7,
        functions,
        function_call: { name: "generate_sections", strict: true },
      }),
    });

    const responseData = await response.json();

    // Handle response
    const choices = responseData.choices;

    if (!choices || !Array.isArray(choices) || choices.length === 0) {
      console.error(
        "Invalid OpenAI response structure:",
        JSON.stringify(responseData, null, 2)
      );
      throw new Error("Invalid API response structure");
    }

    const functionCall = choices[0]?.message?.function_call;
    const messageContent = functionCall ? functionCall.arguments : null;

    if (!messageContent) {
      console.error(
        "Invalid OpenAI response structure:",
        JSON.stringify(responseData, null, 2)
      );
      throw new Error("Invalid API response structure");
    }

    try {
      const finalResponse = JSON.parse(messageContent);
      console.log("Parsed response:", finalResponse);

      if (!Array.isArray(finalResponse.sections)) {
        throw new Error("Response is not an array of sections");
      }

      return NextResponse.json({
        replies: [finalResponse.sections],
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
