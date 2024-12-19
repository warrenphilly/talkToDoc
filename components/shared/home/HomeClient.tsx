"use client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Image, Upload } from "lucide-react"; // Import icons
import React, { useEffect, useRef, useState } from "react";
import SideChat from "../chat/SideChat";

interface Sentence {
  id: number;
  text: string;
}

const HomeClient = () => {
  const [primeSentence, setPrimeSentence] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);

  return (
    <div className="flex flex-col h-full w-full bg-blue-100">
      <div className="flex flex-row items-center justify-between p-2 w-full">
        <div className="text-white p-4 bg-slate-800 rounded-2xl w-fit my-5 font-semibold">
          <h1 className="text-xl font-regular">Dashboard</h1>
        </div>

        <Button
          onClick={() => {
            setShowChat(!showChat);
            setPrimeSentence(null);
          }}
          className="text-white px-4 py-2 bg-slate-800 rounded-full w-fit m-5 font-semibold"
        >
          {showChat ? "Close Chat" : "Open Chat"}
        </Button>
      </div>
      <div className="flex flex-col md:flex-row justify-center flex-grow w-full">
        <div className="flex-grow overflow-y-auto p-4 bg-slate-800 rounded-2xl max-h-full w-full">
          {/* if the user has not uploaded any files */}
        </div>

        {showChat && (
          <div className="w-full md:max-w-[300px] rounded-2xl mr-2">
            <SideChat primeSentence={""} />
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeClient;
