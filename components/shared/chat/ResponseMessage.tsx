import ParagraphEditor from "@/components/ParagraphEditor";
import { Button } from "@/components/ui/button";
import { Message, Section, Sentence } from "@/lib/types";
import { Edit2, Trash2 } from "lucide-react";
import React, { useState } from "react";

interface ResponseProps {
  msg: Message;
  handleSectionClick: (section: Section) => void;
  handleSentenceClick: (sentence: Sentence) => void;
  onEdit: () => void;
  onDelete: () => void;
  onSave: (data: any, index: number) => void;
  index: number;
}

export const ResponseMessage = ({
  msg,
  handleSectionClick,
  handleSentenceClick,
  onEdit,
  onDelete,
  onSave,
  index,
}: ResponseProps) => {
  const [editingSectionIndex, setEditingSectionIndex] = useState<number | null>(
    null
  );

  const handleEditClick = (sectionIdx: number) => {
    setEditingSectionIndex(sectionIdx);
  };

  const handleSave = (data: any) => {
    onSave(data, index);
    setEditingSectionIndex(null);
  };

  if (typeof msg.text === "string") {
    return (
      <div key={index} className="md:p-2 rounded mb-2 ">
        <div className="text-sm">
          <div className="bg-white border border-[#94b347] p-2 md:p-4 rounded-2xl transition-colors">
            <p className="text-gray-800 whitespace-normal break-words">{msg.text}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div key={index} className="md:p-2 rounded mb-2 ">
      {msg.user === "AI" && (
        <div className="text-sm">
          {msg.text.map((section: Section, sectionIdx: number) => (
            <div key={sectionIdx}>
              {editingSectionIndex === sectionIdx ? (
                <ParagraphEditor
                  onSave={handleSave}
                  messageIndex={index}
                  initialData={{
                    user: "AI",
                    text: [
                      {
                        title: section.title,
                        sentences: section.sentences.map((s) => ({
                          id: s.id || 0,
                          text: s.text.trim(),
                        })),
                      },
                    ],
                  }}
                />
              ) : (
                <div className="p-2 md:p-4 rounded-2xl transition-colors">
                  <div className="flex flex-col md:flex-row gap-2 md:gap-0 justify-between items-start  mb-3">
                    <h3
                      className="text-base md:text-lg font-bold text-[#94b347] hover:bg-[slate-600] cursor-pointer break-words"
                      onClick={() => handleSectionClick(section)}
                    >
                      {section.title}
                    </h3>
                    <div className="flex  bg-white rounded-md border border-slate-200 ">
                      <Button
                        onClick={() => handleEditClick(sectionIdx)}
                        variant="ghost"
                        size="sm"
                        className="text-slate-400  hover:bg-slate-100 w-full rounded-l-md rounded-r-none"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <div className="border-r border-slate-300 w-px" />
                      <Button
                        onClick={onDelete}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-100 w-full rounded-r-md rounded-l-none"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {section.sentences.map((sentence: Sentence, sentenceIdx: number) => (
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
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResponseMessage;