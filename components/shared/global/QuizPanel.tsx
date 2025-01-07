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
     

        <div className="flex flex-col gap-5">
        <Button className="border-1 border-slate-300  bg-slate-100  hover:bg-slate-100 hover:border-[#94b347] p-5 rounded-full  hover:text-[#94b347] text-xl p-2">
          <h1 className="text-md font-regular text-slate-500  ">Ask me questions</h1>
        </Button> 

        <Button className="border-1 border-slate-300  bg-slate-100  hover:bg-slate-100 hover:border-[#94b347] p-5 rounded-full  hover:text-[#94b347] text-xl p-2">
          <h1 className="text-md  text-slate-500  p-5">Generate Test for me</h1>
        </Button> 
        </div>
        </div>
     
       
     
      </div>
    
    </div>
  );
};

export default QuizPanel;
