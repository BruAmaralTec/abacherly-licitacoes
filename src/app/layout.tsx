import type { Metadata } from 'next';
import { PT_Serif } from 'next/font/google';
import '@/styles/globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

// Fonte serif clássica self-hosted (Next.js baixa em build, zero requests externos em runtime).
// Usada como variável CSS --font-serif para o globals.css aplicar globalmente.
const ptSerif = PT_Serif({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-serif',
  preload: true,
});

export const metadata: Metadata = {
  title: 'Abächerly Licitações - Sistema de Automação',
  description: 'Sistema de automação de licitações com agentes de IA',
  icons: {
    icon: '/images/icone.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`h-full ${ptSerif.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="preconnect" href="https://firestore.googleapis.com" />
        <link rel="preconnect" href="https://www.googleapis.com" />
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" />
        <link rel="dns-prefetch" href="https://firestore.googleapis.com" />
      </head>
      <body className="font-serif antialiased min-h-full h-full w-full">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
