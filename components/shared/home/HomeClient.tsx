"use client";
import { Button } from "@/components/ui/button";
import React, { useEffect, useRef, useState } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

import SideChat from "@/components/shared/SideChat";
// First, let's define our message types
interface Sentence {
  id: number;
  text: string;
}

interface Section {
  title: string;
  sentences: Sentence[];
}

interface Message {
  user: string;
  text: string | Section[];
  files?: string[];
}



const HomeClient = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [showUpload, setShowUpload] = useState(true);
  const [primeSentence, setPrimeSentence] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  // const [selectedSentence, setSelectedSentence] = useState<Sentence | null>(
  //   null
  // ); - possible to remove


  const handleSentenceClick = (sentence: Sentence) => {
    setPrimeSentence(sentence.text);
    setShowChat(true);
  };



  useEffect(() => {
    // if (messages.length > 0) {
    //   setShowUpload(false);
    // }
    console.log("messages", messages);
  }, [messages]);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-900 w-full">
      <div className="flex flex-col h-full bg-slate-900  w-full mx-2">
        <div className="flex flex-row items-center justify-between w-full ">
          <div className="text-white p-4 bg-slate-800 rounded-2xl w-fit my-5 font-semibold">
            <h1 className="text-xl font-regular">Welcome `user` </h1>
          </div>

          <Button
            onClick={() => {
              setShowChat(!showChat);
              setPrimeSentence(null);
            }}
            className="text-white px-4 py-2 bg-slate-800 rounded-full w-fit m-5 font-semibold"
          >
            {showChat ? "Close Chat" : "Talk to my notes"}
          </Button>
        </div>
        <div className="flex flex-col md:flex-row justify-start h-full max-h-[90vh] px-2">
          <ResizablePanelGroup direction="horizontal" className="w-full px-2">
            <ResizablePanel className="w-full p-2 min-w-[600px]  flex flex-col gap-2 items-center justify-center h-full overflow-y-auto ">
              {/* surgery area */}
            

              {/* end of surgery area */}

              <div className="flex-grow overflow-y-auto p-4 bg-slate-800 rounded-2xl m-2 w-full h-full  max-h-[90vh]">
              <h1 className="text-white text-xl font-regular"> Recent notes </h1>
                {messages.map((msg, index) => (
                  <div key={index} className={`p-2 rounded mb-2 bg-slate-00`}>
                 
                    {/* AI Responses */}
                    {/* surgery area------------------------------------------------------------------------------------------------ */}
                    {msg.user === "AI" && (
                      <div className="text-sm">
                        {Array.isArray(msg.text) ? (
                          <div className="space-y-6 bg-slate-100">
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
                    )}
                  </div>
                ))}
              </div>
            </ResizablePanel>

            <>
              <ResizableHandle withHandle />
              <ResizablePanel
                className={` ${
                  showChat
                    ? "translate-x-0 w-full min-w-[400px] p-2 transition-transform duration-1000 ease-in-out transform"
                    : "hidden"
                }`}
              >
                <div className="rounded-2xl m-2 w-full min-w-[400px] max-w-[700px] ">
                  <SideChat primeSentence={primeSentence} />
                </div>
              </ResizablePanel>
            </>
          </ResizablePanelGroup>
        </div>
      </div>
    </div>
  );
};

export default HomeClient;
