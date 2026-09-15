// Firebase setup — connects our app to your Firebase project's database
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your Firebase project credentials (from Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyC0O18USjVuppIVcyuVeBKU0u1czjk3mVk",
  authDomain: "flow-15afe.firebaseapp.com",
  projectId: "flow-15afe",
  storageBucket: "flow-15afe.firebasestorage.app",
  messagingSenderId: "847742686311",
  appId: "1:847742686311:web:cfdc57f548d35afe0ef0c2",
  measurementId: "G-CFJMG8NW29"
};

// Start Firebase and get a reference to the Firestore database
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
