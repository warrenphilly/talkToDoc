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
import { getCurrentUserId } from "@/lib/auth";
import {
  FirestoreUser,
  getNotebooksByFirestoreUserId,
  getUserByClerkId,
  Notebook,
} from "@/lib/firebase/firestore";
import { User, } from "@clerk/nextjs/server";
import { CircularProgress } from "@mui/material";
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
];

export function SidebarNav() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [isOpen, setIsOpen] = useState(true);
  const [user, setUser] = useState<FirestoreUser | null>(null);
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNotebooks = async () => {
      try {
        // Get Clerk ID
        const clerkUserId = await getCurrentUserId();
        if (!clerkUserId) return;

        // Get Firestore user
        const firestoreUser = await getUserByClerkId(clerkUserId);

        setUser(firestoreUser);

        // if (!firestoreUser) return;

        // // Get notebooks using Firestore user ID
        if (!firestoreUser) return;
        const userNotebooks = await getNotebooksByFirestoreUserId(
          firestoreUser.id
        );
        setNotebooks(userNotebooks);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching notebooks:", error);
      }
    };

    fetchNotebooks();
    console.log(notebooks);
  }, []);
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent className="bg-slate-200 text-slate-400 py-4 pl-2 w-full ">
          <SidebarGroup className=" bg-slate-100 h-full rounded-2xl flex flex-col justify-between w-full ">
            <SidebarGroupContent className="flex flex-col justify-between h-full w-full">
              <SidebarMenu className="h-fit rounded-2xl flex flex-col justify-center items-start w-full  ">
                {isLoading ? (
                  <Skeleton className="h-24 my-5 w-full rounded-2xl" />
                ) : (
                  <div className="text-slate-800 bg-slate-200   w-full rounded-2xl my-5 font-semibold flex flex-col  justify-between">
                  <div className="flex flex-row items-center justify-center  gap-2 p-4">
                    <div className="flex flex-row items-center justify-center  gap-2 text-xl">
                      <UserButton /> <p >{user?.username}</p>
                    </div>
                    <Separator orientation="vertical" className="bg-slate-300" />
                    <div className="flex flex-row items-center gap-2 text-sm text-slate-500">
                    
                      {user?.firstName} {user?.lastName}
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex flex-row items-center justify-between gap-2  px-4 pb-2">
                    <Button className="flex flex-row items-center gap-2 text-sm p-3 bg-slate-100 hover:bg-slate-300 rounded-lg shadow-none">
                      <Settings className="text-[#94b347] text-[30px]" />
                      Settings
                    </Button>
                    <SignOutButton>
                    <Button className="flex flex-row items-center gap-2 text-sm p-3 bg-slate-100 hover:bg-slate-300 rounded-lg shadow-none">
                      <LogOut className="text-[#94b347] text-[30px]" />
                      Logout
                      </Button>
                      </SignOutButton>
                  </div>
                  </div>
                )}

                {/* Regular menu items */}
                {items.map((item) => (
                  <div key={item.title} className="w-full my-1 text-xl ">
                    {isLoading ? (
                      <Skeleton className="h-10 w-full rounded-xl" />
                    ) : (
                      <SidebarMenuItem className="hover:bg-slate-200 text-xl w-full rounded-xl">
                        <SidebarMenuButton
                          asChild
                        className={`w-full py-2  text-sm items-center bg-slate-200 rounded-xl p-5 ${
                          pathname === item.url ? "bg-[#adc668] text-white hover:bg-[#c7d995] hover:text-white" : "hover:bg-slate-300 hover:text-slate-400 "
                        }`}
                      >
                        <a
                          href={item.url}
                          className="flex items-center gap-2 p-2"
                        >
                          <item.icon
                            className={`text-[30px] ${
                              pathname === item.url
                                ? "text-white"
                                : "text-[#94b347]"
                            }`}
                          />
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    )}

                    <Separator className="w-full" />
                  </div>
                ))}

                {/* Notebooks collapsible section */}
                <div className=" mt-5 flex flex-col gap-6 w-full">
                  {isLoading ? (
                    <Skeleton className="h-36 w-full rounded-xl" />
                  ) : (
                  <Collapsible
                    open={isOpen}
                    onOpenChange={setIsOpen}
                    className="w-full justify-center  bg-slate-200 rounded-xl"
                  >
                    <CollapsibleTrigger className="flex items-center gap-2 py-2 w-full hover:bg-slate-200 px-4 rounded-xl">
                      <BookOpen className="text-[#94b347]  h-4" />
                      <span>Notebooks</span>
                      <ChevronDown
                        className={`ml-auto transform transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-5 w-full  gap-2">
                        
                          <CircularProgress
                            size={20}
                        
                            sx={{
                              color: "#94b347",
                            
                            }}
                          />
                        </div>
                      ) : (
                        notebooks.map((notebook) => (
                          <SidebarMenuItem
                          key={notebook.id}
                          className={`hover:bg-slate-300  w-full   ${
                            pathname === `/notes/${notebook.id}`
                              ? "bg-[#d2e4a2] text-white"
                              : ""
                          } ${notebooks.indexOf(notebook) === notebooks.length - 1 ? "rounded-b-xl" : ""}` }
                        >
                          <div className="h-px bg-slate-300 w-full" />

                          <SidebarMenuButton asChild>
                            <Link
                              href={`/notes/${notebook.id}`}
                              className={`flex items-center gap-2 p-2 justify-start pl-10 hover:bg-slate-300 rounded-none ${notebooks.indexOf(notebook) === notebooks.length - 1 ? "rounded-b-xl" : ""}`}
                            >
                              {" "}
                              <FileText className="text-[#94b347]" />
                              <span> {notebook.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        ))
                      )}
                    </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  );
}
