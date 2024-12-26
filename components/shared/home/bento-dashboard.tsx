import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, BarChart3, FileText, Users, Zap } from 'lucide-react'
import Link from "next/link"

const bentoItems = [
  {
    title: "Generate Notes",
    description: "Generate notes from your documents",
    icon: BarChart3,
    href: "/notes",
    color: "bg-blue-500",
  },
  {
    title: "Create Study Cards",
    description: "Generate study cards from your notes",
    icon: Users,
    href: "/customers",
    color: "bg-green-500",
  },
  {
    title: "Generate Quiz",
    description: "Generate quiz from your notes",
    icon: FileText,
    href: "/documents",
    color: "bg-yellow-500",
  },
  {
    title: "PDF Builder",
    description: "Create PDF documents fast and easy with context",
    icon: Zap,
    href: "/actions",
    color: "bg-purple-500",
  },
  {
    title: "Uploaded Documents",
    description: "Create PDF documents fast and easy with context",
    icon: Zap,
    href: "/actions",
    color: "bg-purple-500",
  },
  {
    title: "Settings",
    description: "Create PDF documents fast and easy with context",
    icon: Zap,
    href: "/actions",
    color: "bg-purple-500",
  },
]

export default function BentoDashboard() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-white">Welcome User</h1>
      <div className="flex flex-wrap gap-4  items-center justify-center md:p-5">
        {bentoItems.map((item) => (
          <Link key={item.title} href={item.href}>
            <Card className="h-full transition-transform hover:scale-105 bg-slate-900 border-none w-[800px] md:w-[400px] mx-4 ">
              <CardContent className="p-6 flex flex-col h-full">
                <div className={`p-2 rounded-full w-fit ${item.color}`}>
                  <item.icon className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-xl font-semibold mt-4">{item.title}</h2>
                <p className="text-muted-foreground mt-2 flex-grow">{item.description}</p>
                <div className="flex items-center mt-4 text-sm">
                  <span>Learn more</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

