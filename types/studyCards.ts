export interface StudyCard {
  id: string;
  title: string;
  content: string;
}

export interface StudyCardSet {
  id: string;
  pageId: string;
  notebookId: string;
  title: string;
  createdAt: string;
  cards: Array<{
    title: string;
    content: string;
  }>;
} 