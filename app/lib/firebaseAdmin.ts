import {
  cert,
  getApp,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getEnvironmentValue(
  ...names: string[]
): string {
  for (const name of names) {
    const value = process.env[name]?.trim();

    if (value) {
      return value;
    }
  }

  return "";
}

const projectId = getEnvironmentValue(
  "FIREBASE_ADMIN_PROJECT_ID",
  "FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
);

const clientEmail = getEnvironmentValue(
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_CLIENT_EMAIL"
);

const rawPrivateKey = getEnvironmentValue(
  "FIREBASE_ADMIN_PRIVATE_KEY",
  "FIREBASE_PRIVATE_KEY"
);

const privateKey = rawPrivateKey
  .replace(/^["']|["']$/g, "")
  .replace(/\\n/g, "\n");

const missingVariables: string[] = [];

if (!projectId) {
  missingVariables.push(
    "FIREBASE_ADMIN_PROJECT_ID ya FIREBASE_PROJECT_ID"
  );
}

if (!clientEmail) {
  missingVariables.push(
    "FIREBASE_ADMIN_CLIENT_EMAIL ya FIREBASE_CLIENT_EMAIL"
  );
}

if (!privateKey) {
  missingVariables.push(
    "FIREBASE_ADMIN_PRIVATE_KEY ya FIREBASE_PRIVATE_KEY"
  );
}

if (missingVariables.length > 0) {
  throw new Error(
    `Firebase Admin environment variables missing hain: ${missingVariables.join(
      ", "
    )}`
  );
}

const firebaseAdminApp =
  getApps().length > 0
    ? getApp()
    : initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });

export const adminAuth = getAuth(firebaseAdminApp);
export const adminDb = getFirestore(firebaseAdminApp);