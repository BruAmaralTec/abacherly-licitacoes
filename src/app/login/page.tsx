'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, resetPassword } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (resetMode) {
        await resetPassword(email);
        setResetSent(true);
      } else {
        await signIn(email, password);
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error('Erro:', err);
      if (resetMode) {
        if (err.code === 'auth/user-not-found') {
          setError('Nenhuma conta encontrada com este email.');
        } else if (err.code === 'auth/invalid-email') {
          setError('Email inválido.');
        } else if (err.code === 'auth/too-many-requests') {
          setError('Muitas tentativas. Tente novamente mais tarde.');
        } else {
          setError(`Erro ao enviar email de recuperação. (${err.code || err.message})`);
        }
      } else if (err.code === 'auth/invalid-credential') {
        setError('Email ou senha incorretos.');
      } else if (err.code === 'auth/user-not-found') {
        setError('Usuário não encontrado.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Senha incorreta.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Muitas tentativas. Tente novamente mais tarde.');
      } else {
        setError('Erro ao fazer login. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen h-screen w-screen flex flex-col lg:flex-row overflow-hidden">
      {/* Lado Esquerdo - Branding */}
      <div className="w-full lg:w-1/2 bg-[#1a2b45] relative flex flex-col shrink-0 min-h-[40vh] lg:min-h-full lg:h-screen">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-6 sm:px-8 lg:px-12 py-6 lg:py-8">
          <div className="w-full max-w-md mx-auto lg:mx-0">
            {/* Logo */}
            <div className="mb-4 lg:mb-6">
              <Image
                src="/images/logo-completo.png"
                alt="Abächerly Licitações"
                width={400}
                height={170}
                className="w-full max-w-[250px] sm:max-w-[300px] lg:max-w-[380px] mx-auto lg:mx-0"
                priority
              />
            </div>

            {/* Slogan */}
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-3 lg:mb-4 text-center lg:text-left">
              A Precisão que Gera Resultados
            </h2>

            {/* Linha decorativa + texto */}
            <div className="flex items-start gap-3 justify-center lg:justify-start">
              <div className="w-1 h-10 lg:h-12 bg-[#d64b16] rounded-full flex-shrink-0"></div>
              <p className="text-sm lg:text-base text-white/80 text-left">
                Estratégia, rigor e resultados no universo das licitações públicas
              </p>
            </div>

            {/* Decoração */}
            <div className="hidden lg:flex justify-start gap-2 mt-6">
              <div className="w-2 h-2 rounded-full bg-white/30"></div>
              <div className="w-2 h-2 rounded-full bg-white/60"></div>
              <div className="w-2 h-2 rounded-full bg-white/30"></div>
            </div>
          </div>
        </div>

        {/* Footer EN1 */}
        <div className="relative z-10 px-6 sm:px-8 lg:px-12 py-3 lg:py-4 shrink-0">
          <p className="text-xs text-white/40 text-center lg:text-left">
            Fluxo Agêntico de IA produzido por{' '}
            <a 
              href="https://en1.com.br" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#4674e8] hover:text-white transition-colors font-bold"
            >
              EN1 Soluções em IA
            </a>
            {' - '}en1.com.br
          </p>
        </div>
      </div>

      {/* Lado Direito - Formulário */}
      <div className="w-full lg:w-1/2 flex flex-col bg-[#f8fafc] flex-1 lg:h-screen overflow-y-auto">
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <div className="w-full max-w-sm">
            {/* Título */}
            <div className="text-center mb-5 lg:mb-6">
              <h1 className="text-2xl lg:text-3xl font-bold text-[#2c4a70] mb-1">
                {resetMode ? 'Recuperar Senha' : 'Bem-vindo'}
              </h1>
              <p className="text-sm text-[#1a2b45]/60">
                {resetMode 
                  ? 'Digite seu email para receber as instruções'
                  : 'Digite suas credenciais para acessar o sistema'
                }
              </p>
            </div>

            {resetSent ? (
              <div className="text-center py-6 bg-white rounded-xl shadow-lg p-6">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-7 h-7 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-[#2c4a70] mb-2">
                  Email enviado!
                </h3>
                <p className="text-sm text-[#1a2b45]/60 mb-4">
                  Verifique sua caixa de entrada para redefinir sua senha.
                </p>
                <button
                  onClick={() => {
                    setResetMode(false);
                    setResetSent(false);
                  }}
                  className="px-5 py-2 border-2 border-[#2c4a70] text-[#2c4a70] rounded-lg font-bold text-sm hover:bg-[#2c4a70] hover:text-white transition-all"
                >
                  Voltar ao login
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-5 lg:p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-red-700 text-sm">{error}</p>
                    </div>
                  )}

                  {/* Email */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-[#1a2b45] mb-1.5">
                      <Mail className="w-4 h-4 text-[#4674e8]" />
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      required
                      className="px-4 py-2.5 w-full border border-gray-200 rounded-lg focus:border-[#4674e8] focus:ring-2 focus:ring-[#4674e8]/20 transition-all text-sm"
                    />
                  </div>

                  {/* Password */}
                  {!resetMode && (
                    <div>
                      <label className="flex items-center gap-2 text-sm font-bold text-[#1a2b45] mb-1.5">
                        <Lock className="w-4 h-4 text-[#4674e8]" />
                        Senha
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="px-4 pr-10 py-2.5 w-full border border-gray-200 rounded-lg focus:border-[#4674e8] focus:ring-2 focus:ring-[#4674e8]/20 transition-all text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1a2b45]/40 hover:text-[#1a2b45] transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Forgot Password */}
                  {!resetMode && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setResetMode(true);
                          setError('');
                        }}
                        className="text-sm text-[#4674e8] hover:text-[#2c4a70] font-medium transition-colors"
                      >
                        Esqueceu a senha?
                      </button>
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#2c4a70] hover:bg-[#4674e8] text-white py-3 rounded-lg font-bold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Aguarde...</span>
                      </>
                    ) : (
                      <span>{resetMode ? 'Enviar Email' : 'Entrar'}</span>
                    )}
                  </button>

                  {/* Back */}
                  {resetMode && (
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setResetMode(false);
                          setError('');
                        }}
                        className="text-sm text-[#4674e8] hover:text-[#2c4a70] font-medium transition-colors"
                      >
                        ← Voltar ao login
                      </button>
                    </div>
                  )}
                </form>
              </div>
            )}

            {/* Security Note */}
            <p className="text-center text-[#1a2b45]/40 text-xs mt-4">
              Sistema protegido com autenticação segura
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
