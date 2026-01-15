import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";

// Firebase設定
const firebaseConfig = {
  apiKey: "AIzaSyC2KghkOg6_5tzJFTg1mJQJNwVdzTcDAlw",
  authDomain: "test-5070e.firebaseapp.com",
  projectId: "test-5070e",
  storageBucket: "test-5070e.firebasestorage.app",
  messagingSenderId: "72288461152",
  appId: "1:72288461152:web:8d6d0ce339ed412ed13e05",
  measurementId: "G-MFN12452GM"
};

// アプリの初期化
const app = initializeApp(firebaseConfig);

// 各インスタンスをエクスポート
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);
