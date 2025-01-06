import { Message } from "@/lib/types";

import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { db } from "../../firebase";

// Add interface for Chat type
interface Chat {
  id: string;
  createdAt: Date;
  messages: Record<string, Message>;
  title: string;
}

export const saveChat = async (messages: Message[]) => {
  try {
    // Use a fixed document ID for the current chat session
    const chatDocRef = doc(db, "chat", "currentChat");

    // Convert messages array to an object with numeric keys
    const messagesObject = messages.reduce((acc, message, index) => {
      acc[index] = message;
      return acc;
    }, {} as { [key: number]: Message });

    await setDoc(chatDocRef, messagesObject, { merge: true });
  } catch (error) {
    console.error("Error saving chat:", error);
    throw error;
  }
};

export const getChat = async () => {
  try {
    const chatDocRef = doc(db, "chat", "currentChat");
    const docSnap = await getDoc(chatDocRef);

    if (docSnap.exists()) {
      // Convert the object back to an array
      const data = docSnap.data();
      const messagesArray = Object.keys(data)
        .sort((a, b) => Number(a) - Number(b))
        .map((key) => data[key]);
      return messagesArray;
    }
    return [];
  } catch (error) {
    console.error("Error getting chat:", error);
    throw error;
  }
};

export const createNewChat = async () => {
  try {
    const chatId = `chat_${Date.now()}`; // Create unique ID for each chat
    const chatDocRef = doc(db, "chats", chatId);
    await setDoc(chatDocRef, {
      createdAt: new Date(),
      messages: {},
      title: "New Chat",
    });
    return chatId;
  } catch (error) {
    console.error("Error creating new chat:", error);
    throw error;
  }
};

export const getAllChats = async () => {
  try {
    const chatsCollection = collection(db, "chats");
    const querySnapshot = await getDocs(chatsCollection);
    const chats = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Chat[]; // Type assertion to Chat[]
    return chats.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error("Error getting chats:", error);
    throw error;
  }
};
