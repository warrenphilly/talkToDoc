import { CreateNotebookModal } from "@/components/shared/home/create-notebook-modal";
import { StudyGuide } from "@/components/shared/study/StudyGuide";
import { Button } from "@/components/ui/button";
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

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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
    <div className="container mx-auto">
      <div className="flex flex-col items-center justify-center h-full w-full">
        {" "}
        <h1 className="text-3xl font-semibold text-[#94b347]">Home</h1>
      </div>

      <div className="flex flex-col items-center justify-center h-full w-full">
        <div className="flex flex-col sm:flex-row items-center justify-between  w-full gap-4 mb-6">
          <h1 className="text-xl font-semibold text-slate-600">My Notebooks</h1>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="text-slate-900 px-4 py-2 bg-white rounded-full border border-slate-300 shadow-none font-semibold hover:bg-slate-50"
          >
            New Notebook
          </Button>
        </div>
      </div>

      {notebooks.length === 0 ? (
        loading ? (
          <div className="flex flex-col items-center justify-center h-full w-full gap-2">
            <div className="text-slate-400 text-xl font-semibold">
              Loading your notebooks...
            </div>
            <CircularProgress sx={{ color: "#94b347" }} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full w-full gap-2">
            <div className="text-slate-400 text-xl font-semibold">
              No notebooks found
            </div>
          </div>
        )
      ) : (
        <div className="space-y-8">
          {/* Notebooks Section */}
          <section>
            <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {notebooks.map((notebook) => (
                <Link key={notebook.id} href={`/notes/${notebook.id}`}>
                  <Card className="h-full transition-transform hover:scale-105 shadow-none bg-white border border-slate-300">
                    <CardContent className="p-8 flex flex-col h-full">
                      <div className="p-3 rounded-full w-fit bg-[#94b347]">
                        <FileText className="h-8 w-8 text-white" />
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
          </section>
          <Separator className="w-full " orientation="horizontal" />

          {/* Study Materials Header */}
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-[#94b347]">
              Study Material
            </h2>
          </div>

          {/* Study Materials Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Study Cards Section */}
            <section className="border border-slate-300 rounded-lg h-fit">
              <Accordion type="single" collapsible>
                <AccordionItem value="item-1">
                  <AccordionTrigger>
                    <div className="flex flex-row items-center justify-center w-full">
                      <h3 className="text-md font-semibold mb-4 text-slate-500 text-center">
                        Study Guides
                      </h3>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {studyCards.map((studyCard) => (
                        <Link
                          key={studyCard.id}
                          href={`/study-cards/${studyCard.id}`}
                        >
                          <Card className="transition-transform  shadow-none bg-white border-none">
                            <CardContent className="p-4 flex flex-row items-center justify-between border-t hover:bg-slate-100 border-slate-300">
                              <div className="p-2 rounded-full w-fit bg-[#94b347]">
                                <MessageSquare className="h-6 w-6 text-white" />
                              </div>
                              <div className="flex flex-col items-start flex-grow mx-4">
                                <h2 className="text-md font-semibold text-slate-600">
                                  {studyCard.title}
                                </h2>
                                <p className="text-muted-foreground">
                                  {studyCard.cards.length} cards
                                </p>
                              </div>
                              <p className="text-muted-foreground text-sm">
                                {studyCard.createdAt instanceof Date
                                  ? studyCard.createdAt.toLocaleDateString()
                                  : new Date(
                                      studyCard.createdAt
                                    ).toLocaleDateString()}
                              </p>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </section>

            {/* Study Guides Section */}
            <section className="border border-slate-300 rounded-lg h-fit">
              <Accordion type="single" collapsible>
                <AccordionItem value="item-1">
                  <AccordionTrigger>
                    <div className="flex flex-row items-center justify-center w-full">
                      <h3 className="text-md font-semibold mb-4 text-slate-500 text-center">
                        Study Guides
                      </h3>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {studyGuides.map(
                        (studyGuide) =>
                          studyGuide && (
                            <Link
                              key={studyGuide.id}
                              href={`/study-guides/${studyGuide.id}`}
                            >
                              <Card className="transition-transform  shadow-none bg-white border-none">
                                <CardContent className="p-4 flex flex-row items-center justify-between border-t hover:bg-slate-100 border-slate-300">
                                  <div className="p-2 rounded-full w-fit bg-[#b34747]">
                                    <FileText className="h-6 w-6 text-white" />
                                  </div>
                                  <div className="flex flex-col ml-4">
                                    <h2 className="text-md font-semibold text-slate-600">
                                      Study Guide: {studyGuide.title}
                                    </h2>
                                    <p className="text-muted-foreground">
                                      From notebook: {studyGuide.title}
                                    </p>
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <p className="text-muted-foreground text-sm">
                                      {studyGuide.createdAt instanceof Date
                                        ? studyGuide.createdAt.toLocaleDateString()
                                        : studyGuide.createdAt &&
                                          "seconds" in studyGuide.createdAt
                                        ? new Date(
                                            studyGuide.createdAt.seconds * 1000
                                          ).toLocaleDateString()
                                        : new Date().toLocaleDateString()}
                                    </p>
                                  </div>
                                </CardContent>
                              </Card>
                            </Link>
                          )
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </section>

            {/* Quizzes Section */}
            <section className="border border-slate-300 rounded-lg h-fit">
              <Accordion type="single" collapsible>
                <AccordionItem value="item-1">
                  <AccordionTrigger>
                  <div className="flex flex-row items-center justify-center w-full">
                    <h3 className="text-md font-semibold mb-4 text-slate-500 text-center">
                      Study Guides
                        </h3>
                        </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {quizzes.map((quiz) => (
                        <Link key={quiz.id} href={`/quiz/${quiz.id}`}>
                          <Card className="transition-transform  shadow-none bg-white border-none">
                            <CardContent className="p-4 flex flex-row items-center justify-between border-t hover:bg-slate-100 border-slate-300">
                              <div className="p-2 rounded-full w-fit bg-[#8547b3]">
                                <MessageSquare className="h-6 w-6 text-white" />
                              </div>
                              <div className="flex flex-col ml-4 flex-grow">
                                <h2 className="text-md font-semibold text-slate-600">
                                  {quiz.quizData.title}
                                </h2>
                                <p className="text-muted-foreground">
                                  {quiz.totalQuestions} questions
                                </p>
                              </div>
                              <div className="flex flex-col items-end">
                                <p className="text-muted-foreground text-sm">
                                  {quiz.isComplete
                                    ? "Completed"
                                    : quiz.startedAt
                                    ? "Started"
                                    : "Not started"}
                                </p>
                                <p className="text-muted-foreground text-sm">
                                  {quiz.createdAt
                                    ? typeof quiz.createdAt === "object" &&
                                      "seconds" in quiz.createdAt
                                      ? new Date(
                                          quiz.createdAt.seconds * 1000
                                        ).toLocaleDateString()
                                      : new Date(
                                          quiz.createdAt
                                        ).toLocaleDateString()
                                    : new Date().toLocaleDateString()}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </section>
          </div>
        </div>
      )}

      <CreateNotebookModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
