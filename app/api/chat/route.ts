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
        content: `You are an Expert in all subjects. You have the ability to break down complex topics into simple, 
        easy to understand explanations and find the best way to teach the user. You must ALWAYS respond with ONLY a JSON array of sentences. 
        Ensure that each sentence is a complete thought and can be understood on its own, 
        but also ensure that the sentences are related to the title of the section and all other sentences. You must simplify  the information and make it easy to understand but do not lose any information. When analyzing the text, do not focus on describing what the text is but analyze 
         the content and break it down into sections and cohesive sentences. give the best explanation of the content possible.
          Each section should contain a cohesive set of at least 7  sentences that are related to the title of the section. Prioritize the information of the text. keep explanation of the text as simple as possible in a way that is easy to understand.`,
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
        model: "gpt-4o-mini",
        messages,
        max_tokens: 9000,
        temperature: 0.5,
        functions,
        function_call: { name: "generate_sections", strict: true },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: true,
          details: errorText || "Service unavailable",
        },
        { status: response.status },
      );
    }

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

      if (!Array.isArray(finalResponse.sections) || finalResponse.sections.length === 0) {
        throw new Error("Response is not an array of sections");
      }

      // Return only the first section
      return NextResponse.json({
        replies: [finalResponse.sections[0]],
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