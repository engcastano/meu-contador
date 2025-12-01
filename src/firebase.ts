import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Configuração via Variáveis de Ambiente (Obrigatório para passar no scanner)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: "G-GFJ2NF9KYG" // Esse ID não é sensível, pode ficar
};

// Inicializa apenas se houver configuração válida, senão avisa no console
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  console.error("Erro ao inicializar Firebase. Verifique as variáveis de ambiente.", error);
}

export const auth = app ? getAuth(app) : null as any;
export const googleProvider = new GoogleAuthProvider();
export const db = app ? getFirestore(app) : null as any;
