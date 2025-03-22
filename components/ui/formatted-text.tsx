"use client";

import {
  containsMath,
  formatEquation,
  parseTextWithMath,
} from "@/lib/math-utils";
import "@/styles/math.css";
import { FC, useState } from "react";
import MathDisplay from "./math-display";
import MathFormula from "./math-formula";

interface FormattedTextProps {
  text: string;
  className?: string;
}

export const FormattedText: FC<FormattedTextProps> = ({
  text,
  className = "",
}) => {
  const [showMathDisplay, setShowMathDisplay] = useState(false);

  // Format ASCII-style math expressions for better display
  const formatAsciiMath = (text: string) => {
    if (!text) return text;

    // Basic formatting for simple ASCII math expressions
    return (
      text
        // Format superscripts: x^2
        .replace(
          /(\w+)\^(\w+|\d+)/g,
          "$1<span class='math-superscript'>$2</span>"
        )
        // Format square roots: sqrt(x)
        .replace(
          /sqrt\(([^)]+)\)/g,
          '<span class="math-sqrt"><span class="math-sqrt-content">$1</span></span>'
        )
        // Format fractions: a/b
        .replace(
          /(\w+|\d+)\/(\w+|\d+)(?!\w)/g,
          '<span class="math-fraction"><span class="math-fraction-numerator">$1</span><span class="math-fraction-denominator">$2</span></span>'
        )
        // Format Greek letters
        .replace(
          /\b(alpha|beta|gamma|delta|epsilon|theta|lambda|pi|sigma|omega)\b/gi,
          '<span class="math-greek">$1</span>'
        )
        // Format common math operators
        .replace(
          /\b(sum|int|prod|lim)\b/g,
          '<span class="math-operator">$1</span>'
        )
        // Format subscripts with underscore: x_1
        .replace(/(\w+)_(\w+|\d+)/g, '$1<span class="math-subscript">$2</span>')
    );
  };

  // Simple detection for ASCII-style math
  const containsAsciiMath = (text: string) => {
    if (!text) return false;

    const asciiMathPatterns = [
      /\w+\^\w+/, // Superscripts: x^2
      /\w+_\w+/, // Subscripts: x_1
      /sqrt\([^)]+\)/, // Square roots: sqrt(x)
      /\b\w+\/\w+\b/, // Simple fractions: a/b
      /\b(alpha|beta|gamma|delta|epsilon|theta|lambda|pi|sigma|omega)\b/i, // Greek letter names
      /\b(sum|int|prod|lim)\b/, // Math operation names
    ];

    return asciiMathPatterns.some((pattern) => pattern.test(text));
  };

  // If we detect LaTeX math, use the math components
  if (containsMath(text)) {
    const segments = parseTextWithMath(text);

    return (
      <span className={className}>
        {segments.map((segment, index) => {
          if (segment.type === "text") {
            // Check if the text segment contains ASCII math
            if (containsAsciiMath(segment.content)) {
              return (
                <span
                  key={index}
                  dangerouslySetInnerHTML={{
                    __html: formatAsciiMath(segment.content),
                  }}
                />
              );
            }
            return <span key={index}>{segment.content}</span>;
          } else if (segment.type === "inline-math") {
            return (
              <MathFormula
                key={index}
                formula={formatEquation(segment.content)}
                inline
              />
            );
          } else {
            return (
              <MathDisplay
                key={index}
                formula={formatEquation(segment.content)}
              />
            );
          }
        })}
      </span>
    );
  }

  // Check for ASCII math notation
  if (containsAsciiMath(text)) {
    return (
      <span
        className={className}
        dangerouslySetInnerHTML={{ __html: formatAsciiMath(text) }}
      />
    );
  }

  // Just plain text
  return <span className={className}>{text}</span>;
};

export default FormattedText;
