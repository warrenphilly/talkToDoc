import { NextResponse } from "next/server";
import OpenAI from "openai";
import { doc, getDoc } from 'firebase/firestore';
import { db, storage } from '@/firebase';
import { getDownloadURL, ref } from 'firebase/storage';
import { cleanMarkdownContent } from '@/lib/markdownUtils';

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
      notebookId,
      pageId
    } = body;

    // Only generate feedback for short answers or end of quiz
    if (!isLastQuestion && questionType !== "shortAnswer") {
      return NextResponse.json({ feedback: "" });
    }

    let prompt = "";
    let evaluation = {
      isCorrect: false,
      explanation: "",
      matchedConcepts: [] as string[],
    };

    // Get the page's markdown content (only if needed for short answer evaluation)
    let contextContent = '';
    if (questionType === "shortAnswer") {
      const notebookRef = doc(db, "notebooks", notebookId);
      const notebookSnap = await getDoc(notebookRef);

      if (notebookSnap.exists()) {
        const notebook = notebookSnap.data();
        const page = notebook.pages.find((p: any) => p.id === pageId);
        
        if (page?.markdownRefs) {
          for (const markdownRef of page.markdownRefs) {
            try {
              const plainMarkdownRef = {
                path: markdownRef.path,
                url: markdownRef.url,
                timestamp: typeof markdownRef.timestamp === 'object' && markdownRef.timestamp !== null
                  ? new Date(markdownRef.timestamp.seconds * 1000).toISOString()
                  : markdownRef.timestamp
              };
              
              const storageRef = ref(storage, plainMarkdownRef.path);
              const url = await getDownloadURL(storageRef);
              const response = await fetch(url);
              const content = await response.text();
              contextContent += cleanMarkdownContent(content) + '\n\n';
            } catch (error) {
              console.error(`Error fetching markdown file ${markdownRef.path}:`, error);
            }
          }
        }
      }
    }

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
    } else if (questionType === "shortAnswer") {
      const evaluationPrompt = `
        Context: ${contextContent}
        
        Question: "${question}"
        User's answer: "${userAnswer}"
        Expected concepts: "${correctAnswer}"

        Evaluation Instructions:
        1. Focus on conceptual understanding rather than exact wording
        2. Ignore spelling mistakes if the intended meaning is clear
        3. Accept synonyms and alternative phrasings
        4. Mark as correct if the core concept is understood, even if expressed imperfectly
        5. Only mark as incorrect if:
           - The answer shows fundamental misunderstanding
           - The answer is completely unrelated
           - The answer is gibberish or nonsensical
        
        Respond with a JSON object containing:
        {
          "isCorrect": boolean (true if core concept is understood),
          "explanation": string (friendly feedback explaining the evaluation),
          "matchedConcepts": string[] (concepts correctly expressed)
        }

        Important: Be lenient with spelling and grammar, but strict with conceptual understanding.
        Provide your evaluation in valid JSON format.
      `;

      const evaluationResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are an understanding evaluator. Focus on conceptual understanding rather than perfect spelling or grammar. Accept alternative phrasings and synonyms.",
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
          '{"isCorrect": false, "explanation": "Unable to evaluate answer", "matchedConcepts": []}'
      );

      prompt = `
        Question: ${question}
        User's answer: ${userAnswer}
        Evaluation: ${evaluation.explanation}
        
        Please provide encouraging feedback that:
        1. Acknowledges what they got right (even if partially correct)
        2. Gently corrects any misunderstandings
        3. Provides the complete correct answer
        4. Offers a helpful tip for remembering the concept
      `;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            questionType === "shortAnswer"
              ? "You are an encouraging teacher providing feedback. Focus on what the student understood correctly, even if their expression wasn't perfect."
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
        explanation: evaluation.explanation,
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
