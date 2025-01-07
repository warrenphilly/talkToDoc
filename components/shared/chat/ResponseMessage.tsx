import { Section, Sentence } from '@/lib/types';
import React from 'react'
import { Button } from '@/components/ui/button';

interface ResponseProps {
  msg: {
    user: string;
    text: Section[];
  };
  handleSectionClick: (section: Section) => void;
  handleSentenceClick: (sentence: Sentence) => void;
  index: number;
}

export const ResponseMessage = ({msg, handleSectionClick, handleSentenceClick, index}: ResponseProps) => {
  return (
    <div key={index} className="p-2 rounded mb-2 bg-slate-100">
      {/* AI Responses */}
      {msg.user === "AI" && (
        <div className="text-sm">
          {msg.text.map((section: Section, sectionIdx: number) => (
            <div
              key={sectionIdx}
              className="bg-slate-100 border border-[#94b347] p-4 rounded-2xl transition-colors"
            >
              <h3
                className="text-lg font-bold text-[#94b347] mb-3 hover:bg-[slate-600] cursor-pointer"
                onClick={() => handleSectionClick(section)}
              >
                {section.title}
              </h3>
              <div className="space-y-2">
                {section.sentences.map((sentence: Sentence, sentenceIdx: number) => (
                  <Button
                    key={sentenceIdx}
                    asChild
                    onClick={() => handleSentenceClick(sentence)}
                    className="bg-slate-100 hover:border hover:bg-slate-300  rounded cursor-pointer transition-colors shadow-none p-0 m-0"
                  >
                    <div className="px-1 rounded cursor-pointer transition-colors">
                      <p className="text-gray-800 text-md">
                        {sentence.text}
                      </p>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ResponseMessage;
