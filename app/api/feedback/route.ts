import { NextRequest, NextResponse } from "next/server";
import { getUserByClerkId } from "@/lib/firebase/firestore";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const firestoreUser = await getUserByClerkId(userId);
    const language = firestoreUser?.language || "English";

    // Parse the JSON body
    const body = await req.json();
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

    // Validate required fields
    if (!question || !userAnswer || !correctAnswer) {
      throw new Error("Missing required fields");
    }

    // Create the prompt based on question type
    let prompt = "";
    if (questionType === "shortAnswer") {
      prompt = `You are an expert evaluator. Evaluate this short answer response.

Question: ${question}
Correct Answer: ${correctAnswer}
User's Answer: ${userAnswer}

Evaluate the answer's accuracy and provide the complete correct answer and constructive feedback in ${language}. Be lenient and consider partial credit:
- Award "isCorrect: true" if the answer captures the main concepts and is at least 70% accurate
- Consider key concepts, core ideas, and overall understanding
- Minor missing details or slight inaccuracies should not result in a completely incorrect assessment

Scoring guidelines:
- 0.9-1.0: Excellent answer with all key points
- 0.8-0.9: Very good answer with minor omissions
- 0.7-0.8: Good answer with some missing details but demonstrates understanding
- <0.7: Significant gaps or misunderstandings

Respond in JSON format:
{
  "isCorrect": boolean (true if score >= 0.7),
  "feedback": "detailed feedback here, highlighting both correct elements and areas for improvement",
  "score": number between 0 and 1,
  "improvements": ["specific improvement suggestions"]
}`;
    } else if (isLastQuestion) {
      prompt = `You are an educational coach. Review this quiz performance and provide personalized feedback.

Quiz Performance:
- Score: ${score} 
- Accuracy: ${Math.round((score ) )}%
- Number of incorrect answers: ${incorrectAnswers.length}

Provide comprehensive feedback including:
1. Overall performance assessment
2. Areas of strength
3. Areas needing improvement
4. Specific study recommendations

Respond in JSON format:
{
  "feedback": "detailed feedback here",
  "strengths": ["list of strengths"],
  "improvementAreas": ["areas to improve"],
  "studyRecommendations": ["specific topics to review"]
}`;
    }

    // Make OpenAI API call
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [{ role: "system", content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const feedbackData = JSON.parse(data.choices[0].message.content);

    // Return the feedback
    return NextResponse.json(feedbackData);
  } catch (error) {
    console.error("Feedback generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate feedback",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
