"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Bold from "@tiptap/extension-bold";
import BulletList from "@tiptap/extension-bullet-list";
import Document from "@tiptap/extension-document";
import Heading from "@tiptap/extension-heading";
import Italic from "@tiptap/extension-italic";
import ListItem from "@tiptap/extension-list-item";
import OrderedList from "@tiptap/extension-ordered-list";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import TextAlign from "@tiptap/extension-text-align";
import { BubbleMenu, Editor, EditorContent, useEditor } from "@tiptap/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold as BoldIcon,
  Heading2,
  Italic as ItalicIcon,
  List,
  ListOrdered,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface RichTextEditorProps {
  initialContent: string;
  onChange: (html: string) => void;
  className?: string;
}

// Type for valid heading levels
type Level = 1 | 2 | 3 | 4 | 5 | 6;

// Debug function to track list formatting
const logListStatus = (editor: Editor | null) => {
  if (!editor) return;

  console.log("Editor status:", {
    formats: {
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
    },
    lists: {
      bulletList: editor.isActive("bulletList"),
      orderedList: editor.isActive("orderedList"),
      listItem: editor.isActive("listItem"),
    },
    selection: editor.state.selection.empty ? "No selection" : "Text selected",
    html: editor.getHTML(),
  });
};

// Helper to toggle bullet list while preserving formatting
const toggleBulletList = (editor: Editor) => {
  // Remember the formatting state
  const isBold = editor.isActive("bold");
  const isItalic = editor.isActive("italic");

  // Toggle the bullet list
  editor.chain().focus().toggleBulletList().run();

  // Wait for the next tick to restore formatting
  setTimeout(() => {
    if (isBold) {
      editor.chain().focus().toggleBold().run();
    }
    if (isItalic) {
      editor.chain().focus().toggleItalic().run();
    }
  }, 0);
};

// Helper to toggle ordered list while preserving formatting
const toggleOrderedList = (editor: Editor) => {
  // Remember the formatting state
  const isBold = editor.isActive("bold");
  const isItalic = editor.isActive("italic");

  // Toggle the ordered list
  editor.chain().focus().toggleOrderedList().run();

  // Wait for the next tick to restore formatting
  setTimeout(() => {
    if (isBold) {
      editor.chain().focus().toggleBold().run();
    }
    if (isItalic) {
      editor.chain().focus().toggleItalic().run();
    }
  }, 0);
};

// Apply bold formatting while preserving list structure
const applyBoldFormatting = (editor: Editor) => {
  if (!editor || editor.state.selection.empty) return;

  // Remember if we're in a list
  const inBulletList = editor.isActive("bulletList");
  const inOrderedList = editor.isActive("orderedList");

  // Apply bold
  editor.chain().focus().toggleBold().run();

  // Check if we need to restore list formatting
  if (inBulletList && !editor.isActive("bulletList")) {
    editor.chain().focus().toggleBulletList().run();
  } else if (inOrderedList && !editor.isActive("orderedList")) {
    editor.chain().focus().toggleOrderedList().run();
  }

  // Debug
  logListStatus(editor);
};

// Apply italic formatting while preserving list structure
const applyItalicFormatting = (editor: Editor) => {
  if (!editor || editor.state.selection.empty) return;

  // Remember if we're in a list
  const inBulletList = editor.isActive("bulletList");
  const inOrderedList = editor.isActive("orderedList");

  // Apply italic
  editor.chain().focus().toggleItalic().run();

  // Check if we need to restore list formatting
  if (inBulletList && !editor.isActive("bulletList")) {
    editor.chain().focus().toggleBulletList().run();
  } else if (inOrderedList && !editor.isActive("orderedList")) {
    editor.chain().focus().toggleOrderedList().run();
  }

  // Debug
  logListStatus(editor);
};

