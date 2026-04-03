'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Plus,
  FileText,
  Calendar,
  FileCheck,
  DollarSign,
  Users,
  Settings,
  LogOut,
  ChevronRight,
  Menu,
  X,
  ClipboardList,
  Upload,
  LayoutList,
  FileCheck2,
  Building2,
  BarChart3
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: ('super_admin' | 'admin' | 'operator' | 'cliente')[];
  dividerBefore?: boolean;
}

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['super_admin', 'admin', 'operator', 'cliente']
  },
  {
    name: 'Solicitar Análise',
    href: '/solicitacoes',
    icon: ClipboardList,
    roles: ['super_admin', 'admin', 'operator', 'cliente']
  },
  {
    name: 'Enviar Documentos',
    href: '/documentos',
    icon: Upload,
    roles: ['super_admin', 'admin', 'operator', 'cliente']
  },
  {
    name: 'Relatório',
    href: '/relatorios',
    icon: BarChart3,
    roles: ['super_admin', 'admin', 'operator', 'cliente']
  },
  {
    name: 'Licitações',
    href: '/licitacoes',
    icon: FileText,
    roles: ['super_admin', 'admin', 'operator', 'cliente']
  },
  {
    name: 'Nova Licitação',
    href: '/licitacoes/nova',
    icon: Plus,
    roles: ['super_admin', 'admin']
  },
  {
    name: 'Agenda',
    href: '/agenda',
    icon: Calendar,
    roles: ['super_admin', 'admin', 'operator']
  },
  {
    name: 'Certidões',
    href: '/certidoes',
    icon: FileCheck,
    roles: ['super_admin', 'admin', 'operator']
  },
  {
    name: 'Pagamentos',
    href: '/pagamentos',
    icon: DollarSign,
    roles: ['super_admin', 'admin', 'operator']
  },
  {
    name: 'Painel Solicitações',
    href: '/admin/solicitacoes',
    icon: LayoutList,
    roles: ['super_admin', 'admin'],
    dividerBefore: true
  },
  {
    name: 'Validar Documentos',
    href: '/admin/documentos',
    icon: FileCheck2,
    roles: ['super_admin', 'admin']
  },
  {
    name: 'Info Clientes',
    href: '/admin/clientes',
    icon: Building2,
    roles: ['super_admin', 'admin']
  },
  {
    name: 'Usuários',
    href: '/usuarios',
    icon: Users,
    roles: ['super_admin', 'admin']
  },
  {
    name: 'Configurações',
    href: '/configuracoes',
    icon: Settings,
    roles: ['super_admin']
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { userProfile, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Fecha menu ao mudar de rota
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Previne scroll quando menu mobile está aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const filteredNavItems = navItems.filter(item => 
    userProfile && item.roles.includes(userProfile.role)
  );

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-4 lg:p-6 border-b border-white/10">
        <Link href="/dashboard" onClick={() => setIsOpen(false)}>
          <Image
            src="/images/logo-horizontal.png"
            alt="Abächerly Licitações"
            width={200}
            height={50}
            className="w-full max-w-[180px] lg:max-w-[200px] h-auto"
            priority
          />
        </Link>
      </div>

      {/* User Info */}
      <div className="p-3 lg:p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-[#4674e8] flex items-center justify-center font-bold text-sm lg:text-base flex-shrink-0">
            {userProfile?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold truncate text-sm lg:text-base">{userProfile?.name || 'Usuário'}</p>
            <p className="text-xs text-white/60 truncate">
              {userProfile?.role === 'super_admin' && 'Super Admin'}
              {userProfile?.role === 'admin' && 'Administrador'}
              {userProfile?.role === 'operator' && 'Operador'}
              {userProfile?.role === 'cliente' && 'Cliente'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 lg:p-4 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <div key={item.href}>
              {item.dividerBefore && (
                <div className="my-2 border-t border-white/10" />
              )}
              <Link
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-3 lg:px-4 py-2.5 lg:py-3 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-[#4674e8] text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-sm lg:text-base">{item.name}</span>
                {isActive && (
                  <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0" />
                )}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 lg:p-4 border-t border-white/10">
        <button
          onClick={() => {
            setIsOpen(false);
            signOut();
          }}
          className="flex items-center gap-3 px-3 lg:px-4 py-2.5 lg:py-3 w-full rounded-lg text-white/70 hover:bg-red-500/20 hover:text-red-300 transition-all duration-200"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium text-sm lg:text-base">Sair</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-[#1a2b45] h-14 flex items-center justify-between px-4">
        <Link href="/dashboard">
          <Image
            src="/images/logo-horizontal.png"
            alt="Abächerly"
            width={140}
            height={35}
            className="h-8 w-auto"
            priority
          />
        </Link>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-10 h-10 flex items-center justify-center text-white rounded-lg hover:bg-white/10 transition-colors"
          aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40 pt-14"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside 
        className={`lg:hidden fixed top-14 left-0 bottom-0 w-[280px] max-w-[85vw] bg-[#1a2b45] text-white z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 min-h-screen bg-[#1a2b45] text-white flex-col fixed left-0 top-0 bottom-0">
        <SidebarContent />
      </aside>

      {/* Spacer for mobile header */}
      <div className="lg:hidden h-14 flex-shrink-0" />
    </>
  );
}
