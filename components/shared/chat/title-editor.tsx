"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/firebase";
import { updatePageTitle } from "@/lib/firebase/firestore";
import { doc, updateDoc } from "firebase/firestore";
import { Check, Pencil, X } from "lucide-react";
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
  const [editedTitle, setEditedTitle] = useState(initialTitle);

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

  const startEditing = () => {
    setEditedTitle(title);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditedTitle(title);
    setIsEditing(false);
  };

  return (
    <div className="flex gap-2 items-center w-full relative">
      {isEditing ? (
        <>
          <Input
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            autoFocus
            placeholder="Note Title"
            className="text-sm md:text-md bg-transparent m-1 border border-slate-200 rounded-lg shadow-none focus:ring-0 text-slate-900 font-medium w-full"
          />
          <div className="flex gap-1">
            <Button
              onClick={() => handleTitleChange(editedTitle)}
              className="save-button p-1 h-7 w-7 bg-green-50 hover:bg-green-100 text-green-600 rounded-full "
              size="icon"
            >
              <Check size={14} />
            </Button>
            <Button
              onClick={cancelEditing}
              className="cancel-button p-1 h-7 w-7 bg-red-50 hover:bg-red-100 text-red-600 rounded-full"
              size="icon"
            >
              <X size={14} />
            </Button>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between w-full">
          <span className="text-sm md:text-md text-slate-900 font-medium truncate px-1">
            {title}
          </span>
          <Button
            onClick={startEditing}
            className="edit-button p-1 h-6 w-6 bg-transparent hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full ml-1 shadow-none"
            size="icon"
          >
            <Pencil size={12} />
          </Button>
        </div>
      )}
    </div>
  );
};
