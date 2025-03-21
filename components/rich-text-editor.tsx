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
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold as BoldIcon,
  Heading1,
  Heading2,
  Heading3,
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

// Define a type for valid heading levels
type Level = 1 | 2 | 3 | 4 | 5 | 6;

// Debug function to track list formatting
const logListStatus = (editor: Editor | null) => {
  if (!editor) return;

  console.log("List Status:", {
    active: {
      bulletList: editor.isActive("bulletList"),
      orderedList: editor.isActive("orderedList"),
      listItem: editor.isActive("listItem"),
    },
    can: {
      toggleBulletList: editor.can().toggleBulletList(),
      toggleOrderedList: editor.can().toggleOrderedList(),
    },
    selection: editor.state.selection,
  });
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
    isHeading1: false,
    isHeading2: false,
  });

  // Show a temporary notification message
  const showNotification = (message: string) => {
    setNotification(message);

    // Clear any existing timeout
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }

    // Set a new timeout to clear the notification
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

  // Initialize the editor with explicitly imported extensions and improved list handling
  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      Bold.configure({
        HTMLAttributes: {
          class: "format-bold",
        },
      }),
      Italic.configure({
        HTMLAttributes: {
          class: "format-italic",
        },
      }),
      Heading.configure({
        levels: [1, 2, 3],
      }),
      BulletList.configure({
        keepMarks: true,
        HTMLAttributes: {
          class: "bullet-list-container",
        },
      }),
      OrderedList.configure({
        keepMarks: true,
        HTMLAttributes: {
          class: "ordered-list-container",
        },
      }),
      ListItem.configure({
        HTMLAttributes: {
          class: "list-item",
        },
      }),
      TextAlign.configure({
        types: [
          "heading",
          "paragraph",
          "listItem",
          "bulletList",
          "orderedList",
        ],
        alignments: ["left", "center", "right"],
        defaultAlignment: "left",
      }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setContent(html);
      onChange(html);
      console.log("Editor update:", html); // Debug log to see content changes

      // Update editor state
      setEditorState({
        isBold: editor.isActive("bold"),
        isItalic: editor.isActive("italic"),
        isBulletList: editor.isActive("bulletList"),
        isOrderedList: editor.isActive("orderedList"),
        isHeading1: editor.isActive("heading", { level: 1 }),
        isHeading2: editor.isActive("heading", { level: 2 }),
      });

      // Log list status for debugging
      logListStatus(editor);
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base lg:prose-lg max-w-none focus:outline-none min-h-[200px] p-4",
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
      // Only update if content is different to avoid cursor jumping
      if (editor.getHTML() !== initialContent) {
        editor.commands.setContent(initialContent);
        setContent(initialContent);
        console.log("Setting initial content:", initialContent); // Debug log
      }
    }
  }, [editor, initialContent]);

  // Debug logging on mount
  useEffect(() => {
    if (editor) {
      console.log("Editor initialized with content:", initialContent);
      console.log("Editor HTML on init:", editor.getHTML());
    }
  }, [editor, initialContent]);

  // Just make sure the Italic extension is properly applied with this debug log
  useEffect(() => {
    if (editor) {
      console.log("Editor extensions:", editor.extensionManager.extensions);
      console.log("Italic extension is active:", editor.can().toggleItalic());
    }
  }, [editor]);

  // Add visual indicator for nested formatting
  useEffect(() => {
    if (editor) {
      // Add a class to detect when both bold and italic are active
      const updateNestedFormatClass = () => {
        const isBold = editor.isActive("bold");
        const isItalic = editor.isActive("italic");

        // Find the editor DOM element
        const editorElement = document.querySelector(".editor-content");
        if (editorElement) {
          if (isBold && isItalic) {
            editorElement.classList.add("nested-format-active");
          } else {
            editorElement.classList.remove("nested-format-active");
          }
        }
      };

      // Update on selection change or content change
      editor.on("selectionUpdate", updateNestedFormatClass);
      editor.on("update", updateNestedFormatClass);

      return () => {
        editor.off("selectionUpdate", updateNestedFormatClass);
        editor.off("update", updateNestedFormatClass);
      };
    }
  }, [editor]);

  // Add event handlers to help with formatting in lists
  useEffect(() => {
    if (editor) {
      // Create a custom event handler for detecting formatting commands
      const handleFormatting = ({
        editor: editorInstance,
        transaction,
      }: {
        editor: any;
        transaction: { getMeta: (key: string) => any };
      }) => {
        // Check if we're toggling bold/italic inside a list
        if (
          transaction.getMeta("formattingCommand") &&
          (editor.isActive("bulletList") || editor.isActive("orderedList"))
        ) {
          console.log(
            "Formatting inside list:",
            transaction.getMeta("formattingCommand")
          );
        }
        return true; // Allow the transaction
      };

      // Add the handler
      editor.on("beforeTransaction", handleFormatting);

      return () => {
        editor.off("beforeTransaction", handleFormatting);
      };
    }
  }, [editor]);

  // Add a debugging function to track list items during formatting operations
  useEffect(() => {
    if (editor) {
      const trackListItems = () => {
        // Check if we're in a list and what kind
        const isInBulletList = editor.isActive("bulletList");
        const isInOrderedList = editor.isActive("orderedList");
        const isInListItem = editor.isActive("listItem");

        if (isInBulletList || isInOrderedList) {
          console.log("List state:", {
            bulletList: isInBulletList,
            orderedList: isInOrderedList,
            listItem: isInListItem,
            selectionEmpty: editor.state.selection.empty,
            html: editor.getHTML(),
          });
        }
      };

      // Track when selection changes
      editor.on("selectionUpdate", trackListItems);
      editor.on("update", trackListItems);

      return () => {
        editor.off("selectionUpdate", trackListItems);
        editor.off("update", trackListItems);
      };
    }
  }, [editor]);

  // Add selection tracking
  useEffect(() => {
    if (editor) {
      const handleSelectionUpdate = () => {
        const isEmpty = editor.state.selection.empty;
        setHasTextSelected(!isEmpty);

        if (!isEmpty) {
          const { from, to } = editor.state.selection;
          console.log(`Text selected: ${from} to ${to}`);
        }
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

  // Helper to check if a style is active - with better error handling
  const isStyleActive = (style: string, options = {}) => {
    try {
      return editor.isActive(style, options);
    } catch (error) {
      console.error(`Error checking if ${style} is active:`, error);
      return false;
    }
  };

  // Helper to check if text alignment is active
  const isTextAlignActive = (alignment: string) => {
    try {
      return editor.isActive({ textAlign: alignment });
    } catch (error) {
      console.error(
        `Error checking if text alignment ${alignment} is active:`,
        error
      );
      return false;
    }
  };

  const applyBold = () => {
    try {
      // Check if there's a text selection
      if (editor.state.selection.empty) {
        showNotification("Select text first to apply bold formatting");
        console.log("No text selected for formatting");
        return;
      }

      editor.chain().focus().toggleBold().run();
      console.log("Bold applied, current HTML:", editor.getHTML());
    } catch (error) {
      console.error("Error applying bold:", error);
    }
  };

  const applyItalic = () => {
    try {
      // Check if there's a text selection
      if (editor.state.selection.empty) {
        showNotification("Select text first to apply italic formatting");
        console.log("No text selected for formatting");
        return;
      }

      editor.chain().focus().toggleItalic().run();
      console.log("Italic applied, current HTML:", editor.getHTML());
    } catch (error) {
      console.error("Error applying italic:", error);
    }
  };

  const applyHeading = (level: Level) => {
    try {
      editor.chain().focus().toggleHeading({ level }).run();
      console.log(`Heading ${level} applied, current HTML:`, editor.getHTML());
    } catch (error) {
      console.error(`Error applying heading level ${level}:`, error);
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

      {/* Provide visual indication of active formatting */}
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
        {editorState.isHeading1 && (
          <span className="px-1 bg-purple-200 rounded">H1</span>
        )}
        {editorState.isHeading2 && (
          <span className="px-1 bg-pink-200 rounded">H2</span>
        )}
        {editorState.isBold && editorState.isItalic && (
          <span className="px-1 bg-red-200 rounded italic font-bold">B+I</span>
        )}
      </div>

      {editor && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 100 }}
          className="bg-white shadow-md rounded-lg flex overflow-hidden border border-gray-200"
          shouldShow={({ editor, view, state, oldState, from, to }) => {
            // Only show bubble menu if text is selected and not empty
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
            onClick={() => {
              if (!editor.state.selection.empty) {
                editor.chain().focus().toggleBold().run();
              }
            }}
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
            onClick={() => {
              if (!editor.state.selection.empty) {
                editor.chain().focus().toggleItalic().run();
              }
            }}
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
            onClick={() => editor.chain().focus().toggleBulletList().run()}
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
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Convert to numbered list"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
        </BubbleMenu>
      )}
      <div className="rich-editor-container rounded-md border bg-white">
        {/* Add a selection hint */}
        <div className="px-3 py-1 bg-gray-50 text-gray-500 text-xs border-b">
          Tip: Select specific text to format individual words or phrases
        </div>
        <div className="flex flex-wrap gap-1 p-2 border-b bg-gray-50">
          <Button
            variant="ghost"
            size="sm"
            onClick={applyBold}
            className={isStyleActive("bold") ? "bg-gray-200" : ""}
            aria-label="Bold"
            title="Bold (select text first to format only that text)"
          >
            <BoldIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={applyItalic}
            className={isStyleActive("italic") ? "bg-gray-200" : ""}
            aria-label="Italic"
            title="Italic (select text first to format only that text)"
          >
            <ItalicIcon className="h-4 w-4" />
          </Button>
          {/* Add a visual indicator for combined formatting */}
          {editor && editor.isActive("bold") && editor.isActive("italic") && (
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
              Combined Format
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => applyHeading(2 as Level)}
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
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={isStyleActive("bulletList") ? "bg-gray-200" : ""}
            aria-label="Bullet List"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
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
        <EditorContent editor={editor} className="editor-content" />
      </div>

      {/* Enhanced styles for nested formatting */}
      <style jsx global>{`
        .nested-format-active {
          background-color: rgba(59, 130, 246, 0.05);
        }

        /* Make nested formatting more visible */
        .ProseMirror strong em,
        .ProseMirror em strong,
        .ProseMirror b i,
        .ProseMirror i b {
          background-color: rgba(99, 102, 241, 0.1);
          padding: 0 2px;
          border-radius: 2px;
        }

        /* Highlight individual formatted words */
        .ProseMirror p strong,
        .ProseMirror p .format-bold {
          color: #1e40af;
          background-color: rgba(30, 64, 175, 0.05);
          padding: 0 1px;
          border-radius: 2px;
          border-bottom: 1px solid rgba(30, 64, 175, 0.2);
          display: inline;
        }

        .ProseMirror p em,
        .ProseMirror p .format-italic {
          color: #047857;
          background-color: rgba(4, 120, 87, 0.05);
          padding: 0 1px;
          border-radius: 2px;
          border-bottom: 1px solid rgba(4, 120, 87, 0.2);
          display: inline;
        }

        /* Show selection more clearly */
        .ProseMirror-selectednode {
          outline: 2px solid #60a5fa !important;
          border-radius: 2px;
        }

        /* Improve list styling */
        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.5em;
          margin: 0.5em 0;
        }

        .ProseMirror ul {
          list-style-type: disc;
        }

        .ProseMirror ol {
          list-style-type: decimal;
        }

        /* Style list items */
        .ProseMirror li {
          position: relative;
          padding: 0.2em 0;
          margin: 0.2em 0;
        }

        /* Style nested lists */
        .ProseMirror li ul,
        .ProseMirror li ol {
          margin: 0.2em 0 0.2em 1em;
        }

        /* Style formatting in list items */
        .ProseMirror li strong,
        .ProseMirror li em,
        .ProseMirror li b,
        .ProseMirror li i {
          display: inline-block;
          position: relative;
        }

        /* Add subtle indicator for formatted list items */
        .ProseMirror li:has(strong, em, b, i) {
          border-left: 2px solid rgba(99, 102, 241, 0.3);
          padding-left: 4px;
          margin-left: -6px;
        }

        /* Special style for lists with nested formatting */
        .bullet-list-container:has(strong, em, b, i),
        .ordered-list-container:has(strong, em, b, i) {
          border-left: 2px solid rgba(99, 102, 241, 0.2);
          padding-left: 6px;
          border-radius: 4px;
        }

        /* Base ProseMirror styles */
        .ProseMirror {
          min-height: 150px;
        }

        /* List styling */
        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.5rem;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .ProseMirror ul {
          list-style-type: disc;
        }

        .ProseMirror ol {
          list-style-type: decimal;
        }

        .ProseMirror li {
          margin-bottom: 0.3rem;
        }

        /* Nested list styling */
        .ProseMirror li > ul,
        .ProseMirror li > ol {
          margin-top: 0.3rem;
          margin-bottom: 0.3rem;
        }

        /* Visual indicators for formatted list items */
        .ProseMirror li strong {
          font-weight: 700;
          color: #1e40af;
          background-color: rgba(30, 64, 175, 0.05);
          padding: 0 2px;
          border-radius: 2px;
        }

        .ProseMirror li em {
          font-style: italic;
          color: #047857;
          background-color: rgba(4, 120, 87, 0.05);
          padding: 0 2px;
          border-radius: 2px;
        }

        /* Style nested formatting in lists */
        .ProseMirror li strong em,
        .ProseMirror li em strong {
          color: #be185d;
          background-color: rgba(190, 24, 93, 0.05);
          padding: 0 2px;
          border-radius: 2px;
        }

        /* Add additional CSS for preservation of list markers */
        .ProseMirror ul,
        .ProseMirror ol {
          list-style-position: outside !important;
          padding-left: 1.5em !important;
        }

        /* Ensure list markers remain visible */
        .ProseMirror ol {
          list-style-type: decimal !important;
          counter-reset: list-counter !important;
        }

        .ProseMirror ol > li {
          display: list-item !important;
          counter-increment: list-counter !important;
        }

        .ProseMirror ol > li::before {
          content: counter(list-counter) "." !important;
          position: absolute !important;
          left: -1.5em !important;
          width: 1.2em !important;
          text-align: right !important;
        }

        /* Specific styling for individual formatting */
        .ProseMirror p .format-bold,
        .ProseMirror p strong {
          font-weight: bold;
          display: inline;
        }

        .ProseMirror p .format-italic,
        .ProseMirror p em {
          font-style: italic;
          display: inline;
        }

        /* Fix for selection-based formatting */
        .ProseMirror p {
          white-space: pre-wrap;
        }

        /* Style Selections */
        .ProseMirror ::selection {
          background: rgba(59, 130, 246, 0.2);
        }

        /* Make the editor show the cursor as a text input */
        .ProseMirror {
          cursor: text;
        }
      `}</style>

      {/* Debug panel - remove in production */}
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
                Bold: {editor?.isActive("bold") ? "Active" : "Inactive"}
              </div>
              <div>
                Italic: {editor?.isActive("italic") ? "Active" : "Inactive"}
              </div>
              <div>
                Combined:{" "}
                {editor?.isActive("bold") && editor?.isActive("italic")
                  ? "Active"
                  : "Inactive"}
              </div>
            </div>
          </details>
          <details>
            <summary>List Formatting Status</summary>
            <div className="mt-2 p-2 bg-gray-100 rounded">
              <div>
                Bullet List:{" "}
                {editor?.isActive("bulletList") ? "Active" : "Inactive"}
              </div>
              <div>
                Ordered List:{" "}
                {editor?.isActive("orderedList") ? "Active" : "Inactive"}
              </div>
              <div>
                Bold in List:{" "}
                {editor?.isActive("bulletList") && editor?.isActive("bold")
                  ? "Active"
                  : "Inactive"}
              </div>
              <div>
                Italic in List:{" "}
                {editor?.isActive("bulletList") && editor?.isActive("italic")
                  ? "Active"
                  : "Inactive"}
              </div>
            </div>
          </details>
          <details className="mt-1 text-xs border-t border-gray-100 pt-1">
            <summary className="cursor-pointer text-gray-400">
              Debug Format Status
            </summary>
            <div className="p-1 mt-1 bg-gray-50 rounded text-xs">
              <div>Bold Active: {editor?.isActive("bold") ? "Yes" : "No"}</div>
              <div>
                Italic Active: {editor?.isActive("italic") ? "Yes" : "No"}
              </div>
              <div>
                List Active:{" "}
                {editor?.isActive("bulletList") ||
                editor?.isActive("orderedList")
                  ? "Yes"
                  : "No"}
              </div>
              <div>
                Mark Types:{" "}
                {editor?.extensionManager.extensions
                  .filter((ext) => ext.type === "mark")
                  .map((ext) => ext.name)
                  .join(", ")}
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default RichTextEditor;
