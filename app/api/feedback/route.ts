import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      question,
      userAnswer,
      correctAnswer,
      isLastQuestion,
      score,
      totalQuestions,
      incorrectAnswers,
      questionType,
    } = body;

    // Only generate feedback for short answers or end of quiz
    if (!isLastQuestion && questionType !== "shortAnswer") {
      return NextResponse.json({ feedback: "" });
    }

    let prompt: string;
    // Initialize evaluation with default values
    let evaluation = {
      isCorrect: false,
      explanation: "",
      matchedConcepts: [] as string[],
    };

    if (isLastQuestion) {
      prompt = `The user has completed the quiz with a score of ${score} out of ${totalQuestions}. 
        ${
          incorrectAnswers.length > 0
            ? `They got questions ${incorrectAnswers.join(", ")} wrong.`
            : "They got all questions correct!"
        } 
        Please provide:
        1. Overall performance analysis
        2. Key areas for improvement based on the incorrect answers
        3. Encouragement for future learning`;
    } else {
      // For short answers, first evaluate if the answer contains required concepts
      const evaluationPrompt = `
        Question: "${question}"
        User's answer: "${userAnswer}"
        Required concepts: "${correctAnswer}"

        Evaluation Instructions:
        1. The answer must demonstrate clear understanding of the core concept
        2. Random text, gibberish, or unrelated answers should be marked as incorrect
        3. The answer should contain key terms or synonyms related to the correct answer
        4. Spelling mistakes are acceptable only if the intended meaning is clear
        5. Respond with a JSON object containing:
           - isCorrect: boolean (true only if answer demonstrates clear understanding)
           - explanation: string (detailed feedback explaining the evaluation)
           - matchedConcepts: string[] (key concepts found in the answer)

        Provide your evaluation in valid JSON format.
      `;

      const evaluationResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are a strict answer evaluator. You must ensure answers demonstrate clear understanding. Return only valid JSON.",
          },
          {
            role: "user",
            content: evaluationPrompt,
          },
        ],
        response_format: { type: "json_object" },
      });

      evaluation = JSON.parse(
        evaluationResponse.choices[0]?.message?.content ||
          '{"isCorrect": false, "explanation": "", "matchedConcepts": []}'
      );

      prompt = `
        Question: ${question}
        User's answer: ${userAnswer}
        Evaluation: ${evaluation.explanation}
        
        Please provide constructive feedback that:
        1. Acknowledges any correct concepts (if any)
        2. Identifies missing or incorrect concepts
        3. Explains the correct answer
        4. Provides guidance for improvement
      `;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            questionType === "shortAnswer"
              ? "You are an AI evaluating short answer responses. Be encouraging but accurate in your assessment."
              : "You are a helpful educational assistant providing quiz performance feedback.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: isLastQuestion ? 300 : 200,
    });

    const aiResponse = response.choices[0]?.message?.content;
    if (!aiResponse) {
      throw new Error("No response from OpenAI");
    }

    if (questionType === "shortAnswer") {
      return NextResponse.json({
        feedback: aiResponse,
        isCorrect: evaluation.isCorrect,
      });
    }

    return NextResponse.json({ feedback: aiResponse });
  } catch (error) {
    console.error("Error in feedback API:", error);
    return NextResponse.json(
      { error: "Failed to generate feedback" },
      { status: 500 }
    );
  }
}
