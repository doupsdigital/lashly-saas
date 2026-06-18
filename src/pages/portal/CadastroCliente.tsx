import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { usePortal } from '../../contexts/PortalContext';

function applyPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const limited = digits.substring(0, 11);
  if (limited.length <= 2) return `(${limited}`;
  if (limited.length <= 7) return `(${limited.substring(0, 2)}) ${limited.substring(2)}`;
  return `(${limited.substring(0, 2)}) ${limited.substring(2, 7)}-${limited.substring(7)}`;
}

export default function CadastroCliente() {
  const navigate = useNavigate();
  const { establishmentId, slug } = usePortal();
  const [form, setForm] = useState({
    nome: '',
    sobrenome: '',
    whatsapp: '',
    email: '',
    senha: '',
    confirmarSenha: '',
  });
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successModal, setSuccessModal] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'whatsapp') {
      setForm((prev) => ({ ...prev, whatsapp: applyPhoneMask(value) }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const validate = (): string | null => {
    if (!form.nome || !form.sobrenome || !form.whatsapp || !form.email || !form.senha || !form.confirmarSenha) {
      return 'Preencha todos os campos obrigatórios.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) return 'Informe um e-mail válido.';
    if (form.senha.length < 6) return 'A senha deve ter pelo menos 6 caracteres.';
    if (form.senha !== form.confirmarSenha) return 'As senhas não coincidem.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const validationError = validate();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setSubmitting(true);

    try {
      if (!establishmentId) {
        throw new Error('Estabelecimento não carregado.');
      }

      // Passo 1 — Verificar se e-mail já está cadastrado antes de criar qualquer registro
      const { data: existingUser } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', form.email.trim().toLowerCase())
        .maybeSingle();

      if (existingUser) {
        throw new Error('Este e-mail já está cadastrado.');
      }

      // Passo 2 — Inserir clientes ANTES do auth.signUp porque a trigger
      // handle_new_user_onboarding precisa do registro em clientes para criar usuarios.
      const clientId = crypto.randomUUID();

      const { error: clientError } = await supabase
        .from('clientes')
        .insert({
          id: clientId,
          nome: form.nome.trim(),
          sobrenome: form.sobrenome.trim(),
          email: form.email.trim().toLowerCase(),
          whatsapp: form.whatsapp,
          estabelecimento_id: establishmentId
        });

      if (clientError) {
        throw new Error(`Erro ao registrar dados do cliente: ${clientError.message}`);
      }

      // Passo 3 — Criar usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.senha,
        options: {
          data: {
            nome: `${form.nome.trim()} ${form.sobrenome.trim()}`,
            role: 'cliente',
            cliente_id: clientId,
            estabelecimento_id: establishmentId
          }
        }
      });

      if (authError) {
        // Rollback: remove o registro de clientes criado no passo anterior
        await supabase.from('clientes').delete().eq('id', clientId);

        const msg = authError.message.toLowerCase();
        if (msg.includes('already registered') || msg.includes('already been registered')) {
          throw new Error('Este e-mail já está cadastrado.');
        }
        if (msg.includes('rate limit') || authError.status === 429) {
          throw new Error('Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.');
        }
        throw new Error('Ocorreu um erro ao criar sua conta. Tente novamente.');
      }

      if (!authData.user) {
        await supabase.from('clientes').delete().eq('id', clientId);
        throw new Error('Ocorreu um erro ao criar sua conta. Tente novamente.');
      }

      // Passo 4 — Login automático
      await supabase.auth.signInWithPassword({
        email: form.email.trim().toLowerCase(),
        password: form.senha,
      });

      setSuccessModal(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Ocorreu um erro ao criar sua conta. Tente novamente.');
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2.5 border border-border rounded-xl bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400 placeholder:text-text-muted transition-all';

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4 py-12 relative overflow-hidden font-sans">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-rose-100/40 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-rose-100/40 blur-3xl pointer-events-none" />

      <div className="w-full max-w-[460px] bg-white border border-border rounded-[20px] shadow-xl p-8 md:p-10 relative z-10 animate-fade-in">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-600 to-rose-400 text-white flex items-center justify-center shadow-lg mb-4 hover:scale-105 transition-transform duration-300 overflow-hidden">
            <img
              src="/logo-login.png"
              alt="Lash Hub"
              className="w-[110%] h-[110%] object-contain invert mix-blend-screen scale-130"
            />
          </div>
          <h2 className="font-title font-bold text-3xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-rose-400">
            Lash Hub
          </h2>
          <p className="text-xs text-text-muted mt-2 uppercase tracking-wider font-medium">
            Criar sua conta
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
            <p className="text-xs font-medium leading-relaxed">{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block">
                Nome
              </label>
              <input
                name="nome"
                type="text"
                required
                autoComplete="given-name"
                placeholder="Maria"
                value={form.nome}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block">
                Sobrenome
              </label>
              <input
                name="sobrenome"
                type="text"
                required
                autoComplete="family-name"
                placeholder="Silva"
                value={form.sobrenome}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block">
              WhatsApp
            </label>
            <input
              name="whatsapp"
              type="tel"
              required
              autoComplete="tel"
              placeholder="(00) 00000-0000"
              value={form.whatsapp}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block">
              E-mail
            </label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="seu@email.com"
              value={form.email}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block">
              Senha
            </label>
            <div className="relative">
              <input
                name="senha"
                type={showSenha ? 'text' : 'password'}
                required
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                value={form.senha}
                onChange={handleChange}
                className={`${inputClass} pr-10`}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowSenha(!showSenha)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-rose-600 cursor-pointer"
              >
                {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block">
              Confirmar Senha
            </label>
            <div className="relative">
              <input
                name="confirmarSenha"
                type={showConfirmar ? 'text' : 'password'}
                required
                autoComplete="new-password"
                placeholder="Repita a senha"
                value={form.confirmarSenha}
                onChange={handleChange}
                className={`${inputClass} pr-10`}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowConfirmar(!showConfirmar)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-rose-600 cursor-pointer"
              >
                {showConfirmar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-rose-600 hover:bg-rose-800 disabled:bg-rose-400 text-white rounded-xl text-sm font-semibold transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center cursor-pointer mt-2"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Criar conta'
            )}
          </button>
        </form>

        <p className="text-center text-xs text-text-secondary mt-6">
          Já tem conta?{' '}
          <Link to={`/portal/${slug}/login`} className="text-rose-600 font-semibold hover:underline">
            Faça login
          </Link>
        </p>
      </div>

      {successModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[14px] border border-border shadow-xl w-full max-w-sm p-6 text-center animate-slide-up space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-green-600">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary">Cadastro realizado!</h3>
              <p className="text-sm text-text-secondary mt-1">Bem-vinda! Sua conta foi criada com sucesso.</p>
            </div>
            <button
              onClick={() => navigate(`/portal/${slug}/catalogo`, { replace: true })}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-800 text-white rounded-xl text-sm font-semibold transition-all duration-300 shadow-md cursor-pointer"
            >
              Concluir e Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
