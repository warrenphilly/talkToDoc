"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";
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
      <div className="flex flex-col items-center justify-between w-fit p-2">
           <h3 className="text-lg font-medium">Generating content...</h3>
           <div className="flex items-center justify-center gap-2">
        <span className="text-sm text-gray-500">
          
           sections generated: {" "}  {currentSections} 
           </span>
           <RefreshCw
                      size={16}
              className="text-[#94b347] animate-spin"
              
                    />
           </div>
      </div>

      {/* <div className="w-full  rounded-full h-2.5 flex items-center justify-center"> */}
        {/* <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
              style={{ width: `${progress}%` }}
              
           ></div> */}
               {/* <RefreshCw
                      size={16}
              className="text-[#94b347] animate-spin"
              
                    />
            */}
      {/* </div> */}

  
    </div>
  );
};

export default LoadingSection;
