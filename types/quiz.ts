export type QuestionType = "multipleChoice" | "trueFalse" | "shortAnswer";

export interface BaseQuestion {
  id: number;
  type: QuestionType;
  question: string;
  correctAnswer: string;
  explanation: string;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: "multipleChoice";
  options: string[];
}

export interface TrueFalseQuestion extends BaseQuestion {
  type: "trueFalse";
}

export interface ShortAnswerQuestion extends BaseQuestion {
  type: "shortAnswer";
}

export type Question =
  | MultipleChoiceQuestion
  | TrueFalseQuestion
  | ShortAnswerQuestion;

export interface QuizData {
  questions: Array<{
    id: number;
    question: string;
    type: string;
    correctAnswer: string;
    explanation: string;
    options?: string[];
  }>;
  format?: string;
  numberOfQuestions?: number;
  questionTypes?: string[];
}

export interface QuizState {
  id: string;
  notebookId: string;
  pageId: string;
  startedAt: Date;
  lastUpdatedAt: Date;
  currentQuestionIndex: number;
  score: number;
  totalQuestions: number;
  userAnswers: Record<number, string>;
  evaluationResults: Record<number, boolean>;
  incorrectAnswers: number[];
  isComplete: boolean;
  gptFeedback: string;
  quizData: QuizData;
}
