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
    /* Make KaTeX equations bold and italic */
    .katex {
      font-weight: bold !important;
    }
    
    /* Improve display math formatting */
    .katex-display {
      padding: 0.5rem;
      margin: 1rem 0;
      background-color: rgba(148, 179, 71, 0.05);
      border: 1px solid rgba(148, 179, 71, 0.2);
      border-radius: 0.375rem;
      overflow-x: auto;
    }
    
    /* Add a highlight effect to focused equations */
    .katex-display:hover {
      background-color: rgba(148, 179, 71, 0.1);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    
    /* Improve inline math visibility */
    .katex-inline {
      padding: 0 0.15rem;
      color: #0a4c79;
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
          <motion.h3
            className="text-lg md:text-xl font-bold text-[#94b347] hover:text-[#7a9639] cursor-pointer break-words"
            onClick={() => handleSectionClick(section)}
            variants={itemAnimation}
          >
            {section.title}
          </motion.h3>
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
                        rehypePlugins={[rehypeKatex]}
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
                switch (format) {
                  case "formula":
                    content = (
                      <div className="px-4 py-3 bg-gray-50 text-gray-800 text-sm md:text-base text-left whitespace-normal break-words overflow-x-auto my-3 rounded-md border border-gray-200">
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkMath, remarkGfm]}
                            rehypePlugins={[rehypeKatex]}
                          >
                            {sentence.text}
                          </ReactMarkdown>
                        </div>
                      </div>
                    );
                    break;
                  case "italic":
                    content = (
                      <div className="text-gray-800 text-sm md:text-base text-left whitespace-normal break-words italic my-3 leading-relaxed">
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkMath, remarkGfm]}
                            rehypePlugins={[rehypeKatex]}
                          >
                            {sentence.text}
                          </ReactMarkdown>
                        </div>
                      </div>
                    );
                    break;
                  case "bold":
                    content = (
                      <div className="text-gray-800 text-sm md:text-base text-left whitespace-normal break-words font-bold my-3 leading-relaxed">
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkMath, remarkGfm]}
                            rehypePlugins={[rehypeKatex]}
                          >
                            {sentence.text}
                          </ReactMarkdown>
                        </div>
                      </div>
                    );
                    break;
                  case "heading":
                    content = (
                      <div className={`text-gray-800 text-base md:text-lg font-semibold text-left whitespace-normal break-words my-4 ${
                        isSummarySection ? "text-[#94b347]" : ""
                      }`}>
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkMath, remarkGfm]}
                            rehypePlugins={[rehypeKatex]}
                          >
                            {sentence.text}
                          </ReactMarkdown>
                        </div>
                      </div>
                    );
                    break;
                  default: // paragraph
                    content = (
                      <div className={`text-gray-800 text-sm md:text-base text-left whitespace-normal break-words my-3 leading-relaxed ${
                        isSummarySection ? "text-gray-700" : ""
                      }`}>
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkMath, remarkGfm]}
                            rehypePlugins={[rehypeKatex]}
                          >
                            {sentence.text}
                          </ReactMarkdown>
                        </div>
                      </div>
                    );
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
