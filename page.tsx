import ExpandableContainer from './expandable-container'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-2xl font-bold mb-4">Expandable Container Demo</h1>
      <div className="h-[500px] bg-white rounded-lg shadow-md p-4">
        <ExpandableContainer className="bg-gray-200 rounded-md">
          <h2 className="text-xl font-semibold mb-2">Expandable Content</h2>
          <p>This content can be expanded to full screen within its parent container.</p>
          <p className="mt-4">Click the button in the top-right corner to toggle fullscreen mode.</p>
          {/* Add more content here to demonstrate scrolling */}
          {Array(20).fill(null).map((_, index) => (
            <p key={index} className="mt-4">
              This is paragraph {index + 1}. It's here to demonstrate scrolling when there's a lot of content.
            </p>
          ))}
        </ExpandableContainer>
      </div>
    </div>
  )
}

