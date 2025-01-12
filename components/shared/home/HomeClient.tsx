"use client";
import { Button } from "@/components/ui/button";
import React, { useEffect, useRef, useState } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

import SideChat from "@/components/shared/global/SideChat";
import { createNewNotebook } from "@/lib/firebase/firestore";
import BentoDashboard from "./bento-dashboard";
import { CreateNotebookModal } from "@/components/shared/home/create-notebook-modal";
import { useUser } from "@clerk/nextjs";
import ContinuousSegmentSpinner from "@/components/continuous-segment-spinner"; 
import CircularProgress from '@mui/material/CircularProgress';
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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const {isLoaded, isSignedIn} = useUser()
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setTimeout(() => {
        setIsLoading(true);
      }, 1000);
  }, [, ]);


  useEffect(() => {
    console.log("messages", messages);
  }, [messages]);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-200 w-full">
      <div className="flex flex-col h-full bg-slate-200  w-full mx-2">
        <div className="flex flex-row items-center justify-between w-full ">
          <div className="text-slate-900 p-4 bg-slate-100 rounded-2xl w-fit my-4 mx-4 font-semibold">
            <h1 className="text-xl font-regular">Home </h1>
          </div>

          <div className="flex gap-2 ">
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="text-slate-900 px-4 py-2 bg-slate-100 rounded-full border border-slate-300 shadow-none w-fit my-5 font-semibold mx-5"
            >
              New Notebook
            </Button>
          
          </div>
        </div>


        {/* recent notebooks */}
        <div className="flex flex-col md:flex-row justify-start h-fit px-2">
         
            
              {/* surgery area */}

              {/* end of surgery area */}

              <div className="flex-grow overflow-y-auto p-4 bg-slate-100 rounded-2xl m-2 w-full h-full  max-h-[90vh] mt-10">
                
                  <BentoDashboard listType="recent" />
              
              </div>
          

          
        </div>

        {/*all notebooks */}
       
      </div>
      <CreateNotebookModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
};

export default HomeClient;
