import { storage } from "@/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export const handleGenerateQuiz = async (
  quizName: string,
  numberOfQuestions: number,
  selectedQuestionTypes: any,
  filesToUpload: File[],
  selectedPages: { [notebookId: string]: string[] },
  userId: string

) => {
  try {
    // Upload and convert files first
    const uploadedDocs = [];
    if (filesToUpload.length > 0) {
      for (const file of filesToUpload) {
        const timestamp = Date.now();
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const path = `uploads/${timestamp}_${sanitizedFileName}`;
        
        // Upload to storage
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        
        // Convert file from storage
        const response = await fetch('/api/convert-from-storage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileUrl: url,
            fileName: file.name,
            fileType: file.type
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to convert file: ${file.name}`);
        }

        const data = await response.json();
        if (data.text) {
          uploadedDocs.push({
            path,
            url,
            name: file.name,
            content: data.text,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    // ... rest of the quiz generation logic remains the same ...
  } catch (error) {
    console.error("Error generating quiz:", error);
    throw error;
  }
}; 