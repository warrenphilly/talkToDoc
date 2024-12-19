import { Button } from "@/components/ui/button";
import React from "react";

interface Section {
  title: string;
  sentences: Sentence[];
}

interface Sentence {
  text: string;
}

interface OutputNotesProps {
  msg: any;
  handleSentenceClick: (sentence: Sentence) => void;
}

export default function OutputNotes({ msg, handleSentenceClick }: OutputNotesProps) {
  return (
   <div className="text-sm">
   {Array.isArray(msg.text) ? (
     <div className="space-y-6 bg-slate-800">
       {msg.text.map(
         (section: Section, sectionIdx: number) => (
           <div
             key={sectionIdx}
             className="bg-slate-700 p-4 rounded-lg"
           >
             <h3 className="text-lg font-bold text-slate-200 mb-3">
               {section.title}
             </h3>
             <div className="space-y-2">
               {section.sentences.map(
                 (sentence: Sentence) => (
                   <Button
                     asChild
                     onClick={() =>
                       handleSentenceClick(sentence)
                     }
                     className="bg-slate-700 hover:bg-slate-900 rounded cursor-pointer transition-colors shadow-none p-0 m-0"
                   >
                     <div className="pl-2 hover:p-2 hover:m-2 hover:shadow-md rounded cursor-pointer transition-colors">
                       <p className="text-gray-400">
                         {sentence.text}
                       </p>
                     </div>
                   </Button>
                 )
               )}
             </div>
           </div>
         )
       )}
     </div>
   ) : (
     <span>{String(msg.text)}</span>
   )}
 </div>
  );
}
