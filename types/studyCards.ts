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
  cards: StudyCard[];
  metadata: StudySetMetadata;
  pageId: string;
  notebookId: string;
  createdAt: Date;
  userId: string;
}
