'use client'

import { useState, useEffect } from 'react'
import { PlusIcon, XIcon, SaveIcon } from 'lucide-react'

interface ParagraphData {
  user: string
  text: {
    title: string
    sentences: {
      id: number
      text: string
    }[]
  }[]
}

interface ParagraphEditorProps {
  onSave: (data: ParagraphData, index: number) => void;
  onDelete?: () => void;
  messageIndex: number;
  initialData?: ParagraphData;
}

export default function ParagraphEditor({ 
  onSave, 
  messageIndex, 
  initialData 
}: ParagraphEditorProps) {
  // Start in editing mode only if we're editing an existing paragraph
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [savedData, setSavedData] = useState<ParagraphData | null>(initialData || null)

  // Parse initial data into content when component mounts or when editing starts
  useEffect(() => {
    if (initialData?.text[0]) {
      const sentences = initialData.text[0].sentences;
      const combinedContent = sentences
        .map(s => s.text.replace(/\.$/, '')) // Remove trailing periods
        .join('. ') + '.'; // Add period at the end
      
      setContent(combinedContent);
      setTitle(initialData.text[0].title);
      setIsEditing(true); // Only set editing to true when we have initial data
    }
  }, [initialData]);

  const handleSave = () => {
    const sentences = content
      .split('.')
      .filter(sentence => sentence.trim() !== '')
      .map((sentence, index) => ({
        id: index + 1,
        text: sentence.trim() + '.'
      }));

    const paragraphData: ParagraphData = {
      user: "AI",
      text: [{
        title,
        sentences
      }]
    };

    onSave(paragraphData, messageIndex);
    setSavedData(paragraphData);
    setIsEditing(false);
    // Reset form if this was a new paragraph
    if (!initialData) {
      setTitle('');
      setContent('');
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
        <div className="flex-grow h-px bg-gray-200 ml-2" />
      </div>

      {isEditing && (
        <div className="mt-4 space-y-4 transition-all duration-300 ease-in-out border border-[#94b347] rounded-2xl p-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-xl text-[#94b347] font-bold p-2 rounded-md bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#94b347]"
            placeholder="Enter paragraph title"
          />
          <div className="w-full h-px bg-slate-300" />
          
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full p-2 rounded-md bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#94b347]"
            placeholder="Type your paragraph here..."
            rows={5}
          />
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

