'use client'

import { useState } from 'react'
import { PlusIcon, XIcon, BoldIcon, ItalicIcon, UnderlineIcon } from 'lucide-react'

export default function SeparatorWithAddButton() {
  const [isHovered, setIsHovered] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState('')

  const handleMouseEnter = () => setIsHovered(true)
  const handleMouseLeave = () => setIsHovered(false)
  const handleClick = () => setIsEditing(true)
  const handleClose = () => {
    setIsEditing(false)
    setText('')
  }

  const applyFormatting = (format: string) => {
    const textarea = document.getElementById('paragraph-textarea') as HTMLTextAreaElement
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = text.substring(start, end)
    const beforeText = text.substring(0, start)
    const afterText = text.substring(end)

    let formattedText = ''
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`
        break
      case 'italic':
        formattedText = `*${selectedText}*`
        break
      case 'underline':
        formattedText = `__${selectedText}__`
        break
      default:
        formattedText = selectedText
    }

    setText(beforeText + formattedText + afterText)
  }

  return (
    <div className="relative py-4">
      <div className="flex items-center">
        <div className="relative">
          <button
            onClick={isEditing ? handleClose : handleClick}
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
          {!isEditing && isHovered && (
            <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 text-sm text-gray-500 whitespace-nowrap transition-opacity duration-300 ease-in-out">
              Add paragraph
            </span>
          )}
        </div>
        <div className="flex-grow h-px bg-gray-200 ml-2" />
      </div>
      {isEditing && (
        <div className="mt-2 space-y-2 transition-all duration-300 ease-in-out">
          <div className="flex items-center space-x-2 mb-2">
            <button onClick={() => applyFormatting('bold')} className="p-1 hover:bg-gray-200 rounded transition-colors duration-150 ease-in-out">
              <BoldIcon className="w-4 h-4" />
            </button>
            <button onClick={() => applyFormatting('italic')} className="p-1 hover:bg-gray-200 rounded transition-colors duration-150 ease-in-out">
              <ItalicIcon className="w-4 h-4" />
            </button>
            <button onClick={() => applyFormatting('underline')} className="p-1 hover:bg-gray-200 rounded transition-colors duration-150 ease-in-out">
              <UnderlineIcon className="w-4 h-4" />
            </button>
          </div>
          <textarea
            id="paragraph-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#94b347] transition-all duration-300 ease-in-out"
            style={{ border: '1px solid #94b347' }}
            placeholder="Type your paragraph here..."
            rows={3}
          />
        </div>
      )}
    </div>
  )
}

