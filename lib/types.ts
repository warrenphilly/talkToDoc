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