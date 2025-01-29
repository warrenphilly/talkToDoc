"use client";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SignOutButton, UserButton } from "@clerk/nextjs";

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
  getUserByClerkId,
  Notebook,
} from "@/lib/firebase/firestore";
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
  Calendar,
  ChevronDown,
  File,
  FileText,
  Home,
  Inbox,
  LogOut,
  MessageCircle,
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

export function SidebarNav() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [isOpen, setIsOpen] = useState(true);
  const [user, setUser] = useState<FirestoreUser | null>(null);
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserAndSetupNotebooksListener = async () => {
      try {
        const clerkUserId = await getCurrentUserId();
        if (!clerkUserId) return;

        const firestoreUser = await getUserByClerkId(clerkUserId);
        setUser(firestoreUser);

        if (!firestoreUser) return;

        const notebooksRef = collection(db, "notebooks");
        const notebooksQuery = query(
          notebooksRef,
          where("userId", "==", firestoreUser.id)
        );

        const unsubscribe = onSnapshot(notebooksQuery, (snapshot) => {
          const updatedNotebooks = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              title: data.title,
              createdAt: data.createdAt?.toDate() || new Date(),
              userId: data.userId,
              pages: data.pages,
            } as Notebook;
          });
          updatedNotebooks.sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
          );
          setNotebooks(updatedNotebooks);
          setIsLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("Error setting up notebooks listener:", error);
        setIsLoading(false);
      }
    };

    fetchUserAndSetupNotebooksListener();
  }, []);

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
                      <item.icon className={`text-[30px] text-[#94b347] ${pathname === item.url ? "text-white" : ""}`} />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Notebooks section */}
              <Collapsible
                open={isOpen}
                onOpenChange={setIsOpen}
                className="w-full h-fit justify-center bg-white rounded-xl"
              >
                <CollapsibleTrigger className={`flex items-center  gap-2 border-y border-b-slate-200 py-2 w-full bg-none px-4 ${
                      pathname.includes("/notes")
                        ? "bg-[#e7f2ca] text-slate-800"
                        : "hover:bg-slate-300"
                    } `}>
                  <BookOpen className="text-[#94b347] h-4" />
                  <span>Notebooks</span>
                  <ChevronDown
                    className={`ml-auto transform transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {isLoading ? (
                    <div className={`flex flex-col  items-center justify-center h-5 w-full   gap-2 ${
                      pathname.includes("/notes")
                        ? "bg-slate-50 text-white hover:text-white hover:bg-[#8da34f]"
                        : "hover:bg-slate-300"
                    } `}>
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
                            className={`flex items-center gap-2 pl-10 justify-start ${
                              pathname === `/notes/${notebook.id}`
                                ? "bg-[#bdcc97] text-white hover:text-white hover:bg-[#8da34f]"
                                : "hover:bg-slate-300"
                            }  ${
                              pathname.includes("/notes") && pathname !== `/notes/${notebook.id}`
                                ? "bg-slate-50  hover:bg-[#8da34f]"
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
