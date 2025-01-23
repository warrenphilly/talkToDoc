import { Message, Section, Sentence } from "@/lib/types";
import { clsx, type ClassValue } from "clsx";
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
  if (!input.trim() && files.length === 0) return;

  const formData = new FormData();
  formData.append("message", input);

  const textSections = [];
  let markdownFilename: string | null = null;
  let allText = '';
  let messages: Message[] = [];

  // Add user message first
  const userMessage: Message = {
    user: "User",
    text: input,
    files: files.map((file) => URL.createObjectURL(file)),
  };
  messages.push(userMessage);
  setMessages((prevMessages) => [...prevMessages, userMessage]);

  // Process all files through the convert endpoint
  for (const file of files) {
    const fileFormData = new FormData();
    fileFormData.append("file", file);

    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      
    try {
      console.log("Converting file:", file.name, "Type:", file.type);
      
      const response = await fetch(`${baseUrl}/api/convert`, {
        method: "POST",
        body: fileFormData,
      });

      const data = await response.json();
      console.log("Conversion response:", data);

      if (!response.ok || data.error) {
        throw new Error(data.details || "File conversion failed");
      }
      
      if (data.text) {
        console.log("Received text content, length:", data.text.length);
        allText += data.text + '\n\n';
        
        // Split into sections for processing
        const SECTION_LENGTH = 500;
        for (let i = 0; i < data.text.length; i += SECTION_LENGTH) {
          const section = data.text.slice(i, i + SECTION_LENGTH);
          textSections.push(section);
        }
      } else {
        throw new Error("No text content received from conversion");
      }
    } catch (error) {
      console.error("File conversion error:", error);
      const errorMessage: Message = {
        user: "AI",
        text: [
          {
            title: "Error",
            sentences: [
              {
                id: 1,
                text: error instanceof Error ? error.message : "Failed to convert file. Please try again.",
              },
            ],
          },
        ],
      };
      messages.push(errorMessage);
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
      continue; // Continue with next file instead of returning
    }
  }

  // Save markdown only if we have content
  if (allText.trim()) {
    try {
      console.log("Saving markdown content, length:", allText.length);
      const initResponse = await fetch("/api/save-markdown", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          text: allText, // Changed from section to text to match the API
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
      
      markdownFilename = responseData.path;
    } catch (error) {
      console.error("Error saving markdown file:", error);
    }
  }

  // Process sections only if we have content
  if (textSections.length > 0) {
    setProgress(0);
    setIsProcessing(true);
    setTotalSections(textSections.length);

    //send message logic begins here
    const maxRetries = 3;

    console.log(" totaltextSections", textSections.length);

    // Process each text section
    for (let i = 0; i < textSections.length; i++) {
      const section = textSections[i];
      let attempt = 0;
      let success = false;

      while (attempt < maxRetries && !success) {
        try {
          const response = await fetch("/api/chat", {
            method: "POST",
            body: JSON.stringify({ message: section }),
            headers: {
              "Content-Type": "application/json",
            },
          });

          const data = await response.json();
          console.log("Raw API response for section:", data);

          let parsedResponse;

          try {
            if (!data.replies) {
              throw new Error("No replies in response");
            }

            parsedResponse =
              typeof data.replies === "string"
                ? JSON.parse(data.replies)
                : data.replies;

            console.log("Parsed response:", parsedResponse); // Debug log

            if (!Array.isArray(parsedResponse)) {
              throw new Error("Response is not an array");
            }

            // Iterate over each set of sections
            parsedResponse.forEach((section) => {
              console.log("Section received:", section); // Log the section for debugging

              if (
                typeof section.title !== "string" ||
                !Array.isArray(section.sentences)
              ) {
                console.error("Invalid section structure:", section);
                throw new Error("Invalid section structure");
              }

              const validSentences = section.sentences.every(
                (sentence: Sentence) => {
                  console.log("Checking sentence:", sentence); // Log each sentence

                  if (
                    typeof sentence.id !== "number" ||
                    typeof sentence.text !== "string"
                  ) {
                    console.error("Invalid sentence structure:", sentence);
                    return false;
                  }
                  return true;
                }
              );

              if (!validSentences) {
                console.error("Invalid sentences found");
                throw new Error("Invalid sentence structure");
              }

              // Send the section as a separate message
              const aiMessage = {
                user: "AI",
                text: [section],
              };

              messages.push(aiMessage);
              setMessages((prevMessages) => [...prevMessages, aiMessage]);
            });

            success = true;
            setProgress(i + 1); // Update progress after successful processing
          } catch (parseError) {
            console.error("Parsing error:", parseError);
            attempt++;
            if (attempt >= maxRetries) {
              const fallbackResponse = [
                {
                  title: "Error",
                  sentences: [
                    {
                      id: 1,
                      text: "Sorry, there was an error processing the response. Please try again.",
                    },
                  ],
                },
              ];

              const fallbackMessage: Message = {
                user: "AI",
                text: fallbackResponse,
              };
              messages.push(fallbackMessage);
              setMessages((prevMessages) => [...prevMessages, fallbackMessage]);
              setShowUpload(false);
            }
          }
        } catch (error) {
          console.error("Network error:", error);
          const errorResponse = [
            {
              title: "Error",
              sentences: [
                {
                  id: 1,
                  text: "Sorry, there was a network error. Please try again.",
                },
              ],
            },
          ];

          const errorMessage: Message = {
            user: "AI",
            text: errorResponse,
          };
          messages.push(errorMessage);
          setMessages((prevMessages) => [...prevMessages, errorMessage]);
          break;
        }
      }
    }

    // Reset processing state when done
    setIsProcessing(false);
  } else {
    setIsProcessing(false);
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