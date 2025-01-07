"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { createNewNotebook } from "@/lib/firebase/firestore";
import { revalidatePath } from "next/cache";

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
      revalidatePath("/notes");
      router.push(`/notes/${notebookId}`);
    } catch (error) {
      console.error("Error creating notebook:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-100">
        <DialogHeader>
          <DialogTitle>Create New Notebook</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Input
            placeholder="Enter notebook title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Button onClick={handleCreate} className={`w-full  ${title ==="" ? "text-slate-400 bg-slate-200" : "text-slate-800 bg-[#94b347] "}  hover:border hover:border-[#94b347] `}>
            Create Notebook
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}