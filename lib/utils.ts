import { Message, Section, Sentence } from "@/lib/types";
import { clsx, type ClassValue } from "clsx";
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
  setShowUpload: (show: boolean) => void
) => {
  if (!input.trim() && files.length === 0) return;

  const formData = new FormData();
  formData.append("message", input);

  const textSections = [];
  console.log("input", input);

  console.log("files", files);
  for (const file of files) {
    if (file.type === "application/pdf") {
      const pdfFormData = new FormData();
      pdfFormData.append("file", file);

      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      try {
        const pdfResponse = await fetch(`${baseUrl}/api/convert`, {
          method: "POST",
          body: pdfFormData,
        });

        if (!pdfResponse.ok) {
          throw new Error("PDF conversion failed");
        }

        const data = await pdfResponse.json();

        // Split text into 1000 character sections
        const SECTION_LENGTH = 500;

        if (data.text) {
          for (let i = 0; i < data.text.length; i += SECTION_LENGTH) {
            textSections.push(data.text.slice(i, i + SECTION_LENGTH));
          }
        }

        // Append the sectioned text instead of the PDF file
        formData.append("text", textSections.join("\n---\n"));
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

  console.log("formDatapleaseeeee", formData);

  const userMessage: Message = {
    user: "User",
    text: input,
    files: files.map((file) => URL.createObjectURL(file)),
  };

  setMessages((prevMessages) => [...prevMessages, userMessage]);
  setInput("");
  setFiles([]);
 
  //send message logic begins here
  const maxRetries = 3;

  console.log(" totaltextSections", textSections.length);

  // Process each text section
  for (const section of textSections) {
    let attempt = 0;
    let success = false;
    console.log(`section:`, section);

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

            const validSentences = section.sentences.every((sentence: Sentence) => {
              console.log("Checking sentence:", sentence); // Log each sentence

              if (
                typeof sentence.id !== "number" ||
                typeof sentence.text !== "string"
              ) {
                console.error("Invalid sentence structure:", sentence);
                return false;
              }
              return true;
            });

            if (!validSentences) {
              console.error("Invalid sentences found");
              throw new Error("Invalid sentence structure");
            }

            // Send the section as a separate message
            const aiMessage = {
              user: "AI",
              text: [section],
            };

            setMessages((prevMessages) => [...prevMessages, aiMessage]);
          });

          success = true;
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

            setMessages((prevMessages) => [
              ...prevMessages,
              {
                user: "AI",
                text: fallbackResponse,
              },
            ]);
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

        setMessages((prevMessages) => [
          ...prevMessages,
          {
            user: "AI",
            text: errorResponse,
          },
        ]);
        break;
      }
    }
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
