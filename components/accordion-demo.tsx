import { useState, useEffect } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { ChevronDown, CirclePlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button"
import { CircularProgress } from "@mui/material"

interface AccordionDemoProps {
  sections: {
    id: string;
    title: string;
    content: React.ReactNode;
    button?: {
      label: string;
      onClick: () => void;
    };
    loading?: boolean;
  }[];
}

export function AccordionDemo({ sections }: AccordionDemoProps) {
  const isLargeScreen = useMediaQuery("(min-width: 1024px)")
  const [openItems, setOpenItems] = useState<string[]>([])

  useEffect(() => {
    // Always keep sections open
    setOpenItems(sections.map(section => section.id))
  }, [sections])

  return (
    <Accordion 
      type="multiple" 
      value={openItems} 
      onValueChange={setOpenItems} 
      className="w-full"
      defaultValue={sections.map(section => section.id)}
    >
      {sections.map((section) => (
        <AccordionItem key={section.id} value={section.id}>
          <AccordionTrigger className="flex justify-between">
            <div className="flex items-center justify-between w-full">
              {section.button && (
                <CirclePlus 
                  className="h-6 w-6 text-slate-400 hover:text-[#94b347]" 
                  onClick={(e) => {
                    e.stopPropagation();
                    section.button?.onClick();
                  }} 
                />
              )}
              <span className="flex items-center gap-2">
                {section.title}
                {section.loading && (
                  <CircularProgress size={16} sx={{ color: "#94b347" }} />
                )}
              </span>
              <div></div>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            {section.loading ? (
              <div className="flex justify-center py-4">
                <CircularProgress sx={{ color: "#94b347" }} />
              </div>
            ) : (
              section.content
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

