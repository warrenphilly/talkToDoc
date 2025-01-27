import { StudyGuide } from "@/components/shared/study/StudyGuide";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getCurrentUserId } from "@/lib/auth";
import {
  getNotebooksByFirestoreUserId,
  getQuizzesByFirestoreUserId,
  getStudyCardsByClerkId,
  getStudyGuidesByFirestoreUserId,
  getUserByClerkId,
  Notebook,
  Page,
} from "@/lib/firebase/firestore";
import type { Message } from "@/lib/types";
import type { QuizState } from "@/types/quiz";
import { StudyCardSet } from "@/types/studyCards";
import CircularProgress from "@mui/material/CircularProgress";
import { FileText, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface StudyCardData {
  title: string;
  content: string;
}

interface StudyCardMetadata {
  cardCount: number;
  createdAt: Date;
  name: string;
}

interface StudyCardNotebook {
  notebookId: string;
  notebookTitle: string;
}

interface StudyCardPage {
  pageId: string;
  pageTitle: string;
}

export default function BentoDashboard({ listType }: { listType: string }) {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [studyCards, setStudyCards] = useState<StudyCardSet[]>([]);
  const [studyGuides, setStudyGuides] = useState<StudyGuide[]>([]);
  const [quizzes, setQuizzes] = useState<QuizState[]>([]);

  useEffect(() => {
    const fetchNotebooks = async () => {
      try {
        const clerkUserId = await getCurrentUserId();
        console.log("Clerk User ID:", clerkUserId); // Debug log

        if (!clerkUserId) return;

        const firestoreUser = await getUserByClerkId(clerkUserId);
        console.log("Firestore User:", firestoreUser); // Debug log

        if (!firestoreUser) return;

        const userNotebooks = await getNotebooksByFirestoreUserId(
          firestoreUser.id
        );
        const userStudyCards = await getStudyCardsByClerkId(clerkUserId);
        const userStudyGuides = await getStudyGuidesByFirestoreUserId(
          clerkUserId
        );
        const userQuizzes = await getQuizzesByFirestoreUserId(clerkUserId);

        console.log("Firestore User ID:", firestoreUser.id); // Debug log
        console.log("Study Cards Query Result:", userStudyCards);
        console.log("Study Guides Query Result:", userStudyGuides);
        console.log("Quizzes Query Result:", userQuizzes);

        setNotebooks(userNotebooks);
        setStudyCards(userStudyCards);
        setStudyGuides(userStudyGuides);
        setQuizzes(userQuizzes);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching notebooks:", error);
      }
    };

    fetchNotebooks();
  }, []);

  // useEffect(() => {
  //   setTimeout(() => {
  //     setLoading(false);
  //   }, 4000);
  // }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-slate-400">
        {listType === "all" ? "All Notebooks" : "Recent Notebooks"}
      </h1>
      <div className="flex flex-wrap gap-4 items-center justify-start md:p-5">
        {notebooks.length === 0 ? (
          loading ? (
            <div className="flex flex-col items-center justify-center h-full w-full gap-2">
              <div className="text-slate-400 text-xl font-semibold">
                Loading your notebooks...
              </div>
              <CircularProgress
                sx={{
                  color: "#94b347",
                }}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full w-full gap-2">
              <div className="text-slate-400 text-xl font-semibold">
                No notebooks found
              </div>
            </div>
          )
        ) : (
          <>
            {/* Notebooks Section */}
            <div className="w-full mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-slate-500">
                Notebooks
              </h2>
              <div className="flex flex-wrap gap-4">
                {notebooks.map((notebook) => (
                  <Link key={notebook.id} href={`/notes/${notebook.id}`}>
                    <Card className="h-full transition-transform hover:scale-105 shadow-none bg-white border border-slate-600 w-[800px] md:w-[400px] mx-4">
                      <CardContent className="p-6 flex flex-col h-full">
                        <div className="p-2 rounded-full w-fit bg-[#94b347]">
                          <FileText className="h-6 w-6 text-white" />
                        </div>
                        <h2 className="text-xl font-semibold mt-4 text-slate-600">
                          {notebook.title}
                        </h2>
                        <p className="text-muted-foreground mt-2 flex-grow">
                          {notebook.createdAt instanceof Date
                            ? notebook.createdAt.toLocaleDateString()
                            : new Date(notebook.createdAt).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex flex-row w-full gap-4 items-start justify-center">
              {/* Study Cards Section */}
              <div className="w-full mb-8 ">
                <div className="flex flex-row items-center justify-center w-full">
                  <h2 className="text-md font-semibold mb-4 text-slate-500">
                    Study Cards
                  </h2>
                </div>

                <div className="flex flex-wrap gap-4 ">
                  {studyCards.map((studyCard) => (
                    <Link
                      key={studyCard.id}
                      href={`/study-cards/${studyCard.id}`}
                    >
                      <Card className="h-full transition-transform hover:scale-105 shadow-none bg-white border border-slate-600 w-[800px] md:w-[400px] ">
                        <CardContent className="p-1 px-6 flex flex-col h-full">
                          <div className="flex flex-row items-center justify-between">
                            <div className="p-2 rounded-full w-fit bg-[#94b347] ">
                              <MessageSquare className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex flex-col items-center w-full justify-start ">
                              <h2 className="text-md font-semibold  text-slate-600">
                                {studyCard.title}
                              </h2>
                              <p className="text-muted-foreground  ">
                                {studyCard.cards.length} cards
                              </p>
                            </div>

                            <p className="text-muted-foreground ml-16 ">
                              {studyCard.createdAt instanceof Date
                                ? studyCard.createdAt.toLocaleDateString()
                                : new Date(
                                    studyCard.createdAt
                                  ).toLocaleDateString()}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>

              <Separator
                className="h-full bg-slate-600 w-px"
                orientation="vertical"
              />

              {/* Study Guides Section */}
              <div className="w-full mb-8">
                <div className="flex flex-row items-center justify-center w-full">
                  <h2 className="text-md font-semibold mb-4 text-slate-500">
                    Study Guides
                  </h2>
                </div>
                <div className="flex flex-wrap gap-4">
                  {studyGuides.map(
                    (studyGuide) =>
                      studyGuide && (
                        <Link
                          key={studyGuide.id}
                          href={`/study-guides/${studyGuide.id}`}
                        >
                          <Card className=" transition-transform hover:scale-105 shadow-none bg-white border border-slate-600 w-[800px] md:w-[400px] flex flex-row items-center justify-center ">
                            <CardContent className=" p-1  flex flex-col h-full w-full mx-2">
                              <div className="flex flex-row items-center w-full justify-between ">
                                <div className="p-2 rounded-full w-fit bg-[#b34747]">
                                  <FileText className="h-6 w-6 text-white" />
                                </div>

                                <div className="flex flex-col items-center w-full justify-center ">
                                  <h2 className="text-md font-semibold text-slate-600">
                                    Study Guide: {studyGuide.title}
                                  </h2>
                                  <p className="text-muted-foreground  flex-grow">
                                    From notebook: {studyGuide.title}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      )
                  )}
                </div>
              </div>

              <Separator
                className="h-full bg-slate-600 w-px"
                orientation="vertical"
              />

              {/* Quizzes Section */}
              <div className="w-full mb-8">
                <div className="flex flex-row items-center justify-center w-full">
                  <h2 className="text-md font-semibold mb-4 text-slate-500">
                    Quizzes
                  </h2>
                </div>
                <div className="flex flex-wrap gap-4">
                  {quizzes.map((quiz: QuizState) => (
                    <Link key={quiz.id} href={`/quiz/${quiz.id}`}>
                      <Card className="h-full transition-transform hover:scale-105 shadow-none bg-white border border-slate-600 w-[800px] md:w-[400px] mx-4">
                        <CardContent className=" p-1 flex flex-row h-full">
                          <div className="flex flex-row items-center justify-between">
                            <div className="p-2 rounded-full w-fit bg-[#8547b3]">
                              <MessageSquare className="h-6 w-6 text-white" />
                            </div>
                          </div>
                          <div className="flex flex-col items-center w-full justify-center ">
                            <h2 className="text-md font-semibold  text-slate-600">
                              Quiz: {quiz.quizData.title}
                            </h2>
                            <p className="text-muted-foreground  flex-grow">
                              {quiz.totalQuestions} questions
                            </p>
                          </div>
                          <div className="flex flex-col items-center w-full justify-center ">
                            <p className="text-muted-foreground  flex-grow">
                              {quiz.isComplete
                                ? "Completed"
                                : quiz.startedAt
                                ? "Started"
                                : "Not started"}
                            </p>
                            <p className="text-muted-foreground  flex-grow">
                              {quiz.createdAt instanceof Date
                                ? quiz.createdAt.toLocaleDateString()
                                : quiz.createdAt && "seconds" in quiz.createdAt
                                ? new Date(
                                    quiz.createdAt.seconds * 1000
                                  ).toLocaleDateString()
                                : new Date().toLocaleDateString()}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
