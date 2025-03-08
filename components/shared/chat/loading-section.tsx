"use client";

import { Skeleton } from "@/components/ui/skeleton";
import React from "react";

interface LoadingSectionProps {
  totalSections: number;
  currentSections: number;
}

const LoadingSection = ({
  totalSections,
  currentSections,
}: LoadingSectionProps) => {
  const progress =
    totalSections > 0 ? (currentSections / totalSections) * 100 : 0;

  return (
    <div className="flex flex-col space-y-4 p-4 border rounded-md bg-gray-50 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Generating content...</h3>
        <span className="text-sm text-gray-500">
          {currentSections} {totalSections > 0 ? `/ ${totalSections}` : ""}{" "}
          sections
        </span>
      </div>

      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
};

export default LoadingSection;