const RichTextEditor = ({
  initialContent,
  onChange,
  className = "",
}: RichTextEditorProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [hasTextSelected, setHasTextSelected] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [editorState, setEditorState] = useState({
    isBold: false,
    isItalic: false,
    isBulletList: false,
    isOrderedList: false,
    isHeading2: false,
    textSelected: false,
  });

  // Show a temporary notification message
  const showNotification = (message: string) => {
    setNotification(message);
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    notificationTimeoutRef.current = setTimeout(() => {
      setNotification(null);
    }, 2000);
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, []);

  // Initialize the editor with explicit configuration
  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      // Configure Bold extension to ensure it works with lists
      Bold.configure({
        HTMLAttributes: {
          class: "format-bold",
        },
      }),
      // Configure Italic extension to ensure it works with lists
      Italic.configure({
        HTMLAttributes: {
          class: "format-italic",
        },
      }),
      Heading.configure({
        levels: [2],
      }),
      // Critical configuration for BulletList to preserve marks
      BulletList.configure({
        keepMarks: true,
        keepAttributes: true,
        HTMLAttributes: {
          class: "bullet-list",
        },
      }),
      // Critical configuration for OrderedList to preserve marks
      OrderedList.configure({
        keepMarks: true,
        keepAttributes: true,
        HTMLAttributes: {
          class: "ordered-list",
        },
      }),
      // Configure ListItem
      ListItem.configure({
        HTMLAttributes: {
          class: "list-item",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right"],
        defaultAlignment: "left",
      }),
    ],
    // Set initial content
    content: initialContent,

    // Handle content updates
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setContent(html);
      onChange(html);

      // Update editor state for UI feedback
      setEditorState({
        isBold: editor.isActive("bold"),
        isItalic: editor.isActive("italic"),
        isBulletList: editor.isActive("bulletList"),
        isOrderedList: editor.isActive("orderedList"),
        isHeading2: editor.isActive("heading", { level: 2 }),
        textSelected: !editor.state.selection.empty,
      });

      // Debug log
      logListStatus(editor);
    },

    // Add key handlers to catch formatting shortcuts
    editorProps: {
      handleKeyDown: (view, event) => {
        // Handle keyboard shortcuts for formatting in lists (Ctrl+B/Cmd+B, Ctrl+I/Cmd+I)
        if (
          (event.ctrlKey || event.metaKey) &&
          (event.key === "b" || event.key === "i") &&
          !view.state.selection.empty &&
          (editor?.isActive("bulletList") || editor?.isActive("orderedList"))
        ) {
          // Remember list state
          const inBulletList = editor?.isActive("bulletList");
          const inOrderedList = editor?.isActive("orderedList");

          // Let the browser handle the shortcut normally

          // Check after processing to ensure list structure remains
          setTimeout(() => {
            if (inBulletList && !editor?.isActive("bulletList")) {
              editor?.chain().focus().toggleBulletList().run();
            } else if (inOrderedList && !editor?.isActive("orderedList")) {
              editor?.chain().focus().toggleOrderedList().run();
            }
          }, 10);
        }
        return false; // Allow default handling
      },
      attributes: {
        class:
          "prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[200px] p-4",
      },
    },
  });

  // Handle client-side rendering
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update content if initialContent changes
  useEffect(() => {
    if (editor && initialContent) {
      if (editor.getHTML() !== initialContent) {
        editor.commands.setContent(initialContent);
        setContent(initialContent);
      }
    }
  }, [editor, initialContent]);

  // Selection tracking
  useEffect(() => {
    if (editor) {
      const handleSelectionUpdate = () => {
        const hasSelection = !editor.state.selection.empty;
        setHasTextSelected(hasSelection);
      };

      editor.on("selectionUpdate", handleSelectionUpdate);

      return () => {
        editor.off("selectionUpdate", handleSelectionUpdate);
      };
    }
  }, [editor]);

  if (!isMounted) {
    return null;
  }

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  // Helper to check if a style is active
  const isStyleActive = (style: string, options = {}) => {
    try {
      return editor.isActive(style, options);
    } catch (error) {
      return false;
    }
  };

  // Helper to check if text alignment is active
  const isTextAlignActive = (alignment: string) => {
    try {
      return editor.isActive({ textAlign: alignment });
    } catch (error) {
      return false;
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Notification message */}
      {notification && (
        <div className="absolute top-0 left-0 right-0 z-20 bg-blue-100 text-blue-800 text-sm py-2 px-3 rounded-t-md text-center">
          {notification}
        </div>
      )}

      {/* Selection indicator */}
      {hasTextSelected && (
        <div className="absolute top-0 left-0 z-10 bg-green-100 text-green-800 text-xs py-1 px-2 rounded-bl-md">
          Text selected - ready to format
        </div>
      )}

      {/* Active formatting indicators */}
      <div className="absolute top-0 right-0 z-10 flex space-x-1 p-1 text-xs bg-gray-100 rounded-bl-md opacity-70">
        {editorState.isBold && (
          <span className="px-1 bg-blue-200 rounded">B</span>
        )}
        {editorState.isItalic && (
          <span className="px-1 bg-green-200 rounded italic">I</span>
        )}
        {editorState.isBulletList && (
          <span className="px-1 bg-yellow-200 rounded">•</span>
        )}
        {editorState.isOrderedList && (
          <span className="px-1 bg-orange-200 rounded">1.</span>
        )}
        {editorState.isHeading2 && (
          <span className="px-1 bg-purple-200 rounded">H2</span>
        )}
        {editorState.isBold && editorState.isItalic && (
          <span className="px-1 bg-red-200 rounded italic font-bold">B+I</span>
        )}
      </div>

      {/* Bubble menu that appears when text is selected */}
      {editor && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 100 }}
          className="bg-white shadow-md rounded-lg flex overflow-hidden border border-gray-200"
          shouldShow={({ editor, view, state, from, to }) => {
            return from !== to && !editor.state.selection.empty;
          }}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "text-gray-600 p-2 h-8 hover:bg-gray-100",
              editor.isActive("bold") && "bg-gray-200 text-gray-900"
            )}
            onClick={() => applyBoldFormatting(editor)}
            title="Bold selected text"
          >
            <BoldIcon className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "text-gray-600 p-2 h-8 hover:bg-gray-100",
              editor.isActive("italic") && "bg-gray-200 text-gray-900"
            )}
            onClick={() => applyItalicFormatting(editor)}
            title="Italic selected text"
          >
            <ItalicIcon className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "text-gray-600 p-2 h-8 hover:bg-gray-100",
              editor.isActive("bulletList") && "bg-gray-200 text-gray-900"
            )}
            onClick={() => toggleBulletList(editor)}
            title="Convert to bullet list"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "text-gray-600 p-2 h-8 hover:bg-gray-100",
              editor.isActive("orderedList") && "bg-gray-200 text-gray-900"
            )}
            onClick={() => toggleOrderedList(editor)}
            title="Convert to numbered list"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
        </BubbleMenu>
      )}

      <div className="rich-editor-container rounded-md border bg-white">
        {/* Selection hint */}
        <div className="px-3 py-1 bg-gray-50 text-gray-500 text-xs border-b">
          Tip: Select text to format individual words or phrases
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-1 p-2 border-b bg-gray-50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (editor.state.selection.empty) {
                showNotification("Select text first to apply bold formatting");
                return;
              }
              applyBoldFormatting(editor);
            }}
            className={isStyleActive("bold") ? "bg-gray-200" : ""}
            aria-label="Bold"
            title="Bold (select text first to format only that text)"
          >
            <BoldIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (editor.state.selection.empty) {
                showNotification(
                  "Select text first to apply italic formatting"
                );
                return;
              }
              applyItalicFormatting(editor);
            }}
            className={isStyleActive("italic") ? "bg-gray-200" : ""}
            aria-label="Italic"
            title="Italic (select text first to format only that text)"
          >
            <ItalicIcon className="h-4 w-4" />
          </Button>
          {editor.isActive("bold") && editor.isActive("italic") && (
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
              Combined Format
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            className={
              isStyleActive("heading", { level: 2 }) ? "bg-gray-200" : ""
            }
            aria-label="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleBulletList(editor)}
            className={isStyleActive("bulletList") ? "bg-gray-200" : ""}
            aria-label="Bullet List"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleOrderedList(editor)}
            className={isStyleActive("orderedList") ? "bg-gray-200" : ""}
            aria-label="Ordered List"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            className={isTextAlignActive("left") ? "bg-gray-200" : ""}
            aria-label="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            className={isTextAlignActive("center") ? "bg-gray-200" : ""}
            aria-label="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            className={isTextAlignActive("right") ? "bg-gray-200" : ""}
            aria-label="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Editor content */}
        <EditorContent editor={editor} className="editor-content" />
      </div>

      {/* Enhanced styles */}
      <style jsx global>{`
        /* Base editor styles */
        .ProseMirror {
          min-height: 150px;
          cursor: text;
          white-space: pre-wrap;
        }

        /* List styling */
        .ProseMirror ul {
          list-style-type: disc !important;
          padding-left: 1.5em !important;
          margin: 0.5em 0 !important;
        }

        .ProseMirror ol {
          list-style-type: decimal !important;
          padding-left: 1.5em !important;
          margin: 0.5em 0 !important;
        }

        /* Ensure list items are properly displayed */
        .ProseMirror li {
          position: relative !important;
          margin-bottom: 0.3rem !important;
        }

        /* Nested list styling */
        .ProseMirror li > ul,
        .ProseMirror li > ol {
          margin-top: 0.3rem !important;
          margin-bottom: 0.3rem !important;
        }

        /* Ensure lists have bullets/numbers */
        .ProseMirror ul {
          list-style-position: outside !important;
        }

        .ProseMirror ol {
          list-style-position: outside !important;
        }

        /* Handling combined formatting */
        .ProseMirror strong em,
        .ProseMirror em strong {
          color: #be185d;
          background-color: rgba(190, 24, 93, 0.05);
          padding: 0 2px;
          border-radius: 2px;
        }

        /* Formatting in lists */
        .ProseMirror li strong {
          color: #1e40af;
          background-color: rgba(30, 64, 175, 0.05);
          padding: 0 2px;
          border-radius: 2px;
          display: inline;
        }

        .ProseMirror li em {
          color: #047857;
          background-color: rgba(4, 120, 87, 0.05);
          padding: 0 2px;
          border-radius: 2px;
          display: inline;
        }

        /* Fix for list item formatting */
        .ProseMirror li b,
        .ProseMirror li i,
        .ProseMirror li strong,
        .ProseMirror li em {
          display: inline;
        }

        /* Selection styling */
        .ProseMirror ::selection {
          background: rgba(59, 130, 246, 0.2);
        }

        /* Make nested formatting more visible */
        .ProseMirror strong,
        .ProseMirror .format-bold {
          font-weight: bold;
          display: inline;
        }

        .ProseMirror em,
        .ProseMirror .format-italic {
          font-style: italic;
          display: inline;
        }
      `}</style>

      {/* Debug panel */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-2 p-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
          <details>
            <summary>Debug: Current HTML</summary>
            <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-[100px]">
              {content}
            </pre>
          </details>
          <details>
            <summary>Formatting Status</summary>
            <div className="mt-2 p-2 bg-gray-100 rounded">
              <div>
                Bold: {editor.isActive("bold") ? "✅ Active" : "❌ Inactive"}
              </div>
              <div>
                Italic:{" "}
                {editor.isActive("italic") ? "✅ Active" : "❌ Inactive"}
              </div>
              <div>
                Combined:{" "}
                {editor.isActive("bold") && editor.isActive("italic")
                  ? "✅ Active"
                  : "❌ Inactive"}
              </div>
              <div>
                Bullet List:{" "}
                {editor.isActive("bulletList") ? "✅ Active" : "❌ Inactive"}
              </div>
              <div>
                Ordered List:{" "}
                {editor.isActive("orderedList") ? "✅ Active" : "❌ Inactive"}
              </div>
              <div>
                Bold in List:{" "}
                {(editor.isActive("bulletList") ||
                  editor.isActive("orderedList")) &&
                editor.isActive("bold")
                  ? "✅ Active"
                  : "❌ Inactive"}
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default RichTextEditor;
