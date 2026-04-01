'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Plus,
  Edit,
  Trash2,
  Shield,
  ShieldCheck,
  User,
  Mail,
  Calendar,
  MoreVertical,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';

// Dados de exemplo
const usuarios = [
  {
    id: '1',
    email: 'contato@bruamaral.tec.br',
    name: 'Bruna Amaral - EN1',
    role: 'super_admin',
    createdAt: '2026-01-01',
    lastLogin: '2026-03-12'
  },
  {
    id: '2',
    email: 'erika@abacherly.com',
    name: 'Érika Abächerly',
    role: 'admin',
    createdAt: '2026-01-15',
    lastLogin: '2026-03-11'
  },
  {
    id: '3',
    email: 'assistente@abacherly.com',
    name: 'Assistente',
    role: 'operator',
    createdAt: '2026-02-01',
    lastLogin: '2026-03-10'
  },
];

const roleConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  super_admin: { label: 'Super Admin', color: 'text-purple-700', bg: 'bg-purple-50', icon: ShieldCheck },
  admin: { label: 'Administrador', color: 'text-blue-700', bg: 'bg-blue-50', icon: Shield },
  operator: { label: 'Operador', color: 'text-gray-700', bg: 'bg-gray-100', icon: User },
};

export default function UsuariosPage() {
  const router = useRouter();
  const { user, userProfile, loading, isSuperAdmin, isAdmin } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    // Apenas admin e super_admin podem acessar
    if (!loading && user && !isAdmin) {
      router.push('/dashboard');
    }
  }, [user, loading, router, isAdmin]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="spinner"></div>
      </div>
    );
  }

  const handleAddUser = () => {
    setEditingUser(null);
    setShowModal(true);
  };

  const handleEditUser = (usuario: any) => {
    setEditingUser(usuario);
    setShowModal(true);
  };

  return (
    <div className="min-h-screen w-full bg-[#f8fafc]">
      <Sidebar />
      
      <div className="w-full lg:pl-64 min-h-screen flex flex-col">
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-[#2c4a70]">Usuários</h1>
              <p className="text-sm lg:text-base text-[#1a2b45]/60 mt-1">
                Gerencie os usuários do sistema
              </p>
            </div>
            <button 
              onClick={handleAddUser}
              className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Plus className="w-5 h-5" />
              Novo Usuário
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
            <div className="card p-3 sm:p-4 text-center">
              <p className="text-2xl font-bold text-[#2c4a70]">{usuarios.length}</p>
              <p className="text-xs sm:text-sm text-[#1a2b45]/60">Total</p>
            </div>
            <div className="card p-3 sm:p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {usuarios.filter(u => u.role === 'admin').length}
              </p>
              <p className="text-xs sm:text-sm text-[#1a2b45]/60">Admins</p>
            </div>
            <div className="card p-3 sm:p-4 text-center">
              <p className="text-2xl font-bold text-gray-600">
                {usuarios.filter(u => u.role === 'operator').length}
              </p>
              <p className="text-xs sm:text-sm text-[#1a2b45]/60">Operadores</p>
            </div>
          </div>

          {/* Lista de Usuários */}
          <div className="space-y-4">
            {usuarios.map((usuario) => {
              const RoleIcon = roleConfig[usuario.role].icon;
              const podeEditar = isSuperAdmin || (isAdmin && usuario.role === 'operator');

              return (
                <div key={usuario.id} className="card p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#4674e8] flex items-center justify-center text-white font-bold text-lg">
                        {usuario.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-[#2c4a70]">{usuario.name}</h3>
                        <div className="flex items-center gap-1 text-sm text-[#1a2b45]/60">
                          <Mail className="w-4 h-4" />
                          {usuario.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${roleConfig[usuario.role].bg} ${roleConfig[usuario.role].color}`}>
                        <RoleIcon className="w-3 h-3" />
                        {roleConfig[usuario.role].label}
                      </span>

                      <div className="text-sm text-[#1a2b45]/60">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Último acesso: {new Date(usuario.lastLogin).toLocaleDateString('pt-BR')}
                        </div>
                      </div>

                      {podeEditar && (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleEditUser(usuario)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4 text-[#4674e8]" />
                          </button>
                          {isSuperAdmin && usuario.role !== 'super_admin' && (
                            <button 
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>

        <Footer />
      </div>

      {/* Modal de Adicionar/Editar Usuário */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#2c4a70]">
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1a2b45] mb-1">Nome</label>
                <input
                  type="text"
                  defaultValue={editingUser?.name}
                  placeholder="Nome completo"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-[#4674e8] focus:ring-2 focus:ring-[#4674e8]/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1a2b45] mb-1">Email</label>
                <input
                  type="email"
                  defaultValue={editingUser?.email}
                  placeholder="email@exemplo.com"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-[#4674e8] focus:ring-2 focus:ring-[#4674e8]/20"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-[#1a2b45] mb-1">Senha</label>
                  <input
                    type="password"
                    placeholder="Senha inicial"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-[#4674e8] focus:ring-2 focus:ring-[#4674e8]/20"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[#1a2b45] mb-1">Perfil</label>
                <select
                  defaultValue={editingUser?.role || 'operator'}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-[#4674e8] focus:ring-2 focus:ring-[#4674e8]/20"
                >
                  <option value="operator">Operador</option>
                  {isSuperAdmin && <option value="admin">Administrador</option>}
                  {isSuperAdmin && <option value="super_admin">Super Admin</option>}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                >
                  {editingUser ? 'Salvar' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
