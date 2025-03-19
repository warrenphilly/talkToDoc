import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Check, ChevronLeft, Pencil, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { StudyGuide } from "./StudyGuide"; // Make sure to export the interface from StudyGuide.tsx

interface StudyGuideCardProps {
  guide: StudyGuide;
  onDelete: (guideId: string) => void;
  onUpdateTitle: (guideId: string, newTitle: string) => void;
  onBack: () => void;
}

export function StudyGuideCard({
  guide,
  onDelete,
  onUpdateTitle,
  onBack,
}: StudyGuideCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(guide.title);

  const handleSave = () => {
    if (editedTitle.trim()) {
      onUpdateTitle(guide.id, editedTitle.trim());
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditedTitle(guide.title);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <div className="w-full ">
      <Card className="bg-white border-none w-full h-full shadow-none rounded-xl ">
        <div className="flex  justify-center  md:justify-between items-center m-3 p-3 w-full">
          <Button
            variant="ghost"
            className="gap-2 text-slate-400 flex items-center justify-center w-fit hover:bg-transparent hover:text-slate-600 transition-colors"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden md:block">Back to Guide list</span>
            <span className="md:hidden">Back</span>
          </Button>
        </div>

        <div className="">
          <div className="flex flex-row items-center justify-center w-full pb-6 border-b border-slate-100">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="border border-slate-300 rounded-md px-3 py-2 text-[#94b347] focus:outline-none focus:border-[#94b347] text-base sm:text-lg font-semibold"
                  autoFocus
                  onKeyDown={handleKeyDown}
                />
                <button
                  onClick={handleSave}
                  className="p-2 hover:bg-green-100 rounded-full transition-colors"
                >
                  <Check className="h-4 w-4 text-green-600" />
                </button>
                <button
                  onClick={handleCancel}
                  className="p-2 hover:bg-red-100 rounded-full transition-colors"
                >
                  <X className="h-4 w-4 text-red-600" />
                </button>
              </div>
            ) : (
              <div
                className="flex items-center rounded-lg justify-center hover:cursor-pointer"
                onClick={() => setIsEditing(true)}
              >
                <h3 className="text-2xl text-[#94b347] rounded-lg cursor-pointer">
                  Study Guide: <span className="text-slate-600 font-bold">{guide.title}</span>
                </h3>
                <div className="flex items-center justify-center rounded-lg ml-2 h-8 w-8 hover:bg-slate-100 transition-colors" onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4 text-slate-500 hover:text-[#7a943a]" />
                </div>
              </div>
            )}
          </div>

          {guide.content.map((section, sectionIndex) => (
            <div key={sectionIndex} className="rounded-lg py-6">
              <div className="text-center mb-6">
                <h4 className="text-xl font-semibold text-slate-800 mb-2">
                  {section.topic}
                </h4>
                <p className="text-sm text-gray-500">
                  Created: {guide.createdAt.toLocaleDateString()}
                </p>
              </div>

              <div className="grid gap-6  mx-auto">
                {section.subtopics.map((subtopic, subtopicIndex) => (
                  <div key={subtopicIndex} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                    <h5 className="text-lg font-semibold text-[#94b347] mb-3">
                      {subtopic.title}
                    </h5>
                    <p className="text-slate-600 mb-4 leading-relaxed">{subtopic.description}</p>

                    {/* Key Points */}
                    <div className="mb-4 bg-slate-50 p-4 rounded-lg">
                      <h6 className="text-sm font-semibold text-slate-700 mb-2 flex items-center">
                        <span className="h-1.5 w-1.5 bg-[#94b347] rounded-full mr-2"></span>
                        Key Points:
                      </h6>
                      <ul className="list-disc pl-5 space-y-2">
                        {subtopic.keyPoints.map((point, index) => (
                          <li key={index} className="text-slate-600">
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Examples */}
                    {subtopic.examples && subtopic.examples.length > 0 && (
                      <div className="mb-4 bg-slate-50 p-4 rounded-lg">
                        <h6 className="text-sm font-semibold text-slate-700 mb-2 flex items-center">
                          <span className="h-1.5 w-1.5 bg-[#94b347] rounded-full mr-2"></span>
                          Examples:
                        </h6>
                        <ul className="list-disc pl-5 space-y-2">
                          {subtopic.examples.map((example, index) => (
                            <li key={index} className="text-slate-600">
                              {example}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Study Tips */}
                    {subtopic.studyTips && subtopic.studyTips.length > 0 && (
                      <div className="bg-[#eef5db] p-4 rounded-lg mt-4 border-l-4 border-[#94b347]">
                        <h6 className="text-sm font-semibold text-slate-700 mb-2 flex items-center">
                          <span className="h-1.5 w-1.5 bg-[#94b347] rounded-full mr-2"></span>
                          Study Tips:
                        </h6>
                        <ul className="list-disc pl-5 space-y-2">
                          {subtopic.studyTips.map((tip, index) => (
                            <li key={index} className="text-slate-600">
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
