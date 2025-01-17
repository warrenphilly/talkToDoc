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
}

export const TitleEditor: React.FC<TitleEditorProps> = ({
  initialTitle,
  noteId,
  notebookId,
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [isEditing, setIsEditing] = useState(false);

  const handleTitleChange = async (newTitle: string) => {
    try {
      await updatePageTitle(notebookId, noteId, newTitle);
      setTitle(newTitle);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating title:", error);
    }
  };

  return (
    <div className="flex gap-2 items-center">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onFocus={() => setIsEditing(true)}
        onBlur={(e) => {
          // Only hide the save button if we're not clicking it
          if (!e.relatedTarget?.classList.contains('save-button')) {
            setIsEditing(false);
          }
        }}
        placeholder="Note Title"
        className="text-4xl bg-transparent border-none shadow-none focus:ring-0 text-slate-900 font-bold"
      />
      {isEditing && (
        <Button 
          onClick={() => handleTitleChange(title)}
          className="save-button bg-[#94b347] hover:bg-[#7a9339] text-white"
        >
          Save
        </Button>
      )}
    </div>
  );
};