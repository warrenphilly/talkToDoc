"use client"

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import { cn } from "@/lib/utils"
import { TitleEditor } from './shared/chat/title-editor'
import ChatClient from './shared/chat/ChatClient'

interface Tab {
  id: string
  title: string
  content: React.ReactNode
}

interface BrowserTabsProps {
  initialTabs: Tab[]
  className?: string
}

export const BrowserTabs: React.FC<BrowserTabsProps> = ({ initialTabs, className }) => {
  const [tabs, setTabs] = useState(initialTabs)
  const [activeTabId, setActiveTabId] = useState(tabs[0]?.id)

  const addTab = () => {
    const newTab = {
      id: `tab-${Date.now()}`,
      title: `Untitled Page ${tabs.length + 1}`,
      content: <div>Content for New Tab {tabs.length + 1}</div>
    }
    setTabs([...tabs, newTab])
    setActiveTabId(newTab.id)
  }

  const removeTab = (tabId: string) => {
    const newTabs = tabs.filter(tab => tab.id !== tabId)
    setTabs(newTabs)
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[newTabs.length - 1]?.id)
    }
  }

  const activeTab = tabs.find(tab => tab.id === activeTabId);

  return (
    <div className={cn("w-full h-full mx-auto  rounded-lg  bg-slate-200", className)}>
      <div className="flex items-center bg-slate-200  rounded-t-lg">
        {tabs.map((tab) => (
          <motion.div
            key={tab.id}
            layout
            className={cn(
              "flex items-center px-3 py-2 text-sm font-medium rounded-t-lg cursor-pointer",
              activeTabId === tab.id
                ? "bg-background text-foreground bg-slate-100 shadow-x-md"
                : "text-muted-foreground bg-slate-300"
            )}
            onClick={() => setActiveTabId(tab.id)}
          >
             <TitleEditor initialTitle={tab.title} noteId={tab.id} />
            <button
              className="ml-2 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation()
                removeTab(tab.id)
              }}
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
        <button
          className="p-1 ml-2 text-muted-foreground group relative flex items-center"
          onClick={addTab}
        >
          <Plus size={20} />
          <span className="absolute left-full ml-2 hidden group-hover:flex transition-opacity whitespace-nowrap text-sm text-slate-400">
            Add page
          </span>
        </button>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTabId}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="p-4 rounded-b-lg h-[calc(100vh-85px)] rounded-b-xl rounded-r-xl bg-slate-100"
        >
          <ChatClient title={activeTab?.title || ''} tabId={activeTab?.id || ''} />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
