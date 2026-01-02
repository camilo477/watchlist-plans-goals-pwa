import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { enableIndexedDbPersistence, getFirestore } from "firebase/firestore";
console.log("ENV check", {
  hasApiKey: !!import.meta.env.VITE_FIREBASE_API_KEY,
  apiKeyLen: import.meta.env.VITE_FIREBASE_API_KEY?.length,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
});
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Offline cache Firestore (opcional)
enableIndexedDbPersistence(db).catch((err) => {
  console.warn("Firestore persistence error:", err);
});
