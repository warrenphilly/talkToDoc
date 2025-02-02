"use client";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SignOutButton, UserButton, useUser } from "@clerk/nextjs";

import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/firebase";
import { getCurrentUserId } from "@/lib/auth";
import {
  FirestoreUser,
  getNotebooksByFirestoreUserId,
  getQuizzesByFirestoreUserId,
  getStudyCardsByClerkId,
  getStudyGuidesByFirestoreUserId,
  getUserByClerkId,
  Notebook,
} from "@/lib/firebase/firestore";
import { QuizState } from "@/types/quiz";
import { StudyCardSet } from "@/types/studyCards";
import { User } from "@clerk/nextjs/server";
import { CircularProgress } from "@mui/material";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import {
  BookOpen,
  BookOpenText,
  Brain,
  Calendar,
  ChevronDown,
  File,
  FileText,
  GraduationCap,
  Home,
  Inbox,
  LogOut,
  MessageCircle,
  ScrollText,
  Search,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Menu items.
const items = [
  {
    title: "Home",
    url: "/",
    icon: Home,
  },
  // {
  //   title: "Study Cards",
  //   url: "#",
  //   icon: BookOpen,
  // },
  // {
  //   title: "Document Builder",
  //   url: "#",
  //   icon: BookOpenText,
  // },

  // {
  //   title: "Uploaded files",
  //   url: "#",
  //   icon: File,
  // },

  // {
  //   title: "show me where i went wrong  with my exams",
  //   url: "#",
  //   icon: File,
  // },
];

// Add this type definition
type StudyGuide = {
  id: string;
  title: string;
  // Add other properties that your StudyGuide type needs
};

export function SidebarNav() {
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

  useEffect(() => {
    const fetchUserAndData = async () => {
      try {
        if (!clerkUser) return;

        const firestoreUser = await getUserByClerkId(clerkUser.id);
        setUser(firestoreUser);
        console.log("Firestore User:", firestoreUser);

        if (!firestoreUser) return;

        // Fetch all data types
        const userNotebooks = await getNotebooksByFirestoreUserId(
          firestoreUser.id
        );
        console.log("Notebooks:", userNotebooks);

        const userStudyCards = await getStudyCardsByClerkId(clerkUser.id);
        console.log("Study Cards:", userStudyCards);

        const userStudyGuides = await getStudyGuidesByFirestoreUserId(
          clerkUser.id
        );
        console.log("Study Guides:", userStudyGuides);

        const userQuizzes = await getQuizzesByFirestoreUserId(clerkUser.id);
        console.log("Quizzes:", userQuizzes);

        setNotebooks(userNotebooks);
        setStudyCards(userStudyCards);
        setStudyGuides(userStudyGuides);
        setQuizzes(userQuizzes);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setIsLoading(false);
      }
    };

    fetchUserAndData();
  }, [clerkUser]);

  return (
    <Sidebar>
      <SidebarContent className="bg-white text-slate-400 py-4 pl-2 w-full">
        <SidebarGroup className="bg-white h-full rounded-2xl flex flex-col justify-between w-full">
          <SidebarGroupContent className="flex flex-col justify-center h-full w-full items-center">
            <SidebarMenu className="h-full max-h-[calc(100vh-140px)] bg-white border border-slate-300 rounded-2xl flex flex-col gap-0 w-full">
              <div className="text-slate-800 bg-white   w-full rounded-2xl  font-semibold flex flex-col  justify-between">
                <div className="flex flex-col items-center justify-center  gap-2 p-4">
                  <div className="flex flex-row items-center justify-center  gap-2 text-xl">
                    <UserButton /> <p>{user?.username}</p>
                  </div>

                  <div className="flex flex-row items-center gap-2 text-sm text-slate-500">
                    {user?.firstName} {user?.lastName}
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex flex-row items-center justify-center gap-4 px-4 pb-2">
                  <Button className="flex flex-row items-center gap-2 text-sm p-3 bg-white border border-slate-400 hover:bg-slate-300 rounded-full shadow-none">
                    <Settings className="text-[#94b347] text-[30px]" />
                    Settings
                  </Button>
                  <SignOutButton>
                    <Button className="flex flex-row items-center gap-2 text-sm p-3 bg-white border border-slate-400 hover:bg-slate-300 rounded-full shadow-none">
                      <LogOut className="text-[#94b347] text-[30px]" />
                      Logout
                    </Button>
                  </SignOutButton>
                </div>
              </div>

              {/* Regular menu items */}
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className={`w-full py-4 rounded-none border-t border-slate-300 text-slate-400 text-sm items-center bg-white p-5 ${
                      pathname === item.url
                        ? "bg-[#bdcc97] text-white hover:text-white hover:bg-[#8da34f]"
                        : "hover:bg-slate-300"
                    }`}
                  >
                    <Link
                      href={item.url}
                      className="flex items-center gap-2 p-2"
                    >
                      <item.icon
                        className={`text-[30px] text-[#94b347] ${
                          pathname === item.url ? "text-white" : ""
                        }`}
                      />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Notebooks Section */}
              <Collapsible
                open={notebooksOpen}
                onOpenChange={setNotebooksOpen}
                className="w-full h-fit justify-center bg-white rounded-xl"
              >
                <CollapsibleTrigger
                  className={`flex items-center gap-2 border-y border-b-slate-200 py-2 w-full bg-none px-4 ${
                    pathname.includes("/notes")
                      ? "bg-[#e7f2ca] text-slate-800"
                      : "hover:bg-slate-300"
                  }`}
                >
                  <BookOpen className="text-[#94b347] h-4" />
                  <span>Notebooks</span>
                  <ChevronDown
                    className={`ml-auto transform transition-transform duration-200 ${
                      notebooksOpen ? "rotate-180" : ""
                    }`}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {isLoading ? (
                    <div
                      className={`flex flex-col  items-center justify-center h-5 w-full   gap-2 ${
                        pathname.includes("/notes")
                          ? "bg-slate-50 text-white hover:text-white hover:bg-[#8da34f]"
                          : "hover:bg-slate-300"
                      } `}
                    >
                      <CircularProgress
                        size={20}
                        sx={{
                          color: "#94b347",
                        }}
                      />
                    </div>
                  ) : (
                    notebooks.map((notebook, index) => (
                      <SidebarMenuItem
                        key={notebook.id}
                        className={`w-full border-b  rounded-none border-slate-200`}
                      >
                        <SidebarMenuButton asChild className={`rounded-none`}>
                          <Link
                            href={`/notes/${notebook.id}`}
                            className={`flex items-center gap-2 bg-slate-50 pl-10 justify-start ${
                              pathname === `/notes/${notebook.id}`
                                ? "bg-[#bdcc97] text-white hover:text-white hover:bg-[#8da34f]"
                                : "hover:bg-slate-300"
                            }  ${
                              pathname.includes("/notes") &&
                              pathname !== `/notes/${notebook.id}`
                                ? "  hover:bg-[#8da34f]"
                                : "hover:bg-slate-100"
                            } `}
                          >
                            <FileText
                              className={`text-[#94b347] ${
                                pathname === `/notes/${notebook.id}`
                                  ? "text-white"
                                  : ""
                              }`}
                            />
                            <span>{notebook.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Study Cards Section */}
              <Collapsible
                open={studyCardsOpen}
                onOpenChange={setStudyCardsOpen}
                className="w-full h-fit justify-center bg-white rounded-xl"
              >
                <CollapsibleTrigger
                  className={`flex items-center gap-2 border-b border-slate-200 py-2 w-full bg-none px-4 ${
                    pathname.includes("/study-cards")
                      ? "bg-[#e7f2ca] text-slate-800"
                      : "hover:bg-slate-300"
                  }`}
                >
                  <Brain className="text-[#94b347] h-4" />
                  <span>Study Cards</span>
                  <ChevronDown
                    className={`ml-auto transform transition-transform duration-200 ${
                      studyCardsOpen ? "rotate-180" : ""
                    }`}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <CircularProgress size={20} sx={{ color: "#94b347" }} />
                    </div>
                  ) : (
                    studyCards.map((set) => (
                      <SidebarMenuItem
                        key={set.id}
                        className="w-full border-b rounded-none border-slate-200"
                      >
                        <SidebarMenuButton asChild className="rounded-none">
                          <Link
                            href={`study-cards/${set.id}`}
                            className={`flex items-center bg-slate-50 gap-2 pl-10 justify-start ${
                              pathname === `/study-cards/${set.id}`
                                ? "bg-[#bdcc97] text-white hover:text-white hover:bg-[#8da34f]"
                                : "hover:bg-slate-300"
                            } ${
                              pathname.includes("/study-cards") &&
                              pathname !== `/study-cards/${set.id}`
                                ? "bg-slate-50 hover:bg-[#8da34f]"
                                : "hover:bg-slate-100"
                            } py-2`}
                          >
                            <ScrollText
                              className={`text-[#94b347] ${
                                pathname === `/study-cards/${set.id}`
                                  ? "text-white"
                                  : ""
                              }`}
                            />
                            <span>{set.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Study Guides Section */}
              <Collapsible
                open={studyGuidesOpen}
                onOpenChange={setStudyGuidesOpen}
                className="w-full h-fit justify-center bg-white rounded-xl"
              >
                <CollapsibleTrigger
                  className={`flex items-center gap-2 border-b border-slate-200 py-2 w-full bg-none px-4 ${
                    pathname.includes("/study-guides")
                      ? "bg-[#e7f2ca] text-slate-800"
                      : "hover:bg-slate-300"
                  }`}
                >
                  <GraduationCap className="text-[#94b347] h-4" />
                  <span>Study Guides</span>
                  <ChevronDown
                    className={`ml-auto transform transition-transform duration-200 ${
                      studyGuidesOpen ? "rotate-180" : ""
                    }`}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <CircularProgress size={20} sx={{ color: "#94b347" }} />
                    </div>
                  ) : (
                    studyGuides.map((guide) => (
                      <SidebarMenuItem
                        key={guide.id}
                        className="w-full border-b rounded-none border-slate-200"
                      >
                        <SidebarMenuButton asChild className="rounded-none">
                          <Link
                            href={`/study-guides/${guide.id}`}
                            className={`flex items-center bg-slate-50 gap-2 pl-10 justify-start ${
                              pathname === `/study-guides/${guide.id}`
                                ? "bg-[#bdcc97] text-white hover:text-white hover:bg-[#8da34f]"
                                : "hover:bg-slate-300"
                            } ${
                              pathname.includes("/study-guides") &&
                              pathname !== `/study-guides/${guide.id}`
                                ? "bg-slate-50 hover:bg-[#8da34f]"
                                : "hover:bg-slate-100"
                            } py-2`}
                          >
                            <FileText
                              className={`text-[#94b347] ${
                                pathname === `/study-guides/${guide.id}`
                                  ? "text-white"
                                  : ""
                              }`}
                            />
                            <span>{guide.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Quizzes Section */}
              <Collapsible
                open={quizzesOpen}
                onOpenChange={setQuizzesOpen}
                className="w-full h-fit justify-center bg-white rounded-xl"
              >
                <CollapsibleTrigger
                  className={`flex items-center gap-2 border-b border-slate-200 py-2 w-full bg-none px-4 ${
                    pathname.includes("/quizzes")
                      ? "bg-[#e7f2ca] text-slate-800"
                      : "hover:bg-slate-300"
                  }`}
                >
                  <MessageCircle className="text-[#94b347] h-4" />
                  <span>Quizzes</span>
                  <ChevronDown
                    className={`ml-auto transform transition-transform duration-200 ${
                      quizzesOpen ? "rotate-180" : ""
                    }`}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <CircularProgress size={20} sx={{ color: "#94b347" }} />
                    </div>
                  ) : (
                    quizzes.map((quiz) => (
                      <SidebarMenuItem
                        key={quiz.id}
                        className="w-full border-b rounded-none border-slate-200"
                      >
                        <SidebarMenuButton asChild className="rounded-none">
                          <Link
                            href={`/quizzes/${quiz.id}`}
                            className={`flex items-center bg-slate-50 gap-2 pl-10 justify-start ${
                              pathname === `/quizzes/${quiz.id}`
                                ? "bg-[#bdcc97] text-white hover:text-white hover:bg-[#8da34f]"
                                : "hover:bg-slate-300"
                            } ${
                              pathname.includes("/quizzes") &&
                              pathname !== `/quizzes/${quiz.id}`
                                ? "bg-slate-50 hover:bg-[#8da34f]"
                                : "hover:bg-slate-100"
                            } py-2`}
                          >
                            <FileText
                              className={`text-[#94b347] ${
                                pathname === `/quizzes/${quiz.id}`
                                  ? "text-white"
                                  : ""
                              }`}
                            />
                            <span>{`${quiz.quizData.title}`}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))
                  )}
                </CollapsibleContent>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
