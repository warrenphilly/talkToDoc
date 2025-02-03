import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Check, ChevronLeft, X } from "lucide-react";
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
    <Card className="px-6 bg-white shadow-xl border-none w-full h-full">
      <div className="flex justify-between items-center mb-4 w-full">
        <Button
          variant="ghost"
          className="gap-2 text-slate-400 flex items-center justify-center w-fit hover:bg-transparent hover:text-slate-600"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Guide list
        </Button>
      


       
      </div>

      <div className="shadow-none border-none">
        <div className="flex flex-row items-center justify-between w-full  px-4  pb-2">
          {isEditing ? (
            <div className="flex items-center gap-2 flex-1 mr-4 w-full  ">
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                className="text-xl font-bold text-[#94b347] p-2 border-none text-center flex items-center justify-center w-fit border border-slate-600 rounded-lg"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSave}
                  className="text-green-600 hover:text-green-700 "
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="flex items-center rounded-lg w-fit  justify-center hover:cursor-pointer "
              onClick={() => setIsEditing(true)}
            >
              <h3 className="text-2xl font-bold text-[#94b347]  rounded-lg cursor-pointer hover:text-[#7a943a]">
                Study Guide: <span className="text-slate-500">{guide.title}</span>
              </h3>
            </div>
          )}
        </div>

        {guide.content.map((section, sectionIndex) => (
          <div key={sectionIndex} className="  rounded-lg pb-4 ">
            <h4 className="text-lg font-semibold text-slate-800 mb-2 pl-4">
              Topic: {section.topic}
            </h4>
            <p className="text-sm text-gray-500 pl-4 mb-4  ">
              Created: {guide.createdAt.toLocaleDateString()}
            </p>

            <div className="space-y-4">
              {section.subtopics.map((subtopic, subtopicIndex) => (
                <div key={subtopicIndex} className="bg-white p-4 rounded-lg ">
                  <h5 className="text-md font-semibold text-[#94b347] mb-2">
                    {subtopic.title}
                  </h5>
                  <p className="text-slate-600 mb-3">{subtopic.description}</p>

                  {/* Key Points */}
                  <div className="mb-3">
                    <h6 className="text-sm font-semibold text-slate-700 mb-2">
                      Key Points:
                    </h6>
                    <ul className="list-disc pl-5 space-y-1">
                      {subtopic.keyPoints.map((point, index) => (
                        <li key={index} className="text-slate-600">
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Examples */}
                  {subtopic.examples && subtopic.examples.length > 0 && (
                    <div className="mb-3">
                      <h6 className="text-sm font-semibold text-slate-700 mb-2">
                        Examples:
                      </h6>
                      <ul className="list-disc pl-5 space-y-1">
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
                    <div className="bg-[#dae9b6] p-3 rounded-lg mt-3">
                      <h6 className="text-sm font-semibold text-slate-700 mb-2">
                        Study Tips:
                      </h6>
                      <ul className="list-disc pl-5 space-y-1">
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
  );
}
