import { useState, useEffect } from 'react';
import { db } from '@/firebase';
import { collection, query, where, onSnapshot, Query } from 'firebase/firestore';
import { getCurrentUserId } from '@/lib/auth';

export function useCollectionData<T>(
  collectionName: string,
  transform?: (doc: any) => T
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) {
          setLoading(false);
          return;
        }

        const q = query(
          collection(db, collectionName),
          where("userId", "==", userId)
        );

        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const items = snapshot.docs.map((doc) => {
              const data = doc.data();
              const item = {
                id: doc.id,
                ...data,
              };
              return transform ? transform(item) : item;
            });
            setData(items as T[]);
            setLoading(false);
          },
          (error) => {
            console.error(`Error fetching ${collectionName}:`, error);
            setError(error);
            setLoading(false);
          }
        );

        return () => unsubscribe();
      } catch (error) {
        console.error(`Error setting up ${collectionName} listener:`, error);
        setError(error as Error);
        setLoading(false);
      }
    };

    fetchData();
  }, [collectionName, transform]);

  return { data, loading, error };
} 