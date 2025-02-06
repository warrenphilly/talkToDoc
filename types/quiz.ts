import { Timestamp } from "firebase/firestore";

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

export interface QuizQuestion {
  id: number;
  question: string;
  type: 'multipleChoice' | 'trueFalse' | 'shortAnswer';
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export interface QuizData {
  title: string;
  questions: QuizQuestion[];
  description?: string;
}

export interface SerializedTimestamp {
  seconds: number;
  nanoseconds: number;
  toLocaleDateString: () => string;
}

export interface QuizState {
  id: string;
  notebookId: string;
  pageId: string;
  quizData: QuizData;
  currentQuestionIndex: number;
  userAnswers: Record<number, string>;
  evaluationResults: Record<number, boolean>;
  score: number;
  totalQuestions: number;
  startedAt: Timestamp | SerializedTimestamp;
  lastUpdatedAt: Timestamp | SerializedTimestamp;
  isComplete: boolean;
  incorrectAnswers: number[];
  gptFeedback?: string;
  userId: string;
  createdAt: Timestamp | SerializedTimestamp;
  title: string;
}

// Add a type for the Firestore quiz document
export interface QuizDocument {
  id: string;
  notebookId?: string;
  pageId?: string;
  currentQuestionIndex: number;
  score: number;
  userAnswers: Record<number, string>;
  evaluationResults: Record<number, boolean>;
  incorrectAnswers: number[];
  isComplete: boolean;
  gptFeedback?: string;
  startedAt: Timestamp | SerializedTimestamp;
  lastUpdatedAt: Timestamp | SerializedTimestamp;
  totalQuestions: number;
  quizData?: QuizData;
}

// Add a helper function to convert between Firestore and app types
export function convertFirestoreQuizToQuizState(doc: FirebaseFirestore.DocumentData): QuizState {
  return {
    ...doc,
    startedAt: doc.startedAt,
    lastUpdatedAt: doc.lastUpdatedAt,
  } as QuizState;
}

export function convertQuizStateToFirestore(quiz: QuizState): Omit<QuizDocument, 'id'> {
  return {
    ...quiz,
    startedAt: quiz.startedAt instanceof Timestamp ? quiz.startedAt : new Timestamp(quiz.startedAt.seconds, quiz.startedAt.nanoseconds),
    lastUpdatedAt: quiz.lastUpdatedAt instanceof Timestamp ? quiz.lastUpdatedAt : new Timestamp(quiz.lastUpdatedAt.seconds, quiz.lastUpdatedAt.nanoseconds),
  };
}
