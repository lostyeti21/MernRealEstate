import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "mern-estate-d94bb.firebaseapp.com",
  projectId: "mern-estate-d94bb",
  storageBucket: "mern-estate-d94bb.appspot.com",
  messagingSenderId: "1026640814252",
  appId: "1:1026640814252:web:4df78f6a04e4b6d4e97f09"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);