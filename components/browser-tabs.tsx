"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addPageToNotebook,
  deleteNotebook,
  deletePage,
  Page,
  togglePageOpenState,
  updateNotebookTitle,
} from "@/lib/firebase/firestore";
import { Message } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { List, Pencil, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import ChatClient from "./shared/chat/ChatClient";
import { TitleEditor } from "./shared/chat/title-editor";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";

interface Tab {
  id: string;
  title: string;
  content: React.ReactNode;
  messages: Message[];
  isOpen: boolean;
  isEditing?: boolean;
}

interface BrowserTabsProps {
  notebookId: string;
  notebookTitle: string;
  initialTabs: Tab[];
  className?: string;
  onNotebookDelete?: (notebookId: string) => void;
}

export const BrowserTabs: React.FC<BrowserTabsProps> = ({
  notebookId,
  notebookTitle,
  initialTabs,
  className,
  onNotebookDelete,
}) => {
  const [tabs, setTabs] = useState(initialTabs);
  const [activeTabId, setActiveTabId] = useState(tabs[0]?.id);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [allPages, setAllPages] = useState<Tab[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(notebookTitle);
  const router = useRouter();

  useEffect(() => {
    setAllPages(initialTabs);
  }, [initialTabs]);

  useEffect(() => {
    const openPages = initialTabs.filter((tab) => tab.isOpen);
    const convertedTabs: Tab[] = openPages.map((page) => ({
      id: page.id,
      title: page.title,
      content: (
        <ChatClient
          title={page.title}
          tabId={page.id}
          notebookId={notebookId}
          onPageDelete={syncTabs}
        />
      ),
      messages: page.messages,
      isOpen: page.isOpen,
      isEditing: false,
    }));

    setTabs(convertedTabs);

    if (convertedTabs.length > 0) {
      setActiveTabId(convertedTabs[0].id);
    }
  }, [initialTabs, notebookId]);

  useEffect(() => {
    if (tabs.length === 0) {
      createNewTab();
    }
  }, [tabs]);

  const createNewTab = async () => {
    const timestamp = new Date().toISOString();
    const newTitle = `Untitled Page ${tabs.length + 1}`;
    try {
      const newPage = await addPageToNotebook(notebookId, newTitle);
      const newTab: Tab = {
        id: newPage.id,
        title: newPage.title,
        content: (
          <ChatClient
            title={newPage.title}
            tabId={newPage.id}
            notebookId={notebookId}
            onPageDelete={syncTabs}
          />
        ),
        messages: [],
        isOpen: true,
        isEditing: false,
      };
      setTabs([newTab]);
      setActiveTabId(newPage.id);
    } catch (error) {
      console.error("Error creating new tab:", error);
    }
  };

  const addTab = async () => {
    const newTitle = `Untitled Page ${tabs.length + 1}`;
    try {
      // Create new page object before database call for optimistic update
      const tempId = `temp_${crypto.randomUUID()}`;
      const tempNewTab: Tab = {
        id: tempId,
        title: newTitle,
        content: (
          <ChatClient
            title={newTitle}
            tabId={tempId}
            notebookId={notebookId}
            onPageDelete={syncTabs}
          />
        ),
        messages: [],
        isOpen: true,
        isEditing: false,
      };

      // Optimistically update UI
      setAllPages((prev) => [...prev, tempNewTab]);
      setTabs((prev) => [...prev, tempNewTab]);
      setActiveTabId(tempId);

      // Actually create the page in the database
      const newPage = await addPageToNotebook(notebookId, newTitle);

      // Update the temporary ID with the real one
      const finalNewTab: Tab = {
        ...tempNewTab,
        id: newPage.id,
        content: (
          <ChatClient
            title={newTitle}
            tabId={newPage.id}
            notebookId={notebookId}
            onPageDelete={syncTabs}
          />
        ),
      };

      // Update states with the real ID
      setAllPages((prev) =>
        prev.map((tab) => (tab.id === tempId ? finalNewTab : tab))
      );
      setTabs((prev) =>
        prev.map((tab) => (tab.id === tempId ? finalNewTab : tab))
      );
      setActiveTabId(newPage.id);
    } catch (error) {
      console.error("Error adding new tab:", error);
      alert("Failed to create new page. Please try again.");
      // Revert optimistic updates on error
      router.refresh();
    }
  };

  const removeTab = async (tabId: string) => {
    await togglePageOpenState(notebookId, tabId, false);
    const newTabs = tabs.filter((tab) => tab.id !== tabId);
    setTabs(newTabs);

    if (activeTabId === tabId) {
      const removedTabIndex = tabs.findIndex((tab) => tab.id === tabId);
      const newActiveIndex = Math.max(0, removedTabIndex - 1);
      setActiveTabId(newTabs[newActiveIndex]?.id);
    }
  };

  const syncTabs = (deletedPageId: string) => {
    removeTab(deletedPageId);
  };

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  const handlePageToggle = async (pageId: string) => {
    const page = allPages.find((p) => p.id === pageId);
    if (!page) return;

    try {
      setAllPages((prevPages) =>
        prevPages.map((p) =>
          p.id === pageId ? { ...p, isOpen: !p.isOpen } : p
        )
      );

      if (page.isOpen) {
        setTabs((prevTabs) => prevTabs.filter((tab) => tab.id !== pageId));
        await togglePageOpenState(notebookId, pageId, false);
      } else {
        const newTab: Tab = {
          id: page.id,
          title: page.title,
          content: (
            <ChatClient
              title={page.title}
              tabId={page.id}
              notebookId={notebookId}
              onPageDelete={syncTabs}
            />
          ),
          messages: page.messages,
          isOpen: true,
          isEditing: false,
        };
        setTabs((prevTabs) => [...prevTabs, newTab]);
        setActiveTabId(page.id);
        await togglePageOpenState(notebookId, pageId, true);
      }
    } catch (error) {
      console.error("Error toggling page:", error);
      router.refresh();
    }
  };

  const handleDeleteNotebook = async () => {
    try {
      await deleteNotebook(notebookId);
      onNotebookDelete?.(notebookId);
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Error deleting notebook:", error);
    }
  };

  const handleDeletePage = async (pageId: string) => {
    try {
      if (activeTabId === pageId) {
        const currentIndex = tabs.findIndex((tab) => tab.id === pageId);
        const previousTab = tabs[currentIndex - 1] || tabs[currentIndex + 1];

        if (previousTab) {
          setActiveTabId(previousTab.id);
        }
      }

      setAllPages((prevPages) =>
        prevPages.filter((page) => page.id !== pageId)
      );
      setTabs((prevTabs) => prevTabs.filter((tab) => tab.id !== pageId));

      const { newPageId, isNewPage } = await deletePage(notebookId, pageId);

      if (isNewPage) {
        router.refresh();
      }
    } catch (error) {
      console.error("Error deleting page:", error);
      router.refresh();
    }
  };

  const isMobileScreen = () =>
    typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <div
      className={cn(
        "w-full h-full mx-auto rounded-lg bg-white flex flex-col items-start justify-center pt-16 md:pt-4 ",
        className
      )}
    >
      <div className="p-2 rounded-lg relative top-[-10px] md:top-[-10px] gap-2 left-0 h-fit flex flex-row items-center justify-start w-fit">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="w-[200px]"
            />
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full hover:bg-green-100 hover:text-green-600"
              onClick={async () => {
                try {
                  await updateNotebookTitle(notebookId, editedTitle);
                  setIsEditing(false);
                  router.refresh();
                } catch (error) {
                  console.error("Error updating title:", error);
                  alert("Failed to update title. Please try again.");
                }
              }}
            >
              Save
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full hover:bg-red-100 hover:text-red-600"
              onClick={() => {
                setEditedTitle(notebookTitle);
                setIsEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-xl font-semibold text-slate-500">
              Title:{" "}
              <span className="font-medium text-[#94b347]">
                {notebookTitle}
              </span>
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-transparent hover:text-[#94b347]"
              onClick={() => setIsEditing(true)}
            >
              <Pencil size={16} />
            </Button>
          </div>
        )}
      </div>
      <div className="flex  items-center z-50 h-fit w-full rounded-t-lg scrollbar-hide">
        <div className="md:hidden flex justify-between w-full items-center gap-2 pb-2  ">
          {activeTab &&
            (activeTab.isEditing ? (
              <div className="flex items-center gap-2 w-full max-w-[200px]">
                <TitleEditor
                  initialTitle={activeTab.title}
                  noteId={activeTab.id}
                  notebookId={notebookId}
                  onComplete={(newTitle) => {
                    setTabs(prev => 
                      prev.map(tab => 
                        tab.id === activeTab.id 
                          ? { ...tab, isEditing: false, title: newTitle } 
                          : tab
                      )
                    );
                  }}
                />
              </div>
            ) : (
              <>
                <Select
                  value={activeTabId}
                  onValueChange={(value) => setActiveTabId(value)}
                >
                  <SelectTrigger className="w-full max-w-[200px]">
                    <SelectValue placeholder="Select a page" />
                  </SelectTrigger>
                  <SelectContent>
                    {tabs.map((tab) => (
                      <SelectItem key={tab.id} value={tab.id}>
                        {tab.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <button
                    className="p-2 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setTabs((prev) =>
                        prev.map((tab) =>
                          tab.id === activeTab.id
                            ? { ...tab, isEditing: true }
                            : tab
                        )
                      );
                    }}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="p-2 text-muted-foreground hover:text-foreground"
                    onClick={addTab}
                  >
                    <Plus size={16} />
                  </button>
                  <button
                    className="p-2 text-muted-foreground hover:text-foreground"
                    onClick={() => setIsModalOpen(true)}
                  >
                    <List size={16} />
                  </button>
                </div>
              </>
            ))}
        </div>
        <div className="hidden md:flex items-center w-full">
          {tabs.map((tab) => (
            <motion.div
              key={tab.id}
              layout
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium relative top-[1px] rounded-t-lg cursor-pointer min-w-[150px] max-w-none",
                activeTabId === tab.id
                  ? "text-foreground border-t border-b border-b-white border-r border-r-slate-300 border-l border-l-slate-300 bg-white shadow-x-md"
                  : "text-muted-foreground bg-slate-100 border-t border-b border-b-white border-r border-r-slate-300 border-l border-l-slate-300"
              )}
              onClick={() => setActiveTabId(tab.id)}
            >
              <TitleEditor
                initialTitle={tab.title}
                noteId={tab.id}
                notebookId={notebookId}
              />
              <button
                className="ml-2 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTab(tab.id);
                }}
              >
                <X size={14} className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
          <button
            className="p-1 ml-2 text-muted-foreground group relative flex items-center"
            onClick={addTab}
          >
            <Plus size={14} className="w-5 h-5" />
            <span className="absolute left-full ml-2 hidden group-hover:flex transition-opacity whitespace-nowrap text-sm text-slate-400">
              Add page
            </span>
          </button>
          <button
            className="p-1 ml-auto mr-2 text-muted-foreground hover:text-foreground"
            onClick={() => setIsModalOpen(true)}
          >
            <List size={14} className="w-5 h-5" />
          </button>
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTabId}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className=" h-[90vh] rounded-l-xl md:rounded-l-none rounded-r-xl rounded-b-xl w-full bg-white overflow-hidden md:border border-slate-300 z-10 "
        >
          <ChatClient
            title={activeTab?.title || ""}
            tabId={activeTab?.id || ""}
            notebookId={notebookId}
            onPageDelete={syncTabs}
          />
        </motion.div>
      </AnimatePresence>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white">
          <DialogHeader>
            <DialogTitle>All Pages</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[300px] w-full pr-4">
            <div className="flex justify-end mb-4">
              <button
                className="bg-white border border-[#94b347] hover:bg-[#c6d996] text-[#94b347] rounded-full  hover:text-white px-3 py-1 text-sm flex items-center gap-1"
                onClick={addTab}
              >
                <Plus size={16} />
                New Page
              </button>
            </div>
            {allPages.map((page) => (
              <div
                key={page.id}
                className="flex items-center justify-between py-2 border-b"
              >
                <span>{page.title}</span>
                <div className="flex gap-2">
                  <button
                    className="bg-white border border-slate-300 hover:bg-slate-200 text-slate-500 hover:text-slate-700  rounded-full px-2 py-1 text-sm"
                    onClick={() => handlePageToggle(page.id)}
                  >
                    {page.isOpen ? "Close" : "Open"}
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="bg-white border border-red-600  text-red-600 rounded-full  hover:bg-red-200 px-2 py-1 text-sm">
                        Delete
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-white">
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Are you sure you want to delete this page?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-white rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-700 ">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeletePage(page.id)}
                          className="bg-white border border-red-600 hover:bg-red-200 text-red-600 rounded-full  "
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </ScrollArea>
          <div className="mt-4 pt-4 border-t">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="rounded-full bg-white border border-red-600 w-full px-4 py-2 text-sm bg-red-100 text-red-600  hover:bg-red-200">
                  Delete Notebook
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Are you sure you want to delete this notebook?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    your notebook and all its pages.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteNotebook}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
