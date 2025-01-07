'use client'

import { useState } from 'react'
import { PlusIcon, XIcon, SaveIcon } from 'lucide-react'
import { Separator } from '@radix-ui/react-separator'

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
  onSave: (data: ParagraphData) => void;
  messageIndex: number;
}

export default function ParagraphEditor({ onSave, messageIndex }: ParagraphEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [savedData, setSavedData] = useState<ParagraphData | null>(null)

  const handleSave = () => {
    const sentences = content
      .split('.')
      .filter(sentence => sentence.trim() !== '')
      .map((sentence, index) => ({
        id: index + 1,
        text: sentence.trim() + '.'
      }))

    const paragraphData: ParagraphData = {
      user: "AI",
      text: [{
        title,
        sentences
      }]
    }

    onSave(paragraphData);
    
    setSavedData(paragraphData)
    setIsEditing(false)
    console.log('Saved data:', paragraphData)
  }

  return (
    <div className="relative p-4 ">
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
        <div className="mt-4 space-y-4 transition-all duration-300 ease-in-out  b border border-[#94b347] rounded-2xl p-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-xl text-[#94b347] w-96 font-bold p-2 rounded-md bg-slate-100  focus:outline-none focus:ring-2 focus:ring-[#94b347]"
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
  )
}

