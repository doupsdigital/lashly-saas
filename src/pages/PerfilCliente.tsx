import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  ArrowLeft, 
  User, 
  FileText, 
  History, 
  Plus, 
  Save, 
  AlertCircle, 
  X, 
  Clock, 
  Sparkles, 
  UserCheck, 
  Power,
  Calendar
} from 'lucide-react';
import type { Cliente, Atendimento, Servico, VariacaoServico, Profissional } from '../types';

interface AtendimentoWithRelations extends Atendimento {
  servicos?: { nome: string };
  variacoes_servico?: { nome: string };
  profissionais?: { nome: string; sobrenome: string };
}

interface ServicoWithVariations extends Servico {
  variacoes_servico?: VariacaoServico[];
}

export default function PerfilCliente() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'dados' | 'anamnese' | 'historico'>('dados');
  
  // Data States
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [atendimentos, setAtendimentos] = useState<AtendimentoWithRelations[]>([]);
  const [servicos, setServicos] = useState<ServicoWithVariations[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal State
  const [isAtendimentoModalOpen, setIsAtendimentoModalOpen] = useState(false);

  // Form States - Dados Pessoais
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [cpf, setCpf] = useState('');
  const [endereco, setEndereco] = useState('');
  const [comoConheceu, setComoConheceu] = useState('');

  // Form States - Anamnese
  const [alergias, setAlergias] = useState('');
  const [tipoPele, setTipoPele] = useState('');
  const [restricoes, setRestricoes] = useState('');
  const [medicamentos, setMedicamentos] = useState('');
  const [gestante, setGestante] = useState(false);
  const [doencasCronicas, setDoencasCronicas] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Form States - Novo Atendimento
  const [atendimentoData, setAtendimentoData] = useState('');
  const [atendimentoServicoId, setAtendimentoServicoId] = useState('');
  const [atendimentoVariacaoId, setAtendimentoVariacaoId] = useState('');
  const [atendimentoProfissionalId, setAtendimentoProfissionalId] = useState('');
  const [atendimentoValor, setAtendimentoValor] = useState<number>(0);
  const [atendimentoObs, setAtendimentoObs] = useState('');

  const showTemporaryError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 5000);
  };

  const showTemporarySuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Helper log action
  const logAction = async (acao: 'criou' | 'editou' | 'excluiu', entidade: string, entidadeId: string, descricao: string) => {
    try {
      await supabase.from('logs').insert({
        usuario_nome: 'Dra. Amanda Rosa', // Mocked active user
        acao,
        entidade,
        entidade_id: entidadeId,
        descricao
      });
    } catch (err) {
      console.error('Erro ao gerar log:', err);
    }
  };

  const fetchClienteData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      // 1. Fetch client info
      const { data: clientData, error: clientError } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .single();

      if (clientError) throw clientError;
      setCliente(clientData);

      // Load Form states - Personal
      setNome(clientData.nome || '');
      setSobrenome(clientData.sobrenome || '');
      setWhatsapp(clientData.whatsapp || '');
      setEmail(clientData.email || '');
      setDataNascimento(clientData.data_nascimento || '');
      setCpf(clientData.cpf || '');
      setEndereco(clientData.endereco || '');
      setComoConheceu(clientData.como_conheceu || '');

      // Load Form states - Anamnese
      setAlergias(clientData.alergias || '');
      setTipoPele(clientData.tipo_pele || '');
      setRestricoes(clientData.restricoes || '');
      setMedicamentos(clientData.medicamentos || '');
      setGestante(!!clientData.gestante);
      setDoencasCronicas(clientData.doencas_cronicas || '');
      setObservacoes(clientData.observacoes || '');

      // 2. Fetch history
      const { data: histData, error: histError } = await supabase
        .from('atendimentos')
        .select(`
          *,
          servicos ( nome ),
          variacoes_servico ( nome ),
          profissionais ( nome, sobrenome )
        `)
        .eq('cliente_id', id)
        .order('data_atendimento', { ascending: false });

      if (histError) throw histError;
      setAtendimentos(histData || []);

      // 3. Fetch active services (with variations)
      const { data: srvData, error: srvError } = await supabase
        .from('servicos')
        .select('*, variacoes_servico(*)')
        .eq('ativo', true)
        .order('nome', { ascending: true });

      if (srvError) throw srvError;
      setServicos(srvData || []);

      // 4. Fetch active professionals
      const { data: profData, error: profError } = await supabase
        .from('profissionais')
        .select('*')
        .eq('ativo', true)
        .order('nome', { ascending: true });

      if (profError) throw profError;
      setProfissionais(profData || []);

    } catch (err) {
      console.error('Erro ao buscar dados do cliente:', err);
      showTemporaryError('Falha ao carregar dados do prontuário.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClienteData();
  }, [id]);

  // TOGGLE CLIENT STATUS
  const handleToggleClienteStatus = async () => {
    if (!cliente) return;
    const newStatus = !cliente.ativo;
    try {
      const { error } = await supabase
        .from('clientes')
        .update({ ativo: newStatus })
        .eq('id', cliente.id);

      if (error) throw error;
      await logAction('editou', 'cliente', cliente.id, `${newStatus ? 'Ativou' : 'Desativou'} cliente "${cliente.nome} ${cliente.sobrenome}"`);
      setCliente(prev => prev ? { ...prev, ativo: newStatus } : null);
      showTemporarySuccess(`Status alterado para ${newStatus ? 'Ativo' : 'Inativo'}.`);
    } catch (err) {
      console.error(err);
      showTemporaryError('Erro ao atualizar status do cliente.');
    }
  };

  // SAVE PERSONAL DATA
  const handleSavePersonalData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliente) return;

    if (!nome.trim() || !sobrenome.trim() || !whatsapp.trim()) {
      showTemporaryError('Nome, sobrenome e WhatsApp são obrigatórios.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('clientes')
        .update({
          nome,
          sobrenome,
          whatsapp,
          email: email.trim() || null,
          data_nascimento: dataNascimento || null,
          cpf: cpf.trim() || null,
          endereco: endereco.trim() || null,
          como_conheceu: comoConheceu || null
        })
        .eq('id', cliente.id);

      if (error) {
        if (error.code === '23505') {
          throw new Error('Este número de WhatsApp já está cadastrado para outro cliente.');
        }
        throw error;
      }

      await logAction('editou', 'cliente', cliente.id, `Editou dados pessoais de "${nome} ${sobrenome}"`);
      showTemporarySuccess('Dados pessoais atualizados com sucesso!');
      setCliente(prev => prev ? { ...prev, nome, sobrenome, whatsapp, email, data_nascimento: dataNascimento, cpf, endereco, como_conheceu: comoConheceu } : null);
    } catch (err: any) {
      console.error(err);
      showTemporaryError(err.message || 'Falha ao salvar dados pessoais.');
    } finally {
      setSaving(false);
    }
  };

  // SAVE ANAMNESE
  const handleSaveAnamnese = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliente) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('clientes')
        .update({
          alergias: alergias.trim() || null,
          tipo_pele: tipoPele || null,
          restricoes: restricoes.trim() || null,
          medicamentos: medicamentos.trim() || null,
          gestante,
          doencas_cronicas: doencasCronicas.trim() || null,
          observacoes: observacoes.trim() || null
        })
        .eq('id', cliente.id);

      if (error) throw error;

      await logAction('editou', 'cliente', cliente.id, `Atualizou a ficha clínica (anamnese) de "${cliente.nome} ${cliente.sobrenome}"`);
      showTemporarySuccess('Ficha clínica (anamnese) atualizada com sucesso!');
    } catch (err) {
      console.error(err);
      showTemporaryError('Falha ao salvar a ficha clínica.');
    } finally {
      setSaving(false);
    }
  };

  // OPEN ATENDIMENTO MODAL
  const handleOpenAtendimentoModal = () => {
    // Set default values
    const todayStr = new Date().toISOString().split('T')[0];
    setAtendimentoData(todayStr);
    setAtendimentoServicoId('');
    setAtendimentoVariacaoId('');
    setAtendimentoProfissionalId(profissionais.length > 0 ? profissionais[0].id : '');
    setAtendimentoValor(0);
    setAtendimentoObs('');
    setIsAtendimentoModalOpen(true);
  };

  // HANDLE SERVICE CHANGE IN MODAL
  const handleServiceChange = (serviceId: string) => {
    setAtendimentoServicoId(serviceId);
    
    // Find service and check variations
    const service = servicos.find(s => s.id === serviceId);
    if (!service) return;

    if (service.variacoes_servico && service.variacoes_servico.length > 0) {
      // Has variations: Select first variation and set its price
      const firstVar = service.variacoes_servico[0];
      setAtendimentoVariacaoId(firstVar.id);
      setAtendimentoValor(Number(firstVar.valor));
    } else {
      // No variations: Clear variation ID and set standard price
      setAtendimentoVariacaoId('');
      setAtendimentoValor(Number(service.valor_padrao));
    }
  };

  // HANDLE VARIATION CHANGE IN MODAL
  const handleVariationChange = (variationId: string) => {
    setAtendimentoVariacaoId(variationId);
    
    // Find the price
    const service = servicos.find(s => s.id === atendimentoServicoId);
    if (!service || !service.variacoes_servico) return;

    const variation = service.variacoes_servico.find(v => v.id === variationId);
    if (variation) {
      setAtendimentoValor(Number(variation.valor));
    }
  };

  // SAVE ATENDIMENTO
  const handleSaveAtendimento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliente) return;

    if (!atendimentoData || !atendimentoServicoId || !atendimentoProfissionalId) {
      showTemporaryError('Data, serviço e profissional são obrigatórios.');
      return;
    }

    if (atendimentoValor < 0) {
      showTemporaryError('O valor cobrado não pode ser negativo.');
      return;
    }

    setSaving(true);
    try {
      const selectedService = servicos.find(s => s.id === atendimentoServicoId);
      
      const payload = {
        cliente_id: cliente.id,
        profissional_id: atendimentoProfissionalId,
        servico_id: atendimentoServicoId,
        variacao_id: atendimentoVariacaoId || null,
        data_atendimento: atendimentoData,
        valor_cobrado: atendimentoValor,
        observacoes: atendimentoObs.trim() || null
      };

      const { data, error } = await supabase
        .from('atendimentos')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      await logAction(
        'criou', 
        'atendimento', 
        data.id, 
        `Registrou atendimento de "${selectedService?.nome}" para a cliente "${cliente.nome} ${cliente.sobrenome}"`
      );

      setIsAtendimentoModalOpen(false);
      showTemporarySuccess('Atendimento registrado com sucesso!');
      
      // Reload history
      fetchClienteData();
    } catch (err) {
      console.error(err);
      showTemporaryError('Falha ao registrar atendimento.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !cliente) {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-text-secondary bg-surface border rounded-[14px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600 mb-2"></div>
        <p className="text-sm">Carregando prontuário da cliente...</p>
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="bg-white border border-border rounded-[14px] p-12 text-center text-text-secondary">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <p className="font-title font-medium text-lg text-text-primary">Cliente não encontrada</p>
        <p className="text-sm text-text-muted mt-1">O link acessado é inválido ou o registro foi removido.</p>
        <Link 
          to="/clientes" 
          className="mt-4 inline-flex items-center gap-1 px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-medium hover:bg-rose-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Lista
        </Link>
      </div>
    );
  }

  const initials = `${cliente.nome[0] || ''}${cliente.sobrenome[0] || ''}`.toUpperCase();
  const selectedService = servicos.find(s => s.id === atendimentoServicoId);

  return (
    <div className="space-y-6">
      {/* Top Banners */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-3 animate-fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
          <p className="text-sm font-medium">{errorMessage}</p>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-3 animate-fade-in">
          <Sparkles className="w-5 h-5 flex-shrink-0 text-green-600" />
          <p className="text-sm font-medium">{successMessage}</p>
        </div>
      )}

      {/* Header Profile Section */}
      <div className="bg-white border border-border rounded-[14px] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-rose-100 border-2 border-rose-200 text-rose-800 flex items-center justify-center font-title font-bold text-xl flex-shrink-0">
            {initials}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="font-title font-semibold text-2xl text-text-primary">
                {cliente.nome} {cliente.sobrenome}
              </h2>
              <span className={`text-[10px] font-sans font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${cliente.ativo 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-500'}`}
              >
                {cliente.ativo ? 'Ativa' : 'Inativa'}
              </span>
            </div>
            
            <div className="flex items-center gap-2 mt-1">
              <Link 
                to="/clientes" 
                className="text-xs text-text-secondary hover:text-rose-600 font-medium flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar para Clientes
              </Link>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Switcher Button */}
          <button
            onClick={handleToggleClienteStatus}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-medium transition-colors cursor-pointer ${cliente.ativo
              ? 'border-gray-200 hover:bg-gray-50 text-text-secondary'
              : 'border-green-200 hover:bg-green-50 text-green-600'}`}
          >
            <Power className="w-4 h-4" />
            {cliente.ativo ? 'Desativar Cliente' : 'Ativar Cliente'}
          </button>

          {/* Static New Appointment */}
          <button
            disabled
            className="px-4 py-2 bg-rose-100 text-rose-400 border border-rose-200 rounded-lg text-xs font-semibold cursor-not-allowed"
            title="Agendamento disponível na próxima etapa"
          >
            Novo Agendamento
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Side: Client Summary Card */}
        <div className="lg:col-span-1 bg-white border border-border rounded-[14px] p-5 shadow-sm space-y-4 h-fit">
          <p className="text-xs font-bold text-text-muted uppercase tracking-wider border-b border-border pb-1">Resumo Rápido</p>
          
          <div className="space-y-3">
            <div>
              <p className="text-[10px] text-text-secondary uppercase font-semibold">WhatsApp</p>
              <p className="text-sm font-semibold text-text-primary mt-0.5">{cliente.whatsapp}</p>
            </div>
            
            <div>
              <p className="text-[10px] text-text-secondary uppercase font-semibold">E-mail</p>
              <p className="text-xs text-text-primary mt-0.5 break-all">{cliente.email || <span className="text-text-muted italic">Não informado</span>}</p>
            </div>

            <div>
              <p className="text-[10px] text-text-secondary uppercase font-semibold">Idade / Nasc.</p>
              <p className="text-xs text-text-primary mt-0.5">
                {cliente.data_nascimento 
                  ? `${new Date(cliente.data_nascimento).toLocaleDateString('pt-BR')} (${new Date().getFullYear() - new Date(cliente.data_nascimento).getFullYear()} anos)` 
                  : <span className="text-text-muted italic">Não informada</span>}
              </p>
            </div>

            <div>
              <p className="text-[10px] text-text-secondary uppercase font-semibold">Canal de Origem</p>
              <p className="text-xs text-text-primary mt-0.5">
                {cliente.como_conheceu 
                  ? <span className="bg-rose-50 border border-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-medium text-[10px]">{cliente.como_conheceu}</span>
                  : <span className="text-text-muted italic">Não informado</span>}
              </p>
            </div>

            <div className="pt-2 border-t border-border/60">
              <p className="text-[10px] text-text-secondary uppercase font-semibold">Cadastro</p>
              <p className="text-[10px] text-text-muted mt-0.5">
                {new Date(cliente.created_at || '').toLocaleDateString('pt-BR')} às {new Date(cliente.created_at || '').toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Navigation Tabs & Tab Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Tab Navigation header */}
          <div className="flex border-b border-border bg-white rounded-t-[14px] px-4 pt-2 border-x border-t">
            {[
              { id: 'dados', label: 'Dados Pessoais', icon: User },
              { id: 'anamnese', label: 'Ficha Clínica (Anamnese)', icon: FileText },
              { id: 'historico', label: 'Histórico de Atendimentos', icon: History }
            ].map(tab => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${activeTab === tab.id
                    ? 'border-rose-600 text-rose-600'
                    : 'border-transparent text-text-secondary hover:text-rose-600'}`}
                >
                  <TabIcon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content Box */}
          <div className="bg-white border-x border-b border-border rounded-b-[14px] p-6 shadow-sm min-h-[400px]">
            
            {/* TAB: DADOS PESSOAIS */}
            {activeTab === 'dados' && (
              <form onSubmit={handleSavePersonalData} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Nome *</label>
                    <input 
                      type="text" 
                      required
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Sobrenome *</label>
                    <input 
                      type="text" 
                      required
                      value={sobrenome}
                      onChange={(e) => setSobrenome(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">WhatsApp *</label>
                    <input 
                      type="text" 
                      required
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">E-mail</label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Data de Nascimento</label>
                    <input 
                      type="date" 
                      value={dataNascimento}
                      onChange={(e) => setDataNascimento(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">CPF</label>
                    <input 
                      type="text" 
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Origem / Como conheceu</label>
                    <select
                      value={comoConheceu}
                      onChange={(e) => setComoConheceu(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400 cursor-pointer"
                    >
                      <option value="">Selecione...</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Indicação">Indicação</option>
                      <option value="Google">Google</option>
                      <option value="Passando na rua">Passando na rua</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Endereço Completo</label>
                  <input 
                    type="text" 
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400"
                  />
                </div>

                <div className="pt-3 border-t border-border flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-rose-600 hover:bg-rose-800 disabled:bg-rose-300 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Salvando...' : 'Salvar Dados Pessoais'}
                  </button>
                </div>
              </form>
            )}

            {/* TAB: ANAMNESE */}
            {activeTab === 'anamnese' && (
              <form onSubmit={handleSaveAnamnese} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Tipo de Pele</label>
                    <select
                      value={tipoPele}
                      onChange={(e) => setTipoPele(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400 cursor-pointer"
                    >
                      <option value="">Não avaliado</option>
                      <option value="Normal">Normal</option>
                      <option value="Oleosa">Oleosa</option>
                      <option value="Seca">Seca</option>
                      <option value="Mista">Mista</option>
                      <option value="Sensível">Sensível</option>
                    </select>
                  </div>

                  {/* Gestante Checkbox */}
                  <div className="flex items-center h-full sm:pt-6">
                    <label className="flex items-center gap-3 p-3 bg-bg/40 rounded-lg border border-border/60 cursor-pointer w-full select-none">
                      <input 
                        type="checkbox"
                        checked={gestante}
                        onChange={(e) => setGestante(e.target.checked)}
                        className="w-4.5 h-4.5 accent-rose-600 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-text-primary uppercase tracking-wide">Gestante ou Amamentando</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Alergias</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Ácido salicílico, iodo..."
                      value={alergias}
                      onChange={(e) => setAlergias(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Restrições / Contraindicações</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Queloides, marca-passo..."
                      value={restricoes}
                      onChange={(e) => setRestricoes(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Medicamentos em uso</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Roacutan, anticoagulantes..."
                      value={medicamentos}
                      onChange={(e) => setMedicamentos(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Doenças Crônicas</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Diabetes, hipertensão..."
                      value={doencasCronicas}
                      onChange={(e) => setDoencasCronicas(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Observações Livres</label>
                  <textarea 
                    rows={4}
                    placeholder="Histórico clínico geral, preferências de atendimento, anotações de sessões anteriores..."
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400 placeholder:text-text-muted"
                  />
                </div>

                <div className="pt-3 border-t border-border flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-rose-600 hover:bg-rose-800 disabled:bg-rose-300 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Salvando...' : 'Salvar Ficha Clínica'}
                  </button>
                </div>
              </form>
            )}

            {/* TAB: HISTORICO */}
            {activeTab === 'historico' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <h3 className="font-title font-semibold text-lg text-text-primary">Registros de Atendimento</h3>
                    <p className="text-xs text-text-secondary">Todos os procedimentos realizados e cobrados.</p>
                  </div>
                  <button
                    onClick={handleOpenAtendimentoModal}
                    className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Registrar Atendimento
                  </button>
                </div>

                {atendimentos.length === 0 ? (
                  <div className="py-12 text-center text-text-secondary">
                    <Sparkles className="w-10 h-10 text-rose-200 mx-auto mb-2" />
                    <p className="font-title font-medium text-text-primary">Nenhum atendimento registrado</p>
                    <p className="text-xs text-text-muted mt-0.5">Registre o primeiro atendimento clicando no botão acima.</p>
                  </div>
                ) : (
                  /* Timeline List */
                  <div className="relative border-l-2 border-rose-100 ml-3 pl-6 space-y-6 py-2">
                    {atendimentos.map(atend => {
                      const dateObj = new Date(atend.data_atendimento + 'T12:00:00'); // Prevent timezone offset
                      const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
                      
                      return (
                        <div key={atend.id} className="relative group">
                          {/* Dot indicator */}
                          <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-rose-400 bg-white group-hover:bg-rose-600 transition-colors" />

                          <div className="bg-bg/15 hover:bg-bg/40 border border-border p-4 rounded-xl transition-all max-w-2xl">
                            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1">
                                <Clock className="w-3 h-3 text-rose-400" />
                                {formattedDate}
                              </span>
                              <span className="text-sm font-bold text-rose-800 bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded-full">
                                R$ {Number(atend.valor_cobrado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>

                            <h4 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                              {atend.servicos?.nome}
                              {atend.variacoes_servico?.nome && (
                                <span className="text-[10px] bg-gold-light/40 text-gold border border-gold-light/60 px-1.5 py-0.5 rounded font-normal font-sans">
                                  {atend.variacoes_servico.nome}
                                </span>
                              )}
                            </h4>

                            <p className="text-[11px] text-text-secondary flex items-center gap-1 mt-1">
                              <UserCheck className="w-3 h-3 text-text-muted" />
                              Atendido por: <span className="font-semibold">{atend.profissionais?.nome} {atend.profissionais?.sobrenome}</span>
                            </p>

                            {atend.observacoes && (
                              <div className="mt-3 text-xs text-text-secondary bg-white border border-border/40 p-2.5 rounded-lg leading-relaxed italic">
                                "{atend.observacoes}"
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* REGISTRAR ATENDIMENTO MODAL */}
      {isAtendimentoModalOpen && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-[14px] border border-border shadow-xl w-full max-w-lg overflow-hidden my-8 animate-slide-up">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-rose-50/10">
              <h4 className="font-title font-semibold text-lg text-text-primary flex items-center gap-2">
                <Calendar className="w-5 h-5 text-rose-600" />
                Registrar Atendimento Realizado
              </h4>
              <button 
                onClick={() => setIsAtendimentoModalOpen(false)}
                className="text-text-secondary hover:text-rose-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveAtendimento} className="p-6 space-y-5">
              
              {/* Data */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Data do Atendimento *
                </label>
                <input 
                  type="date" 
                  required
                  value={atendimentoData}
                  onChange={(e) => setAtendimentoData(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400"
                />
              </div>

              {/* Servico Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Serviço *
                </label>
                <select
                  required
                  value={atendimentoServicoId}
                  onChange={(e) => handleServiceChange(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400 cursor-pointer"
                >
                  <option value="" disabled>Selecione um serviço ativo</option>
                  {servicos.map(s => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </select>
              </div>

              {/* Variação Selection (Dynamically appears if service has variations) */}
              {selectedService && selectedService.variacoes_servico && selectedService.variacoes_servico.length > 0 && (
                <div className="space-y-1.5 animate-fade-in">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    Variação do Serviço *
                  </label>
                  <select
                    required
                    value={atendimentoVariacaoId}
                    onChange={(e) => handleVariationChange(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400 cursor-pointer"
                  >
                    {selectedService.variacoes_servico.map(v => (
                      <option key={v.id} value={v.id}>{v.nome}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Profissional Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Profissional que Atendeu *
                </label>
                <select
                  required
                  value={atendimentoProfissionalId}
                  onChange={(e) => setAtendimentoProfissionalId(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400 cursor-pointer"
                >
                  <option value="" disabled>Selecione o profissional</option>
                  {profissionais.map(p => (
                    <option key={p.id} value={p.id}>{p.nome} {p.sobrenome}</option>
                  ))}
                </select>
              </div>

              {/* Valor Cobrado */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Valor Cobrado (R$) *
                </label>
                <input 
                  type="number" 
                  required
                  step="0.01"
                  min="0"
                  value={atendimentoValor}
                  onChange={(e) => setAtendimentoValor(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400"
                />
              </div>

              {/* Observações */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Observações do Atendimento
                </label>
                <textarea 
                  rows={3}
                  placeholder="Ex: Cliente relatou leve pinçamento. Reaplicado filtro solar ao final."
                  value={atendimentoObs}
                  onChange={(e) => setAtendimentoObs(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400 placeholder:text-text-muted"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAtendimentoModalOpen(false)}
                  disabled={saving}
                  className="px-4 py-2 border border-border rounded-lg text-xs font-medium text-text-secondary hover:bg-bg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-800 disabled:bg-rose-300 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  {saving ? 'Registrando...' : 'Confirmar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
