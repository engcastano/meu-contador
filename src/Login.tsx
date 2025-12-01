import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { NotebookPen, AlertCircle } from 'lucide-react';
import { User } from './types';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = () => {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error(err);
      setError('Erro ao conectar com Google. Tente novamente.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md text-center border border-slate-200 dark:border-slate-700">
        <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-600/30">
          <NotebookPen className="text-white w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Bem-vindo(a)</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8">Faça login para acessar seu controle financeiro.</p>
        {error && (<div className="mb-6 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 text-sm rounded-lg flex items-center gap-2 justify-center"><AlertCircle size={16} />{error}</div>)}
        <button onClick={handleGoogleLogin} disabled={isLoading} className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 font-bold py-3 px-4 rounded-xl border border-slate-300 transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed">
          {isLoading ? (<span className="animate-pulse">Conectando...</span>) : (<><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5"/>Entrar com Google</>)}
        </button>
      </div>
    </div>
  );
};