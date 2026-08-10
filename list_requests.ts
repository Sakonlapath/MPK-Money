import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { readFileSync } from 'fs';

const config = JSON.parse(readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app);

async function listReqs() {
  const reqSnapshot = await getDocs(collection(db, 'requests'));
  for (const requestDoc of reqSnapshot.docs) {
    const data = requestDoc.data();
    console.log(`Req: ${requestDoc.id}, user: ${data.userName}, resp: ${data.responsiblePerson}`);
  }
  process.exit(0);
}

listReqs().catch(console.error);
