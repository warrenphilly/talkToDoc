export interface StudyGuideSubtopic {
  title: string;
  description: string;
  keyPoints: string[];
  examples?: string[];
  studyTips?: string[];
}

export interface StudyGuideSection {
  topic: string;
  subtopics: StudyGuideSubtopic[];
  show: boolean;
}

export interface StudyGuide {
  id: string;
  title: string;
  content: StudyGuideSection[];
  notebookId: string;
  pageId: string;
  createdAt: Date;
  userId: string;
}
