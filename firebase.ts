import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// MODO ARQUITETO:
// Agora utilizando variáveis de ambiente para segurança.
// As chaves são carregadas do arquivo .env.local na raiz.
// Certifique-se de que o arquivo .env.local existe e tem as chaves corretas.

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Validação de segurança: Evita erros bizarros se o .env não for carregado
if (!firebaseConfig.apiKey) {
  console.error("ERRO CRÍTICO: Variáveis de ambiente do Firebase não encontradas. Verifique se o arquivo .env.local existe na raiz do projeto.");
}

let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  console.error("Erro ao inicializar Firebase:", error);
}

// Exportações dos serviços
export const auth = app ? getAuth(app) : null as any;
export const googleProvider = new GoogleAuthProvider();
export const db = app ? getFirestore(app) : null as any;