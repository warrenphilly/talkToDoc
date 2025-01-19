export interface Page {
  id: string;
  title: string;
  content: string;
  isOpen: boolean;
  messages?: any[];
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
}

export interface Notebook {
  id: string;
  title: string;
  createdAt: Date;
  userId: string;
  pages: Page[];
}
