// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "mern-estate-d94bb.firebaseapp.com",
  projectId: "mern-estate-d94bb",
  storageBucket: "mern-estate-d94bb.firebasestorage.app",
  messagingSenderId: "1026640814252",
  appId: "1:1026640814252:web:4df78f6a04e4b6d4e97f09"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);