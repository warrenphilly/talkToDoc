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

  const userMessage: Message = {
    user: "User",
    text: input,
    files: files.map((file) => URL.createObjectURL(file)),
  };

  setMessages((prevMessages) => [...prevMessages, userMessage]);
  setInput("");
  setFiles([]);

  const maxRetries = 3;

  for (const file of files) {
    formData.append("files", file);

    let attempt = 0;
    let success = false;

    while (attempt < maxRetries && !success) {
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        console.log("Raw API response:", data); // Debug log

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
          parsedResponse.forEach((sections) => {
            if (!Array.isArray(sections)) {
              console.error("Invalid section structure:", sections);
              throw new Error("Invalid section structure");
            }

            const validSections = sections.every((section) => {
              if (
                !section.title ||
                !section.sentences ||
                !Array.isArray(section.sentences)
              ) {
                console.error("Invalid section structure:", section);
                return false;
              }

              return section.sentences.every((sentence: Sentence) => {
                if (
                  !sentence ||
                  typeof sentence.id !== "number" ||
                  typeof sentence.text !== "string"
                ) {
                  console.error("Invalid sentence structure:", sentence);
                  return false;
                }
                return true;
              });
            });

            if (!validSections) {
              throw new Error("Invalid section or sentence structure");
            }

            // Send each section as a separate message
            sections.forEach((section) => {
              const aiMessage = {
                user: "AI",
                text: [section],
              };

              setMessages((prevMessages) => [...prevMessages, aiMessage]);
            });
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
