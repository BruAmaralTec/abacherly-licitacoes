'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

// Tipos de perfil de usuário
export type UserRole = 'super_admin' | 'admin' | 'operator' | 'cliente';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  clientId?: string;
  createdAt?: Date;
  lastLogin?: Date;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isOperator: boolean;
  isCliente: boolean;
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
        // Se já temos cache e o email bate, mostrar imediatamente
        const cached = getCachedProfile();
        if (cached && cached.email === firebaseUser.email) {
          setUserProfile(cached);
          setLoading(false);
        }

        // Buscar perfil atualizado do Firestore em background
        try {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', firebaseUser.email));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const data = userDoc.data();
            const profile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: data.name || 'Usuário',
              role: data.role || 'operator',
              clientId: data.clientId,
            };
            setUserProfile(profile);
            setCachedProfile(profile);
          } else {
            const fallback: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.email.split('@')[0],
              role: 'operator',
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
              role: 'operator',
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

  const isSuperAdmin = userProfile?.role === 'super_admin';
  const isAdmin = userProfile?.role === 'admin' || isSuperAdmin;
  const isOperator = userProfile?.role === 'operator' || isAdmin;
  const isCliente = userProfile?.role === 'cliente';

  const value = useMemo(() => ({
    user,
    userProfile,
    loading,
    signIn,
    signOut,
    resetPassword,
    isSuperAdmin,
    isAdmin,
    isOperator,
    isCliente,
  }), [user, userProfile, loading, isSuperAdmin, isAdmin, isOperator, isCliente]);

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
