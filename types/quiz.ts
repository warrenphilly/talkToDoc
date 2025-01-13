export type QuestionType = 'multipleChoice' | 'trueFalse' | 'shortAnswer';

export interface BaseQuestion {
  id: number;
  type: QuestionType;
  question: string;
  correctAnswer: string;
  explanation: string;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multipleChoice';
  options: string[];
}

export interface TrueFalseQuestion extends BaseQuestion {
  type: 'trueFalse';
}

export interface ShortAnswerQuestion extends BaseQuestion {
  type: 'shortAnswer';
}

export type Question = MultipleChoiceQuestion | TrueFalseQuestion | ShortAnswerQuestion;

export interface QuizData {
  questions: Question[];
}

