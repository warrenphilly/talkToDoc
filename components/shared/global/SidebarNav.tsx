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
    title: "Notes",
    url: "/notes",
    icon: Home,
  },

  {
    title: "Study Cards ",
    url: "#",
    icon: BookOpen,
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
        <SidebarContent className="bg-slate-200 text-slate-400 py-4 pl-2">
          <SidebarGroup className="px-5 bg-slate-100 h-full rounded-2xl">
          <div className="text-slate-800 p-4 bg-slate-200 w-full rounded-2xl my-5 font-semibold">
            <h1 className="text-xl font-regular">Welcome , User</h1>
          </div>

            <SidebarGroupContent>
              <SidebarMenu className=" h-full rounded-2xl">
                {items.map((item) => (
                  <SidebarMenuItem key={item.title} className="hover:bg-red-400">
                    <SidebarMenuButton asChild>
                      <a href={item.url} className="flex items-center gap-2 p-2">
                        <item.icon className="text-[#94b347]" />
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