import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCh350GL4vwHpiqz98TZETNEDa-zlSItaE",
  authDomain: "sudais-digital.firebaseapp.com",
  projectId: "sudais-digital",
  storageBucket: "sudais-digital.firebasestorage.app",
  messagingSenderId: "3099181262",
  appId: "1:3099181262:web:979c41f11e93cea989109f",
  measurementId: "G-GRXSEHXGQ4",
};

const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);