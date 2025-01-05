"use client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Image, Upload } from "lucide-react"; // Import icons
import React, { useEffect, useRef, useState } from "react";

// First, let's define our message types
interface Sentence {
  id: number;
  text: string;
}

interface Section {
  title: string;
  sentences: Sentence[];
}

interface Message {
  user: string;
  text: string | Section[];
  files?: string[];
}

const SideChat = ({ primeSentence }: { primeSentence: string | null }) => {
  const [messages, setMessages] = useState<Message[]>([
    { user: "user", text: primeSentence || "" },
  ]);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sendMessage = async (messageText: string = input) => {
    console.log("sendMessage called with:", messageText);
    if (!messageText.trim() && files.length === 0) return;

    const formData = new FormData();
    formData.append("message", messageText);
    formData.append("context", primeSentence || "");
    files.forEach((file) => {
      formData.append("files", file);
    });

    const userMessage = {
      user: "User",
      text: messageText,
      files: files.map((file) => URL.createObjectURL(file)),
    };

    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput("");
    setFiles([]);

    try {
      const response = await fetch("/api/sidechat", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      console.log("Raw API response:", data); // Debug log

      const aiMessage = {
        user: "AI",
        text: data.reply,
      };

      setMessages((prevMessages) => [...prevMessages, aiMessage]);
    } catch (error) {
      console.error("Network error:", error);
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          user: "AI",
          text: "Sorry, there was a network error. Please try again.",
        },
      ]);
    }
  };

  return (
    <div className="flex flex-col h-full w-full border-3 bg-slate-100 rounded-2xl mb-4 max-h-[90vh] ">
      <div className="border border-[#94b347] text-white rounded-lg   p-4 m-4">
        {/* <h1 className='text-xl font-regular'>AI Chat</h1> */}
        <div className="m-2">
          {primeSentence ? (
            <p>{primeSentence}</p>
          ) : (
            <p className="text-gray-500">Click a Sentence to add context</p>
          )}
        </div>
        <div className="flex flex-row gap-2">
          <Button
            className="bg-[#94b347] text-white"
            onClick={() => sendMessage("Explain this in greater detail")}
          >
            Explain{" "}
          </Button>
          <Button
            className="bg-[#94b347] text-white"
            onClick={() => sendMessage("Give me a step-by-step example")}
          >
            Give Example{" "}
          </Button>
        </div>
      </div>
      <div className="flex-grow overflow-y-auto p-4 auto-scroll">
        {messages.map(
          (msg, index) =>
            msg.text &&
            (msg.user === "User" || msg.user === "AI") && (
              <div
                key={index}
                className={`p-2 rounded mb-2 ${
                  msg.user === "User"
                    ? "bg-[#c1d295] shadow-sm rounded-xl text-white"
                    : "bg-slate-100 text-lg text-slate-900"
                }`}
              >
                {msg.user === "AI" ? (
                  <div className="text-sm">
                    <strong className="block mb-4 text-lg">{msg.user}:</strong>
                    {Array.isArray(msg.text) ? (
                      <div className="space-y-6 ">
                        {msg.text.map(
                          (section: Section, sectionIdx: number) => (
                            <div
                              key={sectionIdx}
                              className="bg-white p-4 rounded-lg shadow"
                            >
                              <h3 className="text-lg font-bold text-gray-100 mb-3">
                                {section.title}
                              </h3>
                              <div className="space-y-2">
                                {section.sentences.map((sentence: Sentence) => (
                                  <div className="p-2 bg-gray-50 hover:bg-gray-100 rounded cursor-pointer transition-colors">
                                    <p className="text-gray-100">
                                      {sentence.text}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <span>{String(msg.text)}</span>
                    )}
                  </div>
                ) : (
                  <div className="text-sm">
                    <strong>{msg.user}:</strong> <span>{String(msg.text)}</span>
                    {msg.files && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {msg.files.map((fileUrl: string, idx: number) => (
                          <img
                            key={idx}
                            src={fileUrl}
                            alt={`Uploaded file ${idx + 1}`}
                            className="max-w-[200px] max-h-[200px] object-cover rounded"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
        )}
      </div>
      <div className="bg-slate-100 p-4  rounded-b-lg">
        <div className="flex  bg-slate-200 rounded-lg  p-2 flex-row items-center gap-3 h-fit">
          <Textarea
            className="w-full h-full border shadow-none border-slate-200 rounded bg-slate-200 text-slate-900 flex-grow"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && !e.shiftKey && sendMessage(input)
            }
          />
          <Button
            className="bg-[#94b347] text-white"
            onClick={() => sendMessage(input)}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SideChat;
