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
  UserCircle,
  Mail,
  Calendar,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import {
  listarUsuarios,
  criarUsuario,
  atualizarUsuario,
  excluirUsuario,
  UserFirestore,
} from '@/lib/services/usuarios';
import { listarClientes } from '@/lib/services/clientes';
import { ClienteInfo } from '@/lib/types';

const roleConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  super_admin: { label: 'Super Admin', color: 'text-purple-700', bg: 'bg-purple-50', icon: ShieldCheck },
  admin: { label: 'Administrador', color: 'text-blue-700', bg: 'bg-blue-50', icon: Shield },
  operator: { label: 'Operador', color: 'text-green-700', bg: 'bg-green-50', icon: User },
  cliente: { label: 'Cliente', color: 'text-gray-700', bg: 'bg-gray-100', icon: UserCircle },
};

export default function UsuariosPage() {
  const router = useRouter();
  const { user, userProfile, loading, isSuperAdmin, isAdmin } = useAuth();

  const [usuarios, setUsuarios] = useState<UserFirestore[]>([]);
  const [clientes, setClientes] = useState<ClienteInfo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserFirestore | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  // Form state
  const [formNome, setFormNome] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formSenha, setFormSenha] = useState('');
  const [formRole, setFormRole] = useState<UserFirestore['role']>('operator');
  const [formClientId, setFormClientId] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && !isAdmin) router.push('/dashboard');
  }, [user, loading, router, isAdmin]);

  useEffect(() => {
    async function carregar() {
      try {
        const [usrs, cls] = await Promise.all([listarUsuarios(), listarClientes()]);
        setUsuarios(usrs);
        setClientes(cls);
      } catch (error) {
        console.error('Erro ao carregar:', error);
      } finally {
        setCarregando(false);
      }
    }
    if (!loading && isAdmin) carregar();
  }, [loading, isAdmin]);

  const openModal = (usuario?: UserFirestore) => {
    setErro('');
    setSucesso('');
    if (usuario) {
      setEditingUser(usuario);
      setFormNome(usuario.name);
      setFormEmail(usuario.email);
      setFormSenha('');
      setFormRole(usuario.role);
      setFormClientId(usuario.clientId || '');
    } else {
      setEditingUser(null);
      setFormNome('');
      setFormEmail('');
      setFormSenha('');
      setFormRole('operator');
      setFormClientId('');
    }
    setShowModal(true);
  };

  const handleSalvar = async () => {
    if (!formNome.trim() || !formEmail.trim()) {
      setErro('Nome e e-mail são obrigatórios');
      return;
    }

    setSalvando(true);
    setErro('');

    try {
      if (editingUser?.id) {
        // Editar
        await atualizarUsuario(editingUser.id, {
          name: formNome.trim(),
          role: formRole,
          clientId: formClientId || undefined,
        });
        setUsuarios((prev) =>
          prev.map((u) =>
            u.id === editingUser.id
              ? { ...u, name: formNome.trim(), role: formRole, clientId: formClientId }
              : u
          )
        );
      } else {
        // Criar
        if (!formSenha || formSenha.length < 6) {
          setErro('A senha deve ter pelo menos 6 caracteres');
          setSalvando(false);
          return;
        }
        await criarUsuario(
          formEmail.trim(),
          formSenha,
          formNome.trim(),
          formRole,
          formClientId || undefined
        );
        // Recarregar lista
        const usrs = await listarUsuarios();
        setUsuarios(usrs);
      }

      setShowModal(false);
      setSucesso(editingUser ? 'Usuário atualizado!' : 'Usuário criado!');
      setTimeout(() => setSucesso(''), 3000);
    } catch (error: any) {
      setErro(error.message || 'Erro ao salvar usuário');
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async (usuario: UserFirestore) => {
    if (!confirm(`Excluir o usuário "${usuario.name}"?`)) return;
    if (!usuario.id) return;

    try {
      await excluirUsuario(usuario.id);
      setUsuarios((prev) => prev.filter((u) => u.id !== usuario.id));
    } catch (error: any) {
      setErro(error.message || 'Erro ao excluir');
    }
  };

  if (loading || !user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="spinner"></div>
      </div>
    );
  }

  const totalClientes = usuarios.filter((u) => u.role === 'cliente').length;
  const totalAdmins = usuarios.filter((u) => ['admin', 'super_admin'].includes(u.role)).length;
  const totalOperadores = usuarios.filter((u) => u.role === 'operator').length;

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
              onClick={() => openModal()}
              className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Plus className="w-5 h-5" />
              Novo Usuário
            </button>
          </div>

          {sucesso && (
            <div className="mb-4 flex items-center gap-2 text-green-600 text-sm card p-3">
              <CheckCircle className="w-4 h-4" />
              {sucesso}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 sm:gap-4 mb-6">
            <div className="card p-3 sm:p-4 text-center">
              <p className="text-2xl font-bold text-[#2c4a70]">{usuarios.length}</p>
              <p className="text-xs sm:text-sm text-[#1a2b45]/60">Total</p>
            </div>
            <div className="card p-3 sm:p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{totalAdmins}</p>
              <p className="text-xs sm:text-sm text-[#1a2b45]/60">Admins</p>
            </div>
            <div className="card p-3 sm:p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{totalOperadores}</p>
              <p className="text-xs sm:text-sm text-[#1a2b45]/60">Operadores</p>
            </div>
            <div className="card p-3 sm:p-4 text-center">
              <p className="text-2xl font-bold text-gray-600">{totalClientes}</p>
              <p className="text-xs sm:text-sm text-[#1a2b45]/60">Clientes</p>
            </div>
          </div>

          {/* Lista */}
          {carregando ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#4674e8]" />
            </div>
          ) : (
            <div className="space-y-3">
              {usuarios.map((usuario) => {
                const config = roleConfig[usuario.role] || roleConfig.operator;
                const RoleIcon = config.icon;
                const podeEditar = isSuperAdmin || (isAdmin && usuario.role !== 'super_admin' && usuario.role !== 'admin');
                const clienteInfo = clientes.find((c) => c.id === usuario.clientId);

                return (
                  <div key={usuario.id} className="card p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#4674e8] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                          {usuario.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <h3 className="font-bold text-[#2c4a70]">{usuario.name}</h3>
                          <div className="flex items-center gap-1 text-sm text-[#1a2b45]/60">
                            <Mail className="w-3 h-3" />
                            {usuario.email}
                          </div>
                          {clienteInfo && (
                            <p className="text-xs text-[#1a2b45]/40 mt-0.5">
                              Cliente: {clienteInfo.razaoSocial || clienteInfo.nomeFantasia || usuario.clientId}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${config.bg} ${config.color}`}>
                          <RoleIcon className="w-3 h-3" />
                          {config.label}
                        </span>

                        {usuario.lastLogin && (
                          <div className="text-xs text-[#1a2b45]/40 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {usuario.lastLogin?.toDate?.()
                              ? usuario.lastLogin.toDate().toLocaleDateString('pt-BR')
                              : ''}
                          </div>
                        )}

                        {podeEditar && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openModal(usuario)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4 text-[#4674e8]" />
                            </button>
                            {isSuperAdmin && usuario.role !== 'super_admin' && (
                              <button
                                onClick={() => handleExcluir(usuario)}
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
          )}
        </main>

        <Footer />
      </div>

      {/* Modal */}
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

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1a2b45] mb-1">Nome *</label>
                <input
                  type="text"
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Nome completo"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-[#4674e8] focus:ring-2 focus:ring-[#4674e8]/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1a2b45] mb-1">E-mail *</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  disabled={!!editingUser}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-[#4674e8] focus:ring-2 focus:ring-[#4674e8]/20 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-[#1a2b45] mb-1">Senha *</label>
                  <input
                    type="password"
                    value={formSenha}
                    onChange={(e) => setFormSenha(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-[#4674e8] focus:ring-2 focus:ring-[#4674e8]/20"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[#1a2b45] mb-1">Perfil *</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as UserFirestore['role'])}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-[#4674e8] focus:ring-2 focus:ring-[#4674e8]/20"
                >
                  <option value="cliente">Cliente</option>
                  <option value="operator">Operador</option>
                  {isSuperAdmin && <option value="admin">Administrador</option>}
                  {isSuperAdmin && <option value="super_admin">Super Admin</option>}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1a2b45] mb-1">
                  Cliente vinculado {formRole === 'cliente' && '*'}
                </label>
                <select
                  value={formClientId}
                  onChange={(e) => setFormClientId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-[#4674e8] focus:ring-2 focus:ring-[#4674e8]/20"
                >
                  <option value="">Nenhum</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.razaoSocial || c.nomeFantasia || c.id}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[#1a2b45]/40 mt-1">
                  Vincule a um cliente cadastrado em Info Clientes
                </p>
              </div>

              {erro && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {erro}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSalvar}
                  disabled={salvando}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  {salvando ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    editingUser ? 'Salvar' : 'Criar Usuário'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
