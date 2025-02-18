import ParagraphEditor from "@/components/ParagraphEditor";
import { Button } from "@/components/ui/button";
import { Message, ParagraphData, Section, Sentence } from "@/lib/types";
import { Edit2, Trash2 } from "lucide-react";
import React, { useState } from "react";

interface ResponseProps {
  msg: Message;
  handleSectionClick: (section: Section) => void;
  handleSentenceClick: (sentence: Sentence) => void;
  onEdit: () => void;
  onDelete: () => void;
  onSave: (data: any, index: number) => void;
  handleParagraphSave: (
    data: ParagraphData,
    index: number,
    sectionIndex: number
  ) => void;
  index: number;
}

export const ResponseMessage = ({
  msg,
  handleSectionClick,
  handleSentenceClick,
  onEdit,
  onDelete,
  onSave,
  handleParagraphSave,
  index,
}: ResponseProps) => {
  const [isEditing, setIsEditing] = useState(false);

  if (typeof msg.text === "string") {
    return (
      <div className="md:p-2 rounded mb-2">
        <div className="text-sm">
          <div className="bg-white border border-[#94b347] p-2 md:p-4 rounded-2xl transition-colors">
            <p className="text-gray-800 whitespace-normal break-words">
              {msg.text}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Get the first section from the array
  const section = msg.text[0];

  return (
    <div className="md:p-2 rounded mb-2">
      <div className="p-2 md:p-4 rounded-2xl transition-colors bg-white border border-[#94b347]">
        <div className="flex flex-row gap-2 md:gap-0 justify-between items-start mb-3">
          <h3
            className="text-base md:text-lg font-bold text-[#94b347] hover:bg-[slate-600] cursor-pointer break-words"
            onClick={() => handleSectionClick(section)}
          >
            {section.title}
          </h3>
          <div className="flex gap-6">
            <Button
              onClick={onEdit}
              variant="ghost"
              size="sm"
              className="text-slate-400 rounded-full border border-slate-400 hover:bg-slate-100 w-8 h-8"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              onClick={onDelete}
              variant="ghost"
              size="sm"
              className="border rounded-full border-red-600 text-red-600 hover:text-red-700 hover:bg-red-100 w-8 h-8"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          {section.sentences.map((sentence, sentenceIdx) => (
            <Button
              key={sentenceIdx}
              asChild
              onClick={() => handleSentenceClick(sentence)}
              className="bg-white hover:border hover:bg-slate-200 rounded cursor-pointer transition-colors shadow-none p-0 m-0 w-fit"
            >
              <div className="px-1 py-1 rounded cursor-pointer transition-colors">
                <p className="text-gray-800 text-xs md:text-sm text-left whitespace-normal break-words">
                  {sentence.text}
                </p>
              </div>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResponseMessage;
