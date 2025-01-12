"use client"

import { Button } from "@/components/ui/button";
import { SignOutButton, UserButton } from "@clerk/nextjs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import {
  BookOpen,
  BookOpenText,
  Calendar,
  ChevronDown,
  File,
  Home,
  Inbox,
  MessageCircle,
  Search,
  Settings,
  LogOut,
  FileText,
  
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
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
import { getNotebooksByFirestoreUserId, getUserByClerkId, Notebook } from "@/lib/firebase/firestore";
import { getCurrentUserId } from "@/lib/auth";
import { User } from "@clerk/nextjs/server";
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
  const [user, setUser] = useState<User | null>(null);
  const pathname = usePathname();


  useEffect(() => {
    const fetchNotebooks = async () => {
      try {
        // Get Clerk ID
        const clerkUserId = await getCurrentUserId();
        if (!clerkUserId) return;

        // Get Firestore user
        const firestoreUser = await getUserByClerkId(clerkUserId);
        console.log(firestoreUser)
        // if (firestoreUser) {
        //   setUser(firestoreUser);
        // }
        // if (!firestoreUser) return;

        // // Get notebooks using Firestore user ID
        if (!firestoreUser) return;
        const userNotebooks = await getNotebooksByFirestoreUserId(firestoreUser.id);
        setNotebooks(userNotebooks);
    
      } catch (error) {
        console.error("Error fetching notebooks:", error);
      }
    };

    fetchNotebooks();
    console.log(notebooks)
  }, []);
  return (
    <SidebarProvider >
      <Sidebar >
        <SidebarContent className="bg-slate-200 text-slate-400 py-4 pl-2 w-full ">
          <SidebarGroup className=" bg-slate-100 h-full rounded-2xl flex flex-col justify-between w-full ">
            <SidebarGroupContent className="flex flex-col justify-between h-full w-full">
              <SidebarMenu className="h-fit rounded-2xl flex flex-col justify-center items-start w-full  ">
                 <div className="text-slate-800 p-4 bg-slate-200 w-full rounded-2xl my-5 font-semibold flex items-center justify-between">
                  <UserButton /> 

                  <SignOutButton> 
                    <div className="flex flex-row items-center gap-2">logout
                    <LogOut className="text-[#94b347] text-[30px]"/></div>
                  </SignOutButton>

                 
                
                </div> 
                
                {/* Regular menu items */}
                {items.map((item) => (
                  <div key={item.title} className="w-full my-1 text-xl" >
                    <SidebarMenuItem className="hover:bg-slate-200 text-xl w-full">
                      <SidebarMenuButton asChild className={`w-full py-2 hover:bg-slate-200 text-sm items-center bg-slate-200 rounded-lg p-5 ${
                          pathname === item.url
                            ? "bg-[#adc668] text-white"
                            : ""
                        }`}>
                        <a
                          href={item.url}
                          className="flex items-center gap-2 p-2"
                        >
                          <item.icon className={`text-[30px] ${
                          pathname === item.url
                            ? "text-white"
                            : "text-[#94b347]"
                        }`} />
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <Separator className="w-full" />
                  </div>
                ))}

                {/* Notebooks collapsible section */}
                <div className=" mt-5 flex flex-col gap-6 w-full">
                <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full justify-center  bg-slate-200 rounded-lg">
                  <CollapsibleTrigger className="flex items-center gap-2 py-2 w-full hover:bg-slate-200 px-4 rounded-lg">
                    <BookOpen className="text-[#94b347]  h-4" />
                    <span>Notebooks</span>
                    <ChevronDown
                      className={`ml-auto transform transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                 
                      {notebooks.map((notebook) => (
                        <SidebarMenuItem
                          key={notebook.id}
                        className={`hover:bg-slate-300 rounded-b-lg w-full   ${
                          pathname === `/notes/${notebook.id}`
                            ? "bg-[#d2e4a2] text-white"
                            : ""
                        }`}
                        >
                          <div className="h-px bg-slate-300 w-full" />
                          
                        <SidebarMenuButton asChild>
                          <Link
                            href={`/notes/${notebook.id}`}
                            className="flex items-center gap-2 p-2 justify-start pl-10 hover:bg-slate-300"
                          >
                            {" "}
                            <FileText className="text-[#94b347]" />
                            <span> {notebook.title}</span>
                          </Link>
                        </SidebarMenuButton>
                        
                      </SidebarMenuItem>
                      
                    ))}
                  </CollapsibleContent>
                </Collapsible>

             
                </div>
              </SidebarMenu>

            
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  );
}

