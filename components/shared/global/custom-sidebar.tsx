"use client";

import { Button } from "@/components/ui/button";
import { db } from "@/firebase";
import {
  FirestoreUser,
  Notebook,
  getUserByClerkId,
} from "@/lib/firebase/firestore";
import { QuizState } from "@/types/quiz";
import { StudyCardSet } from "@/types/studyCards";
import { SignOutButton, UserButton, useUser } from "@clerk/nextjs";
import { CircularProgress } from "@mui/material";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import {
  ChevronDown,
  Home,
  LogOut,
  Menu,
  MessageCircleQuestion,
  NotebookPen,
  PanelBottom,
  RefreshCw,
  ScrollText,
  Settings,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Menu items
const items = [
  {
    title: "Home",
    url: "/",
    icon: Home,
  },
];

// Study Guide type
type StudyGuide = {
  id: string;
  title: string;
};

export function CustomSidebar() {
  const { user: clerkUser } = useUser();
  const [notebooksOpen, setNotebooksOpen] = useState(true);
  const [studyCardsOpen, setStudyCardsOpen] = useState(true);
  const [studyGuidesOpen, setStudyGuidesOpen] = useState(true);
  const [quizzesOpen, setQuizzesOpen] = useState(true);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [studyCards, setStudyCards] = useState<StudyCardSet[]>([]);
  const [studyGuides, setStudyGuides] = useState<StudyGuide[]>([]);
  const [quizzes, setQuizzes] = useState<QuizState[]>([]);
  const [user, setUser] = useState<FirestoreUser | null>(null);
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Check screen size on component mount to set initial sidebar state
  useEffect(() => {
    const checkScreenSize = () => {
      const isMediumScreen = window.innerWidth >= 768; // md breakpoint in Tailwind
      setSidebarOpen(isMediumScreen);
    };

    // Set initial state
    checkScreenSize();

    // Add event listener for resize
    window.addEventListener("resize", checkScreenSize);

    // Cleanup
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Get user data
  useEffect(() => {
    const fetchUser = async () => {
      if (!clerkUser) return;

      try {
        const firestoreUser = await getUserByClerkId(clerkUser.id);
        setUser(firestoreUser);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };

    fetchUser();
  }, [clerkUser]);

  // Set up real-time listeners for notebooks
  useEffect(() => {
    if (!user) return;

    setIsLoading(true);

    // Notebooks listener - use a simple query without orderBy
    const notebooksRef = collection(db, "notebooks");
    const simpleQuery = query(notebooksRef, where("userId", "==", user.id));

    const unsubscribeNotebooks = onSnapshot(
      simpleQuery,
      (snapshot) => {
        const notebooksData: Notebook[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();

          // Helper function to serialize timestamps
          const serializeTimestamp = (timestamp: any) => {
            if (!timestamp) return "";
            if (timestamp.toDate) {
              return timestamp.toDate().toISOString();
            }
            return timestamp;
          };

          const notebook: Notebook = {
            id: doc.id,
            title: data.title,
            createdAt: serializeTimestamp(data.createdAt),
            updatedAt: serializeTimestamp(data.updatedAt),
            userId: data.userId,
            pages: data.pages || [],
          };

          notebooksData.push(notebook);
        });

        // Sort manually by updatedAt
        notebooksData.sort((a, b) => {
          const dateA = new Date(a.updatedAt || a.createdAt).getTime();
          const dateB = new Date(b.updatedAt || b.createdAt).getTime();
          return dateB - dateA; // descending order
        });

        setNotebooks(notebooksData);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error listening to notebooks:", error);
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribeNotebooks();
    };
  }, [user]);

  // Set up real-time listeners for study cards
  useEffect(() => {
    if (!clerkUser) return;

    // Study cards listener
    const studyCardsRef = collection(db, "studyCards");
    const studyCardsQuery = query(
      studyCardsRef,
      where("userId", "==", clerkUser.id)
    );

    const unsubscribeStudyCards = onSnapshot(
      studyCardsQuery,
      (snapshot) => {
        const studyCardsData: StudyCardSet[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();

          // Helper function to serialize timestamps
          const convertTimestamp = (timestamp: any) => {
            if (!timestamp) return null;
            if (timestamp.toDate) {
              return timestamp.toDate().toISOString();
            }
            return timestamp;
          };

          const studyCardSet: StudyCardSet = {
            id: doc.id,
            title: data.metadata?.name || data.title || "Untitled Set",
            cards: data.cards || [],
            createdAt: convertTimestamp(data.createdAt),
            updatedAt: convertTimestamp(data.updatedAt),
            userId: data.userId,
            metadata: data.metadata || {},
            notebookId: data.notebookId || null,
            pageId: data.pageId || null,
          };

          studyCardsData.push(studyCardSet);
        });

        setStudyCards(studyCardsData);
      },
      (error) => {
        console.error("Error listening to study cards:", error);
      }
    );

    return () => {
      unsubscribeStudyCards();
    };
  }, [clerkUser]);

  // Set up real-time listeners for study guides
  useEffect(() => {
    if (!clerkUser) return; // Use clerkUser instead of user

    // Study guides listener - match the query used in bento-dashboard
    const studyGuidesRef = collection(db, "studyGuides");
    const studyGuidesQuery = query(
      studyGuidesRef,
      where("userId", "==", clerkUser.id) // Use clerkUser.id instead of user.id
    );

    const unsubscribeStudyGuides = onSnapshot(
      studyGuidesQuery,
      (snapshot) => {
        const studyGuidesData: StudyGuide[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();

          const studyGuide: StudyGuide = {
            id: doc.id,
            title: data.title || "Untitled Guide",
          };

          studyGuidesData.push(studyGuide);
        });

        setStudyGuides(studyGuidesData);
      },
      (error) => {
        console.error("Error listening to study guides:", error);
      }
    );

    return () => {
      unsubscribeStudyGuides();
    };
  }, [clerkUser]);

  // Set up real-time listeners for quizzes
  useEffect(() => {
    if (!clerkUser) return; // Use clerkUser instead of user

    // Quizzes listener - match the query used in bento-dashboard
    const quizzesRef = collection(db, "quizzes");
    const quizzesQuery = query(
      quizzesRef,
      where("userId", "==", clerkUser.id) // Use clerkUser.id instead of user.id
    );

    const unsubscribeQuizzes = onSnapshot(
      quizzesQuery,
      (snapshot) => {
        const quizzesData: QuizState[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();

          const quiz: QuizState = {
            id: doc.id,
            notebookId: data.notebookId || "",
            pageId: data.pageId || "",
            quizData: data.quizData || {},
            currentQuestionIndex: data.currentQuestionIndex || 0,
            startedAt: data.startedAt?.toDate?.() || new Date(),
            lastUpdatedAt: data.lastUpdatedAt?.toDate?.() || new Date(),
            createdAt: data.createdAt?.toDate?.() || new Date(),
            userAnswers: data.userAnswers || [],
            evaluationResults: data.evaluationResults || [],
            score: data.score || 0,
            isComplete: data.isComplete || false,
            incorrectAnswers: data.incorrectAnswers || [],
            totalQuestions: data.totalQuestions || 0,
            userId: data.userId,
            title: data.title || data.quizData?.title || "Untitled Quiz",
          };

          quizzesData.push(quiz);
        });

        setQuizzes(quizzesData);
      },
      (error) => {
        console.error("Error listening to quizzes:", error);
      }
    );

    return () => {
      unsubscribeQuizzes();
    };
  }, [clerkUser]);

  // Toggle sidebar on mobile
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-20 md:hidden bg-white p-2 rounded-full shadow-md"
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 flex flex-col h-screen pb-36 md:pb-0`}
      >
        {/* User profile section */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-center gap-2 mb-2">
            <UserButton />
            <p className="font-semibold text-slate-800">{user?.username}</p>
          </div>
          <div className="text-sm text-slate-500 text-center">
            {user?.firstName} {user?.lastName}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-center gap-2 p-3 border-b border-slate-200">
          <Link
            href="/settings"
            className="flex items-center gap-1 text-sm p-2 text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-md"
          >
            <Settings className="text-[#94b347] h-4 w-4" />
            <span>Settings</span>
          </Link>
          <SignOutButton>
            <Button className="flex items-center gap-1 text-sm p-2 text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-md">
              <LogOut className="text-[#94b347] h-4 w-4" />
              <span>Logout</span>
            </Button>
          </SignOutButton>
        </div>

        {/* Navigation sections */}
        <div className="flex-1 overflow-y-auto py-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-20">
              <RefreshCw className="text-[#94b347] text-[30px] animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col">
              {/* Regular menu items */}
              {items.map((item) => (
                <Link
                  key={item.title}
                  href={item.url}
                  className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-md ${
                    pathname === item.url
                      ? "bg-[#b9d27a] text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <item.icon
                    className={`h-5 w-5 ${
                      pathname === item.url ? "text-white" : "text-[#94b347]"
                    }`}
                  />
                  <span>{item.title}</span>
                </Link>
              ))}

              {/* Notebooks Section */}
              <div className="mt-4">
                <button
                  onClick={() => setNotebooksOpen(!notebooksOpen)}
                  className={`flex items-center justify-between w-full px-4 py-2 text-left ${
                    pathname.includes("/notes")
                      ? "bg-[#e7f2ca] text-slate-800"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <NotebookPen className="h-5 w-5 text-[#94b347]" />
                    <span>Notebooks</span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      notebooksOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {notebooksOpen && (
                  <div className="ml-4 mt-1 border-l-2 border-slate-200 px-4">
                    {notebooks.length === 0 ? (
                      <div className="text-sm text-slate-500 py-2 px-3">
                        No notebooks yet
                      </div>
                    ) : (
                      notebooks.map((notebook) => (
                        <Link
                          key={notebook.id}
                          href={`/notes/${notebook.id}`}
                          className={`flex items-center gap-2 py-2 px-3 my-1 rounded-md ${
                            pathname === `/notes/${notebook.id}`
                              ? "bg-[#b9d27a] text-white"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <NotebookPen
                            className={`h-4 w-4 ${
                              pathname === `/notes/${notebook.id}`
                                ? "text-white"
                                : "text-[#94b347]"
                            }`}
                          />
                          <span className="truncate">{notebook.title}</span>
                        </Link>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Study Cards Section */}
              <div className="mt-2">
                <button
                  onClick={() => setStudyCardsOpen(!studyCardsOpen)}
                  className={`flex items-center justify-between w-full px-4 py-2 text-left ${
                    pathname.includes("/study-cards")
                      ? "bg-[#e7f2ca] text-slate-800"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <PanelBottom className="h-5 w-5 text-[#94b347]" />
                    <span>Study Cards</span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      studyCardsOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {studyCardsOpen && (
                  <div className="ml-4 mt-1 border-l-2 border-slate-200 px-4">
                    {studyCards.length === 0 ? (
                      <div className="text-sm text-slate-500 py-2 px-3">
                        No study cards yet
                      </div>
                    ) : (
                      studyCards.map((set) => (
                        <Link
                          key={set.id}
                          href={`/study-cards/${set.id}`}
                          className={`flex items-center gap-2 py-2 px-3 my-1 rounded-md ${
                            pathname === `/study-cards/${set.id}`
                              ? "bg-[#b9d27a] text-white"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <PanelBottom
                            className={`h-4 w-4 ${
                              pathname === `/study-cards/${set.id}`
                                ? "text-white"
                                : "text-[#94b347]"
                            }`}
                          />
                          <span className="truncate">
                            {set.metadata?.name || set.title || "Untitled Set"}
                          </span>
                        </Link>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Study Guides Section */}
              <div className="mt-2">
                <button
                  onClick={() => setStudyGuidesOpen(!studyGuidesOpen)}
                  className={`flex items-center justify-between w-full px-4 py-2 text-left ${
                    pathname.includes("/study-guides")
                      ? "bg-[#e7f2ca] text-slate-800"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ScrollText className="h-5 w-5 text-[#94b347]" />
                    <span>Study Guides</span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      studyGuidesOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {studyGuidesOpen && (
                  <div className="ml-4 mt-1 border-l-2 border-slate-200 px-4">
                    {studyGuides.length === 0 ? (
                      <div className="text-sm text-slate-500 py-2 px-3">
                        No study guides yet
                      </div>
                    ) : (
                      studyGuides.map((guide) => (
                        <Link
                          key={guide.id}
                          href={`/study-guides/${guide.id}`}
                          className={`flex items-center gap-2 py-2 px-3 my-1 rounded-md ${
                            pathname === `/study-guides/${guide.id}`
                              ? "bg-[#b9d27a] text-white"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <ScrollText
                            className={`h-4 w-4 ${
                              pathname === `/study-guides/${guide.id}`
                                ? "text-white"
                                : "text-[#94b347]"
                            }`}
                          />
                          <span className="truncate">{guide.title}</span>
                        </Link>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Quizzes Section */}
              <div className="mt-2">
                <button
                  onClick={() => setQuizzesOpen(!quizzesOpen)}
                  className={`flex items-center justify-between w-full px-4 py-2 text-left ${
                    pathname.includes("/quizzes")
                      ? "bg-[#e7f2ca] text-slate-800"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <MessageCircleQuestion className="h-5 w-5 text-[#94b347]" />
                    <span>Quizzes</span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      quizzesOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {quizzesOpen && (
                  <div className="ml-4 mt-1 border-l-2 border-slate-200 px-4">
                    {quizzes.length === 0 ? (
                      <div className="text-sm text-slate-500 py-2 px-3">
                        No quizzes yet
                      </div>
                    ) : (
                      quizzes.map((quiz) => (
                        <Link
                          key={quiz.id}
                          href={`/quizzes/${quiz.id}`}
                          className={`flex items-center gap-2 py-2 px-3 my-1 rounded-md ${
                            pathname === `/quizzes/${quiz.id}`
                              ? "bg-[#b9d27a] text-white"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <MessageCircleQuestion
                            className={`h-4 w-4 ${
                              pathname === `/quizzes/${quiz.id}`
                                ? "text-white"
                                : "text-[#94b347]"
                            }`}
                          />
                          <span className="truncate">{quiz.title}</span>
                        </Link>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* App version or branding */}
        <div className="p-2 md:p-5 text-xs text-center text-slate-400 border-t border-slate-200">
          <p className="text-xs text-[#94b347]">Gammanotes v1.0</p>
          <p className="text-xs text-slate-500">
            Ai is not perfect, double check responses
          </p>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={toggleSidebar}
        />
      )}
    </>
  );
}
