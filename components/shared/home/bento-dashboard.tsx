import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Chat {
  id: string;
  createdAt: Timestamp;
  title: string;
}

export default function BentoDashboard() {
  const [chats, setChats] = useState<Chat[]>([]);

  useEffect(() => {
    // Create a query to get chats ordered by creation date
    const chatsQuery = query(
      collection(db, "chats"),
      orderBy("createdAt", "desc")
    );

    // Set up real-time listener
    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      const chatsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Chat[];
      setChats(chatsList);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-white">Your Chats</h1>
      <div className="flex flex-wrap gap-4 items-center justify-center md:p-5">
        {chats.map((chat) => (
          <Link key={chat.id} href={`/chat/${chat.id}`}>
            <Card className="h-full transition-transform hover:scale-105 bg-[#c1d296] border-none w-[800px] md:w-[400px] mx-4">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="p-2 rounded-full w-fit bg-blue-500">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-xl font-semibold mt-4 text-slate-600">
                  {chat.title}
                </h2>
                <p className="text-muted-foreground mt-2 flex-grow">
                  {chat.createdAt.toDate().toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
