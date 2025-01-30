export interface StudyCard {
  title: string;
  content: string;
}

export interface StudySetMetadata {
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

export interface StudyCardSet {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  notebookId: string;
  pageId: string;
  userId: string;
  cards: StudyCard[];
  metadata: {
    name: string;
    cardCount: number;
    sourceNotebooks: string[];
    createdAt: string;
  };
}
