import { useEffect, useState } from 'react';
import { db, auth } from './firebase';
import { collection, onSnapshot, doc, getDoc, setDoc } from 'firebase/firestore';
import { AppUser, Project, SubActivity, BudgetRequest, SystemAlert } from './types';
import { onAuthStateChanged } from 'firebase/auth';

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeUser = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        let created = false;
        
        unsubscribeUser = onSnapshot(userRef, async (userSnap) => {
          if (userSnap.exists()) {
            setCurrentUser(userSnap.data() as AppUser);
            setLoading(false);
          } else {
            setCurrentUser(null);
            setLoading(false);
          }
        });
      } else {
        unsubscribeUser();
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeUser();
      unsubscribeAuth();
    };
  }, []);

  return { currentUser, loading };
}

export function useFirestoreCollection<T>(collectionName: string) {
  const [data, setData] = useState<T[]>([]);

  useEffect(() => {
    let unsubscribeSnapshot = () => {};
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const colRef = collection(db, collectionName);
        unsubscribeSnapshot = onSnapshot(colRef, (snapshot) => {
          const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as T[];
          setData(items);
        }, (error) => {
          console.error(`Error in snapshot listener for ${collectionName}:`, error);
        });
      } else {
        unsubscribeSnapshot();
        setData([]);
      }
    });

    return () => {
      unsubscribeSnapshot();
      unsubscribeAuth();
    };
  }, [collectionName]);

  return data;
}
