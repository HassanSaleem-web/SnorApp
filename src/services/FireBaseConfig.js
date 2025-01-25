// Import Firebase dependencies
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'; // Added Firestore import

// Firebase configuration (Existing credentials)
const firebaseConfig = {
    apiKey: "AIzaSyAbh66fEbSYm2xfBzSTDxFaTa1rFBXhzyk",
    authDomain: "maptool-69e64.firebaseapp.com",
    projectId: "maptool-69e64",
    storageBucket: "maptool-69e64.firebasestorage.app",
    messagingSenderId: "396027758502",
    appId: "1:396027758502:web:4a750ac7570dfe76d17167",
    measurementId: "G-QEGM104CK9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Authentication Services
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

// Firestore Database Service (Added)
export const db = getFirestore(app); // Required for storing shapes

export default app;