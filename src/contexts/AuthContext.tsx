'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user && user.email) {
        // Buscar perfil do usuário no Firestore pelo email
        try {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', user.email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const data = userDoc.data();
            setUserProfile({
              uid: user.uid,
              email: user.email,
              name: data.name || 'Usuário',
              role: data.role || 'operator',
              clientId: data.clientId,
              createdAt: data.createdAt?.toDate(),
              lastLogin: data.lastLogin?.toDate(),
            });
          } else {
            // Se não encontrar perfil, criar um básico
            setUserProfile({
              uid: user.uid,
              email: user.email,
              name: user.email.split('@')[0],
              role: 'operator',
            });
          }
        } catch (error) {
          console.error('Erro ao buscar perfil:', error);
          // Fallback em caso de erro
          setUserProfile({
            uid: user.uid,
            email: user.email,
            name: user.email.split('@')[0],
            role: 'operator',
          });
        }
      } else {
        setUserProfile(null);
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
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const isSuperAdmin = userProfile?.role === 'super_admin';
  const isAdmin = userProfile?.role === 'admin' || isSuperAdmin;
  const isOperator = userProfile?.role === 'operator' || isAdmin;
  const isCliente = userProfile?.role === 'cliente';

  return (
    <AuthContext.Provider value={{
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
    }}>
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
