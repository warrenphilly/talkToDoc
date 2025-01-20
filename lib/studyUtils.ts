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
  
    for (const file of files) {
      if (file.type === "application/pdf") {
        const pdfFormData = new FormData();
        pdfFormData.append("file", file);
  
        const baseUrl = typeof window !== 'undefined' 
          ? window.location.origin 
          : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        try {
          const pdfResponse = await fetch(`${baseUrl}/api/convert`, {
            method: "POST",
            body: pdfFormData,
          });
  
          if (!pdfResponse.ok) {
            throw new Error("PDF conversion failed");
          }
  
          const data = await pdfResponse.json();
          
          // Accumulate all text from the PDF
          if (data.text) {
            allText += data.text + '\n\n';
            
            // Split into sections for processing
            const SECTION_LENGTH = 500;
            for (let i = 0; i < data.text.length; i += SECTION_LENGTH) {
              const section = data.text.slice(i, i + SECTION_LENGTH);
              textSections.push(section);
            }
          }
        } catch (error) {
          console.error("PDF conversion error:", error);
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
                      text: "Failed to convert PDF file. Please try again.",
                    },
                  ],
                },
              ],
            },
          ]);
          return;
        }
      } else {
        // For non-PDF files, append them as usual
        formData.append("files", file);
      }
    }
  
    // Create single markdown file after processing all PDFs
    if (allText) {
      try {
        const initResponse = await fetch("/api/save-markdown", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            section: allText,
            createNew: true,
            notebookId,
            pageId
          }),
        });
  
        if (!initResponse.ok) {
          throw new Error("Failed to save markdown file");
        }
  
        const responseData = await initResponse.json();
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
  
    console.log("formDatapleaseeeee", formData);
  
    
 
  
  
    console.log(" totaltextSections", textSections.length);
  
 
  
    // Reset processing state when done
    setIsProcessing(false);
  };