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
