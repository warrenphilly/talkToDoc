'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ArrowLeft, ArrowRight } from 'lucide-react'

interface PageCarouselProps {
  items: Array<{
    id: string | number
    content: React.ReactNode
  }>
}

export default function PageCarousel({ items }: PageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : items.length - 1))
  }

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex < items.length - 1 ? prevIndex + 1 : 0))
  }

  return (
    <div className="relative w-full max-w-md mx-auto h-[400px]">
      <AnimatePresence>
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            className="absolute w-full"
            initial={{ scale: 0.8, translateY: 50, opacity: 0 }}
            animate={{
              scale: index === currentIndex ? 1 : 0.8,
              translateY: index === currentIndex ? 0 : 50,
              opacity: index === currentIndex ? 1 : 0,
              zIndex: items.length - index,
            }}
            exit={{ scale: 0.8, translateY: 50, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="w-full h-[400px] overflow-hidden shadow-lg">
              <CardContent className="p-6 h-full flex items-center justify-center">
                {item.content}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
      <Button
        variant="outline"
        size="icon"
        onClick={goToPrevious}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
        aria-label="Previous page"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={goToNext}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10"
        aria-label="Next page"
      >
        <ArrowRight className="h-4 w-4" />
      </Button>
      <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
        <Button
          variant="outline"
          size="icon"
          onClick={goToPrevious}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={goToNext}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

