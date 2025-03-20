'use client'

import { useState, useEffect, useRef } from 'react'
import { PlusIcon, XIcon, SaveIcon } from 'lucide-react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import CodeBlock from '@tiptap/extension-code-block'
import Heading from '@tiptap/extension-heading'
import Placeholder from '@tiptap/extension-placeholder' 
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'

// Make sure this matches the type in lib/types.ts
type FormatType = "bold" | "heading" | "italic" | "paragraph" | "bullet" | "numbered" | "formula" | "rich-text";

interface ParagraphData {
  user: string
  text: {
    title: string
    sentences: {
      id: number
      text: string
      format?: FormatType
    }[]
  }[]
}

interface ParagraphEditorProps {
  onSave: (data: ParagraphData, index: number) => void;
  onDelete?: () => void;
  messageIndex: number;
  initialData?: ParagraphData;
}

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
          className={`p-1 rounded-md ${editor.isActive('bold') ? 'bg-slate-200' : 'hover:bg-slate-100'}`}
          title="Bold"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" 
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
            <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
          </svg>
        </button>
        
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1 rounded-md ${editor.isActive('italic') ? 'bg-slate-200' : 'hover:bg-slate-100'}`}
          title="Italic"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" 
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="4" x2="10" y2="4"></line>
            <line x1="14" y1="20" x2="5" y2="20"></line>
            <line x1="15" y1="4" x2="9" y2="20"></line>
          </svg>
        </button>
        
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-1 rounded-md ${editor.isActive('underline') ? 'bg-slate-200' : 'hover:bg-slate-100'}`}
          title="Underline"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" 
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"></path>
            <line x1="4" y1="21" x2="20" y2="21"></line>
          </svg>
        </button>
      </div>
      
      {/* Heading controls */}
      <div className="flex items-center space-x-1 mr-2">
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-1 rounded-md ${editor.isActive('heading', { level: 3 }) ? 'bg-slate-200' : 'hover:bg-slate-100'}`}
          title="Heading"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" 
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          className={`p-1 rounded-md ${editor.isActive('bulletList') ? 'bg-slate-200' : 'hover:bg-slate-100'}`}
          title="Bullet List"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" 
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          className={`p-1 rounded-md ${editor.isActive('orderedList') ? 'bg-slate-200' : 'hover:bg-slate-100'}`}
          title="Numbered List"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" 
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      
      {/* Code and formula controls */}
      <div className="flex items-center space-x-1">
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`p-1 rounded-md ${editor.isActive('codeBlock') ? 'bg-slate-200' : 'hover:bg-slate-100'}`}
          title="Code Block (for formulas)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" 
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
          </svg>
        </button>
        
        {/* Special button for LaTeX/Math formulas */}
        <button
          onClick={() => {
            // Insert a code block and mark it as a formula
            editor.chain().focus().setCodeBlock().run();
            const selection = editor.state.selection;
            if (selection) {
              editor.view.dispatch(
                editor.state.tr.setNodeMarkup(selection.from, undefined, {
                  class: 'math-formula'
                })
              );
            }
          }}
          className={`p-1 rounded-md hover:bg-slate-100`}
          title="Math Formula"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" 
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18"></path>
            <path d="M7 12h10"></path>
            <path d="M5 18h14"></path>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default function ParagraphEditor({ 
  onSave, 
  messageIndex, 
  initialData 
}: ParagraphEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [savedData, setSavedData] = useState<ParagraphData | null>(initialData || null);
  // Store original formats for reconstruction
  const [originalFormats, setOriginalFormats] = useState<Map<number, FormatType>>(new Map());
  const [formatMappings, setFormatMappings] = useState<Map<string, number[]>>(new Map());
  
  // Create the rich text editor instance
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [3], // We only need h3 for section headings
        },
      }),
      Underline,
      BulletList,
      OrderedList,
      ListItem,
      Bold,
      Italic,
      CodeBlock.configure({
        HTMLAttributes: {
          class: 'formula-block',
        },
      }),
      Heading.configure({
        levels: [3],
      }),
      Placeholder.configure({
        placeholder: 'Edit your content here...'
      }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      // You can add real-time tracking here if needed
    }
  });

  // Parse initial data when component mounts or when editing starts
  useEffect(() => {
    if (initialData?.text[0] && editor) {
      // Set the title
      setTitle(initialData.text[0].title);
      
      // Store original format information for reconstruction
      const formats = new Map<number, FormatType>();
      const mappings = new Map<string, number[]>();
      
      initialData.text[0].sentences.forEach((sentence, idx) => {
        if (sentence.format) {
          formats.set(idx, sentence.format);
          
          // Group by format for bulk processing
          const existingIdxs = mappings.get(sentence.format) || [];
          mappings.set(sentence.format, [...existingIdxs, idx]);
        }
      });
      
      setOriginalFormats(formats);
      setFormatMappings(mappings);
      
      // Convert to HTML for the editor
      let htmlContent = parseContentToHTML(initialData.text[0].sentences);
      
      // Set the content in the editor
      editor.commands.setContent(htmlContent);
      
      setIsEditing(true);
    }
  }, [initialData, editor]);

  // Helper function to convert sentences with their formats to HTML
  const parseContentToHTML = (sentences: Array<{id: number, text: string, format?: FormatType}>) => {
    let htmlContent = '';
    let isInBulletList = false;
    let isInNumberedList = false;
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const format = sentence.format || 'paragraph';
      const text = sentence.text;
      
      // Handle list transitions
      if (format !== 'bullet' && isInBulletList) {
        htmlContent += '</ul>';
        isInBulletList = false;
      }
      
      if (format !== 'numbered' && isInNumberedList) {
        htmlContent += '</ol>';
        isInNumberedList = false;
      }
      
      // Process based on format
      switch (format) {
        case 'rich-text':
          // Already HTML, include directly
          htmlContent += text;
          break;
          
        case 'bullet':
          if (!isInBulletList) {
            htmlContent += '<ul>';
            isInBulletList = true;
          }
          htmlContent += `<li>${text}</li>`;
          break;
          
        case 'numbered':
          if (!isInNumberedList) {
            htmlContent += '<ol>';
            isInNumberedList = true;
          }
          htmlContent += `<li>${text}</li>`;
          break;
          
        case 'heading':
          htmlContent += `<h3>${text}</h3>`;
          break;
          
        case 'bold':
          htmlContent += `<p><strong>${text}</strong></p>`;
          break;
          
        case 'italic':
          htmlContent += `<p><em>${text}</em></p>`;
          break;
          
        case 'formula':
          htmlContent += `<pre><code class="math-formula">${text}</code></pre>`;
          break;
          
        default: // paragraph
          htmlContent += `<p>${text}</p>`;
      }
    }
    
    // Close any open lists
    if (isInBulletList) {
      htmlContent += '</ul>';
    }
    
    if (isInNumberedList) {
      htmlContent += '</ol>';
    }
    
    return htmlContent;
  };

  // Helper function to analyze the editor content and reconstruct formatted sentences
  const parseHTMLToFormattedContent = () => {
    if (!editor) return [];
    
    const content = editor.getHTML();
    const sentences: Array<{id: number, text: string, format?: FormatType}> = [];
    
    // Create a temporary div to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    // Process the children
    let id = 1;
    
    Array.from(tempDiv.children).forEach(element => {
      let format: FormatType = 'paragraph';
      let text = element.innerHTML;
      
      // Determine format based on tag
      if (element.tagName === 'UL') {
        // Handle bullet lists
        Array.from(element.querySelectorAll('li')).forEach(li => {
          sentences.push({
            id: id++,
            text: li.innerHTML,
            format: 'bullet'
          });
        });
        return; // Skip further processing for this element
      } else if (element.tagName === 'OL') {
        // Handle numbered lists
        Array.from(element.querySelectorAll('li')).forEach(li => {
          sentences.push({
            id: id++,
            text: li.innerHTML,
            format: 'numbered'
          });
        });
        return; // Skip further processing for this element
      } else if (element.tagName === 'H3') {
        format = 'heading';
      } else if (element.tagName === 'PRE') {
        // Check for code/formula blocks
        const codeElement = element.querySelector('code');
        if (codeElement && codeElement.classList.contains('math-formula')) {
          format = 'formula';
          text = codeElement.innerHTML;
        }
      } else if (element.tagName === 'P') {
        // Check for bold/italic
        if (element.querySelector('strong')?.parentElement === element && element.childNodes.length === 1) {
          format = 'bold';
          text = element.querySelector('strong')!.innerHTML;
        } else if (element.querySelector('em')?.parentElement === element && element.childNodes.length === 1) {
          format = 'italic';
          text = element.querySelector('em')!.innerHTML;
        }
      }
      
      sentences.push({
        id: id++,
        text,
        format
      });
    });
    
    return sentences;
  };

  const handleSave = () => {
    if (!editor) return;
    
    const updatedSentences = parseHTMLToFormattedContent();
    
    // For an existing section with rich-text format, preserve that special handling
    if (initialData && originalFormats.size > 0 && formatMappings.get('rich-text')?.length) {
      // If the original had rich-text formatting, maintain it
      const paragraphData: ParagraphData = {
        user: "AI",
        text: [{
          title,
          sentences: [{
            id: 1,
            text: editor.getHTML(),
            format: "rich-text" as FormatType
          }]
        }]
      };
      
      onSave(paragraphData, messageIndex);
      setSavedData(paragraphData);
    } else {
      // Otherwise use our structured format
      const paragraphData: ParagraphData = {
        user: "AI",
        text: [{
          title,
          sentences: updatedSentences
        }]
      };
      
      onSave(paragraphData, messageIndex);
      setSavedData(paragraphData);
    }
    
    setIsEditing(false);
    
    // Reset for new content
    if (!initialData) {
      setTitle('');
      if (editor) {
        editor.commands.clearContent();
      }
    }
  };

  return (
    <div className="relative p-4">
      <div className="flex items-center">
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`flex items-center justify-center w-6 h-6 rounded-full transition-colors duration-300 ease-in-out ${
            isEditing ? 'bg-red-200 hover:bg-red-300' : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          {isEditing ? (
            <XIcon className="w-4 h-4 text-red-600" />
          ) : (
            <PlusIcon className="w-4 h-4 text-gray-600" />
          )}
        </button>
        {!isEditing && (
          <div className="flex-grow h-[1px] bg-gray-200 ml-2" />
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
          
          {/* Rich text editor toolbar */}
          {editor && <RichTextToolbar editor={editor} />}
          
          {/* Rich text editor content */}
          <div className="min-h-[150px] w-full p-2 rounded-md bg-slate-100 focus-within:ring-2 focus-within:ring-[#94b347]">
            <EditorContent editor={editor} className="prose max-w-none focus:outline-none min-h-[120px]" />
          </div>
          
          {/* Special styling for formulas in the editor */}
          <style jsx global>{`
            .ProseMirror .math-formula,
            .ProseMirror .formula-block {
              background-color: rgba(148, 179, 71, 0.1);
              border: 1px solid rgba(148, 179, 71, 0.2);
              border-radius: 0.375rem;
              padding: 0.5rem;
              font-family: monospace;
            }
            
            .ProseMirror h3 {
              color: #94b347;
              font-weight: bold;
              font-size: 1.25rem;
              margin-top: 1rem;
              margin-bottom: 0.5rem;
            }
            
            .ProseMirror ul li, .ProseMirror ol li {
              margin-left: 1.5rem;
            }
            
            .ProseMirror ul {
              list-style-type: disc;
            }
            
            .ProseMirror ol {
              list-style-type: decimal;
            }
          `}</style>
          
          <button
            onClick={handleSave}
            className="flex items-center justify-center px-4 py-2 bg-[#94b347] text-white rounded-md hover:bg-[#7a9339] transition-colors duration-300 ease-in-out"
          >
            <SaveIcon className="w-4 h-4 mr-2" />
            Save
          </button>
        </div>
      )}
    </div>
  );
}

