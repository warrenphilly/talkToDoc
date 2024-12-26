import BentoDashboard from "./bento-dashboard"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <BentoDashboard />
      <main>{children}</main>
    </div>
  )
}

