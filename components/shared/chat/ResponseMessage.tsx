import ParagraphEditor from "@/components/ParagraphEditor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Message, ParagraphData, Section, Sentence } from "@/lib/types";
import { Editor } from "@tiptap/react";
import DOMPurify from "dompurify";
import { motion } from "framer-motion";
import { renderToString } from "katex";
import "katex/dist/katex.min.css";
import { Edit2, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import React, { ComponentProps, ReactNode, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

interface ResponseProps {
  msg: Message;
  handleSectionClick: (section: Section) => void;
  onEdit: () => void;
  onDelete: () => void;
  onSave: (data: any, index: number) => void;
  handleParagraphSave: (
    data: ParagraphData,
    index: number,
    sectionIndex: number
  ) => void;
  index: number;
  sectionNumber: number;
  totalSections: number;
}

// Dynamically import the TipTap editor to avoid SSR issues
const RichTextEditor = dynamic(() => import("@/components/rich-text-editor"), {
  ssr: false,
  loading: () => (
    <div className="p-4 bg-gray-50 rounded-md">Loading editor...</div>
  ),
});

// Enhanced function to handle both bold (**) and italic ($$) markdown formatting
const formatTextWithMarkdown = (text: string): React.ReactNode => {
  // Check if we have any markdown formatting to process
  if (!text.includes("**") && !text.includes("$$")) {
    return text;
  }

  // Process both bold and italic markdown
  const segments: Array<{
    text: string;
    isBold: boolean;
    isItalic: boolean;
  }> = [];

  // First, split the text by bold markers
  let currentText = text;
  let boldMatch: RegExpExecArray | null;
  const boldRegex = /\*\*([^*]+)\*\*/g;

  // Keep track of positions to avoid overlap issues
  let lastBoldEnd = 0;
  let normalTextStart = 0;

  // Process bold formatting first
  while ((boldMatch = boldRegex.exec(currentText)) !== null) {
    // Add any normal text before this bold match
    if (boldMatch.index > normalTextStart) {
      segments.push({
        text: currentText.substring(normalTextStart, boldMatch.index),
        isBold: false,
        isItalic: false,
      });
    }

    // Add the bold text
    segments.push({
      text: boldMatch[1], // The content inside ** marks
      isBold: true,
      isItalic: false,
    });

    // Update our position trackers
    normalTextStart = boldMatch.index + boldMatch[0].length;
    lastBoldEnd = normalTextStart;
  }

  // Add any remaining text after the last bold match
  if (normalTextStart < currentText.length) {
    segments.push({
      text: currentText.substring(normalTextStart),
      isBold: false,
      isItalic: false,
    });
  }

  // Now process italic formatting within each segment
  const processedSegments: Array<{
    text: string;
    isBold: boolean;
    isItalic: boolean;
  }> = [];

  for (const segment of segments) {
    // Only process non-bold segments for italic, or we already have bold segments
    if (!segment.text.includes("$$")) {
      processedSegments.push(segment);
      continue;
    }

    // For segments with potential italic formatting
    let italicText = segment.text;
    let italicMatch: RegExpExecArray | null;
    const italicRegex = /\$\$([^$]+)\$\$/g;
    let italicStart = 0;

    while ((italicMatch = italicRegex.exec(italicText)) !== null) {
      // Add any text before this italic match
      if (italicMatch.index > italicStart) {
        processedSegments.push({
          text: italicText.substring(italicStart, italicMatch.index),
          isBold: segment.isBold,
          isItalic: false,
        });
      }

      // Add the italic text
      processedSegments.push({
        text: italicMatch[1], // The content inside $$ marks
        isBold: segment.isBold,
        isItalic: true,
      });

      italicStart = italicMatch.index + italicMatch[0].length;
    }

    // Add any remaining text after the last italic match
    if (italicStart < italicText.length) {
      processedSegments.push({
        text: italicText.substring(italicStart),
        isBold: segment.isBold,
        isItalic: false,
      });
    }
  }

  // Debug logging
  console.log("Markdown processed segments:", processedSegments);

  // Convert the segments to React elements
  if (processedSegments.length === 0) {
    return text; // Return original if no formatting
  }

  return processedSegments.map((segment, index) => {
    let content = segment.text;

    // Apply formatting based on flags
    if (segment.isBold && segment.isItalic) {
      return (
        <strong key={index}>
          <em>{content}</em>
        </strong>
      );
    } else if (segment.isBold) {
      return <strong key={index}>{content}</strong>;
    } else if (segment.isItalic) {
      return <em key={index}>{content}</em>;
    } else {
      return <span key={index}>{content}</span>;
    }
  });
};

// Add a styles component for math equations
const MathEquationStyles = () => (
  <style jsx global>{`
    /* Base KaTeX styling */
    .katex {
      font-size: 1.1em !important;
      font-family: KaTeX_Main, "Times New Roman", serif !important;
    }

    /* Ensure proper spacing in math expressions */
    .katex .mord,
    .katex .mbin,
    .katex .mrel,
    .katex .mopen,
    .katex .mclose,
    .katex .mpunct,
    .katex .minner {
      margin-left: 0.0667em;
      margin-right: 0.0667em;
    }

    /* Improve display math formatting */
    .katex-display {
      padding: 0.8rem;
      margin: 1.2rem 0;
      background-color: rgba(148, 179, 71, 0.05);
      border: 1px solid rgba(148, 179, 71, 0.2);
      border-radius: 0.375rem;
      overflow-x: auto;
      text-align: center;
      white-space: normal; /* Allow breaking to new lines */
      max-width: 100%; /* Ensure doesn't overflow container */
    }

    /* Fix for fractions to ensure proper spacing */
    .katex .mfrac .frac-line {
      border-bottom-width: 0.04em;
    }

    /* Improve spacing around operators */
    .katex .mbin {
      margin-left: 0.22em;
      margin-right: 0.22em;
    }

    /* Improve spacing for subscripts and superscripts */
    .katex .msupsub {
      text-align: left;
    }

    /* Improve inline math visibility */
    .katex-inline {
      padding: 0 0.15rem;
      color: #0a4c79;
      font-weight: bold;
    }

    /* Make sure inline math is properly aligned */
    .prose .math-inline {
      display: inline-flex;
      align-items: center;
    }

    /* Prevent word breaking inside formulas while allowing breaks between parts */
    .formula-block,
    .katex-display {
      overflow-wrap: break-word;
      word-wrap: break-word;
      hyphens: auto;
    }

    /* Formula containers should wrap */
    .px-4.py-3.bg-gray-50 {
      overflow-wrap: break-word;
      word-wrap: break-word;
      white-space: normal;
    }
  `}</style>
);

// The helper function to check for HTML content
const containsHtmlTags = (text: string): boolean => {
  const htmlTagPattern = /<\/?[a-z][\s\S]*?>/i;
  return htmlTagPattern.test(text);
};

// Add a utility function to properly escape/unescape LaTeX
const prepareLatexForRendering = (text: string): string => {
  // First, check if we're dealing with LaTeX content
  if (!text.includes("\\") && !text.includes("$")) return text;

  // Make sure backslashes are properly escaped
  // But don't double-escape already escaped backslashes
  let processed = text.replace(/(?<!\\)\\(?!\\)/g, "\\\\");

  // Make sure dollar signs are present for inline math
  if (processed.includes("\\") && !processed.includes("$")) {
    processed = `$${processed}$`;
  }

  // Handle display math if needed
  if (
    processed.includes("\\begin{equation}") ||
    processed.includes("\\begin{align}")
  ) {
    // If it doesn't already have $$ delimiters and needs them
    if (!processed.startsWith("$$")) {
      processed = `$$${processed}$$`;
    }
  }

  return processed;
};

// Add a function to properly format mangled formulas
const reformatMangledFormula = (text: string): string => {
  // Remove newlines and normalize spaces
  let normalized = text.replace(/\n/g, " ").replace(/\s+/g, " ").trim();

  // Check for specific equation patterns
  if (
    /d\s*=\s*V_0\s*t\s*\+\s*\\frac\{1\}\{2\}\s*a\s*t\^2/i.test(normalized) ||
    /Thisiscommonlyexpressedasd/.test(normalized.replace(/\s+/g, ""))
  ) {
    return "$d = V_0 t + \\frac{1}{2} a t^{2}$";
  }

  if (/V_f\^2\s*=\s*V_0\^2\s*\+\s*2ad/i.test(normalized)) {
    return "$V_f^{2} = V_0^{2} + 2ad$";
  }

  // Fix common physics variables
  normalized = normalized
    .replace(/\b(v|V)_0\b/g, "V_0")
    .replace(/\b(v|V)_f\b/g, "V_f")
    .replace(/\bd\b(?!\w)/g, "d") // standalone d
    .replace(/\ba\b(?!\w)/g, "a") // standalone a
    .replace(/\bt\b(?!\w)/g, "t") // standalone t

    // Fix spacing around operators
    .replace(/(\w+)\s*=\s*(\w+)/g, "$1 = $2")
    .replace(/(\w+)\s*\+\s*(\w+)/g, "$1 + $2")
    .replace(/(\w+)\s*-\s*(\w+)/g, "$1 - $2")
    .replace(/(\w+)\s*\*\s*(\w+)/g, "$1 * $2")

    // Fix fractions
    .replace(/\\frac\s*\{\s*1\s*\}\s*\{\s*2\s*\}/g, "\\frac{1}{2}")

    // Fix powers
    .replace(/\^\s*(\d+)/g, "^{$1}")
    .replace(/\^2/g, "^{2}");

  // Ensure proper LaTeX delimiters
  if (!normalized.startsWith("$")) normalized = `$${normalized}`;
  if (!normalized.endsWith("$")) normalized = `${normalized}$`;

  return normalized;
};

// Update the formula detection to catch mangled formulas
const isPotentialMathContent = (text: string): boolean => {
  // Original checks
  const mathPatterns = [
    /\\frac\{/, // Fractions
    /\\sqrt\{/, // Square roots
    /\\sum_/, // Summations
    /\\int/, // Integrals
    /\\alpha|\\beta|\\gamma|\\theta/, // Greek letters
    /[a-zA-Z]_\{[a-zA-Z0-9]+\}/, // Subscripts
    /[a-zA-Z]\^\{[a-zA-Z0-9]+\}/, // Superscripts
    /\\mathbb\{[A-Z]\}/, // Special math fonts
    /\\text\{/, // Text in math mode
    /\\begin\{[a-z]+\}/, // Math environments
  ];

  // Add check for mangled formulas (characters separated by newlines)
  const isMangledFormula =
    /\n\s*[a-zA-Z0-9_]\s*\n/.test(text) &&
    /[Vd]\s*[_=]\s*\d/.test(text.replace(/\n/g, ""));

  return mathPatterns.some((pattern) => pattern.test(text)) || isMangledFormula;
};

// Update the cleanFormulaContent function to match the one in chat route
const cleanFormulaContent = (text: string): string => {
  // Check if the text is likely a mangled formula
  if (/\n\s*[a-zA-Z0-9_]\s*\n/.test(text)) {
    // Remove newlines and normalize spaces
    let cleaned = text.replace(/\n/g, " ").replace(/\s+/g, " ").trim();

    // Add delimiters if missing
    if (!cleaned.startsWith("$")) cleaned = `$${cleaned}`;
    if (!cleaned.endsWith("$")) cleaned = `${cleaned}$`;

    // Fix common physics equations
    cleaned = cleaned
      // Fix spacing around operators
      .replace(/(\w+)=(\w+)/g, "$1 = $2")
      .replace(/(\w+)\+(\w+)/g, "$1 + $2")
      .replace(/(\w+)-(\w+)/g, "$1 - $2")
      // Fix subscripts
      .replace(/V0/g, "V_0")
      .replace(/Vf/g, "V_f");

    return cleaned;
  }

  return text;
};

// Add this helper function
const containsInlineMath = (text: string): boolean => {
  // Look for patterns like $...$ that contain LaTeX
  return /\$[^$]+\$/g.test(text);
};

// For complex formulas, use direct KaTeX rendering
const renderComplexFormula = (formula: string): string => {
  try {
    // Remove $ delimiters if present
    const cleanFormula = formula.replace(/^\$|\$$/g, "");

    // Render to HTML string
    return renderToString(cleanFormula, {
      displayMode: true,
      throwOnError: false,
      output: "html",
    });
  } catch (error) {
    console.error("Error rendering formula:", error);
    return `<span class="text-red-500">Error rendering formula: ${formula}</span>`;
  }
};

// Update EditorStyles function with better heading differentiation
const EditorStyles = () => (
  <style jsx global>{`
    /* Editor-specific styling to highlight formatting */
    .editor-content strong,
    .editor-content b,
    .ProseMirror strong,
    .ProseMirror b {
      font-weight: 700 !important;
      color: #000 !important;
    }

    .editor-content em,
    .editor-content i,
    .ProseMirror em,
    .ProseMirror i {
      font-style: italic !important;
      color: #000 !important;
    }

    /* Update heading styles with better hierarchy */
    .editor-content h1,
    .ProseMirror h1 {
      font-size: 1.8em !important;
      font-weight: 700 !important;
      margin: 1.2em 0 0.6em !important;
      color: #94b347 !important; /* Green color for h1 */
      line-height: 1.3 !important;
    }

    .editor-content h2,
    .ProseMirror h2 {
      font-size: 1.5em !important;
      font-weight: 600 !important;
      margin: 1em 0 0.5em !important;
      color: #333 !important;
      line-height: 1.4 !important;
    }

    .editor-content h3,
    .ProseMirror h3 {
      font-size: 1.3em !important;
      font-weight: bold !important;
      margin: 0.8em 0 0.4em !important;
      color: #444 !important;
      line-height: 1.4 !important;
    }

    .editor-content p,
    .ProseMirror p {
      margin: 0.5em 0 !important;
    }

    .editor-content [style*="text-align: center"],
    .ProseMirror [style*="text-align: center"] {
      text-align: center !important;
    }

    .editor-content [style*="text-align: right"],
    .ProseMirror [style*="text-align: right"] {
      text-align: right !important;
    }

    /* Lists styling */
    .editor-content ul,
    .ProseMirror ul {
      list-style-type: disc !important;
      padding-left: 1.5em !important;
      margin: 0.5em 0 !important;
    }

    .editor-content ol,
    .ProseMirror ol {
      list-style-type: decimal !important;
      padding-left: 1.5em !important;
      margin: 0.5em 0 !important;
    }

    .editor-content li,
    .ProseMirror li {
      margin: 0.25em 0 !important;
    }

    .editor-content .formula,
    .ProseMirror .formula {
      background-color: #f5f7fa !important;
      padding: 0.5em !important;
      border-radius: 0.25em !important;
      margin: 0.5em 0 !important;
    }

    /* Make sure formatting is clearly visible */
    .prose strong,
    b {
      font-weight: 700 !important;
    }

    .prose em,
    i {
      font-style: italic !important;
    }

    /* Apply heading styles in the output content as well */
    .prose h1 {
      font-size: 1.8em !important;
      font-weight: 700 !important;
      color: #94b347 !important;
      margin: 1.2em 0 0.6em !important;
    }

    .prose h2 {
      font-size: 1.5em !important;
      font-weight: 600 !important;
      color: #333 !important;
      margin: 1em 0 0.5em !important;
    }

    .prose h3 {
      font-size: 1.3em !important;
      font-weight: bold !important;
      color: #444 !important;
      margin: 0.8em 0 0.4em !important;
    }
  `}</style>
);

export const ResponseMessage = ({
  msg,
  handleSectionClick,
  onEdit,
  onDelete,
  onSave,
  handleParagraphSave,
  index,
  sectionNumber,
  totalSections,
}: ResponseProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [editorContent, setEditorContent] = useState("");
  const [editorInitialized, setEditorInitialized] = useState(false);

  // Add effect to trigger animation after component mounts
  useEffect(() => {
    // Small delay to ensure the animation is noticeable
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // At the start of your component, add this logging
  useEffect(() => {
    // Log the message data when the component mounts
    if (typeof msg.text !== "string" && msg.text[0]) {
      console.log("SECTION_RECEIVED:", {
        title: msg.text[0].title,
        sentenceCount: msg.text[0].sentences?.length || 0,
        sentenceSample: msg.text[0].sentences?.slice(0, 2) || [],
        hasValidSentences: msg.text[0].sentences?.every(
          (s) =>
            s &&
            typeof s.id === "number" &&
            typeof s.text === "string" &&
            s.text.trim() !== ""
        ),
      });
    }
  }, [msg]);

  // Update the function to handle list formatting better
  const sectionToHtml = (section: Section): string => {
    if (!section || !section.sentences || section.sentences.length === 0) {
      return "<p>No content available</p>";
    }

    let html = `<h2>${section.title}</h2>`;
    let currentListType: string | null = null;
    let listItems = "";

    console.log("Converting section to HTML:", {
      title: section.title,
      sentenceCount: section.sentences.length,
    });

    section.sentences.forEach((sentence) => {
      const format = sentence.format || "paragraph";
      const text = sentence.text;
      const align = sentence.align || null;

      // Create style attribute for alignment if present
      const alignStyle = align ? ` style="text-align: ${align};"` : "";

      // Handle list grouping
      if (format === "bullet" || format === "numbered") {
        // If we don't have a list started, or we're changing list types
        if (currentListType !== format) {
          // Close previous list if exists
          if (currentListType) {
            html += listItems;
            html += currentListType === "bullet" ? "</ul>" : "</ol>";
            listItems = "";
          }

          // Start new list
          currentListType = format;
          const listTag = format === "bullet" ? "ul" : "ol";
          const listClass =
            format === "bullet"
              ? "bullet-list-container"
              : "ordered-list-container";
          html += `<${listTag} class="${listClass}"${alignStyle}>`;
        }

        // Add list item with alignment if needed
        // For numbered lists, ensure we add the proper data attributes to preserve numbering
        const listItemAttrs =
          format === "numbered"
            ? ` class="list-item" data-list-type="ordered"${alignStyle}`
            : ` class="list-item"${alignStyle}`;

        listItems += `<li${listItemAttrs}>${text}</li>`;
      } else {
        // If we were in a list, close it
        if (currentListType) {
          html += listItems;
          html += currentListType === "bullet" ? "</ul>" : "</ol>";
          currentListType = null;
          listItems = "";
        }

        // Handle nested formatting
        if (format === "rich-text") {
          // For rich-text format, use the HTML content directly
          html += `<div${alignStyle}>${text}</div>`;
        } else {
          // Handle other formats with proper HTML tags and alignment
          switch (format) {
            case "h1":
              html += `<h1${alignStyle}>${text}</h1>`;
              break;
            case "h2":
              html += `<h2${alignStyle}>${text}</h2>`;
              break;
            case "heading":
              html += `<h3${alignStyle}>${text}</h3>`;
              break;
            case "formula":
              html += `<div class="formula p-3 bg-gray-50 rounded my-3"${alignStyle}>${text}</div>`;
              break;
            case "italic":
            case "em":
              // Handle special case where text already has $$ markup
              if (text.includes("$$")) {
                html += `<p${alignStyle}>${text}</p>`;
              } else {
                html += `<p${alignStyle}><em>${text}</em></p>`;
              }
              break;
            case "bold":
              // Handle special case where text already has ** markup
              if (text.includes("**")) {
                html += `<p${alignStyle}>${text}</p>`;
              } else {
                html += `<p${alignStyle}><strong>${text}</strong></p>`;
              }
              break;
            default: // paragraph
              // Check if text contains markdown formatting that should be preserved
              if (text.includes("**") || text.includes("$$")) {
                // Process markdown in paragraphs but preserve the original markup
                html += `<p${alignStyle}>${text}</p>`;
              } else {
                html += `<p${alignStyle}>${text}</p>`;
              }
          }
        }
      }
    });

    // Close any open list
    if (currentListType) {
      html += listItems;
      html += currentListType === "bullet" ? "</ul>" : "</ol>";
    }

    // Log for debugging
    console.log("Generated HTML for editor:", html.substring(0, 200) + "...");

    // Sanitize HTML to prevent XSS
    return DOMPurify.sanitize(html, {
      ADD_ATTR: ["data-list-type"], // Allow our custom data attributes
    });
  };

  // Add a function to convert HTML back to a section structure
  const htmlToSection = (html: string, originalSection: Section): Section => {
    // Create a temporary DOM element to parse the HTML
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = DOMPurify.sanitize(html);

    console.log("Parsing HTML:", tempDiv.innerHTML);

    // Extract title from the first h2, or keep original if not found
    const titleElement = tempDiv.querySelector("h2");
    const title = titleElement
      ? titleElement.textContent || originalSection.title
      : originalSection.title;

    // Remove the title element as we've already processed it
    if (titleElement) {
      titleElement.remove();
    }

    // Initialize sentences array
    const sentences: Sentence[] = [];
    let sentenceId = 1;

    // Helper function to detect if paragraph contains partial formatting
    const hasPartialFormatting = (node: Element): boolean => {
      // If no formatting elements exist, it can't be partially formatted
      if (!node.querySelector("strong, em, b, i")) return false;

      // Get total text length
      const totalText = node.textContent || "";
      if (!totalText.trim()) return false;

      // Get total length of formatted text
      const boldElements = Array.from(node.querySelectorAll("strong, b"));
      const italicElements = Array.from(node.querySelectorAll("em, i"));

      // Check if any bold or italic element doesn't contain the entire text
      for (const el of [...boldElements, ...italicElements]) {
        const formattedText = el.textContent || "";
        if (formattedText.length < totalText.length) {
          return true; // Found partial formatting
        }
      }

      // Check for direct text nodes mixed with formatted elements
      let hasDirectTextNode = false;
      node.childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
          hasDirectTextNode = true;
        }
      });

      return hasDirectTextNode;
    };

    // Process all elements
    const processNode = (node: Element) => {
      // Skip already processed nodes
      if (node.getAttribute("data-processed") === "true") {
        return;
      }

      const tagName = node.tagName.toLowerCase();
      const style = node.getAttribute("style") || "";
      const textAlign =
        style.match(/text-align:\s*(center|right|left)/i)?.[1] || null;

      // Handle different element types
      switch (tagName) {
        case "h1":
          sentences.push({
            id: sentenceId++,
            text: node.textContent?.trim() || "",
            format: "h1",
            align: textAlign || undefined,
          });
          break;
        case "h2":
          sentences.push({
            id: sentenceId++,
            text: node.textContent?.trim() || "",
            format: "h2",
            align: textAlign || undefined,
          });
          break;
        case "h3":
          sentences.push({
            id: sentenceId++,
            text: node.textContent?.trim() || "",
            format: "heading",
            align: textAlign || undefined,
          });
          break;
        case "ul":
          Array.from(node.querySelectorAll("li")).forEach((li) => {
            // Check for complex formatting within list items
            if (hasNestedFormatting(li)) {
              sentences.push({
                id: sentenceId++,
                text: li.innerHTML,
                format: "rich-text",
                align: textAlign || undefined,
              });
            } else {
              sentences.push({
                id: sentenceId++,
                text: li.textContent?.trim() || "",
                format: "bullet",
                align: textAlign || undefined,
              });
            }
          });
          return; // Skip further processing for this element
        case "ol":
          Array.from(node.querySelectorAll("li")).forEach((li) => {
            // Check for complex formatting within list items
            if (hasNestedFormatting(li)) {
              sentences.push({
                id: sentenceId++,
                text: li.innerHTML,
                format: "rich-text",
                align: textAlign || undefined,
              });
            } else {
              sentences.push({
                id: sentenceId++,
                text: li.textContent?.trim() || "",
                format: "numbered",
                align: textAlign || undefined,
              });
            }
          });
          return; // Skip further processing for this element
        case "div":
          if (node.classList.contains("formula")) {
            sentences.push({
              id: sentenceId++,
              text: node.textContent?.trim() || "",
              format: "formula",
            });
          } else {
            // Process div with possible formatting
            processFormattedContent(node, textAlign);
          }
          break;
        case "p":
          // Check if paragraph has mixed formatting (some words bold/italic but not all)
          if (hasPartialFormatting(node)) {
            // Use rich-text format to preserve exact HTML
            console.log(
              "Detected partial formatting in paragraph:",
              node.innerHTML.substring(0, 50)
            );
            sentences.push({
              id: sentenceId++,
              text: node.innerHTML,
              format: "rich-text",
              align: textAlign || undefined,
            });
          } else {
            processFormattedContent(node, textAlign);
          }
          break;
        default:
          // For other elements, process children
          Array.from(node.children).forEach((child) => {
            if (child instanceof Element) {
              processNode(child);
            }
          });

          // If node has text but no processed children, add as paragraph
          if (
            !node.getAttribute("data-processed") &&
            node.textContent?.trim() &&
            !Array.from(node.children).some(
              (c) => c.getAttribute("data-processed") === "true"
            )
          ) {
            sentences.push({
              id: sentenceId++,
              text: node.textContent.trim(),
              format: "paragraph",
            });
          }
      }

      // Mark as processed
      node.setAttribute("data-processed", "true");
    };

    // Improve the processFormattedContent function to better detect italic text
    const processFormattedContent = (
      node: Element,
      textAlign: string | null
    ) => {
      // First check if the node itself is an italic or emphasis element
      const isDirectItalic =
        node.tagName.toLowerCase() === "em" ||
        node.tagName.toLowerCase() === "i";

      // Check for em/italic direct children or if the node itself is italic
      const hasEm =
        isDirectItalic ||
        node.querySelector(":scope > em, :scope > i") !== null;

      // Check for strong/bold direct children or if the node itself is bold
      const isDirectBold =
        node.tagName.toLowerCase() === "strong" ||
        node.tagName.toLowerCase() === "b";
      const hasStrong =
        isDirectBold ||
        node.querySelector(":scope > strong, :scope > b") !== null;

      // Check for mixed formatting (e.g., bold text within italic or vice versa)
      const hasNestedFormatting =
        (isDirectItalic && node.querySelector("strong, b") !== null) ||
        (isDirectBold && node.querySelector("em, i") !== null) ||
        node.innerHTML.includes("<strong><em>") ||
        node.innerHTML.includes("<em><strong>");

      // Check if any formatting doesn't cover the entire text
      const hasPartial = hasPartialFormatting(node);

      // Check for nested markdown formatting
      const textContent = node.textContent?.trim() || "";

      if (!textContent) return;

      // Check for markdown-style formatting
      const hasBoldMarkdown = textContent.includes("**");
      const hasItalicMarkdown = textContent.includes("$$");
      const hasNestedMarkdown = hasBoldMarkdown && hasItalicMarkdown;

      // Determine the format based on the content and HTML structure
      let format = "paragraph";

      // Store full HTML content for nested formatting
      let htmlContent = "";

      if (hasNestedFormatting || hasNestedMarkdown || hasPartial) {
        // For mixed formatting, preserve the full HTML structure
        format = "rich-text";
        htmlContent = node.innerHTML;
      } else if (hasStrong || hasBoldMarkdown) {
        format = "bold";
      } else if (hasEm || hasItalicMarkdown) {
        format = "italic";
      }

      console.log("Format detection:", {
        format,
        text: textContent.substring(0, 30),
        isDirectItalic,
        hasEm,
        hasItalicMarkdown,
        isDirectBold,
        hasStrong,
        hasBoldMarkdown,
        hasNestedFormatting,
        hasNestedMarkdown,
        hasPartialFormatting: hasPartial,
      });

      // Add the properly formatted sentence
      sentences.push({
        id: sentenceId++,
        text: format === "rich-text" ? htmlContent : textContent,
        format: format as
          | "bold"
          | "heading"
          | "italic"
          | "paragraph"
          | "bullet"
          | "numbered"
          | "formula"
          | "rich-text",
        align: textAlign || undefined,
      });

      node.setAttribute("data-processed", "true");
    };

    // Process all direct children of the div
    Array.from(tempDiv.children).forEach((node) => {
      if (node instanceof Element) {
        processNode(node);
      }
    });

    console.log("Generated sentences:", sentences);

    return {
      title,
      sentences: sentences.length > 0 ? sentences : originalSection.sentences,
    };
  };

  const handleEditClick = () => {
    if (typeof msg.text !== "string" && msg.text[0]) {
      // Convert section to HTML for the editor
      const html = sectionToHtml(msg.text[0]);
      setEditorContent(html);
      setIsEditing(true);
      onEdit(); // Call the parent's onEdit handler
    }
  };

  const handleSaveEdit = () => {
    if (typeof msg.text !== "string" && msg.text[0]) {
      try {
        // Debug logging before conversion
        console.log("Editor content before conversion:", editorContent);

        // Save what's currently in the editor for debugging
        const debugDiv = document.createElement("div");
        debugDiv.innerHTML = editorContent;
        console.log("Parsed editor DOM:", debugDiv);

        // Convert the HTML back to a section structure
        const updatedSection = htmlToSection(editorContent, msg.text[0]);

        // Debug logging after conversion - check for rich-text content
        const richTextSentences = updatedSection.sentences
          .filter((s) => s.format === "rich-text")
          .map((s) => ({
            id: s.id,
            preview: s.text.substring(0, 50) + "...",
            isPartiallyFormatted:
              s.text.includes("<strong>") && !s.text.startsWith("<strong>"),
          }));

        console.log("Rich-text formatting check:", {
          hasRichTextContent: richTextSentences.length > 0,
          richTextSentences,
        });

        console.log(
          "Format preservation check:",
          updatedSection.sentences.map((s) => ({
            text: s.text.substring(0, 30),
            format: s.format,
            align: s.align,
          }))
        );

        // Create updated message
        const updatedMessage = {
          user: "AI",
          text: [updatedSection],
          files: msg.files || [],
          fileMetadata: msg.fileMetadata || [],
        };

        // Save the updated content
        onSave(updatedMessage, index);
        setIsEditing(false);
      } catch (error) {
        console.error("Error saving edited content:", error);
        alert("There was an error saving your changes. Please try again.");
      }
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  // Animation variants for framer-motion
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  };

  // Content animation variants (staggered children)
  const contentAnimation = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemAnimation = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 },
    },
  };

  // Handler for editor content change
  const handleEditorUpdate = (html: string) => {
    setEditorContent(html);
  };

  const handleRegenerateSection = async () => {
    try {
      // Show loading state
      const updatedSection = {
        ...section,
        sentences: [
          {
            id: 1,
            text: "Regenerating content...",
            format: "paragraph",
          },
        ],
      };

      // Update the section temporarily to show loading
      onSave(
        {
          user: "AI",
          text: [updatedSection],
        },
        index
      );

      // Now call your API to regenerate just this section
      const response = await fetch("/api/regenerate-section", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: section.title,
          // Send any additional context needed
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to regenerate section");
      }

      const newSection = await response.json();

      // Update with the new content
      onSave(
        {
          user: "AI",
          text: [newSection.section],
        },
        index
      );
    } catch (error) {
      console.error("Error regenerating section:", error);
      // Show error state
      const errorSection = {
        ...section,
        sentences: [
          {
            id: 1,
            text: "Failed to regenerate. Please try again.",
            format: "paragraph",
          },
        ],
      };

      onSave(
        {
          user: "AI",
          text: [errorSection],
        },
        index
      );
    }
  };

  if (typeof msg.text === "string") {
    return (
      <motion.div
        className="md:p-2 rounded mb-2"
        initial="hidden"
        animate={isVisible ? "visible" : "hidden"}
        variants={fadeIn}
      >
        <div className="text-sm">
          <div className="bg-white p-2 md:p-4 rounded-2xl transition-colors">
            <p className="text-gray-800 whitespace-normal break-words">
              {msg.text}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Now msg.text will be a single section
  let section = msg.text[0];

  if (isEditing) {
    return (
      <div className="md:p-2 rounded mb-2">
        {/* Add the editor styles */}
        <EditorStyles />

        <div className="p-3 md:p-5 rounded-2xl transition-colors bg-white shadow-lg border border-gray-100">
          <div className="mb-4">
            <h3 className="text-lg md:text-xl font-bold text-[#94b347] mb-4">
              Editing: {section.title}
            </h3>

            <RichTextEditor
              initialContent={editorContent}
              onChange={setEditorContent}
              className="min-h-[300px] border border-gray-200 rounded-md mb-4"
            />

            {process.env.NODE_ENV === "development" && (
              <div className="mt-4 p-3 border border-gray-200 rounded-md">
                <details>
                  <summary className="text-sm text-gray-500 font-medium">
                    HTML Debug
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-50 text-xs text-gray-700 overflow-auto max-h-[200px] rounded">
                    {editorContent}
                  </pre>
                </details>
              </div>
            )}

            <div className="flex justify-end space-x-3 mt-4">
              <Button
                onClick={handleCancelEdit}
                variant="outline"
                className="border-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                className="bg-[#94b347] hover:bg-[#7a9639] text-white"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (section.sentences?.some((s) => s.text.includes("properly formatted"))) {
    console.log("MALFORMED_SECTION_DETECTED:", {
      section,
      sentencesWithIssues: section.sentences
        ?.filter((s) => s.text.includes("properly formatted"))
        ?.map((s) => ({ id: s.id, text: s.text })),
    });

    return (
      <motion.div className="md:p-2 rounded mb-2">
        <div className="p-3 md:p-5 rounded-2xl transition-colors bg-white shadow-lg border border-gray-100">
          <div className="flex flex-row gap-2 md:gap-0 justify-between items-start mb-4">
            <h3 className="text-lg md:text-xl font-bold text-[#94b347]">
              {section.title || "Section Error"}
            </h3>
          </div>
          <div className="bg-red-50 p-4 rounded-md text-red-600 mb-4">
            <p>This section couldn't be properly formatted.</p>
            <div className="flex gap-2 mt-3">
              <Button
                onClick={handleRegenerateSection}
                className="bg-red-100 hover:bg-red-200 text-red-700 rounded"
              >
                Regenerate Section
              </Button>
              <Button
                onClick={() => {
                  // Call the debug endpoint
                  fetch("/api/debug-section", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ section }),
                  })
                    .then((res) => res.json())
                    .then((data) => {
                      console.log("SECTION_DEBUG_RESULT:", data);
                      if (data.success && data.fixedSection) {
                        onSave(
                          {
                            user: "AI",
                            text: [data.fixedSection],
                          },
                          index
                        );
                      }
                    })
                    .catch((err) => console.error("Debug error:", err));
                }}
                className="bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
              >
                Attempt Fix
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="md:p-2 rounded mb-2"
      initial="hidden"
      animate={isVisible ? "visible" : "hidden"}
      variants={fadeIn}
    >
      {/* Add the math styles */}
      <MathEquationStyles />

      {/* Add the editor styles to ensure formatting is visible */}
      <EditorStyles />

      <div className="p-3 md:p-5 rounded-2xl transition-colors bg-white shadow-lg border border-gray-100">
        <div className="flex flex-row gap-2 md:gap-0 justify-between items-start mb-4">
          <motion.div
            className="flex items-center gap-2"
            variants={itemAnimation}
          >
            {/* Display section number beside the title */}
            <motion.h3
              className="text-lg md:text-xl font-bold text-[#94b347] hover:text-[#7a9639] cursor-pointer break-words flex items-center"
              onClick={() => handleSectionClick(section)}
            >
              <span className="inline-flex items-center justify-center bg-[#94b347]/10 text-[#94b347] text-sm font-medium rounded-full h-6 w-6 mr-2 flex-shrink-0">
                {sectionNumber}
              </span>
              {section.title}
            </motion.h3>
          </motion.div>
          <motion.div className="flex gap-6" variants={itemAnimation}>
            <Button
              onClick={handleEditClick}
              variant="ghost"
              size="sm"
              className="text-slate-400 rounded-full border border-slate-400 hover:bg-slate-100 w-8 h-8"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="border rounded-full border-red-600 text-red-600 hover:text-red-700 hover:bg-red-100 w-8 h-8"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-white p-6 max-w-sm rounded-lg">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Section</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this section? This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex flex-row gap-2 justify-between items-center">
                  <AlertDialogCancel className="bg-slate-50 border border-slate-300 hover:bg-slate-100 rounded-full">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDelete}
                    className="bg-red-600 text-white hover:bg-red-700 rounded-full"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </motion.div>
        </div>
        <motion.div className="space-y-4" variants={contentAnimation}>
          {/* Group consecutive paragraphs for better readability */}
          {(() => {
            let currentListType: string | null = null;
            let listItems: React.ReactElement[] = [];
            let result: React.ReactElement[] = [];
            let key = 0;
            let isSummarySection = false;

            // Update the safety check to be more resilient and provide helpful debugging
            if (
              !section ||
              !section.sentences ||
              !Array.isArray(section.sentences)
            ) {
              console.error("Invalid section data:", section);

              // If we have a section but no sentences, create a default sentence
              if (
                section &&
                (!section.sentences ||
                  !Array.isArray(section.sentences) ||
                  section.sentences.length === 0)
              ) {
                // Create a fallback section with a default sentence
                const fallbackSection = {
                  ...section,
                  title: section.title || "Content",
                  sentences: [
                    {
                      id: 1,
                      text:
                        typeof section.sentences === "string"
                          ? section.sentences
                          : "The content couldn't be properly formatted. Please try regenerating this section.",
                      format: "paragraph",
                    },
                  ],
                };

                // Continue rendering with this fallback section
                section = fallbackSection as Section;
              } else {
                // If we don't have enough data to create a fallback, show the error message
                return (
                  <motion.div
                    key="error-message"
                    className="rounded-md p-3 bg-red-50 text-red-600 border border-red-200"
                    variants={itemAnimation}
                  >
                    <p>
                      This section is missing or has invalid content. Please try
                      reloading or generating a new response.
                    </p>
                    <button
                      className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm"
                      onClick={() =>
                        console.log("Section data:", JSON.stringify(section))
                      }
                    >
                      Debug Info
                    </button>
                  </motion.div>
                );
              }
            }

            section.sentences.forEach((sentence, sentenceIdx) => {
              const format = sentence.format || "paragraph";

              // Check if we're entering a summary section
              if (
                format === "heading" &&
                (sentence.text.toLowerCase().includes("summary") ||
                  sentence.text.toLowerCase().includes("key points"))
              ) {
                isSummarySection = true;
              }

              // Handle list grouping
              if (format === "bullet" || format === "numbered") {
                // If we're starting a new list or changing list types
                if (currentListType !== format) {
                  // Flush any existing list
                  if (listItems.length > 0) {
                    result.push(
                      <motion.div
                        key={`list-${key++}`}
                        className="my-3"
                        variants={itemAnimation}
                      >
                        {currentListType === "bullet" ? (
                          <ul className="list-disc pl-6 space-y-2">
                            {listItems}
                          </ul>
                        ) : (
                          <ol className="list-decimal pl-6 space-y-2">
                            {listItems}
                          </ol>
                        )}
                      </motion.div>
                    );
                    listItems = [];
                  }
                  currentListType = format;
                }

                // Add to current list with enhanced formatting support
                listItems.push(
                  <motion.li
                    key={`item-${sentenceIdx}`}
                    className={`text-gray-800 text-sm md:text-base text-left whitespace-normal break-words leading-relaxed ${
                      isSummarySection ? "font-medium" : ""
                    }`}
                    variants={itemAnimation}
                  >
                    {sentence.format === "rich-text" ? (
                      // For rich formatted list items, use dangerouslySetInnerHTML
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: sentence.text }}
                      />
                    ) : (
                      // For regular list items, use the existing ReactMarkdown approach
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkMath, remarkGfm]}
                          rehypePlugins={[rehypeRaw, rehypeKatex]}
                          components={{
                            code: ({
                              className,
                              children,
                              ...props
                            }: ComponentProps<"code"> & {
                              className?: string;
                            }) => {
                              const match = /language-(\w+)/.exec(
                                className || ""
                              );
                              const isInline = !match;

                              return isInline ? (
                                <code
                                  className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono"
                                  {...props}
                                >
                                  {children}
                                </code>
                              ) : (
                                <code
                                  className="block bg-gray-100 p-2 rounded text-sm font-mono overflow-x-auto my-2"
                                  {...props}
                                >
                                  {children}
                                </code>
                              );
                            },
                            // Special handler for paragraphs with math
                            p: ({ children }) => {
                              return (
                                <p className="whitespace-normal word-break-normal">
                                  {children}
                                </p>
                              );
                            },
                          }}
                        >
                          {prepareLatexForRendering(sentence.text)}
                        </ReactMarkdown>
                      </div>
                    )}
                  </motion.li>
                );
              } else {
                // If we're ending a list, flush it
                if (listItems.length > 0) {
                  result.push(
                    <motion.div
                      key={`list-${key++}`}
                      className="my-3"
                      variants={itemAnimation}
                    >
                      {currentListType === "bullet" ? (
                        <ul className="list-disc pl-6 space-y-2">
                          {listItems}
                        </ul>
                      ) : (
                        <ol className="list-decimal pl-6 space-y-2">
                          {listItems}
                        </ol>
                      )}
                    </motion.div>
                  );
                  listItems = [];
                  currentListType = null;
                }

                // Handle non-list content with enhanced styling
                let content;
                if (format === "rich-text") {
                  // For rich-text format, preserve all HTML formatting exactly as it is
                  content = (
                    <div
                      className={`text-gray-800 text-sm md:text-base whitespace-normal break-words my-3 leading-relaxed prose prose-sm max-w-none ${
                        isSummarySection ? "text-gray-700" : ""
                      }`}
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(sentence.text, {
                          ADD_ATTR: ["style", "class"],
                          ADD_TAGS: ["span"],
                        }),
                      }}
                    />
                  );
                } else if (format === "formula") {
                  // Check if formula appears to be mangled with newlines or missing delimiters
                  let processedText = cleanFormulaContent(sentence.text);

                  // Additional formula cleaning for edge cases
                  if (!processedText.startsWith("$")) {
                    processedText = `$${processedText}$`;
                  } else if (
                    processedText.startsWith("$$") &&
                    !processedText.endsWith("$$")
                  ) {
                    processedText = `${processedText}$$`;
                  } else if (
                    processedText.startsWith("$") &&
                    !processedText.endsWith("$")
                  ) {
                    processedText = `${processedText}$`;
                  }

                  // For debugging
                  console.log("Rendering formula:", processedText);

                  content = (
                    <div className="px-4 py-3 bg-gray-50 text-gray-800 text-sm md:text-base text-left whitespace-normal break-words overflow-x-auto my-3 rounded-md border border-gray-200">
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkMath, remarkGfm]}
                          rehypePlugins={[rehypeRaw, rehypeKatex]}
                        >
                          {processedText}
                        </ReactMarkdown>
                      </div>
                    </div>
                  );
                } else {
                  // Check for math content that might have lost $ delimiters
                  const hasUnformattedMath = isPotentialMathContent(
                    sentence.text
                  );

                  if (hasUnformattedMath && !sentence.text.includes("$")) {
                    // If we detect math content without delimiters, treat it as a formula
                    content = (
                      <div className="px-4 py-3 bg-gray-50 text-gray-800 text-sm md:text-base text-left whitespace-normal break-words overflow-x-auto my-3 rounded-md border border-gray-200">
                        <div className="prose prose-sm max-words">
                          <ReactMarkdown
                            remarkPlugins={[remarkMath, remarkGfm]}
                            rehypePlugins={[rehypeRaw, rehypeKatex]}
                          >
                            {`$${sentence.text}$`}
                          </ReactMarkdown>
                        </div>
                      </div>
                    );
                  } else {
                    // Detect inline math with a more reliable pattern
                    const hasInlineMath =
                      /\$(?!\$)(.+?)(?<!\$)\$/g.test(sentence.text) ||
                      /\\\((.+?)\\\)/g.test(sentence.text);

                    if (hasInlineMath) {
                      // Process text to ensure proper math spacing
                      const processedText = sentence.text
                        // Ensure proper spacing in inline math
                        .replace(/\$([^$]+)\$/g, (match, formula) => {
                          // Make sure the formula has proper spacing
                          return `$${prepareLatexForRendering(formula).replace(
                            /\$/g,
                            ""
                          )}$`;
                        });

                      content = (
                        <div
                          className={`text-gray-800 text-sm md:text-base text-left whitespace-normal break-words my-3 leading-relaxed ${
                            isSummarySection ? "text-gray-700" : ""
                          }`}
                        >
                          <div className="prose prose-sm max-w-none">
                            <ReactMarkdown
                              remarkPlugins={[remarkMath, remarkGfm]}
                              rehypePlugins={[rehypeRaw, rehypeKatex]}
                            >
                              {processedText}
                            </ReactMarkdown>
                          </div>
                        </div>
                      );
                    } else {
                      // Check for formatting and alignment
                      let className = `text-gray-800 text-sm md:text-base whitespace-normal break-words my-3 leading-relaxed ${
                        isSummarySection ? "text-gray-700" : ""
                      }`;

                      // Apply text alignment if present
                      if (sentence.align) {
                        className += ` text-${sentence.align}`;
                      }

                      // Apply styling based on format
                      if (format === "bold") {
                        // Support both native bold and markdown bold
                        content = (
                          <div className={className}>
                            {sentence.text.includes("**") ? (
                              formatTextWithMarkdown(sentence.text)
                            ) : (
                              <strong>{sentence.text}</strong>
                            )}
                          </div>
                        );
                      } else if (format === "italic" || format === "em") {
                        // Support both native italic and markdown italic
                        content = (
                          <div className={className}>
                            {sentence.text.includes("$$") ? (
                              formatTextWithMarkdown(sentence.text)
                            ) : (
                              <em>{sentence.text}</em>
                            )}
                          </div>
                        );
                      } else if (format === "h1") {
                        content = (
                          <h1
                            className={`text-2xl font-bold text-[#94b347] ${className}`}
                          >
                            {sentence.text}
                          </h1>
                        );
                      } else if (format === "h2") {
                        content = (
                          <h2
                            className={`text-xl font-semibold text-gray-800 ${className}`}
                          >
                            {sentence.text}
                          </h2>
                        );
                      } else if (format === "heading") {
                        content = (
                          <h3
                            className={`text-lg font-medium text-gray-700 ${className}`}
                          >
                            {sentence.text}
                          </h3>
                        );
                      } else {
                        // Check for markdown in regular paragraphs too
                        if (
                          sentence.text.includes("**") ||
                          sentence.text.includes("$$")
                        ) {
                          content = (
                            <div className={className}>
                              {formatTextWithMarkdown(sentence.text)}
                            </div>
                          );
                        } else {
                          content = (
                            <div className={className}>{sentence.text}</div>
                          );
                        }
                      }
                    }
                  }
                }

                result.push(
                  <motion.div
                    key={`content-${sentenceIdx}`}
                    className="rounded-md transition-colors px-1"
                    variants={itemAnimation}
                  >
                    {content}
                  </motion.div>
                );
              }
            });

            // Flush any remaining list items
            if (listItems.length > 0) {
              result.push(
                <motion.div
                  key={`list-${key++}`}
                  className="my-3"
                  variants={itemAnimation}
                >
                  {currentListType === "bullet" ? (
                    <ul className="list-disc pl-6 space-y-2">{listItems}</ul>
                  ) : (
                    <ol className="list-decimal pl-6 space-y-2">{listItems}</ol>
                  )}
                </motion.div>
              );
            }

            return result;
          })()}
        </motion.div>
      </div>
    </motion.div>
  );
};

