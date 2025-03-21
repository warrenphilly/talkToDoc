"use client";
import { Button } from "@/components/ui/button";
import React, { useEffect, useRef, useState } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

import ContinuousSegmentSpinner from "@/components/continuous-segment-spinner";
import SideChat from "@/components/shared/global/SideChat";
import { createNewNotebook } from "@/lib/firebase/firestore";
import { useUser } from "@clerk/nextjs";
import CircularProgress from "@mui/material/CircularProgress";
import BentoDashboard from "./bento-dashboard";
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
  const { isLoaded, isSignedIn } = useUser();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setIsLoading(true);
    }, 1000);
  }, [,]);


  return (
    <div className="flex flex-col md:flex-row h-screen bg-red-500 w-full overflow-none">
      <div className="flex flex-col h-full bg-white w-full  ">
        

        <div className="flex flex-col md:flex-row justify-start h-full pb-12">
          <div className="flex-grow overflow-y-auto p-2   bg-white rounded-2xl  w-full h-full mt-4  ">
            <BentoDashboard listType="recent" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeClient;
