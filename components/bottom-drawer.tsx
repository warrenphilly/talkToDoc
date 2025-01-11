'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Maximize2, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BottomDrawerProps {
  children: React.ReactNode
}

export function BottomDrawer({ children }: BottomDrawerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const drawerVariants = {
    collapsed: {
      height: '30vh',
      width: '100%',
      borderTopLeftRadius: '1rem',
      borderTopRightRadius: '1rem',
    },
    fullscreen: {
      height: '100vh',
      width: '100%',
      borderRadius: 0,
    },
  }

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 bg-background shadow-lg overflow-hidden"
      initial="collapsed"
      animate={isFullscreen ? 'fullscreen' : 'collapsed'}
      variants={drawerVariants}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="relative w-full h-full p-4">
        <Button
          className="absolute top-2 right-2 z-10"
          size="icon"
          variant="outline"
          onClick={toggleFullscreen}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
        <div className="w-full h-full overflow-auto">
          {children}
        </div>
      </div>
    </motion.div>
  )
}

