import { Skeleton } from "@/components/ui/skeleton";

export function SidebarLoading() {
  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      {/* Logo skeleton */}
      <div className="flex items-center space-x-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-6 w-32" />
      </div>

      {/* Navigation items skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>

      {/* Bottom section skeleton */}
      <div className="mt-auto space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
