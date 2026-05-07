'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

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
//
// HIERARQUIA OFICIAL (definida pelo dono do sistema):
//   adm_tecnico  : nivel mais alto, TUDO (incl. treinamento agente IA + configuracoes)
//   adm_geral    : tudo MENOS treinamento e configuracoes (gestor da Abacherly)
//   analista     : operacoes basicas de licitacao
//   cliente      : apenas seus proprios dados
//
// Mapeamento de roles legados:
//   super_admin -> adm_tecnico  (era o root original = mantem acesso total)
//   admin       -> adm_geral    (gestor sem permissao de config)
//   operator    -> analista
function normalizarRole(role: string | undefined): UserRole {
  switch (role) {
    case 'super_admin': return 'adm_tecnico';
    case 'admin': return 'adm_geral';
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

  // Flags exatas (cada uma == um role específico)
  isAdmTecnico: boolean;  // topo da hierarquia (acesso total, inclui config + treinamento)
  isAdmGeral: boolean;    // gestor (tudo menos config + treinamento)
  isAnalista: boolean;    // operações básicas
  isCliente: boolean;     // só seus dados

  // Flags compostas para checks de permissão
  isEquipe: boolean;            // qualquer membro da equipe Abacherly
  isAdmin: boolean;             // adm_tecnico OU adm_geral (gestores)
  podeConfigurar: boolean;      // só adm_tecnico (configs + treinamento agente)

  // Aliases legados (telas antigas)
  isSuperAdmin: boolean;
  isOperator: boolean;
}

// Versão do cache. Aumente quando a estrutura/roles mudarem para invalidar
// caches localStorage de sessões antigas em todos os usuários.
// v2: inversão de hierarquia adm_tecnico/adm_geral + auto-cura de docs legados.
const CACHE_KEY = 'abacherly_user_profile_v2';

function getCachedProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    // Limpa caches de versões antigas
    localStorage.removeItem('abacherly_user_profile');
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
      localStorage.removeItem('abacherly_user_profile');
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
        const cached = getCachedProfile();
        // Mostra cache instantaneamente se o uid bate — UX rápida
        if (cached && cached.uid === firebaseUser.uid) {
          setUserProfile(cached);
          setLoading(false);
        }

        // Busca profile via API route Next.js (server-side usa Firebase Admin).
        // Evita o Firestore JS SDK no browser inteiro — funciona em qualquer
        // rede que abre o site Vercel.
        try {
          const idToken = await firebaseUser.getIdToken();
          const res = await fetch('/api/profile', {
            method: 'GET',
            headers: { Authorization: `Bearer ${idToken}` },
            cache: 'no-store',
          });
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          const data = await res.json();
          const profile: UserProfile = {
            uid: data.uid,
            email: data.email,
            name: data.name || 'Usuário',
            role: normalizarRole(data.role),
            clientId: data.clientId,
          };
          setUserProfile(profile);
          setCachedProfile(profile);
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

  // userProfile.role já vem normalizado por normalizarRole() (legados convertidos)
  const role = userProfile?.role;
  const isAdmTecnico = role === 'adm_tecnico';
  const isAdmGeral = role === 'adm_geral';
  const isAnalista = role === 'analista';
  const isCliente = role === 'cliente';

  const isAdmin = isAdmTecnico || isAdmGeral;
  const isEquipe = isAdmin || isAnalista;
  const podeConfigurar = isAdmTecnico; // só técnico mexe em config + treinamento

  // Aliases legados (mantidos para não quebrar telas que ainda referenciam)
  const isSuperAdmin = isAdmTecnico;
  const isOperator = isAnalista;

  const value = useMemo(() => ({
    user,
    userProfile,
    loading,
    signIn,
    signOut,
    resetPassword,
    isAdmTecnico,
    isAdmGeral,
    isAnalista,
    isCliente,
    isEquipe,
    isAdmin,
    podeConfigurar,
    isSuperAdmin,
    isOperator,
  }), [user, userProfile, loading, isAdmTecnico, isAdmGeral, isAnalista, isCliente, isEquipe, isAdmin, podeConfigurar]);

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
