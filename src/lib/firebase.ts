import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { enableIndexedDbPersistence, getFirestore } from "firebase/firestore";
import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const missingFirebaseConfig = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => `VITE_FIREBASE_${key.replace(/[A-Z]/g, (m) => `_${m}`).toUpperCase()}`);

const hasFirebaseConfig = missingFirebaseConfig.length === 0;

export const app = hasFirebaseConfig
  ? initializeApp(firebaseConfig)
  : (null as unknown as FirebaseApp);

export const auth = hasFirebaseConfig
  ? getAuth(app)
  : (null as unknown as Auth);

export const db = hasFirebaseConfig
  ? getFirestore(app)
  : (null as unknown as Firestore);

// Offline cache Firestore (opcional)
if (hasFirebaseConfig) {
  enableIndexedDbPersistence(db).catch((err) => {
    console.warn("Firestore persistence error:", err);
  });
}
