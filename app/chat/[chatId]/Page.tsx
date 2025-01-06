import { db } from "@/firebase";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { notFound } from "next/navigation";

interface PageProps {
  params: {
    chatId: string;
  };
}

interface Chat {
  id: string;
  title: string;
  createdAt: Timestamp;
  messages: Record<string, any>;
}

async function getChatData(chatId: string): Promise<Chat | null> {
  const chatRef = doc(db, "chats", chatId);
  const chatSnap = await getDoc(chatRef);

  if (!chatSnap.exists()) {
    return null;
  }

  return {
    id: chatSnap.id,
    ...chatSnap.data(),
  } as Chat;
}

export default async function ChatPage({ params }: PageProps) {
  const chat = await getChatData(params.chatId);

  if (!chat) {
    notFound();
  }

  return (
    <div className="flex flex-col h-screen bg-slate-900 p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-white">{chat.title}</h1>
        <span className="text-gray-400">
          {chat.createdAt.toDate().toLocaleDateString()}
        </span>
      </div>
      <div className="flex-1 bg-slate-800 rounded-lg p-4">
        {/* Chat messages will go here */}
        <div className="text-white">Chat ID: {params.chatId}</div>
      </div>
    </div>
  );
}