// Add helper function to detect nested formatting
const hasNestedFormatting = (element: Element): boolean => {
  // Check for bold within italic or italic within bold
  const hasNestedBoldInItalic =
    element.querySelector("em strong, em b, i strong, i b") !== null;
  const hasNestedItalicInBold =
    element.querySelector("strong em, strong i, b em, b i") !== null;

  // Check for direct formatting of list items
  const hasDirectFormatting =
    element.tagName === "LI" &&
    element.querySelector("strong, em, b, i, u") !== null;

  // Check for nested lists
  const hasNestedList =
    element.tagName === "LI" && element.querySelector("ul, ol") !== null;

  // Check for formula in list items
  const hasFormulaClass = element.querySelector(".formula") !== null;
  const textContent = element.textContent || "";
  const containsDollarSign = textContent.includes("$");
  const hasDollarFormula =
    containsDollarSign && textContent.match(/\$[^$]+\$/) !== null;
  const hasFormula = hasFormulaClass || hasDollarFormula;

  // Check for other complex formatting combinations
  const html = element.innerHTML;

  // Look for patterns like <strong><em>text</em></strong> or <em><strong>text</strong></em>
  const hasNestedTags =
    html.includes("<strong><em>") ||
    html.includes("<em><strong>") ||
    html.includes("<b><i>") ||
    html.includes("<i><b>") ||
    html.includes("<u>") ||
    html.includes("</u>");

  // Check for custom markdown syntax like **bold** or $$italic$$
  const hasCustomMarkdown =
    (textContent.includes("**") &&
      textContent.match(/\*\*[^*]+\*\*/) !== null) ||
    (textContent.includes("$$") && textContent.match(/\$\$[^$]+\$\$/) !== null);

  return (
    hasNestedBoldInItalic ||
    hasNestedItalicInBold ||
    hasNestedTags ||
    hasDirectFormatting ||
    hasNestedList ||
    hasCustomMarkdown ||
    hasFormula
  );
};

export default ResponseMessage;
