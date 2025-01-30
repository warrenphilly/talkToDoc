export interface Sentence {
   id: number;
   text: string;
}

export interface Section {
   title: string;
   sentences: Sentence[];
}
  
export interface Message {
   user: string;
   text: string | Section[];
   files?: string[];

}

export interface ParagraphData {
  user: string;
  text: Section[];
}

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
}

export interface ContextSection {
  id: string;
  text: string;
  timestamp: number;
  isHighlighted?: boolean;
}

export interface SideChat {
  id: string;
  notebookId: string;
  pageId: string;
  contextSections: ContextSection[];
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface Notebook {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  pages: Page[];
}
