'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

// Tipos de perfil de usuário
// Roles equipe Abächerly: adm_geral, adm_tecnico, analista
// Role cliente: cliente
// Legados (para retrocompatibilidade durante migração): super_admin, admin, operator
export type UserRole =
  | 'adm_geral'
  | 'adm_tecnico'
  | 'analista'
  | 'cliente'
  | 'super_admin'
  | 'admin'
  | 'operator';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  clientId?: string;
  createdAt?: Date;
  lastLogin?: Date;
}

// Mapeia roles legados para os novos sem alterar dados em runtime
function normalizarRole(role: string | undefined): UserRole {
  switch (role) {
    case 'super_admin': return 'adm_geral';
    case 'admin': return 'adm_tecnico';
    case 'operator': return 'analista';
    case 'adm_geral':
    case 'adm_tecnico':
    case 'analista':
    case 'cliente':
      return role as UserRole;
    default:
      return 'analista';
  }
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  // Flags por role (já normalizadas)
  isAdmGeral: boolean;
  isAdmTecnico: boolean;
  isAnalista: boolean;
  isCliente: boolean;
  isEquipe: boolean;
  // Aliases legados (mantidos para não quebrar telas antigas durante migração)
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isOperator: boolean;
}

const CACHE_KEY = 'abacherly_user_profile';

function getCachedProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch {}
  return null;
}

function setCachedProfile(profile: UserProfile | null) {
  if (typeof window === 'undefined') return;
  try {
    if (profile) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(CACHE_KEY);
    }
  } catch {}
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(getCachedProfile);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser && firebaseUser.email) {
        // Se já temos cache e o uid bate, mostrar imediatamente e revalidar em background
        const cached = getCachedProfile();
        if (cached && cached.uid === firebaseUser.uid) {
          setUserProfile(cached);
          setLoading(false);
        }

        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const snap = await getDoc(userDocRef);

          if (snap.exists()) {
            const data = snap.data();
            const profile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: data.name || 'Usuário',
              role: normalizarRole(data.role),
              clientId: data.clientId,
            };
            setUserProfile(profile);
            setCachedProfile(profile);
          } else {
            const fallback: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.email.split('@')[0],
              role: 'analista',
            };
            setUserProfile(fallback);
            setCachedProfile(fallback);
          }
        } catch (error) {
          console.error('[Auth] Erro ao buscar perfil:', error);
          if (!getCachedProfile()) {
            setUserProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.email.split('@')[0],
              role: 'analista',
            });
          }
        }
      } else {
        setUserProfile(null);
        setCachedProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUserProfile(null);
    setCachedProfile(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const role = userProfile?.role;
  const isAdmGeral = role === 'adm_geral' || role === 'super_admin';
  const isAdmTecnico = role === 'adm_tecnico' || role === 'admin' || isAdmGeral;
  const isAnalista = role === 'analista' || role === 'operator' || isAdmTecnico;
  const isCliente = role === 'cliente';
  const isEquipe = isAdmGeral || isAdmTecnico || isAnalista;
  // Aliases legados — apontam para os mesmos novos perfis
  const isSuperAdmin = isAdmGeral;
  const isAdmin = isAdmTecnico;
  const isOperator = isAnalista;

  const value = useMemo(() => ({
    user,
    userProfile,
    loading,
    signIn,
    signOut,
    resetPassword,
    isAdmGeral,
    isAdmTecnico,
    isAnalista,
    isCliente,
    isEquipe,
    isSuperAdmin,
    isAdmin,
    isOperator,
  }), [user, userProfile, loading, isAdmGeral, isAdmTecnico, isAnalista, isCliente, isEquipe]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
