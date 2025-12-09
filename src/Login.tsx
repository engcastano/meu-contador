import React, { useState } from 'react';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { NotebookPen, AlertCircle, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { User } from './types';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = () => {
  const [isRegistering, setIsRegistering] = useState(false); // Alternar entre Login e Registro
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // Apenas para registro
  
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

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Preencha todos os campos.');
      return;
    }
    if (isRegistering && !name) {
      setError('Nome é obrigatório para o cadastro.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (isRegistering) {
        // Fluxo de Registro
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Atualizar o nome do usuário no Firebase Auth
        if (auth.currentUser) {
            await updateProfile(auth.currentUser, { displayName: name });
        }
      } else {
        // Fluxo de Login
        await signInWithEmailAndPassword(auth, email, password);
      }
      // O listener no App.tsx vai redirecionar automaticamente
    } catch (err: any) {
      console.error(err);
      switch (err.code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          setError('Email ou senha incorretos.');
          break;
        case 'auth/email-already-in-use':
          setError('Este email já está cadastrado.');
          break;
        case 'auth/weak-password':
          setError('A senha deve ter pelo menos 6 caracteres.');
          break;
        default:
          setError('Erro na autenticação. Tente novamente.');
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-700">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-600/30">
            <NotebookPen className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
            {isRegistering ? 'Crie sua conta' : 'Bem-vindo(a)'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {isRegistering 
              ? 'Comece a controlar suas finanças hoje.' 
              : 'Faça login para acessar seu painel.'}
          </p>
        </div>

        {/* Mensagem de Erro */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium rounded-lg flex items-center gap-2 justify-center border border-red-100 dark:border-red-800/50">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        {/* Formulário de Email/Senha */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          
          {isRegistering && (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-slate-400 text-sm font-bold">Aa</span>
              </div>
              <input
                type="text"
                placeholder="Seu Nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all"
              />
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="text-slate-400" size={18} />
            </div>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="text-slate-400" size={18} />
            </div>
            <input
              type="password"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all"
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading} 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                {isRegistering ? 'Cadastrar' : 'Entrar'} 
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Divisor */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-slate-800 text-slate-500">ou continue com</span>
          </div>
        </div>

        {/* Login com Google */}
        <button 
          onClick={handleGoogleLogin} 
          disabled={isLoading} 
          className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-white font-medium py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-600 transition-all shadow-sm disabled:opacity-70"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5"/>
          Google
        </button>

        {/* Toggle Login/Registro */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {isRegistering ? 'Já tem uma conta?' : 'Não tem uma conta?'}
            <button 
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
                setEmail('');
                setPassword('');
                setName('');
              }}
              className="ml-1 font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline outline-none"
            >
              {isRegistering ? 'Fazer Login' : 'Registre-se'}
            </button>
          </p>
        </div>

      </div>
    </div>
  );
};