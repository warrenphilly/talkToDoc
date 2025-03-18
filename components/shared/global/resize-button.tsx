"use client";

import { Button } from "@/components/ui/button";
import { Expand, Shrink } from "lucide-react";

interface ResizeButtonProps {
  isExpanded: boolean;
  toggleResize: () => void;
  className?: string;
  position?: "topleft" | "topright" | "bottomleft" | "bottomright";
}

export function ResizeButton({
  isExpanded,
  toggleResize,
  className = "absolute top-2 right-10 z-10 bg-white hover:bg-gray-50 p-2 shadow-sm border border-gray-100 rounded-full",
  position = "topright"
}: ResizeButtonProps) {
  // Determine class based on position
  let positionClass = "top-2 right-10";
  
  if (position === "topleft") positionClass = "top-2 left-2";
  if (position === "topright") positionClass = "top-2 right-10"; // Leave space for fullscreen button
  if (position === "bottomleft") positionClass = "bottom-2 left-2";
  if (position === "bottomright") positionClass = "bottom-2 right-2";
  
  const baseClass = `absolute ${positionClass} z-10 bg-white hover:bg-gray-50 p-2 shadow-sm border border-gray-100 rounded-full`;
  
  return (
    <Button
      onClick={toggleResize}
      className={className || baseClass}
      size="icon"
      aria-label={isExpanded ? "Shrink panel" : "Expand panel"}
      title={isExpanded ? "Shrink panel" : "Expand panel"}
    >
      {isExpanded ? (
        <Shrink size={16} className="text-gray-700" />
      ) : (
        <Expand size={16} className="text-gray-700" />
      )}
    </Button>
  );
} 