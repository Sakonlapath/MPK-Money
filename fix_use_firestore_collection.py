import re
with open('src/firebaseUtils.ts', 'r') as f:
    content = f.read()

old = """export function useFirestoreCollection<T>(collectionName: string) {
  const [data, setData] = useState<T[]>([]);

  useEffect(() => {
    const colRef = collection(db, collectionName);
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as T[];
      setData(items);
    });
    return () => unsubscribe();
  }, [collectionName]);

  return data;
}"""

new = """export function useFirestoreCollection<T>(collectionName: string) {
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
}"""

content = content.replace(old, new)

with open('src/firebaseUtils.ts', 'w') as f:
    f.write(content)
