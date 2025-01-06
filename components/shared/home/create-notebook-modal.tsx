"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { createNewNotebook } from "@/lib/firebase/firestore";

interface CreateNotebookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateNotebookModal({ isOpen, onClose }: CreateNotebookModalProps) {
  const [title, setTitle] = useState("");
  const router = useRouter();

  const handleCreate = async () => {
    if (!title.trim()) return;
    
    try {
      const notebookId = await createNewNotebook(title);
      onClose();
      router.push(`/notes/${notebookId}`);
    } catch (error) {
      console.error("Error creating notebook:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Notebook</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Input
            placeholder="Enter notebook title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Button onClick={handleCreate} className="w-full">
            Create Notebook
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}