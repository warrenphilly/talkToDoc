import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

interface ChatActionsProps {
  sendMessage: (message: string) => void;
  contextSections: any[];
  removeContextSection: (id: string) => void;
}

const ChatActions = ({
  sendMessage,
  contextSections,
  removeContextSection,
}: ChatActionsProps) => {
 
  const renderContextSections = (): ReactNode => (
    <div className="m-2">
      {contextSections.length > 0 ? (
        <div className="space-y-2">
          {contextSections.map((section) => (
            <div
              key={section.id}
              className="relative border border-slate-300 rounded-lg p-3  transform transition-all duration-200 ease-in-out hover:scale-[1.02]"
            >
              <p className="pr-8 text-slate-400">"{section.text}"</p>
              <button
                onClick={() => removeContextSection(section.id)}
                className="absolute top-2 right-2 text-red-500 hover:text-red-700 transition-colors duration-200"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center">
          Click text to add context (max 3)
        </p>
      )}
    </div>
  );

  return (
    <div className="bg-white text-[#94b347] rounded-lg ">
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1" className="group">
          <AccordionTrigger className="group">
            <div className="text-slate-400 line-clamp-1 group-data-[state=open]:hidden group-[&[data-state=open]]:hidden">
              {contextSections.length > 0
                ? contextSections[0].text
                : "Click text to add context (max 3)"}
            </div>
            <div className="text-slate-400 line-clamp-1 group-data-[state=open]:block group-[&[data-state=open]]:block group-data-[state=closed]:hidden group-[&[data-state=closed]]:hidden">
              Hide Context
            </div>
          </AccordionTrigger>
          <AccordionContent>{renderContextSections()}</AccordionContent>
        </AccordionItem>
      </Accordion>

      <Accordion type="single" collapsible>
        <AccordionItem value="item-1" className="group">
          <AccordionTrigger className="group">
            <div className="flex flex-col items-center justify-center ">
              <h1 className="text-sm font-semibold text-slate-400">Actions</h1>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-row flex-wrap gap-2 w-full items-center justify-center m-2">
              <Button
                className="bg-white border border-slate-500 text-slate-500 hover:bg-white hover:text-[#94b347] rounded-full shadow-none text-xs sm:text-sm px-3 py-1 sm:px-4 sm:py-2"
                onClick={() => sendMessage("Explain this in simple terms")}
                disabled={contextSections.length === 0}
              >
                Explain
              </Button>
              <Button
                className="bg-white hover:bg-white border border-slate-500 text-slate-500 hover:text-[#94b347] rounded-full shadow-none text-xs sm:text-sm px-3 py-1 sm:px-4 sm:py-2"
                onClick={() => sendMessage("Expand on this")}
                disabled={contextSections.length === 0}
              >
                Expand
              </Button>
              <Button
                className="bg-white hover:bg-white border border-slate-500 text-slate-500 hover:text-[#94b347] rounded-full shadow-none text-xs sm:text-sm px-3 py-1 sm:px-4 sm:py-2"
                onClick={() => sendMessage("Give me a step-by-step example")}
                disabled={contextSections.length === 0}
              >
                Example
              </Button>
              <Button
                className="bg-white hover:bg-white border border-slate-500 text-slate-500 hover:text-[#94b347] rounded-full shadow-none text-xs sm:text-sm px-3 py-1 sm:px-4 sm:py-2"
                onClick={() =>
                  sendMessage(
                    "Reword this in a way that is easier to understand"
                  )
                }
                disabled={contextSections.length === 0}
              >
                Reword
              </Button>
              <Button
                className="bg-white hover:bg-white border border-slate-500 text-slate-500 hover:text-[#94b347] rounded-full shadow-none text-xs sm:text-sm px-3 py-1 sm:px-4 sm:py-2"
                onClick={() =>
                  sendMessage(
                    "Summarize this in a way that is easier to understand, 100 words or less"
                  )
                }
                disabled={contextSections.length === 0}
              >
                Summarize
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default ChatActions;
