import ParagraphEditor from "@/components/ParagraphEditor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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

  const handleEditClick = () => {
    setIsEditing(true);
    onEdit(); // Call the parent's onEdit handler
  };

  if (typeof msg.text === "string") {
    return (
      <div className="md:p-2 rounded mb-2">
        <div className="text-sm">
          <div className="bg-white  p-2 md:p-4 rounded-2xl transition-colors">
            <p className="text-gray-800 whitespace-normal break-words">
              {msg.text}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Now msg.text will be a single section
  const section = msg.text[0];

  if (isEditing) {
    return (
      <div className="md:p-2 rounded mb-2">
        <ParagraphEditor
          onSave={(data) => {
            onSave(data, index);
            setIsEditing(false);
          }}
          messageIndex={index}
          initialData={{
            user: "AI",
            text: [
              {
                title: section.title,
                sentences: section.sentences,
              },
            ],
          }}
        />
      </div>
    );
  }

  return (
    <div className="md:p-2 rounded mb-2">
      <div className="p-3 md:p-5 rounded-2xl transition-colors bg-white shadow-lg border border-gray-100">
        <div className="flex flex-row gap-2 md:gap-0 justify-between items-start mb-4">
          <h3
            className="text-lg md:text-xl font-bold text-[#94b347] hover:text-[#7a9639] cursor-pointer break-words"
            onClick={() => handleSectionClick(section)}
          >
            {section.title}
          </h3>
          <div className="flex gap-6">
            <Button
              onClick={handleEditClick}
              variant="ghost"
              size="sm"
              className="text-slate-400 rounded-full border border-slate-400 hover:bg-slate-100 w-8 h-8"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="border rounded-full border-red-600 text-red-600 hover:text-red-700 hover:bg-red-100 w-8 h-8"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-white p-6 max-w-sm rounded-lg  ">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Section</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this section? This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex flex-row gap-2 justify-between items-center ">
                  <AlertDialogCancel className="bg-slate-50 border border-slate-300 hover:bg-slate-100 rounded-full">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDelete}
                    className="bg-red-600 text-white hover:bg-red-700 rounded-full"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <div className="space-y-4">
          {/* Group consecutive paragraphs for better readability */}
          {(() => {
            let currentListType: string | null = null;
            let listItems: React.ReactElement[] = [];
            let result: React.ReactElement[] = [];
            let key = 0;
            let isSummarySection = false;

            section.sentences.forEach((sentence, sentenceIdx) => {
              const format = sentence.format || "paragraph";

              // Check if we're entering a summary section
              if (
                format === "heading" &&
                (sentence.text.toLowerCase().includes("summary") ||
                  sentence.text.toLowerCase().includes("key points"))
              ) {
                isSummarySection = true;
              }

              // Handle list grouping
              if (format === "bullet" || format === "numbered") {
                // If we're starting a new list or changing list types
                if (currentListType !== format) {
                  // Flush any existing list
                  if (listItems.length > 0) {
                    result.push(
                      <div key={`list-${key++}`} className="my-3">
                        {currentListType === "bullet" ? (
                          <ul className="list-disc pl-6 space-y-2">
                            {listItems}
                          </ul>
                        ) : (
                          <ol className="list-decimal pl-6 space-y-2">
                            {listItems}
                          </ol>
                        )}
                      </div>
                    );
                    listItems = [];
                  }
                  currentListType = format;
                }

                // Add to current list with enhanced styling
                listItems.push(
                  <li
                    key={`item-${sentenceIdx}`}
                    className={`text-gray-800 text-sm md:text-base text-left whitespace-normal break-words leading-relaxed ${
                      isSummarySection ? "font-medium" : ""
                    }`}
                    onClick={() => handleSentenceClick(sentence)}
                  >
                    {sentence.text}
                  </li>
                );
              } else {
                // If we're ending a list, flush it
                if (listItems.length > 0) {
                  result.push(
                    <div key={`list-${key++}`} className="my-3">
                      {currentListType === "bullet" ? (
                        <ul className="list-disc pl-6 space-y-2">
                          {listItems}
                        </ul>
                      ) : (
                        <ol className="list-decimal pl-6 space-y-2">
                          {listItems}
                        </ol>
                      )}
                    </div>
                  );
                  listItems = [];
                  currentListType = null;
                }

                // Handle non-list content with enhanced styling
                let content;
                switch (format) {
                  case "formula":
                    content = (
                      <div
                        className="px-4 py-3 bg-gray-50 font-mono text-gray-800 text-sm md:text-base text-left whitespace-normal break-words overflow-x-auto my-3 rounded-md border border-gray-200"
                        onClick={() => handleSentenceClick(sentence)}
                      >
                        {sentence.text}
                      </div>
                    );
                    break;
                  case "italic":
                    content = (
                      <p
                        className="text-gray-800 text-sm md:text-base text-left whitespace-normal break-words italic my-3 leading-relaxed"
                        onClick={() => handleSentenceClick(sentence)}
                      >
                        {sentence.text}
                      </p>
                    );
                    break;
                  case "bold":
                    content = (
                      <p
                        className="text-gray-800 text-sm md:text-base text-left whitespace-normal break-words font-bold my-3 leading-relaxed"
                        onClick={() => handleSentenceClick(sentence)}
                      >
                        {sentence.text}
                      </p>
                    );
                    break;
                  case "heading":
                    content = (
                      <h4
                        className={`text-gray-800 text-base md:text-lg font-semibold text-left whitespace-normal break-words my-4 ${
                          isSummarySection ? "text-[#94b347]" : ""
                        }`}
                        onClick={() => handleSentenceClick(sentence)}
                      >
                        {sentence.text}
                      </h4>
                    );
                    break;
                  default: // paragraph
                    content = (
                      <p
                        className={`text-gray-800 text-sm md:text-base text-left whitespace-normal break-words my-3 leading-relaxed ${
                          isSummarySection ? "text-gray-700" : ""
                        }`}
                        onClick={() => handleSentenceClick(sentence)}
                      >
                        {sentence.text}
                      </p>
                    );
                }

                result.push(
                  <div
                    key={`content-${sentenceIdx}`}
                    className="hover:bg-gray-50 rounded-md transition-colors px-1"
                  >
                    {content}
                  </div>
                );
              }
            });

            // Flush any remaining list items
            if (listItems.length > 0) {
              result.push(
                <div key={`list-${key++}`} className="my-3">
                  {currentListType === "bullet" ? (
                    <ul className="list-disc pl-6 space-y-2">{listItems}</ul>
                  ) : (
                    <ol className="list-decimal pl-6 space-y-2">{listItems}</ol>
                  )}
                </div>
              );
            }

            return result;
          })()}
        </div>
      </div>
    </div>
  );
};

export default ResponseMessage;
