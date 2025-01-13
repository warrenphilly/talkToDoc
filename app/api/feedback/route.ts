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
    } = body;

    const prompt = isLastQuestion
      ? `Question: ${question}\nUser's answer: ${userAnswer}\nCorrect answer: ${correctAnswer}\n\nThe user has completed the quiz with a score of ${score} out of ${totalQuestions}. They got questions ${incorrectAnswers.join(
          ", "
        )} wrong. Please provide:\n1. Feedback on this specific answer\n2. Overall performance analysis\n3. Key areas for improvement based on the incorrect answers`
      : `Question: ${question}\nUser's answer: ${userAnswer}\nCorrect answer: ${correctAnswer}\n\nProvide brief, constructive feedback explaining why the answer is correct or incorrect.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful educational assistant providing feedback on quiz answers.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: isLastQuestion ? 300 : 150,
    });

    return NextResponse.json({ feedback: response.choices[0].message.content });
  } catch (error) {
    console.error("Error in feedback API:", error);
    return NextResponse.json(
      { error: "Failed to generate feedback" },
      { status: 500 }
    );
  }
}
