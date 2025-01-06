"use client";

import { db } from "@/firebase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { doc, updateDoc } from "firebase/firestore";
import { useState } from "react";

interface TitleEditorProps {
  initialTitle: string;
  noteId: string;
}

export function TitleEditor({ initialTitle, noteId }: TitleEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = async () => {
    try {
      const noteRef = doc(db, "notes", noteId);
      await updateDoc(noteRef, {
        title: title,
      });
      setIsEditing(false);
      console.log("Title updated successfully");
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
          onClick={handleSave}
          className="save-button bg-[#94b347] hover:bg-[#7a9339] text-white"
        >
          Save
        </Button>
      )}
    </div>
  );
}