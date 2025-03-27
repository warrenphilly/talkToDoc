export default function Loading() {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-[#94b347] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600 text-lg">Redirecting...</p>
      </div>
    </div>
  );
}
