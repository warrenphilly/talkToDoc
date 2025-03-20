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
import { motion } from "framer-motion";
import { Edit2, Trash2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import { ComponentProps } from 'react';
import rehypeRaw from 'rehype-raw';
import { renderToString } from 'katex';

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

// Add this helper function to parse and format text with Markdown-style bold
const formatTextWithMarkdown = (text: string) => {
  // Replace **text** with bold spans
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  if (parts.length === 1) {
    return text; // No markdown formatting found
  }

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      // Extract the text between ** and render it as bold
      const boldText = part.slice(2, -2);
      return <strong key={i}>{boldText}</strong>;
    }
    return part;
  });
};

// Add a styles component for math equations
const MathEquationStyles = () => (
  <style jsx global>{`
    /* Base KaTeX styling */
    .katex {
      font-size: 1.1em !important;
      font-family: KaTeX_Main, 'Times New Roman', serif !important;
    }
    
    /* Ensure proper spacing in math expressions */
    .katex .mord, .katex .mbin, .katex .mrel, .katex .mopen, .katex .mclose, .katex .mpunct, .katex .minner {
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
      white-space: normal;      /* Allow breaking to new lines */
      max-width: 100%;          /* Ensure doesn't overflow container */
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
    .formula-block, .katex-display {
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
  if (!text.includes('\\') && !text.includes('$')) return text;
  
  // Make sure backslashes are properly escaped
  // But don't double-escape already escaped backslashes
  let processed = text.replace(/(?<!\\)\\(?!\\)/g, '\\\\');
  
  // Make sure dollar signs are present for inline math
  if (processed.includes('\\') && !processed.includes('$')) {
    processed = `$${processed}$`;
  }
  
  // Handle display math if needed
  if (processed.includes('\\begin{equation}') || processed.includes('\\begin{align}')) {
    // If it doesn't already have $$ delimiters and needs them
    if (!processed.startsWith('$$')) {
      processed = `$$${processed}$$`;
    }
  }
  
  return processed;
};

// Add a function to properly format mangled formulas
const reformatMangledFormula = (text: string): string => {
  // Check if the text appears to be a mangled formula (characters separated by newlines)
  const isMangledFormula = /\n\s*[a-zA-Z0-9_]\s*\n/.test(text);
  
  if (isMangledFormula) {
    // First, remove all newlines and normalize whitespace
    let normalized = text.replace(/\n/g, '').replace(/\s+/g, ' ').trim();
    
    // Check for specific equation patterns and reformulate them
    if (normalized.includes('d=V_0t+\\frac{1}{2}at^2') || 
        normalized.includes('d = V_0t + \\frac{1}{2}at^2')) {
      return '$d = V_0t + \\frac{1}{2}at^2$';
    }
    
    // Handle other common physics equations
    if (/V_f\^?2\s*=\s*V_0\^?2\s*\+\s*2ad/.test(normalized)) {
      return '$V_f^2 = V_0^2 + 2ad$';
    }
    
    // Process general mangles
    normalized = normalized
      // Add spaces after commas
      .replace(/,(\w)/g, ', $1')
      // Add spaces around operators
      .replace(/(\w+)=(\w+)/g, '$1 = $2')
      .replace(/(\w+)\+(\w+)/g, '$1 + $2')
      .replace(/(\w+)-(\w+)/g, '$1 - $2')
      // Fix common subscripts and superscripts
      .replace(/([a-zA-Z])(\d+)/g, '$1_$2')
      .replace(/\^(\d+)/g, '^{$1}');
    
    return `$${normalized}$`;
  }
  
  return text;
};

// Update the formula detection to catch mangled formulas
const isPotentialMathContent = (text: string): boolean => {
  // Original checks
  const mathPatterns = [
    /\\frac\{/,         // Fractions
    /\\sqrt\{/,          // Square roots
    /\\sum_/,            // Summations
    /\\int/,             // Integrals
    /\\alpha|\\beta|\\gamma|\\theta/,  // Greek letters
    /[a-zA-Z]_\{[a-zA-Z0-9]+\}/,  // Subscripts
    /[a-zA-Z]\^\{[a-zA-Z0-9]+\}/,  // Superscripts
    /\\mathbb\{[A-Z]\}/,  // Special math fonts
    /\\text\{/,          // Text in math mode
    /\\begin\{[a-z]+\}/  // Math environments
  ];
  
  // Add check for mangled formulas (characters separated by newlines)
  const isMangledFormula = /\n\s*[a-zA-Z0-9_]\s*\n/.test(text) && 
                           /[Vd]\s*[_=]\s*\d/.test(text.replace(/\n/g, ''));
  
  return mathPatterns.some(pattern => pattern.test(text)) || isMangledFormula;
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
    const cleanFormula = formula.replace(/^\$|\$$/g, '');
    
    // Render to HTML string
    return renderToString(cleanFormula, {
      displayMode: true,
      throwOnError: false,
      output: 'html'
    });
  } catch (error) {
    console.error('Error rendering formula:', error);
    return `<span class="text-red-500">Error rendering formula: ${formula}</span>`;
  }
};

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
        hasValidSentences: msg.text[0].sentences?.every(s => 
          s && typeof s.id === 'number' && typeof s.text === 'string' && s.text.trim() !== ''
        )
      });
    }
  }, [msg]);

  const handleEditClick = () => {
    setIsEditing(true);
    onEdit(); // Call the parent's onEdit handler
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

  const handleRegenerateSection = async () => {
    try {
      // Show loading state
      const updatedSection = {
        ...section,
        sentences: [{
          id: 1,
          text: "Regenerating content...",
          format: "paragraph"
        }]
      };
      
      // Update the section temporarily to show loading
      onSave({
        user: "AI",
        text: [updatedSection]
      }, index);
      
      // Now call your API to regenerate just this section
      const response = await fetch('/api/regenerate-section', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: section.title,
          // Send any additional context needed
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to regenerate section');
      }
      
      const newSection = await response.json();
      
      // Update with the new content
      onSave({
        user: "AI",
        text: [newSection.section]
      }, index);
      
    } catch (error) {
      console.error('Error regenerating section:', error);
      // Show error state
      const errorSection = {
        ...section,
        sentences: [{
          id: 1,
          text: "Failed to regenerate. Please try again.",
          format: "paragraph"
        }]
      };
      
      onSave({
        user: "AI",
        text: [errorSection]
      }, index);
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
        <ParagraphEditor
          onSave={(data) => {
            onSave(data, index);
            setIsEditing(false);
          }}
          messageIndex={index}
          initialData={{
            user: "AI",
            text: [
              {
                title: section.title,
                sentences: section.sentences,
              },
            ],
          }}
        />
      </div>
    );
  }

  if (section.sentences?.some(s => s.text.includes("properly formatted"))) {
    console.log("MALFORMED_SECTION_DETECTED:", {
      section,
      sentencesWithIssues: section.sentences
        ?.filter(s => s.text.includes("properly formatted"))
        ?.map(s => ({ id: s.id, text: s.text }))
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
                  fetch('/api/debug-section', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ section })
                  })
                  .then(res => res.json())
                  .then(data => {
                    console.log("SECTION_DEBUG_RESULT:", data);
                    if (data.success && data.fixedSection) {
                      onSave({
                        user: "AI",
                        text: [data.fixedSection]
                      }, index);
                    }
                  })
                  .catch(err => console.error("Debug error:", err));
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
      
      <div className="p-3 md:p-5 rounded-2xl transition-colors bg-white shadow-lg border border-gray-100">
        <div className="flex flex-row gap-2 md:gap-0 justify-between items-start mb-4">
          <motion.div className="flex items-center gap-2" variants={itemAnimation}>
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
            if (!section || !section.sentences || !Array.isArray(section.sentences)) {
              console.error("Invalid section data:", section);
              
              // If we have a section but no sentences, create a default sentence
              if (section && (!section.sentences || !Array.isArray(section.sentences) || section.sentences.length === 0)) {
                // Create a fallback section with a default sentence
                const fallbackSection = {
                  ...section,
                  title: section.title || "Content",
                  sentences: [{
                    id: 1,
                    text: typeof section.sentences === 'string' 
                      ? section.sentences 
                      : "The content couldn't be properly formatted. Please try regenerating this section.",
                    format: "paragraph"
                  }]
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
                    <p>This section is missing or has invalid content. Please try reloading or generating a new response.</p>
                    <button 
                      className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm"
                      onClick={() => console.log("Section data:", JSON.stringify(section))}
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

                // Add to current list with enhanced styling using ReactMarkdown for math support
                listItems.push(
                  <motion.li
                    key={`item-${sentenceIdx}`}
                    className={`text-gray-800 text-sm md:text-base text-left whitespace-normal break-words leading-relaxed ${
                      isSummarySection ? "font-medium" : ""
                    }`}
                    variants={itemAnimation}
                  >
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkMath, remarkGfm]}
                        rehypePlugins={[rehypeRaw, rehypeKatex]}
                        components={{
                          code: ({ className, children, ...props }: ComponentProps<'code'> & { className?: string }) => {
                            const match = /language-(\w+)/.exec(className || '');
                            const isInline = !match;
                            
                            return isInline ? (
                              <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono" {...props}>
                                {children}
                              </code>
                            ) : (
                              <code className="block bg-gray-100 p-2 rounded text-sm font-mono overflow-x-auto my-2" {...props}>
                                {children}
                              </code>
                            );
                          },
                          // Special handler for paragraphs with math
                          p: ({ children }) => {
                            return <p className="whitespace-normal word-break-normal">{children}</p>;
                          }
                        }}
                      >
                        {prepareLatexForRendering(sentence.text)}
                      </ReactMarkdown>
                    </div>
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
                if ((format as string) === "rich-text") {
                  content = (
                    <div 
                      className="text-gray-800 text-sm md:text-base text-left whitespace-normal break-words my-3 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: sentence.text }}
                    />
                  );
                } else if (format === "formula") {
                  // Check if formula appears to be mangled with newlines
                  const processedText = /\n\s*[a-zA-Z0-9_]\s*\n/.test(sentence.text) 
                    ? reformatMangledFormula(sentence.text)
                    : prepareLatexForRendering(sentence.text);
                  
                  // Use direct KaTeX rendering for reliable formula display
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
                  const hasUnformattedMath = isPotentialMathContent(sentence.text);
                  
                  if (hasUnformattedMath && !sentence.text.includes('$')) {
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
                    const hasInlineMath = /\$(?!\$)(.+?)(?<!\$)\$/g.test(sentence.text) || 
                                          /\\\((.+?)\\\)/g.test(sentence.text);
                    
                    if (hasInlineMath) {
                      // Process text to ensure proper math spacing
                      const processedText = sentence.text
                        // Ensure proper spacing in inline math
                        .replace(/\$([^$]+)\$/g, (match, formula) => {
                          // Make sure the formula has proper spacing
                          return `$${prepareLatexForRendering(formula).replace(/\$/g, '')}$`;
                        });
                      
                      content = (
                        <div className={`text-gray-800 text-sm md:text-base text-left whitespace-normal break-words my-3 leading-relaxed ${
                          isSummarySection ? "text-gray-700" : ""
                        }`}>
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
                      // Check if content contains HTML or markdown indicators
                      const hasMarkdown = /(\*\*|__|~~|`|\[.*\]\(.*\)|#{1,6}\s|>\s|```|^\s*[\-\*\+]\s|^\s*\d+\.\s)/m.test(sentence.text);
                      const hasHtml = containsHtmlTags(sentence.text);
                      
                      if (hasHtml) {
                        // If it has HTML tags, use dangerouslySetInnerHTML to render it directly
                        content = (
                          <div 
                            className={`text-gray-800 text-sm md:text-base text-left whitespace-normal break-words my-3 leading-relaxed ${
                              isSummarySection ? "text-gray-700" : ""
                            }`}
                            dangerouslySetInnerHTML={{ __html: sentence.text }}
                          />
                        );
                      } else if (hasMarkdown) {
                        // If it has markdown but no HTML, use ReactMarkdown with rehypeRaw
                        content = (
                          <div className={`text-gray-800 text-sm md:text-base text-left whitespace-normal break-words my-3 leading-relaxed ${
                            isSummarySection ? "text-gray-700" : ""
                          }`}>
                            <div className="prose prose-sm max-w-none">
                              <ReactMarkdown
                                remarkPlugins={[remarkMath, remarkGfm]}
                                rehypePlugins={[rehypeRaw, rehypeKatex]}
                                components={{
                                  code: ({ className, children, ...props }: ComponentProps<'code'> & { className?: string }) => {
                                    const match = /language-(\w+)/.exec(className || '');
                                    const isInline = !match;
                                    
                                    return isInline ? (
                                      <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono" {...props}>
                                        {children}
                                      </code>
                                    ) : (
                                      <code className="block bg-gray-100 p-2 rounded text-sm font-mono overflow-x-auto my-2" {...props}>
                                        {children}
                                      </code>
                                    );
                                  }
                                }}
                              >
                                {sentence.text}
                              </ReactMarkdown>
                            </div>
                          </div>
                        );
                      } else {
                        // If it's plain text without markdown or HTML, render as before
                        content = (
                          <div className={`text-gray-800 text-sm md:text-base text-left whitespace-normal break-words my-3 leading-relaxed ${
                            isSummarySection ? "text-gray-700" : ""
                          }`}>
                            {sentence.text}
                          </div>
                        );
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

export default ResponseMessage;