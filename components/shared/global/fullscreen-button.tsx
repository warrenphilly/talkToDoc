"use client";

import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2 } from "lucide-react";

interface FullscreenButtonProps {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  className?: string;
}

export function FullscreenButton({
  isFullscreen,
  toggleFullscreen,
  className = "absolute top-2 right-2 z-10 bg-white hover:bg-gray-50 p-2 shadow-sm border border-gray-100 rounded-full"
}: FullscreenButtonProps) {
  return (
    <Button
      onClick={toggleFullscreen}
      className={className}
      size="icon"
      aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
    >
      {isFullscreen ? (
        <Minimize2 size={16} className="text-gray-700" />
      ) : (
        <Maximize2 size={16} className="text-gray-700" />
      )}
    </Button>
  );
} 