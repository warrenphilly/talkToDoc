"use client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Image, Upload } from "lucide-react"; // Import icons
import React, { useEffect, useRef, useState } from "react";

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

const QuizPanel = () => {
  

  

  return (
    <div className="flex flex-col h-full w-full border-3 bg-slate-100 rounded-2xl mb-4 max-h-[90vh] ">
      <div className="flex flex-row items-center justify-center">
      <h1 className='text-xl font-regular text-[#94b347]'>AI Quiz</h1>
      </div>
      <div className=" text-white  min-h-[400px] rounded-lg flex flex-col justify-between items-center  p-4 m-4">
        <div className="flex flex-row gap-2 justify-center items-center w-full">
     

        <div className="flex flex-row gap-2">
        <Button className="bg-[#94b347] text-white text-xl rounded-lg p-2">
          <h1 className="text-md font-regular text-white  ">Ask me questions</h1>
        </Button> 

        <Button className="bg-[#94b347] text-white text-xl rounded-lg p-2">
          <h1 className="text-md  font-regular text-white ">Generate Text</h1>
        </Button> 
        </div>
        </div>
        <div className="h-px bg-slate-300 w-full my-4" />
       
     
      </div>
    
    </div>
  );
};

export default QuizPanel;
