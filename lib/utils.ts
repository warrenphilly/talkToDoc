import { Message, Section, Sentence } from "@/lib/types";
import { clsx, type ClassValue } from "clsx";
import fs from "fs";
import path from "path";
import { twMerge } from "tailwind-merge";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/firebase";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const sendMessage = async (
  input: string,
  files: File[],
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  setInput: (input: string) => void,
  setFiles: (files: File[]) => void,
  setShowUpload: (show: boolean) => void,
  setProgress: (progress: number) => void,
  setTotalSections: (total: number) => void,
  setIsProcessing: (isProcessing: boolean) => void,
  notebookId: string,
  pageId: string
) => {
  if (!input.trim() && files.length === 0) {
    console.warn("No input text or files provided");
    return;
  }

  const textSections = [];
  let allText = '';
  let messages: Message[] = [];

  // Validate file sizes before processing
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);
  if (oversizedFiles.length > 0) {
    const errorMessage: Message = {
      user: "AI",
      text: [{
        title: "Error",
        sentences: [{
          id: 1,
          text: `Files exceeding 10MB limit: ${oversizedFiles.map(f => f.name).join(', ')}`,
        }],
      }],
    };
    setMessages(prev => [...prev, errorMessage]);
    return;
  }

  // Add user message first
  const fileDetails = files.map(file => ({
    id: crypto.randomUUID(),
    name: file.name
  }));

  const userMessage: Message = {
    user: "User",
    text: input,
    files: fileDetails.map(fd => fd.id),
    fileDetails: fileDetails
  };
  messages.push(userMessage);
  setMessages((prevMessages) => [...prevMessages, userMessage]);

  try {
    // Process files first
    for (const file of files) {
      try {
        // Validate file type
        const allowedTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'image/jpeg',
          'image/png',
          'image/gif'
        ];
        
        if (!allowedTypes.includes(file.type)) {
          throw new Error(`Unsupported file type: ${file.type}. Supported types are PDF, Word, PowerPoint, and images.`);
        }

        console.log(`Processing file: ${file.name} (${file.type}), size: ${file.size} bytes`);

        // Upload to Firebase Storage
        const fileName = `${crypto.randomUUID()}_${file.name}`;
        const storageRef = ref(storage, `uploads/${fileName}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        // Monitor upload progress with detailed logging
        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            const state = snapshot.state;
            console.log(`Upload state: ${state}, Progress: ${progress.toFixed(2)}%`);
            setProgress(progress);
          },
          (error) => {
            console.error("Upload error:", {
              code: error.code,
              message: error.message,
              serverResponse: error.serverResponse
            });
            throw new Error(`Upload failed: ${error.message}`);
          }
        );

        // Wait for upload to complete
        try {
          await new Promise((resolve, reject) => {
            uploadTask.then(resolve).catch(reject);
          });
          console.log(`Upload completed successfully for ${file.name}`);
        } catch (uploadError) {
          throw new Error(`Upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
        }

        // Get the download URL
        let downloadURL: string;
        try {
          downloadURL = await getDownloadURL(storageRef);
          console.log("Download URL obtained:", downloadURL);
        } catch (urlError) {
          throw new Error(`Failed to get download URL: ${urlError instanceof Error ? urlError.message : 'Unknown error'}`);
        }

        const response = await fetch('/api/convert-from-storage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileUrl: downloadURL,
            fileName: file.name,
            fileType: file.type,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to convert file');
        }

        const data = await response.json();
        
        if (data.text) {
          allText += data.text + '\n\n';
          console.log("Received converted text, length:", data.text.length);

          try {
            console.log("Saving markdown content...");
            const initResponse = await fetch("/api/save-markdown", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ 
                text: allText,
                createNew: true,
                notebookId,
                pageId
              }),
            });

            if (!initResponse.ok) {
              throw new Error("Failed to save markdown content");
            }

            const responseData = await initResponse.json();
            console.log("Markdown save response:", responseData);

            // Now send to chat API
            console.log("Sending to chat API...");
            const chatResponse = await fetch("/api/chat", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                message: allText,
                markdownPath: responseData.path,
                notebookId,
                pageId
              }),
            });

            if (!chatResponse.ok) {
              const errorData = await chatResponse.json();
              console.error("Chat API error:", errorData);
              throw new Error('Failed to process text with chat API');
            }

            const chatData = await chatResponse.json();
            console.log("Chat API response:", chatData);

            if (chatData.replies) {
              const aiMessage: Message = {
                user: "AI",
                text: chatData.replies,
              };
              messages.push(aiMessage);
              setMessages((prevMessages) => [...prevMessages, aiMessage]);
            } else {
              console.error("No replies in chat response:", chatData);
            }

          } catch (error) {
            console.error("Error in markdown/chat processing:", error);
            throw error;
          }
        } else {
          console.warn("No text content in conversion response");
        }
      } catch (error) {
        console.error("Error processing file:", error);
        const errorMessage: Message = {
          user: "AI",
          text: [{
            title: "Error",
            sentences: [{
              id: 1,
              text: error instanceof Error ? error.message : "Failed to process file",
            }],
          }],
        };
        messages.push(errorMessage);
        setMessages((prevMessages) => [...prevMessages, errorMessage]);
      }
    }

    // Process text input if any
    if (input.trim()) {
      const chatResponse = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: input,
        }),
      });

      if (!chatResponse.ok) {
        throw new Error('Failed to process message');
      }

      const chatData = await chatResponse.json();
      
      if (chatData.replies) {
        const aiMessage: Message = {
          user: "AI",
          text: chatData.replies,
        };
        messages.push(aiMessage);
        setMessages((prevMessages) => [...prevMessages, aiMessage]);
      }
    }

  } catch (error) {
    console.error("Error in sendMessage:", error);
    const errorMessage: Message = {
      user: "AI",
      text: [{
        title: "Error",
        sentences: [{
          id: 1,
          text: error instanceof Error ? error.message : "An error occurred",
        }],
      }],
    };
    messages.push(errorMessage);
    setMessages((prevMessages) => [...prevMessages, errorMessage]);
  } finally {
    setProgress(0);
    setIsProcessing(false);
    setShowUpload(false);
    setFiles([]);
    setInput('');
  }
};

export const fileUpload = (
  event: React.ChangeEvent<HTMLInputElement>,
  setFiles: (files: File[]) => void
) => {
  const uploadedFiles = event.target.files;
  if (uploadedFiles) {
    setFiles(Array.from(uploadedFiles));
  }
};

export const sentenceClick = (
  sentence: Sentence,
  setPrimeSentence: (sentence: string) => void,
  setShowChat: (showChat: boolean) => void
) => {
  setPrimeSentence(sentence.text);
  setShowChat(true);
};

export const sectionClick = (
  section: Section,
  setPrimeSentence: (sentence: string) => void,
  setShowChat: (showChat: boolean) => void
) => {
  const sectionText = section.sentences
    .map((sentence) => sentence.text)
    .join(" ");
  setPrimeSentence(sectionText);
  setShowChat(true);
};