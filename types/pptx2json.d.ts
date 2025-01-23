declare module 'pptx2json' {
  export interface Shape {
    text?: string;
    [key: string]: any;
  }

  export interface Slide {
    shapes?: Shape[];
    [key: string]: any;
  }

  export interface PPTXContent {
    slides: Slide[];
  }

  export default class PPTX2Json {
    static toJSON(buffer: Buffer): Promise<PPTXContent>;
  }
} 