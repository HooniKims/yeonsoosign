import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function readEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} 환경변수가 설정되지 않았습니다.`);
  }

  return value;
}

function parsePrivateKey(value) {
  return value.replace(/\\n/g, "\n");
}

function getAdminApp() {
  if (getApps().length) {
    return getApps()[0];
  }

  return initializeApp({
    credential: cert({
      projectId: readEnv("FIREBASE_ADMIN_PROJECT_ID"),
      clientEmail: readEnv("FIREBASE_ADMIN_CLIENT_EMAIL"),
      privateKey: parsePrivateKey(readEnv("FIREBASE_ADMIN_PRIVATE_KEY")),
    }),
  });
}

export function getAdminContext() {
  const app = getAdminApp();

  return {
    adminAuth: getAuth(app),
    adminDb: getFirestore(app),
  };
}
