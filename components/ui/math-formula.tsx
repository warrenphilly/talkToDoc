"use client";

import "katex/dist/katex.min.css";
import { FC, useEffect, useState } from "react";
import { BlockMath, InlineMath } from "react-katex";

interface MathFormulaProps {
  formula: string;
  inline?: boolean;
  className?: string;
}

export const MathFormula: FC<MathFormulaProps> = ({
  formula,
  inline = false,
  className = "",
}) => {
  const [error, setError] = useState<string | null>(null);
  const [processedFormula, setProcessedFormula] = useState(formula);

  useEffect(() => {
    // Clean and prepare the formula
    try {
      // Normalize LaTeX delimiters - replace various formats with proper LaTeX
      let processed = formula;

      // Remove any existing Katex-specific tags if they exist
      processed = processed.replace(/\\katex{|\\end{katex}/g, "");

      // Handle all common delimiters
      // First handle block delimiters
      processed = processed.replace(/\$\$(.*?)\$\$/g, "$1"); // $$...$$
      processed = processed.replace(/\\\[(.*?)\\\]/g, "$1"); // \[...\]

      // Then handle inline delimiters
      processed = processed.replace(/\$(.*?)\$/g, "$1"); // $...$
      processed = processed.replace(/\\\((.*?)\\\)/g, "$1"); // \(...\)

      // Normalize escaped backslashes in LaTeX commands (common in JSON)
      processed = processed.replace(/\\\\/g, "\\");

      // Specific adjustments for fractions and exponents
      processed = processed.replace(/\\frac(\d+)(\d+)/g, "\\frac{$1}{$2}");
      processed = processed.replace(/\^(\d+)\/(\d+)/g, "^{$1/$2}");

      // Fix spacing around operators
      processed = processed.replace(/([=+\-*/])/g, " $1 ").replace(/\s+/g, " ");

      setProcessedFormula(processed);
      setError(null);
    } catch (err) {
      console.error("Error processing formula:", err);
      setError("Error rendering formula");
    }
  }, [formula]);

  if (error) {
    return (
      <span className="text-red-500 italic text-sm">
        {error}: {formula}
      </span>
    );
  }

  // Render the formula safely with error boundary
  try {
    return inline ? (
      <div className={className}>
        <InlineMath math={processedFormula} />
      </div>
    ) : (
      <div className={className}>
        <BlockMath math={processedFormula} />
      </div>
    );
  } catch (renderError) {
    console.error(
      "Error rendering math formula:",
      renderError,
      processedFormula
    );
    return (
      <span className="text-red-500 italic text-sm">
        Rendering error: {formula}
      </span>
    );
  }
};

export default MathFormula;
