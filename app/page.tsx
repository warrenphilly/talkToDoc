import { Quiz } from '../components/Quiz'
import { QuizData } from '../types/quiz'

const quizData: QuizData = {
  questions: [
    {
      id: 1,
      type: "multipleChoice",
      question: "What is the capital of France?",
      options: [
        "Paris",
        "Rome",
        "Berlin",
        "Madrid"
      ],
      correctAnswer: "Paris",
      explanation: "Paris is the capital city of France, known for its art, fashion, gastronomy, and culture."
    },
    {
      id: 2,
      type: "trueFalse",
      question: "The chemical symbol for gold is Au.",
      correctAnswer: "True",
      explanation: "The chemical symbol for gold is Au, which is derived from the Latin word 'Aurum'."
    },
    {
      id: 3,
      type: "shortAnswer",
      question: "Who wrote the play 'Romeo and Juliet'?",
      correctAnswer: "William Shakespeare",
      explanation: "William Shakespeare, an English playwright, wrote the tragedy 'Romeo and Juliet', which is one of his most famous works."
    },
    {
      id: 4,
      type: "multipleChoice",
      question: "Which planet is known as the Red Planet?",
      options: [
        "Earth",
        "Venus",
        "Mars",
        "Jupiter"
      ],
      correctAnswer: "Mars",
      explanation: "Mars is known as the Red Planet due to its reddish appearance, which is caused by iron oxide on its surface."
    },
    {
      id: 5,
      type: "trueFalse",
      question: "The Pacific Ocean is the largest ocean on Earth.",
      correctAnswer: "True",
      explanation: "The Pacific Ocean is the largest ocean on Earth, covering more area than all the landmasses combined."
    }
  ]
};

export default function Home() {
  return (
    <main className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Enhanced Quiz Application</h1>
      <Quiz data={quizData} />
    </main>
  )
}

