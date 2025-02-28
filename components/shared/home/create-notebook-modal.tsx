"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createNewNotebook, addPageToNotebook } from "@/lib/firebase/firestore";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
      // Create the notebook
      const notebookId = await createNewNotebook(title);
      
      // Create a default page
      // await addPageToNotebook(notebookId, 
      // "Untitled Page",
        
      // );

      onClose();
      router.refresh();
      router.push(`/notes/${notebookId}`);
    } catch (error) {
      console.error("Error creating notebook:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-100 flex flex-col items-center justify-center">
        <DialogHeader>
          <DialogTitle>Create New Notebook</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4 flex flex-col gap-4 ">
          <Input
            placeholder="Enter notebook title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className='w-full'
          />
          <Button onClick={handleCreate} disabled={title === ""} className='rounded-full w-full border border-[#94b347] bg-slate-100 text-white hover:bg-slate-100 hover:text-[#94b347] '  >
            Create Notebook
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}