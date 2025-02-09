import { readFile } from 'fs/promises';
import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';

export async function processDocument(filePath: string, fileType: string): Promise<string> {
  try {
    let text = '';
    const dataBuffer = await readFile(filePath);

    // Get the base URL from environment variable
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    if (fileType === "application/pdf") {
      const pdfData = await pdfParse.default(dataBuffer);
      text = pdfData.text;
    } 
    else if (
      fileType === "application/msword" || 
      fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const result = await mammoth.extractRawText({ buffer: dataBuffer });
      text = result.value;
    }
    else if (fileType === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
      // For PowerPoint files, forward to your existing PPTX route
      const formData = new FormData();
      formData.append('file', new Blob([dataBuffer]), 'presentation.pptx');
      
      const response = await fetch(`${baseUrl}/api/convert/pptx`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to convert PowerPoint file');
      }

      const result = await response.json();
      text = result.text;
    }
    else if (fileType.startsWith("image/")) {
      // For images, forward to your existing image route
      const formData = new FormData();
      formData.append('file', new Blob([dataBuffer]), 'image');
      
      const response = await fetch(`${baseUrl}/api/convert/image`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to process image');
      }

      const result = await response.json();
      text = result.text;
    }
    else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    return text;
  } catch (error) {
    console.error('Error in processDocument:', error);
    throw error;
  }
} 