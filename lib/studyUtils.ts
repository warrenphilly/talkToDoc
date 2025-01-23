import { Message, Section, Sentence } from "@/lib/types";
import { clsx, type ClassValue } from "clsx";
import fs from "fs";
import path from "path";
import { twMerge } from "tailwind-merge";

export const generateCards = async (
  input: string,
  files: File[],
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  setIsProcessing: (isProcessing: boolean) => void,
  notebookId: string,
  pageId: string
) => {
  if (!input.trim() && files.length === 0) return;

  const formData = new FormData();
  formData.append("message", input);

  const textSections = [];
  let markdownFilename: string | null = null;
  let allText = '';

  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Process each file through the appropriate converter
  for (const file of files) {
    const fileFormData = new FormData();
    fileFormData.append("file", file);

    try {
      console.log("Converting file:", file.name, "Type:", file.type);
      
      // The main /api/convert endpoint will route to the appropriate converter
      const response = await fetch(`${baseUrl}/api/convert`, {
        method: "POST",
        body: fileFormData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || "File conversion failed");
      }

      const data = await response.json();
      console.log("Conversion response:", data);

      if (data.text) {
        console.log("Received text content, length:", data.text.length);
        allText += `\n\n--- ${file.name} ---\n\n${data.text}`;
        
        // Split into sections for processing
        const SECTION_LENGTH = 500;
        for (let i = 0; i < data.text.length; i += SECTION_LENGTH) {
          const section = data.text.slice(i, i + SECTION_LENGTH);
          textSections.push(section);
        }
      }
    } catch (error) {
      console.error("File conversion error:", error);
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          user: "AI",
          text: [
            {
              title: "Error",
              sentences: [
                {
                  id: 1,
                  text: error instanceof Error 
                    ? error.message 
                    : "Failed to convert file. Please try again.",
                },
              ],
            },
          ],
        },
      ]);
      continue; // Continue with next file instead of returning
    }
  }

  // Save accumulated text as markdown
  if (allText.trim()) {
    try {
      console.log("Saving markdown content, length:", allText.length);
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
        throw new Error("Failed to save markdown file");
      }

      const responseData = await initResponse.json();
      console.log("Markdown save response:", responseData);
      
      // Convert the response data to ensure it's a plain object
      const plainPath = {
        path: responseData.path,
        url: responseData.url,
        timestamp: typeof responseData.timestamp === 'object' && responseData.timestamp !== null
          ? new Date(responseData.timestamp.seconds * 1000).toISOString()
          : responseData.timestamp
      };

      markdownFilename = plainPath.path;
    } catch (error) {
      console.error("Error saving markdown file:", error);
    }
  }

  // Add the processed files to the message
  setMessages((prevMessages) => [
    ...prevMessages,
    {
      user: "User",
      text: input,
      files: files.map((file) => URL.createObjectURL(file)),
    },
  ]);

  setIsProcessing(false);
};