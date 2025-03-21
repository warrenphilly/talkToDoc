"use client";

import DOMPurify from "dompurify";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  SaveIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import RichTextEditor from "./rich-text-editor";

// Make sure this matches the type in lib/types.ts
type FormatType =
  | "bold"
  | "heading"
  | "italic"
  | "paragraph"
  | "bullet"
  | "numbered"
  | "formula"
  | "rich-text";

interface ParagraphData {
  user: string;
  text: {
    title: string;
    sentences: {
      id: number;
      text: string;
      format?: FormatType;
    }[];
  }[];
}

interface ParagraphEditorProps {
  onSave: (data: ParagraphData, index: number) => void;
  onDelete?: () => void;
  messageIndex: number;
  initialData?: ParagraphData;
}

// Add the EditorStyles component from ResponseMessage
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

    /* Default heading styles - don't modify H1 */
    .editor-content h1,
    .ProseMirror h1 {
      font-size: 1.8em !important;
      font-weight: 700 !important;
      margin: 1.2em 0 0.6em !important;
      color: #94b347 !important; /* Green color for h1 */
      line-height: 1.3 !important;
    }

    /* Only enhance H2 headings from rich text editor */
    .editor-content h2,
    .ProseMirror h2,
    .editor-heading {
      font-size: 1.75em !important;
      font-weight: 600 !important;
      margin: 1em 0 0.5em !important;
      color: #333 !important;
      line-height: 1.4 !important;
      border-bottom: 1px solid #eaeaea !important;
      padding-bottom: 0.3em !important;
    }

    .editor-content h3,
    .ProseMirror h3 {
      font-size: 1.4em !important;
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
      font-size: 1.75em !important;
      font-weight: 600 !important;
      color: #333 !important;
      margin: 1em 0 0.5em !important;
      border-bottom: 1px solid #eaeaea !important;
      padding-bottom: 0.3em !important;
    }

    .prose h3 {
      font-size: 1.4em !important;
      font-weight: bold !important;
      color: #444 !important;
      margin: 0.8em 0 0.4em !important;
    }
  `}</style>
);

export default function ParagraphEditor({
  onSave,
  messageIndex,
  initialData,
  onDelete,
}: ParagraphEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // Initialize with initialData if present
  useEffect(() => {
    if (initialData && initialData.text && initialData.text[0]) {
      setTitle(initialData.text[0].title || "");

      // Get content from the rich-text formatted sentence
      const richTextSentence = initialData.text[0].sentences.find(
        (sentence) => sentence.format === "rich-text"
      );

      if (richTextSentence) {
        setContent(richTextSentence.text || "");
      }

      // If there's content, we've already edited this paragraph before
      if (richTextSentence?.text) {
        setIsCollapsed(true);
      }
    }
  }, [initialData]);

  const handleSave = () => {
    if (!title.trim() && !content.trim()) {
      // Don't save if both title and content are empty
      setIsEditing(false);
      return;
    }

    // Create a basic paragraph data structure
    const paragraphData: ParagraphData = {
      user: "AI",
      text: [
        {
          title: title,
          sentences: [
            {
              id: 1,
              text: content,
              format: "rich-text",
            },
          ],
        },
      ],
    };

    onSave(paragraphData, messageIndex);
    setIsEditing(false);
    setIsCollapsed(true);

    // Reset fields if this is a new paragraph (no initialData)
    if (!initialData) {
      setTitle("");
      setContent("");
    }
  };

  const handleToggle = () => {
    if (!isEditing) {
      setIsCollapsed(!isCollapsed);
    }
  };

  // Sanitize HTML when displaying content
  const sanitizeHtml = (html: string) => {
    return DOMPurify.sanitize(html, {
      ADD_ATTR: ["style", "class", "data-list-type"],
      ADD_TAGS: [
        "span",
        "h1",
        "h2",
        "h3",
        "strong",
        "em",
        "b",
        "i",
        "ul",
        "ol",
        "li",
        "p",
        "div",
      ],
      ALLOW_DATA_ATTR: true,
    });
  };

  return (
    <div className="relative p-4">
      {/* Add the EditorStyles component */}
      <EditorStyles />

      <div className="flex items-center">
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`flex items-center justify-center w-6 h-6 rounded-full transition-colors duration-300 ease-in-out ${
            isEditing
              ? "bg-red-200 hover:bg-red-300"
              : "bg-gray-200 hover:bg-gray-300"
          }`}
        >
          {isEditing ? (
            <XIcon className="w-4 h-4 text-red-600" />
          ) : (
            <PlusIcon className="w-4 h-4 text-gray-600" />
          )}
        </button>
        {!isEditing && <div className="flex-grow h-[1px] bg-gray-200 ml-2" />}

        {/* Show toggle button when not editing but only if isEditing has been true before (content exists) */}
        {!isEditing && content && (
          <button
            onClick={handleToggle}
            className="ml-2 p-1 rounded-full hover:bg-gray-100"
            aria-label={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? (
              <ChevronDownIcon className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronUpIcon className="w-4 h-4 text-gray-600" />
            )}
          </button>
        )}
      </div>

      {isEditing && (
        <div className="mt-4 space-y-4 transition-all duration-300 ease-in-out border border-slate-300 rounded-2xl p-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-xl text-[#94b347] font-bold p-2 rounded-md bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#94b347]"
            placeholder="Enter paragraph title"
          />
          <div className="w-full h-px bg-slate-300" />

          {/* Use the RichTextEditor component with correct props */}
          <RichTextEditor
            initialContent={content}
            onChange={(html) => setContent(html)}
            className="w-full min-h-[250px] border border-gray-200 rounded-md"
          />

          <div className="flex justify-between">
            <button
              onClick={handleSave}
              className="flex items-center justify-center px-4 py-2 bg-[#94b347] text-white rounded-md hover:bg-[#7a9339] transition-colors duration-300 ease-in-out"
            >
              <SaveIcon className="w-4 h-4 mr-2" />
              Save
            </button>

            {onDelete && (
              <button
                onClick={onDelete}
                className="flex items-center justify-center px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-300 ease-in-out"
              >
                <XIcon className="w-4 h-4 mr-2" />
                Delete
              </button>
            )}
          </div>
        </div>
      )}

      {/* Show a preview of content when collapsed and not editing */}
      {!isEditing && content && isCollapsed && (
        <div className="mt-2 ml-8 text-sm text-gray-500 italic">
          Click to expand editor...
        </div>
      )}

      {/* Show the editor in read-only mode when expanded but not editing */}
      {!isEditing && content && !isCollapsed && (
        <div className="mt-4 ml-8 border-l-2 border-[#94b347] pl-4 transition-all duration-300 ease-in-out">
          {title && (
            <h3 className="text-lg font-bold text-[#94b347] mb-2">{title}</h3>
          )}
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
          />
        </div>
      )}
    </div>
  );
}
