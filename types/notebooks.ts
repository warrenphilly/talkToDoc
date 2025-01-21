import { Message } from "@/lib/types";

export interface Page {
  id: string;
  title: string;
  content: string;
  messages: Message[];
  isOpen: boolean;
  markdownRefs?: {
    url: string;
    path: string;
    timestamp: string;
  }[];
  studyGuide?: {
    content: string;
    updatedAt: Date;
  };
  studyCardSetRefs?: string[];
  studyDocs?: {
    url: string;
    path: string;
    name: string;
    timestamp: string;
  }[];
}

export interface Notebook {
  id: string;
  title: string;
  createdAt: Date;
  userId: string;
  pages: Page[];
}
