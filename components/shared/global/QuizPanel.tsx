"use client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Image, Upload } from "lucide-react"; // Import icons
import React, { useEffect, useRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { Switch } from "@/components/ui/switch"
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
    <div className="flex flex-col h-full w-full border-3 bg-slate-200 rounded-2xl mb-4 max-h-[90vh] ">
      <div className="flex flex-col items-center justify-center p-3 gap-4">
   
      <h1 className='text-xl font-semibold text-[#94b347]'>Quiz Me</h1>
      <Button disabled className="  bg-white  shadow-none border border-slate-400 text-red-500  hover:bg-slate-100 hover:border-[#94b347] p-5 rounded-full  hover:text-[#94b347] text-md   ">
          <h1 className="text-md">Clear Test </h1>
            </Button> 
      </div>
      <div className=" text-white  min-h-[400px] rounded-lg flex flex-col justify-between items-center  p-4 m-4">
        <div className="flex flex-row gap-2 justify-center items-center w-full">
     

        <div className="flex flex-col gap-5">
        

        
            {/* test selection */}
        <Select>
          <SelectTrigger className="w-full text-slate-500">
            <SelectValue placeholder="How would you like to be tested?" />
          </SelectTrigger>
          <SelectContent className="bg-slate-100 ">
            <SelectItem value="system" className="text-slate-500 hover:bg-slate-300">Ask me one question at a time (answers,score & explanation after answer) </SelectItem>
            <SelectItem value="system" className="text-slate-500 hover:bg-slate-300"  >Ask me all at once(answers,score & explanation at end)</SelectItem>
          </SelectContent>
        </Select>
            {/* test selection */}
            <Select>
          <SelectTrigger className="w-full text-slate-500">
            <SelectValue placeholder="Text or Speech?" />
          </SelectTrigger>
          <SelectContent className="bg-slate-100">
          
            <SelectItem value="system" className="text-slate-500 hover:bg-slate-300">Text </SelectItem>
            <SelectItem value="system" className="text-slate-500 hover:bg-slate-300">Speech</SelectItem>
          </SelectContent>
        </Select>
          {/* Question number selection */}
          <Select>
          <SelectTrigger className="w-full text-slate-500">
            <SelectValue placeholder="How many Questions?" />
          </SelectTrigger>
          <SelectContent className="bg-slate-100">
          
                <SelectItem value="system">5 </SelectItem>
                
            <SelectItem value="system" className="text-slate-500 hover:bg-slate-300">10</SelectItem>
            <SelectItem value="system" className="text-slate-500 hover:bg-slate-300">15</SelectItem>
                <SelectItem value="system" className="text-slate-500 hover:bg-slate-300">20</SelectItem>
                <SelectItem value="system" className="text-slate-500 hover:bg-slate-300">25</SelectItem>
                
          </SelectContent>
            </Select>
             {/* Question Type selection */}
             <div className="flex flex-col gap-2 items-start text-slate-500">
              <h1 className="text-md font-bold">Question Type</h1>
              <div className="flex flex-row gap-2 items-start">
            <Switch /> <p>True/False</p>
              </div>
              <div className="flex flex-row gap-2 items-start">
            <Switch /> <p>Multiple choice</p>
              </div>
              <div className="flex flex-row gap-2 items-start">
            <Switch /> <p>Short answer</p>
              </div>
              
        </div>
            
          
       

            <div>
            <Button className=" bg-[#94b347] hover:bg-[#a5c05f] text-slate-100 shadow-none  p-5 rounded-lg  hover:text-[#94b347] text-xl w-full">
          <h1 className="text-md  text-white p-5">Generate Test </h1>
            </Button> 
           
        </div>
        </div>
        </div>
     
       
     
      </div>
    
    </div>
  );
};

export default QuizPanel;
