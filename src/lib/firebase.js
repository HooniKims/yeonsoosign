import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "",
};

const REQUIRED_KEYS = ["apiKey", "authDomain", "projectId", "appId"];

export const hasFirebaseConfig = REQUIRED_KEYS.every((key) => Boolean(firebaseConfig[key]));

const app = hasFirebaseConfig
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const googleProvider = auth ? new GoogleAuthProvider() : null;

if (googleProvider) {
  googleProvider.setCustomParameters({
    prompt: "select_account",
  });
}

if (auth) {
  setPersistence(auth, browserLocalPersistence).catch(() => {
    // Persistence is best-effort in embedded browsers.
  });
}

export function assertFirebaseConfigured() {
  if (!hasFirebaseConfig) {
    throw new Error("Firebase 환경변수를 먼저 설정해 주세요.");
  }
}
