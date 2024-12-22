import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBaAEMbfSIkXJRHWTxkO3xpVRxnWXVFPLg",
  authDomain: "mern-estate-d94bb.firebaseapp.com",
  projectId: "mern-estate-d94bb",
  storageBucket: "mern-estate-d94bb.appspot.com",  // Fixed storage bucket URL
  messagingSenderId: "1026640814252",
  appId: "1:1026640814252:web:4df78f6a04e4b6d4e97f09"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

export { app, storage };
