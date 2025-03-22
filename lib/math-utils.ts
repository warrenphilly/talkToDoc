/**
 * Parses text and identifies mathematical formulas using common delimiters
 * For inline math: $formula$, \(formula\)
 * For block math: $$formula$$, \[formula\]
 */

// Common delimiters for mathematical notation
const MATH_DELIMITERS = {
  inline: [
    { start: "$", end: "$" },
    { start: "\\(", end: "\\)" },
    { start: "\\\\(", end: "\\\\)" }, // Double-escaped version from JSON
  ],
  block: [
    { start: "$$", end: "$$" },
    { start: "\\[", end: "\\]" },
    { start: "\\\\[", end: "\\\\]" }, // Double-escaped version from JSON
  ],
};

/**
 * Checks if a string contains mathematical notation
 */
export const containsMath = (text: string): boolean => {
  if (!text) return false;

  // Check for inline math
  for (const delimiter of MATH_DELIMITERS.inline) {
    const regex = new RegExp(
      escapeRegExp(delimiter.start) + "(.*?)" + escapeRegExp(delimiter.end),
      "g"
    );
    if (regex.test(text)) return true;
  }

  // Check for block math
  for (const delimiter of MATH_DELIMITERS.block) {
    const regex = new RegExp(
      escapeRegExp(delimiter.start) + "(.*?)" + escapeRegExp(delimiter.end),
      "g"
    );
    if (regex.test(text)) return true;
  }

  // Check for common mathematical expressions without delimiters
  const commonMathPatterns = [
    /\\frac{.+?}{.+?}/g, // Fractions
    /\\\\frac{.+?}{.+?}/g, // Double-escaped fractions
    /\\sum_/g, // Summation
    /\\\\sum_/g, // Double-escaped summation
    /\\int_/g, // Integral
    /\\\\int_/g, // Double-escaped integral
    /\\sqrt{.+?}/g, // Square root
    /\\\\sqrt{.+?}/g, // Double-escaped square root
    /\\alpha|\\beta|\\gamma|\\theta/g, // Greek letters
    /\\\\alpha|\\\\beta|\\\\gamma|\\\\theta/g, // Double-escaped Greek letters
    /\\Delta|\\Sigma|\\Omega/g, // Capital Greek letters
    /\\\\Delta|\\\\Sigma|\\\\Omega/g, // Double-escaped capital Greek letters
  ];

  for (const pattern of commonMathPatterns) {
    if (pattern.test(text)) return true;
  }

  return false;
};

/**
 * Helper function to escape special characters in regular expressions
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

/**
 * Splits text into segments of regular text and math formulas
 */
interface TextSegment {
  type: "text" | "inline-math" | "block-math";
  content: string;
}

export const parseTextWithMath = (text: string): TextSegment[] => {
  if (!text) return [{ type: "text", content: "" }];

  const segments: TextSegment[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    let earliestMatch: {
      type: "inline-math" | "block-math";
      start: number;
      end: number;
      content: string;
      fullMatch: string;
    } | null = null;

    // Look for all possible math delimiters
    for (const [typeKey, delimiters] of Object.entries(MATH_DELIMITERS)) {
      const type = typeKey as "inline" | "block";

      for (const delimiter of delimiters) {
        // Create properly escaped regex patterns for the delimiters
        const startPattern = escapeRegExp(delimiter.start);
        const endPattern = escapeRegExp(delimiter.end);
        const regex = new RegExp(`${startPattern}(.*?)${endPattern}`, "s");

        const match = regex.exec(remaining);
        if (!match) continue;

        const startIdx = match.index;
        const fullMatch = match[0];
        const content = match[1];
        const fullEnd = startIdx + fullMatch.length;

        if (earliestMatch === null || startIdx < earliestMatch.start) {
          earliestMatch = {
            type: type === "inline" ? "inline-math" : "block-math",
            start: startIdx,
            end: fullEnd,
            content,
            fullMatch,
          };
        }
      }
    }

    if (earliestMatch === null) {
      // No more math found
      segments.push({ type: "text", content: remaining });
      break;
    }

    // Add text before the math
    if (earliestMatch.start > 0) {
      segments.push({
        type: "text",
        content: remaining.substring(0, earliestMatch.start),
      });
    }

    // Add the math formula, normalize double backslashes
    segments.push({
      type: earliestMatch.type,
      content: earliestMatch.content.replace(/\\\\/g, "\\"),
    });

    // Update remaining text
    remaining = remaining.substring(earliestMatch.end);
  }

  return segments;
};

/**
 * Formats equations for proper display
 */
export const formatEquation = (formula: string): string => {
  if (!formula) return "";

  let formatted = formula;

  // Clean up common formatting issues
  formatted = formatted.trim();

  // Normalize double backslashes to single backslashes (from JSON escaping)
  formatted = formatted.replace(/\\\\/g, "\\");

  // Replace multiple spaces with single space
  formatted = formatted.replace(/\s+/g, " ");

  // Ensure proper spacing around operators
  formatted = formatted.replace(/([=+\-*/])/g, " $1 ");

  // Remove whitespace between function name and parenthesis
  formatted = formatted.replace(/(\\[a-zA-Z]+) *\{/g, "$1{");

  // Fix common LaTeX errors
  // Missing braces in subscripts and superscripts
  formatted = formatted.replace(/\_([a-zA-Z0-9])(?![a-zA-Z0-9\}])/g, "_{$1}");
  formatted = formatted.replace(/\^([a-zA-Z0-9])(?![a-zA-Z0-9\}])/g, "^{$1}");

  // Fix fractions without braces
  formatted = formatted.replace(/\\frac([0-9])([0-9])/g, "\\frac{$1}{$2}");

  return formatted;
};
