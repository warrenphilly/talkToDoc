export interface StudyCard {
  title: string;
  content: string;
}

export interface StudySetMetadata {
  name: string;
  cardCount: number;
  sourceNotebooks: {
    notebookId: string;
    notebookTitle: string;
    pages: {
      pageId: string;
      pageTitle: string;
    }[];
  }[];
  createdAt: string;
  userId: string;
}

export interface StudyCardSet {
  id: string;
  title: string;
  cards: Array<{
    title: string;
    content: string;
  }>;
  createdAt: string;
  updatedAt: string;
  userId: string;
  metadata: {
    createdAt: string;
    updatedAt: string;
  };
  notebookId: string | null;
  pageId: string | null;
}
