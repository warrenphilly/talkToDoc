import { useState, useEffect } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { ChevronDown, CirclePlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button"

interface AccordionDemoProps {
  sections: {
    id: string;
    title: string;
    content: React.ReactNode;
    button?: {
      label: string;
      onClick: () => void;
    };
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
          <AccordionTrigger className="flex justify-between">
            <div className="flex items-center justify-between w-full">
            {section.button && (
            
                  <CirclePlus className="h-6 w-6 text-slate-400 hover:text-[#94b347] " onClick={(e) => {
                    e.stopPropagation(); // Prevent accordion from toggling
                    section.button?.onClick();
                  }} />
             
              )}
              <span>{section.title}</span>
              <div></div>
             
            </div>
          </AccordionTrigger>
          <AccordionContent>{section.content}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

