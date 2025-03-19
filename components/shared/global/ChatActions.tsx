import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { ReactNode, useState } from "react";

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
  const [showActions, setShowActions] = useState(false);
  
  const actionButtonVariants = {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    hover: { scale: 1.05, backgroundColor: "rgba(148, 179, 71, 0.1)" }
  };
  
  const contextVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: (i: number) => ({ 
      opacity: 1, 
      y: 0,
      transition: { 
        delay: i * 0.1,
        duration: 0.3,
        ease: "easeOut" 
      }
    })
  };

  const renderContextSections = (): ReactNode => (
    <div className="my-3 space-y-3">
      {contextSections.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">
            Selected Context:
          </h3>
          <div className="space-y-2">
            {contextSections.map((section) => (
              <div 
                key={section.id} 
                className="p-2 bg-[#94b347]/5 border border-[#94b347]/20 rounded-lg flex justify-between items-start"
              >
                <p className="text-xs line-clamp-2 flex-grow mr-2 text-gray-700">
                  {section.text}
                </p>
                <button
                  onClick={() => removeContextSection(section.id)}
                  className="text-red-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          
          <div className="flex justify-between items-center mt-3">
            <span className="text-xs text-gray-500">
              These sections will be used as context for your chat.
            </span>
            <span className="text-xs text-[#94b347]">
              {3 - contextSections.length} more allowed
            </span>
          </div>
        </div>
      ) : (
        <div className="p-3 border border-dashed border-gray-200 rounded-lg text-center bg-gray-50">
          <p className="text-sm text-gray-500">No context selected yet.</p>
          <p className="text-xs text-gray-400 mt-1">
            Click on section titles to add context for your questions.
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-lg border-b border-slate-100 mb-2">
      {/* Context section */}
      <Accordion type="single" collapsible className="border-none">
        <AccordionItem value="context" className="border-none">
          <AccordionTrigger className="py-2 px-3 hover:no-underline group">
            <div className="flex items-center w-full justify-between">
              <div className="text-slate-500 line-clamp-1 text-sm font-medium group-data-[state=open]:text-[#94b347]">
                {contextSections.length > 0
                  ? `Context (${contextSections.length}/3): "${contextSections[0].text.substring(0, 40)}${contextSections[0].text.length > 40 ? '...' : ''}"`
                  : "Click text to add context (max 3)"}
              </div>
              {contextSections.length > 0 && (
                <span className="text-xs bg-[#94b347]/10 text-[#94b347] px-2 py-0.5 rounded-full font-medium">
                  {contextSections.length}/3
                </span>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-2">
            {renderContextSections()}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Actions section */}
      <div className="px-3 pb-3">
        <motion.button
          initial={{ opacity: 0.9 }}
          whileHover={{ opacity: 1 }}
          onClick={() => setShowActions(!showActions)}
          className="w-full text-sm font-medium text-slate-500 hover:text-[#94b347] flex items-center justify-center mb-2 bg-slate-50 hover:bg-slate-100 py-2 rounded-lg transition-all"
        >
          Quick Actions {showActions ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
        </motion.button>
        
        {showActions && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-wrap gap-2 w-full items-center justify-center mt-2"
          >
            <motion.div
              variants={actionButtonVariants}
              initial="initial"
              animate="animate"
              whileHover="hover"
              transition={{ delay: 0.1 }}
            >
              <Button
                className="bg-white border border-slate-200 text-slate-600 hover:bg-white hover:text-[#94b347] hover:border-[#94b347] rounded-full shadow-sm text-xs px-3 py-1"
                onClick={() => sendMessage("Explain this in simpler terms")}
                disabled={contextSections.length === 0}
              >
                Simplify
              </Button>
            </motion.div>
            
            <motion.div
              variants={actionButtonVariants}
              initial="initial"
              animate="animate"
              whileHover="hover"
              transition={{ delay: 0.2 }}
            >
              <Button
                className="bg-white border border-slate-200 text-slate-600 hover:bg-white hover:text-[#94b347] hover:border-[#94b347] rounded-full shadow-sm text-xs px-3 py-1"
                onClick={() => sendMessage("What are the key points here?")}
                disabled={contextSections.length === 0}
              >
                Key Points
              </Button>
            </motion.div>
            
            <motion.div
              variants={actionButtonVariants}
              initial="initial"
              animate="animate"
              whileHover="hover"
              transition={{ delay: 0.3 }}
            >
              <Button
                className="bg-white border border-slate-200 text-slate-600 hover:bg-white hover:text-[#94b347] hover:border-[#94b347] rounded-full shadow-sm text-xs px-3 py-1"
                onClick={() => sendMessage("Give me practice questions on this")}
                disabled={contextSections.length === 0}
              >
                Practice Questions
              </Button>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ChatActions;
