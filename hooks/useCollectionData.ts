import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { useUser } from '@clerk/nextjs';

export function useCollectionData<T>(collectionName: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  useEffect(() => {
    if (!user) return;

    const collectionRef = collection(db, collectionName);
    const q = query(collectionRef, where("userId", "==", user.id));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: T[] = [];
      snapshot.forEach((doc) => {
        items.push({ ...doc.data(), id: doc.id } as T);
      });
      setData(items);
      setLoading(false);
    }, (error) => {
      console.error(`Error fetching ${collectionName}:`, error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionName, user]);

  const mutate = (newData: T[]) => {
    setData(newData);
  };

  return { data, loading, mutate };
} 