const { initializeTestEnvironment } = require("@firebase/rules-unit-testing");
const { doc, setDoc, updateDoc } = require("firebase/firestore");
const fs = require('fs');

async function main() {
  const testEnv = await initializeTestEnvironment({
    projectId: "bento-budget",
    firestore: {
      rules: fs.readFileSync("firestore.rules", "utf8"),
    },
  });

  const alice = testEnv.authenticatedContext("alice", { email: "alice@example.com" });
  
  // Set up initial user
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "users/alice"), {
      uid: "alice",
      email: "alice@example.com",
      displayName: "Alice",
      role: "USER"
    });
  });

  try {
    const db = alice.firestore();
    const photoURL = "data:image/jpeg;base64," + "A".repeat(600);
    await updateDoc(doc(db, "users/alice"), {
      displayName: "Alice Updated",
      photoURL: photoURL
    });
    console.log("SUCCESS!");
  } catch (e) {
    console.error("ERROR:", e.message);
  }

  await testEnv.cleanup();
}

main();
