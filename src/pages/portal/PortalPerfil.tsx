import { useState, useEffect, useRef } from 'react';
import { User, Phone, Mail, Lock, ShieldAlert, Loader2, Sparkles, AlertCircle, Camera, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatWhatsApp(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PortalPerfil() {
  const { user, profile, clienteId, refreshProfile } = useAuth();

  // Seção 0: Foto de Perfil
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [erroAvatar, setErroAvatar] = useState<string | null>(null);
  const [sucessoAvatar, setSucessoAvatar] = useState<string | null>(null);

  // Seção 1: Dados Pessoais
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [originalEmail, setOriginalEmail] = useState('');

  const [loadingDados, setLoadingDados] = useState(true);
  const [salvandoDados, setSalvandoDados] = useState(false);
  const [erroDados, setErroDados] = useState<string | null>(null);
  const [sucessoDados, setSucessoDados] = useState<string | null>(null);

  // Seção 2: Alterar Senha
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [sucessoSenha, setSucessoSenha] = useState<string | null>(null);

  useEffect(() => {
    if (!clienteId) return;

    (async () => {
      setLoadingDados(true);
      setErroDados(null);
      try {
        const { data, error } = await supabase
          .from('clientes')
          .select('nome, sobrenome, email, whatsapp')
          .eq('id', clienteId)
          .single();

        if (error) throw error;

        if (data) {
          setNome(data.nome || '');
          setSobrenome(data.sobrenome || '');
          setWhatsapp(formatWhatsApp(data.whatsapp || ''));
          setEmail(data.email || '');
          setOriginalEmail(data.email || '');
        }
      } catch (err) {
        console.error('Erro ao carregar dados do perfil:', err);
        setErroDados('Não foi possível carregar os dados do perfil.');
      } finally {
        setLoadingDados(false);
      }
    })();
  }, [clienteId]);

  // Handle WhatsApp Input with Mask
  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setWhatsapp(formatWhatsApp(rawValue));
  };

  // Upload da foto de perfil para o Supabase Storage
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    setErroAvatar(null);
    setSucessoAvatar(null);
    setUploadingAvatar(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `public/avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setSucessoAvatar('Foto de perfil atualizada!');
      await refreshProfile();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao enviar foto de perfil.';
      setErroAvatar(msg);
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Remover a foto de perfil
  const handleRemoveAvatar = async () => {
    if (!user?.id) return;
    setErroAvatar(null);
    setSucessoAvatar(null);
    setUploadingAvatar(true);

    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ avatar_url: null })
        .eq('id', user.id);

      if (error) throw error;

      setSucessoAvatar('Foto de perfil removida.');
      await refreshProfile();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao remover foto de perfil.';
      setErroAvatar(msg);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Salvar Dados Pessoais
  const handleSalvarDados = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !clienteId) return;

    if (!nome.trim() || !sobrenome.trim()) {
      setErroDados('Nome e Sobrenome são obrigatórios.');
      return;
    }

    const whatsappLimpo = whatsapp.replace(/\D/g, '');
    if (whatsappLimpo.length < 10 || whatsappLimpo.length > 11) {
      setErroDados('Digite um WhatsApp válido com DDD.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErroDados('Digite um e-mail válido.');
      return;
    }

    setSalvandoDados(true);
    setErroDados(null);
    setSucessoDados(null);

    try {
      // 1. UPDATE em clientes
      const { data: updatedData, error: updateCliError } = await supabase
        .from('clientes')
        .update({
          nome: nome.trim(),
          sobrenome: sobrenome.trim(),
          whatsapp: whatsappLimpo,
          email: email.trim().toLowerCase(),
        })
        .eq('id', clienteId)
        .select();

      if (updateCliError) throw updateCliError;

      if (!updatedData || updatedData.length === 0) {
        throw new Error('Não foi possível salvar as alterações. RLS (Row Level Security) bloqueou a atualização no banco de dados.');
      }

      // 1.5. UPDATE em usuarios (para manter nome e e-mail sincronizados no login/perfil)
      const { error: updateUsrError } = await supabase
        .from('usuarios')
        .update({
          nome: `${nome.trim()} ${sobrenome.trim()}`,
          email: email.trim().toLowerCase(),
        })
        .eq('id', user.id);

      if (updateUsrError) throw updateUsrError;



      // 2. Se o e-mail mudou, atualizar Supabase Auth
      let mudouEmail = false;
      const novoEmail = email.trim().toLowerCase();
      if (novoEmail !== originalEmail.trim().toLowerCase()) {
        const { error: authError } = await supabase.auth.updateUser({ email: novoEmail });
        if (authError) throw authError;
        mudouEmail = true;
      }

      setOriginalEmail(novoEmail);
      await refreshProfile(); // atualiza o perfil no AuthContext

      if (mudouEmail) {
        setSucessoDados(
          'Dados atualizados! Um e-mail de confirmação foi enviado para o novo endereço. Confirme para concluir a alteração.'
        );
      } else {
        setSucessoDados('Dados atualizados com sucesso!');
      }

      setTimeout(() => setSucessoDados(null), 8000);
    } catch (err: any) {
      console.error('Erro ao atualizar perfil:', err);
      setErroDados(err.message || 'Erro ao salvar os dados.');
    } finally {
      setSalvandoDados(false);
    }
  };

  // Salvar Nova Senha
  const handleSalvarSenha = async (e: React.FormEvent) => {
    e.preventDefault();

    if (novaSenha.length < 6) {
      setErroSenha('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErroSenha('As senhas digitadas são diferentes.');
      return;
    }

    setSalvandoSenha(true);
    setErroSenha(null);
    setSucessoSenha(null);

    try {
      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) throw error;

      setSucessoSenha('Senha alterada com sucesso!');
      setNovaSenha('');
      setConfirmarSenha('');

      setTimeout(() => setSucessoSenha(null), 4000);
    } catch (err: any) {
      console.error('Erro ao alterar senha:', err);
      setErroSenha(err.message || 'Erro ao alterar a senha.');
    } finally {
      setSalvandoSenha(false);
    }
  };

  const userName = profile?.nome || 'Cliente';
  const initials = userName
    .split(' ')
    .map((n) => n[0] || '')
    .join('')
    .substring(0, 2)
    .toUpperCase();

  if (loadingDados) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="h-9 bg-gray-200 rounded-lg w-48 animate-pulse mb-8"></div>
        <div className="bg-white border border-border rounded-2xl p-6 space-y-6">
          <div className="h-5 bg-gray-100 rounded w-1/3 animate-pulse"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="h-3 bg-gray-100 rounded w-16 animate-pulse"></div>
              <div className="h-10 bg-gray-100 rounded animate-pulse"></div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-100 rounded w-16 animate-pulse"></div>
              <div className="h-10 bg-gray-100 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <User className="w-8 h-8 text-rose-600" />
        <h1 className="font-title font-bold text-3xl text-text-primary">Meu Perfil</h1>
      </div>

      {/* SEÇÃO 0: FOTO DE PERFIL */}
      <section className="bg-white border border-border rounded-2xl shadow-sm p-6 flex flex-col items-center text-center">
        {erroAvatar && (
          <div className="flex items-center gap-2 p-4 mb-4 w-full bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {erroAvatar}
          </div>
        )}

        {sucessoAvatar && (
          <div className="flex items-start gap-2.5 p-4 mb-4 w-full bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-green-600" />
            <span>{sucessoAvatar}</span>
          </div>
        )}

        <div className="relative group">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={userName}
              className="w-28 h-28 rounded-full object-cover border-2 border-rose-200 shadow-md"
            />
          ) : (
            <div className="w-28 h-28 rounded-full bg-rose-100 border-2 border-rose-200 text-rose-800 flex items-center justify-center font-title font-bold text-3xl shadow-sm">
              {initials}
            </div>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer duration-200"
          >
            <Camera className="w-6 h-6" />
          </button>
        </div>

        <h3 className="font-title font-bold text-lg text-text-primary mt-4 truncate w-full">
          {userName}
        </h3>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleAvatarUpload}
          accept="image/*"
          className="hidden"
        />

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto mt-6">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <Camera className="w-4 h-4" />
            {uploadingAvatar ? 'Enviando...' : 'Alterar Foto'}
          </button>
          {profile?.avatar_url && (
            <button
              onClick={handleRemoveAvatar}
              disabled={uploadingAvatar}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Remover Foto
            </button>
          )}
        </div>
      </section>

      {/* SEÇÃO 1: DADOS PESSOAIS */}
      <section className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-rose-50/20 px-6 py-4 border-b border-border flex items-center gap-2">
          <User className="w-5 h-5 text-rose-600 shrink-0" />
          <h2 className="font-title font-semibold text-xl text-text-primary">Dados Pessoais</h2>
        </div>

        <form onSubmit={handleSalvarDados} className="p-6 space-y-5">
          {erroDados && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {erroDados}
            </div>
          )}

          {sucessoDados && (
            <div className="flex items-start gap-2.5 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-green-600" />
              <span>{sucessoDados}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="nome" className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Nome <span className="text-rose-600">*</span>
              </label>
              <input
                id="nome"
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Seu nome"
                required
                className="w-full px-3.5 py-2.5 border border-border rounded-xl bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400 placeholder:text-text-muted"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="sobrenome" className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Sobrenome <span className="text-rose-600">*</span>
              </label>
              <input
                id="sobrenome"
                type="text"
                value={sobrenome}
                onChange={e => setSobrenome(e.target.value)}
                placeholder="Seu sobrenome"
                required
                className="w-full px-3.5 py-2.5 border border-border rounded-xl bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400 placeholder:text-text-muted"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="whatsapp" className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                WhatsApp <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="whatsapp"
                  type="text"
                  value={whatsapp}
                  onChange={handleWhatsappChange}
                  placeholder="(00) 00000-0000"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 border border-border rounded-xl bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400 placeholder:text-text-muted"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                E-mail <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 border border-border rounded-xl bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400 placeholder:text-text-muted"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={salvandoDados}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-800 disabled:bg-rose-400 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
            >
              {salvandoDados ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
              ) : (
                'Salvar Alterações'
              )}
            </button>
          </div>
        </form>
      </section>

      {/* SEÇÃO 2: ALTERAR SENHA */}
      <section className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-rose-50/20 px-6 py-4 border-b border-border flex items-center gap-2">
          <Lock className="w-5 h-5 text-rose-600 shrink-0" />
          <h2 className="font-title font-semibold text-xl text-text-primary">Alterar Senha</h2>
        </div>

        <form onSubmit={handleSalvarSenha} className="p-6 space-y-5">
          {erroSenha && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {erroSenha}
            </div>
          )}

          {sucessoSenha && (
            <div className="flex items-center gap-2.5 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
              <Sparkles className="w-4 h-4 shrink-0 text-green-600" />
              <span>{sucessoSenha}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="novaSenha" className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Nova Senha
              </label>
              <input
                id="novaSenha"
                type="password"
                value={novaSenha}
                onChange={e => setNovaSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-3.5 py-2.5 border border-border rounded-xl bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400 placeholder:text-text-muted"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirmarSenha" className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Confirmar Nova Senha
              </label>
              <input
                id="confirmarSenha"
                type="password"
                value={confirmarSenha}
                onChange={e => setConfirmarSenha(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full px-3.5 py-2.5 border border-border rounded-xl bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400 placeholder:text-text-muted"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={salvandoSenha}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-800 disabled:bg-rose-400 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
            >
              {salvandoSenha ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Alterando...</>
              ) : (
                'Alterar Senha'
              )}
            </button>
          </div>
        </form>
      </section>

      {/* AVISO DE PRIVACIDADE EXCLUSIVO DO PORTAL */}
      <div className="flex items-start gap-2.5 p-4 bg-rose-50/30 border border-rose-100 rounded-xl text-xs text-text-secondary leading-relaxed">
        <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold block mb-0.5">Segurança dos seus dados</span>
          Suas informações de anamnese (alergias, restrições e tratamentos) são dados sensíveis de acesso restrito e privado. Elas não são visíveis nesta página pública e só podem ser gerenciadas diretamente pela profissional em seu perfil administrativo.
        </div>
      </div>
    </div>
  );
}
