import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDFPjv6pfunmsvYjOHBxXRkiamTeEMA5gY",
  authDomain: "meu-contador-2014b.firebaseapp.com",
  projectId: "meu-contador-2014b",
  storageBucket: "meu-contador-2014b.firebasestorage.app",
  messagingSenderId: "450337984250",
  appId: "1:450337984250:web:af246d496518bc845cc343",
  measurementId: "G-GFJ2NF9KYG"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);