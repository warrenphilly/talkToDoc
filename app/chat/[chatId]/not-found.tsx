import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-900">
      <h2 className="text-2xl font-bold text-white mb-4">Chat Not Found</h2>
      <p className="text-gray-400 mb-4">Could not find the requested chat</p>
      <Link 
        href="/" 
        className="text-blue-500 hover:text-blue-400 underline"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}