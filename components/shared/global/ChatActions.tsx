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
          {contextSections.map((section, i) => (
            <motion.div
              key={section.id}
              custom={i}
              initial="hidden"
              animate="visible"
              variants={contextVariants}
              className="relative border border-slate-200 rounded-lg p-3 bg-gradient-to-r from-slate-50 to-white shadow-sm transform transition-all duration-200 ease-in-out hover:shadow-md hover:border-[#94b347]/30"
            >
              <p className="pr-8 text-slate-600 text-sm leading-relaxed">"{section.text}"</p>
              <motion.button
                whileHover={{ scale: 1.1, color: "#ef4444" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => removeContextSection(section.id)}
                className="absolute top-2 right-2 text-red-400 hover:text-red-600 transition-colors duration-200 w-6 h-6 flex items-center justify-center rounded-full"
              >
                <X size={16} />
              </motion.button>
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-gray-500 text-center text-sm italic my-2"
        >
          Click text to add context (max 3)
        </motion.p>
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
                onClick={() => sendMessage("Explain this in simple terms")}
                disabled={contextSections.length === 0}
              >
                Explain
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
                onClick={() => sendMessage("Expand on this")}
                disabled={contextSections.length === 0}
              >
                Expand
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
                onClick={() => sendMessage("Give me a step-by-step example")}
                disabled={contextSections.length === 0}
              >
                Example
              </Button>
            </motion.div>
            
            <motion.div
              variants={actionButtonVariants}
              initial="initial"
              animate="animate"
              whileHover="hover"
              transition={{ delay: 0.4 }}
            >
              <Button
                className="bg-white border border-slate-200 text-slate-600 hover:bg-white hover:text-[#94b347] hover:border-[#94b347] rounded-full shadow-sm text-xs px-3 py-1"
                onClick={() => sendMessage("Reword this in a way that is easier to understand")}
                disabled={contextSections.length === 0}
              >
                Reword
              </Button>
            </motion.div>
            
            <motion.div
              variants={actionButtonVariants}
              initial="initial"
              animate="animate"
              whileHover="hover"
              transition={{ delay: 0.5 }}
            >
              <Button
                className="bg-white border border-slate-200 text-slate-600 hover:bg-white hover:text-[#94b347] hover:border-[#94b347] rounded-full shadow-sm text-xs px-3 py-1"
                onClick={() => sendMessage("Summarize this in a way that is easier to understand, 100 words or less")}
                disabled={contextSections.length === 0}
              >
                Summarize
              </Button>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ChatActions;
