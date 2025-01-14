"use client"

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Maximize2, Minimize2 } from 'lucide-react'
import { Button } from "@/components/ui/button"

interface ExpandableContainerProps {
  children: React.ReactNode
  className?: string
}

export default function ExpandableContainer({ children, className = '' }: ExpandableContainerProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <motion.div
      className={`relative overflow-hidden bg-background ${className}`}
      animate={{
        height: isExpanded ? '100%' : '300px',
        width: isExpanded ? '100%' : '100%',
      }}
      transition={{ duration: 0.3 }}
    >
      <div className="h-full w-full overflow-auto p-4">
        {children}
      </div>
      <Button
        variant="outline"
        size="icon"
        className="absolute top-2 right-2 z-10"
        onClick={toggleExpand}
      >
        {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </Button>
    </motion.div>
  )
}

