import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { readFileSync } from 'fs';

const config = JSON.parse(readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app);

async function fixAjMam() {
  const reqSnapshot = await getDocs(collection(db, 'requests'));
  let updatedCount = 0;
  for (const requestDoc of reqSnapshot.docs) {
    const data = requestDoc.data();
    if (data.responsiblePerson === 'AJ.Mam') {
      await updateDoc(doc(db, 'requests', requestDoc.id), {
        responsiblePerson: 'นางวิทชรียา ทองผาย'
      });
      updatedCount++;
    }
  }
  console.log(`Updated ${updatedCount} requests!`);
  process.exit(0);
}

fixAjMam().catch(console.error);
