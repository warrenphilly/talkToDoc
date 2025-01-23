"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/firebase";
import {
  deleteStudyCardSet,
  getAllNotebooks,
  getStudyCards,
  getStudyCardSets,
  saveStudyCard,
  saveStudyCardSet,
  saveStudyGuide,
} from "@/lib/firebase/firestore";
import { Notebook, Page } from "@/types/notebooks";
import { StudyCard, StudyCardSet } from "@/types/studyCards";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Plus,
  PlusCircle,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import FormUpload from "@/components/shared/study/formUpload";
import StudyGuide from "@/components/shared/study/StudyGuide";
import { storage } from "@/firebase";
import { Message } from "@/lib/types";
import { fileUpload } from "@/lib/utils";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import { RefObject } from "react";
import StudyCards from "@/components/shared/study/StudyCards";

interface StudyMaterialTabsProps {
  notebookId: string;
  pageId: string;
}

interface StudySetMetadata {
  name: string;
  createdAt: Date;
  sourceNotebooks: {
    notebookId: string;
    notebookTitle: string;
    pages: {
      pageId: string;
      pageTitle: string;
    }[];
  }[];
  cardCount: number;
}



export default function StudyMaterialTabs({
  notebookId,
  pageId,
}: StudyMaterialTabsProps) {
  return (
    <div className="flex flex-col w-full mx-auto h-full overflow-y-auto">
      <div className="flex flex-row items-center justify-center">
        <h1 className="text-xl font-semibold text-[#94b347] mb-8 mt-2">
          Study Material
        </h1>
      </div>
      <Tabs defaultValue="studycards" className="w-full   mx-auto">
        <div className="flex flex-row items-center justify-center">  <TabsList className="grid w-full grid-cols-2 max-w-xl bg-slate-100 rounded-md">
          <TabsTrigger value="studycards" className="data-[state=active]:bg-[#dae9b6] data-[state=active]:text-slate-700">Study Cards</TabsTrigger>
          <TabsTrigger value="studyguide" className="data-[state=active]:bg-[#dae9b6] data-[state=active]:text-slate-700">Study Guide</TabsTrigger>
        </TabsList></div>
      
        <TabsContent value="studycards">
          <StudyCards notebookId={notebookId} pageId={pageId} />
        </TabsContent>
        <TabsContent value="studyguide">
          <StudyGuide notebookId={notebookId} pageId={pageId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
