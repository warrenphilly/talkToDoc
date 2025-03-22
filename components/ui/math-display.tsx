"use client";

import { formatEquation } from "@/lib/math-utils";
import { Copy, Download, ZoomIn, ZoomOut } from "lucide-react";
import { FC, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import MathFormula from "./math-formula";

interface MathDisplayProps {
  formula: string;
  className?: string;
}

export const MathDisplay: FC<MathDisplayProps> = ({
  formula,
  className = "",
}) => {
  const [zoom, setZoom] = useState(1);
  const [copied, setCopied] = useState(false);
  const mathDisplayRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => {
    setZoom(Math.min(zoom + 0.2, 2.0));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(zoom - 0.2, 0.6));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(formula);
    setCopied(true);
    toast.success("Formula copied to clipboard");

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const handleDownload = () => {
    // Create a downloadable LaTeX file
    const texContent = `\\documentclass{article}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\begin{document}
$${formatEquation(formula)}$
\\end{document}`;

    const blob = new Blob([texContent], { type: "application/x-tex" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "formula.tex";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("LaTeX file downloaded");
  };

  const formattedFormula = formatEquation(formula);

  return (
    <div className="w-full bg-slate-50 rounded-lg p-4 my-2">
      <div className="flex justify-end gap-2 mb-2">
        <button
          onClick={handleZoomOut}
          className="p-1 rounded-md hover:bg-slate-200 transition-colors"
          aria-label="Zoom out"
        >
          <ZoomOut size={16} />
        </button>
        <button
          onClick={handleZoomIn}
          className="p-1 rounded-md hover:bg-slate-200 transition-colors"
          aria-label="Zoom in"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={handleCopy}
          className={`p-1 rounded-md hover:bg-slate-200 transition-colors ${
            copied ? "text-green-500" : ""
          }`}
          aria-label="Copy formula"
        >
          <Copy size={16} />
        </button>
        <button
          onClick={handleDownload}
          className="p-1 rounded-md hover:bg-slate-200 transition-colors"
          aria-label="Download as LaTeX"
        >
          <Download size={16} />
        </button>
      </div>

      <div
        ref={mathDisplayRef}
        className="flex justify-center items-center overflow-x-auto py-4 px-2"
        style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
      >
        <MathFormula formula={formattedFormula} className={className} />
      </div>
    </div>
  );
};

export default MathDisplay;
