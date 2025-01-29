import { useState, useEffect } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { ChevronDown } from "lucide-react";

interface AccordionDemoProps {
  sections: {
    id: string;
    title: string;
    content: React.ReactNode;
  }[];
}

export function AccordionDemo({ sections }: AccordionDemoProps) {
  const isLargeScreen = useMediaQuery("(min-width: 1024px)")
  const [openItems, setOpenItems] = useState<string[]>([])

  useEffect(() => {
    if (isLargeScreen) {
      setOpenItems(sections.map(section => section.id))
    } else {
      setOpenItems([])
    }
  }, [isLargeScreen, sections])

  return (
    <Accordion type="multiple" value={openItems} onValueChange={setOpenItems} className="w-full">
      {sections.map((section) => (
        <AccordionItem key={section.id} value={section.id}>
          <AccordionTrigger >
            <div className="flex flex-col items-center justify-center w-full">
              <h2 className="text-lg font-semibold">{section.title}</h2>
            
              
            </div>
          </AccordionTrigger>
          <AccordionContent>{section.content}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

