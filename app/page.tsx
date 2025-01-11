import { BottomDrawer } from '@/components/bottom-drawer'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Main Content</h1>
      <p className="text-xl mb-4">This is the main page content.</p>
      <BottomDrawer>
        <h2 className="text-2xl font-semibold mb-4">Drawer Content</h2>
        <p className="mb-4">This is the content inside the bottom drawer.</p>
        <p className="mb-4">You can expand this drawer to fullscreen by clicking the button in the top right corner.</p>
        {/* Add more content here as needed */}
        {Array.from({ length: 20 }).map((_, index) => (
          <p key={index} className="mb-4">Scroll content {index + 1}</p>
        ))}
      </BottomDrawer>
    </main>
  )
}

