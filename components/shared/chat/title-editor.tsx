"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/firebase";
import { updatePageTitle } from "@/lib/firebase/firestore";
import { doc, updateDoc } from "firebase/firestore";
import { useState } from "react";

interface TitleEditorProps {
  initialTitle: string;
  noteId: string;
  notebookId: string;
  onComplete?: (title: string) => void;
}

export const TitleEditor: React.FC<TitleEditorProps> = ({
  initialTitle,
  noteId,
  notebookId,
  onComplete,
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [isEditing, setIsEditing] = useState(false);

  const handleTitleChange = async (newTitle: string) => {
    try {
      await updatePageTitle(notebookId, noteId, newTitle);
      setTitle(newTitle);
      setIsEditing(false);
      onComplete?.(newTitle);
    } catch (error) {
      console.error("Error updating title:", error);
    }
  };

  return (
    <div className="flex gap-2 items-center w-full relative">
      
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onFocus={() => setIsEditing(true)}
        onBlur={(e) => {
          if (!e.relatedTarget?.classList.contains('save-button')) {
            setIsEditing(false);
            onComplete?.(title);
          }
        }}
        placeholder="Note Title"
        className="text-sm md:text-md bg-transparent m-1 border border-slate-200 rounded-lg shadow-none focus:ring-0 text-slate-900 font-bold w-full"
      />
      {isEditing && (
        <Button 
          onClick={() => handleTitleChange(title)}
          className="save-button bg-[#94b347] hover:bg-[#7a9339] text-white text-sm md:text-base whitespace-nowrap"
        >
          Save
        </Button>
      )}
    </div>
  );
};