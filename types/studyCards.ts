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
}

export interface StudyCardSet {
  id: string;
  title: string;
  cards: Array<{
    front: string;
    back: string;
  }>;
  metadata: StudySetMetadata;
  notebookId: string;
  pageId: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}
