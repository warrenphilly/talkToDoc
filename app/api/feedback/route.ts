import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/lib/firebase/firebaseAdmin";
import { cleanMarkdownContent } from "@/lib/markdownUtils";

export async function POST(req: NextRequest) {
  try {
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
      notebookId,
      pageId
    } = body;

    // Fetch the document content for context
    const notebookRef = adminDb.collection('notebooks').doc(notebookId);
    const notebookSnap = await notebookRef.get();
    
    if (!notebookSnap.exists) {
      throw new Error("Notebook not found");
    }

    const notebookData = notebookSnap.data();
    const page = notebookData?.pages?.find((p: any) => p.id === pageId);
    
    if (!page) {
      throw new Error("Page not found");
    }

    // Fetch content from markdown files
    let documentContent = '';
    if (page.markdownRefs && page.markdownRefs.length > 0) {
      for (const markdownRef of page.markdownRefs) {
        try {
          const cleanPath = markdownRef.path.replace(/^gs:\/\/[^\/]+\//, '');
          const bucket = adminStorage.bucket();
          const file = bucket.file(cleanPath);
          const [content] = await file.download();
          documentContent += cleanMarkdownContent(content.toString()) + '\n\n';
        } catch (error) {
          console.error(`Error fetching markdown file ${markdownRef.path}:`, error);
        }
      }
    }

    let prompt;
    if (questionType === 'shortAnswer') {
      prompt = `You are an expert evaluator. Evaluate this short answer response using the provided context.

Context from document:
${documentContent}

Question: ${question}
Correct Answer: ${correctAnswer}
User's Answer: ${userAnswer}

Evaluate the answer's accuracy and provide constructive feedback. Consider:
1. Key concepts mentioned
2. Accuracy of information
3. Completeness of response

Respond in JSON format:
{
  "isCorrect": boolean,
  "feedback": "detailed feedback here",
  "score": number between 0 and 1,
  "improvements": ["specific improvement suggestions"]
}`;
    } else if (isLastQuestion) {
      prompt = `You are an educational coach. Review this quiz performance and provide personalized feedback.

Context from document:
${documentContent}

Quiz Performance:
- Score: ${score} out of ${totalQuestions}
- Accuracy: ${Math.round((score / totalQuestions) * 100)}%
- Number of incorrect answers: ${incorrectAnswers.length}

Provide comprehensive feedback including:
1. Overall performance assessment
2. Areas of strength
3. Areas needing improvement
4. Specific study recommendations based on the document content

Respond in JSON format:
{
  "feedback": "detailed feedback here",
  "strengths": ["list of strengths"],
  "improvementAreas": ["areas to improve"],
  "studyRecommendations": ["specific topics to review"],
  "nextSteps": ["suggested actions"]
}`;
    } else {
      prompt = `Evaluate this answer:
Question: ${question}
Correct Answer: ${correctAnswer}
User's Answer: ${userAnswer}

Provide brief, constructive feedback.`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'system', content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get feedback from OpenAI');
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Feedback generation error:', error);
    return NextResponse.json({ 
      error: "Failed to generate feedback",
      message: error instanceof Error ? error.message : "Unknown error occurred"
    }, { status: 500 });
  }
}
