"use client";

import { Node } from "@tiptap/core";
import Bold from "@tiptap/extension-bold";
import BulletList from "@tiptap/extension-bullet-list";
import CodeBlock from "@tiptap/extension-code-block";
import Document from "@tiptap/extension-document";
import Heading from "@tiptap/extension-heading";
import Italic from "@tiptap/extension-italic";
import ListItem from "@tiptap/extension-list-item";
import OrderedList from "@tiptap/extension-ordered-list";
import Paragraph from "@tiptap/extension-paragraph";
import Placeholder from "@tiptap/extension-placeholder";
import Text from "@tiptap/extension-text";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

interface SimpleRichTextEditorProps {
  initialContent?: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

// Create a custom Formula extension for TipTap
const Formula = Node.create({
  name: "formula",
  group: "block",
  content: "text*",

  addAttributes() {
    return {
      latex: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div.formula-block",
        getAttrs: (node) => {
          if (typeof node === "string") return {};
          const element = node as HTMLElement;
          return { latex: element.textContent };
        },
      },
    ];
  },

  renderHTML({ node }) {
    return ["div", { class: "formula-block" }, node.attrs.latex];
  },
});

// Create a toolbar for rich text editing with more options
const RichTextToolbar = ({ editor }: { editor: any }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 p-2 mb-2">
      {/* Text formatting controls */}
      <div className="flex items-center space-x-1 mr-2">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1 rounded-md ${
            editor.isActive("bold") ? "bg-slate-200" : "hover:bg-slate-100"
          }`}
          title="Bold"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
            <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
          </svg>
        </button>

        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1 rounded-md ${
            editor.isActive("italic") ? "bg-slate-200" : "hover:bg-slate-100"
          }`}
          title="Italic"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="4" x2="10" y2="4"></line>
            <line x1="14" y1="20" x2="5" y2="20"></line>
            <line x1="15" y1="4" x2="9" y2="20"></line>
          </svg>
        </button>

        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-1 rounded-md ${
            editor.isActive("underline") ? "bg-slate-200" : "hover:bg-slate-100"
          }`}
          title="Underline"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"></path>
            <line x1="4" y1="21" x2="20" y2="21"></line>
          </svg>
        </button>
      </div>

      {/* Heading controls */}
      <div className="flex items-center space-x-1 mr-2">
        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          className={`p-1 rounded-md ${
            editor.isActive("heading", { level: 3 })
              ? "bg-slate-200"
              : "hover:bg-slate-100"
          }`}
          title="Heading"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 12h12"></path>
            <path d="M6 4h12"></path>
            <path d="M9 4v16"></path>
          </svg>
        </button>
      </div>

      <div className="h-6 w-px bg-slate-200 mx-1"></div>

      {/* List controls */}
      <div className="flex items-center space-x-1 mr-2">
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1 rounded-md ${
            editor.isActive("bulletList")
              ? "bg-slate-200"
              : "hover:bg-slate-100"
          }`}
          title="Bullet List"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
        </button>

        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1 rounded-md ${
            editor.isActive("orderedList")
              ? "bg-slate-200"
              : "hover:bg-slate-100"
          }`}
          title="Numbered List"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="10" y1="6" x2="21" y2="6"></line>
            <line x1="10" y1="12" x2="21" y2="12"></line>
            <line x1="10" y1="18" x2="21" y2="18"></line>
            <path d="M4 6h1v4"></path>
            <path d="M4 10h2"></path>
            <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path>
          </svg>
        </button>
      </div>

      <div className="h-6 w-px bg-slate-200 mx-1"></div>

      {/* Code block control */}
      <div className="flex items-center space-x-1">
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`p-1 rounded-md ${
            editor.isActive("codeBlock") ? "bg-slate-200" : "hover:bg-slate-100"
          }`}
          title="Code Block"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
          </svg>
        </button>

        {/* Special button for LaTeX/Math formulas */}
        <button
          onClick={() => {
            // Get the current selection
            const { from, to } = editor.state.selection;
            const selectedText = editor.state.doc.textBetween(from, to, " ");

            // If text is selected, wrap it in formula delimiters
            if (selectedText) {
              // Check if already has delimiters
              if (selectedText.startsWith("$") && selectedText.endsWith("$")) {
                // Already formatted, do nothing
                return;
              }

              // Create a formula block with the selected text
              editor
                .chain()
                .focus()
                .deleteSelection()
                .insertContent(
                  `<div class="formula-block">$${selectedText}$</div>`
                )
                .run();
            } else {
              // Insert an empty formula block
              editor
                .chain()
                .focus()
                .insertContent('<div class="formula-block">$formula$</div>')
                .run();

              // Position cursor inside the formula
              const pos = editor.state.selection.from - 8;
              editor.commands.setTextSelection({ from: pos, to: pos + 7 });
            }
          }}
          className={`p-1 rounded-md hover:bg-slate-100`}
          title="Math Formula"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18"></path>
            <path d="M7 12h10"></path>
            <path d="M5 18h14"></path>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default function SimpleRichTextEditor({
  initialContent = "",
  onChange,
  placeholder = "Start typing...",
  className = "",
}: SimpleRichTextEditorProps) {
  // Create the rich text editor instance
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3], // Allow all heading levels
        },
      }),
      Underline,
      BulletList.configure({
        keepMarks: true,
        keepAttributes: true,
      }),
      OrderedList.configure({
        keepMarks: true,
        keepAttributes: true,
      }),
      ListItem,
      Bold,
      Italic,
      CodeBlock.configure({
        HTMLAttributes: {
          class: "formula-block",
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Formula,
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      // Pass HTML content to parent component
      onChange(editor.getHTML());
    },
  });

  // Update content if initialContent changes
  useEffect(() => {
    if (editor && initialContent) {
      if (editor.getHTML() !== initialContent) {
        editor.commands.setContent(initialContent);
      }
    }
  }, [editor, initialContent]);

  return (
    <div className={`rich-text-editor ${className}`}>
      {/* Rich text editor toolbar */}
      {editor && <RichTextToolbar editor={editor} />}

      {/* Rich text editor content */}
      <div className="min-h-[150px] w-full p-2 rounded-md bg-slate-100 focus-within:ring-2 focus-within:ring-[#94b347]">
        <EditorContent
          editor={editor}
          className="prose max-w-none focus:outline-none min-h-[120px]"
        />
      </div>

      {/* Special styling for formulas in the editor */}
      <style jsx global>{`
        .ProseMirror {
          outline: none;
          padding: 0.5rem;
        }

        .ProseMirror .math-formula,
        .ProseMirror .formula-block {
          background-color: rgba(148, 179, 71, 0.1);
          border: 1px solid rgba(148, 179, 71, 0.2);
          border-radius: 0.375rem;
          padding: 0.75rem;
          font-family: monospace;
          color: #0a4c79;
          font-weight: bold;
          white-space: normal; /* Allow wrapping */
          word-break: break-word; /* Break at word boundaries when possible */
          overflow-wrap: anywhere; /* Allow breaking anywhere if needed */
          max-width: 100%; /* Ensure it doesn't overflow container */
          display: block; /* Make it a block element */
          margin: 12px 0; /* Add spacing above and below */
          line-height: 1.6; /* Improve readability */
        }

        /* Add visual indicator that this is a formula */
        .ProseMirror .formula-block::before {
          content: "Formula: ";
          color: #94b347;
          font-weight: bold;
          margin-right: 8px;
          opacity: 0.9;
        }

        /* Style paragraphs containing inline math */
        .ProseMirror p.contains-math {
          border-left: 3px solid rgba(148, 179, 71, 0.4);
          padding-left: 8px;
          background-color: rgba(148, 179, 71, 0.05);
        }

        .ProseMirror h1 {
          color: #94b347;
          font-weight: bold;
          font-size: 1.5rem;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }

        .ProseMirror h2 {
          color: #333;
          font-weight: bold;
          font-size: 1.3rem;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }

        .ProseMirror h3 {
          color: #94b347;
          font-weight: bold;
          font-size: 1.25rem;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }

        .ProseMirror ul li,
        .ProseMirror ol li {
          margin-left: 1.5rem;
        }

        .ProseMirror ul {
          list-style-type: disc;
        }

        .ProseMirror ol {
          list-style-type: decimal;
        }
      `}</style>
    </div>
  );
}
