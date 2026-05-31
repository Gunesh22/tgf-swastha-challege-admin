import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBUUu6i0tJbJkuZXeYWdUUKKOZY-ajxejE",
  authDomain: "tgf-challenges.firebaseapp.com",
  projectId: "tgf-challenges",
  storageBucket: "tgf-challenges.firebasestorage.app",
  messagingSenderId: "628255693136",
  appId: "1:628255693136:web:c45dbafc043f6882403455",
  measurementId: "G-NKM7S94FXN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
