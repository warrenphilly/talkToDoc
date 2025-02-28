import { storage } from "@/firebase";
import { Message, Section, Sentence } from "@/lib/types";
import { clsx, type ClassValue } from "clsx";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import fs from "fs";
import path from "path";
import { twMerge } from "tailwind-merge";

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

  let allText = "";
  let messages: Message[] = [];

  try {
    // Process files first
    for (const file of files) {
      try {
        console.log(`Starting to process file: ${file.name} (${file.type})`);

        // Validate file type
        const allowedTypes = [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "image/jpeg",
          "image/png",
          "image/gif",
        ];

        if (!allowedTypes.includes(file.type)) {
          throw new Error(`Unsupported file type: ${file.type}`);
        }

        // Upload to Firebase Storage
        const fileName = `${crypto.randomUUID()}_${file.name}`;
        const storageRef = ref(storage, `uploads/${fileName}`);

        console.log("Starting file upload to Firebase...");

        const uploadTask = uploadBytesResumable(storageRef, file);
        await new Promise((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const progress =
                (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              console.log(`Upload progress: ${progress.toFixed(2)}%`);
              setProgress(progress);
            },
            (error) => {
              console.error("Upload error:", error);
              reject(error);
            },
            () => {
              console.log("Upload completed successfully");
              resolve(uploadTask);
            }
          );
        });

        // Get download URL
        let downloadURL: string;
        try {
          downloadURL = await getDownloadURL(storageRef);
          console.log("Got download URL:", downloadURL);
        } catch (urlError) {
          console.error("Error getting download URL:", urlError);
          throw new Error("Failed to get download URL");
        }

        // Convert file
        console.log("Sending to conversion service...");
        const response = await fetch("/api/convert-from-storage", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.NEXT_PUBLIC_API_KEY || "",
          },
          body: JSON.stringify({
            fileUrl: downloadURL,
            fileName: file.name,
            fileType: file.type,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Conversion service error:", errorData);
          throw new Error(errorData.details || "Failed to convert file");
        }

        const data = await response.json();

        if (!data.text) {
          console.error("No text content in conversion response:", data);
          throw new Error("No text content received from conversion");
        }

        allText += data.text + "\n\n";
        console.log("Conversion successful, text length:", data.text.length);

        // Save markdown content
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
              pageId,
            }),
          });

          if (!initResponse.ok) {
            const errorData = await initResponse.json();
            console.error("Markdown save error:", errorData);
            throw new Error("Failed to save markdown content");
          }

          const responseData = await initResponse.json();
          console.log("Markdown saved successfully:", responseData);

          // Process with chat API
          const chatResponse = await fetch("/api/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: allText,
              markdownPath: responseData.path,
              notebookId,
              pageId,
            }),
          });

          if (!chatResponse.ok) {
            const errorData = await chatResponse.json();
            console.error("Chat API error:", errorData);
            throw new Error("Failed to process with chat API");
          }

          const chatData = await chatResponse.json();
          console.log("Chat API response received");

          if (chatData.replies) {
            const aiMessage: Message = {
              user: "AI",
              text: chatData.replies,
            };
            messages.push(aiMessage);
            setMessages((prevMessages) => [...prevMessages, aiMessage]);
          } else {
            console.error("No replies in chat response:", chatData);
            throw new Error("No replies received from chat API");
          }
        } catch (error) {
          console.error("Error in markdown/chat processing:", error);
          throw error;
        }
      } catch (error) {
        console.error("Error processing file:", error);
        const errorMessage: Message = {
          user: "AI",
          text: [
            {
              title: "Error",
              sentences: [
                {
                  id: 1,
                  text:
                    error instanceof Error
                      ? error.message
                      : "Failed to process file",
                },
              ],
            },
          ],
        };
        messages.push(errorMessage);
        setMessages((prevMessages) => [...prevMessages, errorMessage]);
      }
    }
  } catch (error) {
    console.error("Error in sendMessage:", error);
    const errorMessage: Message = {
      user: "AI",
      text: [
        {
          title: "Error",
          sentences: [
            {
              id: 1,
              text:
                error instanceof Error ? error.message : "An error occurred",
            },
          ],
        },
      ],
    };
    messages.push(errorMessage);
    setMessages((prevMessages) => [...prevMessages, errorMessage]);
  } finally {
    setProgress(0);
    setIsProcessing(false);
    setShowUpload(false);
    setFiles([]);
    setInput("");
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

// Add this utility function to serialize Firestore timestamps
export function serializeData(data: any): any {
  if (!data) return data;
  
  if (data.seconds !== undefined && data.nanoseconds !== undefined) {
    return new Date(data.seconds * 1000 + data.nanoseconds / 1000000).toISOString();
  }
  
  if (Array.isArray(data)) {
    return data.map(item => serializeData(item));
  }
  
  if (typeof data === 'object') {
    return Object.keys(data).reduce((acc, key) => {
      acc[key] = serializeData(data[key]);
      return acc;
    }, {} as any);
  }
  
  return data;
}
