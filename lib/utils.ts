import { storage } from "@/firebase";
import { saveNote } from "@/lib/firebase/firestore";
import { registerStreamRequest } from "@/lib/streamManager";
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
  language: string,
  input: string,
  files: File[],
  setMessages: (
    messagesOrUpdater: Message[] | ((prev: Message[]) => Message[])
  ) => void,
  setInput: (input: string) => void,
  setFiles: (files: File[]) => void,
  setShowUpload: (show: boolean) => void,
  setProgress: (progress: number) => void,
  setTotalSections: (total: number) => void,
  setIsProcessing: (isProcessing: boolean) => void,
  notebookId: string,
  pageId: string,
  fileMetadata: Array<{
    name: string;
    size: number;
    type: string;
    uploadedAt: number;
    id: string;
  }> = [],
  tabId: string,
  instructions?: string
) => {
  if (!input.trim() && files.length === 0) {
    console.warn("No input text or files provided");
    return;
  }

  let allText = "";
  let messages: Message[] = [];

  // Create a temporary message to show streaming content
  const tempAiMessage: Message = {
    user: "AI",
    text: [],
    files: files.map((file) => file.name),
    fileMetadata: fileMetadata,
  };

  // Add the temporary message to the UI immediately
  setMessages((prevMessages) => [...prevMessages, tempAiMessage]);

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
          const errorData = await response
            .json()
            .catch(() => ({ details: `HTTP error ${response.status}` }));
          console.error("Conversion service error:", errorData);
          throw new Error(
            errorData.details ||
              `Failed to convert file: ${response.statusText}`
          );
        }

        const data = await response.json().catch(() => {
          throw new Error("Failed to parse conversion response");
        });

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
            const errorData = await initResponse
              .json()
              .catch(() => ({ details: `HTTP error ${initResponse.status}` }));
            console.error("Markdown save error:", errorData);
            throw new Error(
              errorData.details || "Failed to save markdown content"
            );
          }

          const responseData = await initResponse.json().catch(() => {
            throw new Error("Failed to parse markdown save response");
          });

          console.log("Markdown saved successfully:", responseData);

          // Process with chat API using streaming
          const sections: Section[] = [];

          // Create a stream ID from notebookId and tabId
          const streamId = `${notebookId}-${tabId}`;

          // Register this stream with the manager
          const controller = registerStreamRequest(streamId);

          // Use the controller's signal in your fetch request
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
              stream: true,
              language: language,
              instructions: instructions?.trim() || null,
            }),
            signal: controller.signal,
          });

          if (!chatResponse.ok) {
            const errorData = await chatResponse
              .json()
              .catch(() => ({ details: `HTTP error ${chatResponse.status}` }));
            console.error("Chat API error:", errorData);
            throw new Error(
              errorData.details || "Failed to process with chat API"
            );
          }

          // Process the streaming response
          const reader = chatResponse.body?.getReader();
          const decoder = new TextDecoder();

          if (!reader) {
            throw new Error("Failed to get reader from response");
          }

          let done = false;
          let buffer = "";

          while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;

            if (done) {
              console.log("Stream complete - reader signaled completion");
              setIsProcessing(false);
              break;
            }

            // Decode the chunk and add it to our buffer
            buffer += decoder.decode(value, { stream: true });

            // Process complete lines in the buffer
            const lines = buffer.split("\n");
            buffer = lines.pop() || ""; // Keep the last incomplete line in the buffer

            for (const line of lines) {
              if (line.trim() === "") continue;

              try {
                const data = JSON.parse(line);

                if (data.type === "section" && data.data) {
                  // Add the new section to our array
                  sections.push(data.data);

                  // Update the temporary message with the new section
                  setMessages((prevMessages) => {
                    const updatedMessages = [...prevMessages];
                    const lastMessage =
                      updatedMessages[updatedMessages.length - 1];

                    if (lastMessage && lastMessage.user === "AI") {
                      // Update the text with all sections received so far
                      lastMessage.text = sections;
                    }

                    return updatedMessages;
                  });

                  // Update the total sections count
                  setTotalSections(data.total);

                  // Save to database incrementally
                  const aiMessage: Message = {
                    user: "AI",
                    text: sections,
                    files: files.map((file) => file.name),
                    fileMetadata: fileMetadata,
                  };

                  // Save the current state to the database
                  try {
                    await saveNote(notebookId, pageId, [
                      ...messages,
                      aiMessage,
                    ]);
                  } catch (saveError) {
                    console.error(
                      "Error saving incremental update:",
                      saveError
                    );
                    // Continue processing even if an incremental save fails
                  }
                } else if (data.type === "done" || data.type === "complete") {
                  console.log(
                    "Streaming completed, received",
                    data.total,
                    "sections"
                  );
                  // Explicitly set processing to false when done
                  setIsProcessing(false);

                  // Add a final database save to ensure all content is saved
                  try {
                    const aiMessage: Message = {
                      user: "AI",
                      text: sections,
                      files: files.map((file) => file.name),
                      fileMetadata: fileMetadata,
                    };
                    await saveNote(notebookId, pageId, [
                      ...messages,
                      aiMessage,
                    ]);
                  } catch (finalSaveError) {
                    console.error("Error saving final state:", finalSaveError);
                  }

                  // Early completion - exit the loop
                  done = true;
                  break;
                } else if (data.type === "error") {
                  console.error("Stream error:", data.message);
                  setIsProcessing(false);

                  // Handle error by adding an error message
                  const errorMessage: Message = {
                    user: "AI",
                    text: [
                      {
                        title: "Error",
                        sentences: [
                          {
                            id: 1,
                            text:
                              data.message ||
                              "An error occurred during processing",
                          },
                        ],
                      },
                    ],
                    files: files.map((file) => file.name),
                    fileMetadata: fileMetadata,
                  };

                  setMessages((prevMessages) => {
                    // Replace the temporary message with the error
                    const updatedMessages = [...prevMessages];
                    updatedMessages[updatedMessages.length - 1] = errorMessage;
                    return updatedMessages;
                  });

                  // Exit the loop
                  done = true;
                  break;
                }
              } catch (error) {
                console.error(
                  "Error parsing streaming response:",
                  error,
                  "Line:",
                  line
                );
                // Continue processing other lines even if one fails
              }
            }
          }

          // Create the final AI message with all sections
          const aiMessage: Message = {
            user: "AI",
            text: sections,
            files: files.map((file) => file.name),
            fileMetadata: fileMetadata,
          };

          messages.push(aiMessage);

          // Final update to the messages state
          setMessages((prevMessages) => {
            const updatedMessages = [...prevMessages];
            // Replace the temporary message with the final one
            updatedMessages[updatedMessages.length - 1] = aiMessage;
            return updatedMessages;
          });
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
          files: [],
          fileMetadata: [],
        };
        messages.push(errorMessage);
        setMessages((prevMessages) => {
          // Remove the temporary message if it's the last one
          const filteredMessages = prevMessages.filter(
            (msg, idx) =>
              !(
                idx === prevMessages.length - 1 &&
                msg.user === "AI" &&
                Array.isArray(msg.text) &&
                msg.text.length === 0
              )
          );
          return [...filteredMessages, errorMessage];
        });

        // Don't throw here - we want to continue processing other files if possible
      }
    }

    // If we have text input but no files were processed successfully
    if (input.trim() && messages.length === 0) {
      // Process the text input directly
      // This would need implementation similar to file processing but for direct text
      console.log("Processing text input directly");
      // Implementation for text-only processing would go here
    }

    // If we reach here with no messages, it means all file processing failed
    if (messages.length === 0) {
      const errorMessage: Message = {
        user: "AI",
        text: [
          {
            title: "Processing Complete",
            sentences: [
              {
                id: 1,
                text: "Your files have been processed, but no content could be extracted. Please try again or use a different file format.",
              },
            ],
          },
        ],
        files: [],
        fileMetadata: [],
      };

      setMessages((prevMessages) => {
        // Remove the temporary message if it's the last one
        const filteredMessages = prevMessages.filter(
          (msg, idx) =>
            !(
              idx === prevMessages.length - 1 &&
              msg.user === "AI" &&
              Array.isArray(msg.text) &&
              msg.text.length === 0
            )
        );
        return [...filteredMessages, errorMessage];
      });
    }

    return messages;
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
      files: [],
      fileMetadata: [],
    };

    setMessages((prevMessages) => {
      // Remove the temporary message if it's the last one
      const filteredMessages = prevMessages.filter(
        (msg, idx) =>
          !(
            idx === prevMessages.length - 1 &&
            msg.user === "AI" &&
            Array.isArray(msg.text) &&
            msg.text.length === 0
          )
      );
      return [...filteredMessages, errorMessage];
    });

    return [errorMessage]; // Return the error message so the caller knows something happened
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
    return new Date(
      data.seconds * 1000 + data.nanoseconds / 1000000
    ).toISOString();
  }

  if (Array.isArray(data)) {
    return data.map((item) => serializeData(item));
  }

  if (typeof data === "object") {
    return Object.keys(data).reduce((acc, key) => {
      acc[key] = serializeData(data[key]);
      return acc;
    }, {} as any);
  }

  return data;
}
