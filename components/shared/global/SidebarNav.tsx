import { Calendar, Home, Inbox, Search, Settings, MessageCircle, BookOpen, BookOpenText, File } from "lucide-react"
 
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { SidebarProvider } from "@/components/ui/sidebar";

// Menu items.
const items = [
  {
    title: "Home",
    url: "/",
    icon: Home,
  },
  {
    title: "Ai enhanced notes",
    url: "/notes",
    icon: Home,
  },
  {
    title: "Chat",
    url: "/chat",
    icon: MessageCircle,
  },
  {
    title: "Study Cards ",
    url: "#",
    icon: BookOpen,
  },
  {
    title: "Generate Quiz",
    url: "#",
    icon: BookOpenText,
  },
  {
    title: "Document Builder",
    url: "#",
    icon: BookOpenText,
  },
  {
    title: "Settings",
    url: "#",
    icon: Settings,
  },
  {
    title: "Uploaded files",
    url: "#",
    icon: File,
  },
]
 
export function SidebarNav() {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent className="bg-[#94b347] text-slate-200 ">
          <SidebarGroup>
         
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.title} className="hover:bg-slate-700">
                    <SidebarMenuButton asChild>
                      <a href={item.url} className="flex items-center gap-2 p-2">
                        <item.icon className="text-slate-100" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  )
}

export function App() {
  return (
    <SidebarProvider>
      <SidebarNav />
    </SidebarProvider>
  );
}