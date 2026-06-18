import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
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
  Calendar,
  Eye,
  Moon,
  HeartPulse,
  ShieldAlert,
  CheckCircle,
  UserX
} from 'lucide-react';
import type { Cliente, Servico, VariacaoServico } from '../types';
import { registrarLog } from '../utils/log';

interface AtendimentoWithRelations {
  id: string;
  data: string; // YYYY-MM-DD
  valor_cobrado: number;
  observacoes: string | null;
  servico_name: string;
  variacao_name?: string | null;
  tipo: 'manual' | 'agendamento' | 'falta';
}

interface ServicoWithVariations extends Servico {
  variacoes_servico?: VariacaoServico[];
}

function applyPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const limited = digits.substring(0, 11);
  if (limited.length <= 2) return `(${limited}`;
  if (limited.length <= 7) return `(${limited.substring(0, 2)}) ${limited.substring(2)}`;
  return `(${limited.substring(0, 2)}) ${limited.substring(2, 7)}-${limited.substring(7)}`;
}

function applyCpfMask(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const limited = digits.substring(0, 11);
  if (limited.length <= 3) return limited;
  if (limited.length <= 6) return `${limited.substring(0, 3)}.${limited.substring(3)}`;
  if (limited.length <= 9) return `${limited.substring(0, 3)}.${limited.substring(3, 6)}.${limited.substring(6)}`;
  return `${limited.substring(0, 3)}.${limited.substring(3, 6)}.${limited.substring(6, 9)}-${limited.substring(9)}`;
}

export default function PerfilCliente() {
  const { id } = useParams<{ id: string }>();
  const { estabelecimentoId } = useAuth();
  const [activeTab, setActiveTab] = useState<'dados' | 'anamnese' | 'historico'>('dados');
  
  // Data States
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [atendimentos, setAtendimentos] = useState<AtendimentoWithRelations[]>([]);
  const [totalFaltas, setTotalFaltas] = useState(0);
  const [servicos, setServicos] = useState<ServicoWithVariations[]>([]);
  
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
  const [medicamentos, setMedicamentos] = useState('');
  const [gestante, setGestante] = useState(false);
  const [doencasCronicas, setDoencasCronicas] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Form States - Anamnese Lash
  const [fezExtensaoAntes, setFezExtensaoAntes] = useState(false);
  const [reacaoAlergicaAnterior, setReacaoAlergicaAnterior] = useState(false);
  const [usaLentesContato, setUsaLentesContato] = useState(false);
  const [olhosSensiveis, setOlhosSensiveis] = useState(false);
  const [doencasOculares, setDoencasOculares] = useState(false);
  const [habitoEsfregarOlhos, setHabitoEsfregarOlhos] = useState(false);
  const [posicaoDormir, setPosicaoDormir] = useState<'lado' | 'costas' | 'de_brucos' | 'variada' | ''>('');
  const [maquiagemProvaAgua, setMaquiagemProvaAgua] = useState(false);
  const [exposicaoCalorAgua, setExposicaoCalorAgua] = useState(false);
  const [problemasTireoide, setProblemasTireoide] = useState(false);
  const [quimioterapiaRecente, setQuimioterapiaRecente] = useState(false);
  const [quedaCabeloAlopecia, setQuedaCabeloAlopecia] = useState(false);
  const [alergiaProdutos, setAlergiaProdutos] = useState(false);

  // Form States - Novo Atendimento
  const [atendimentoData, setAtendimentoData] = useState('');
  const [atendimentoServicoId, setAtendimentoServicoId] = useState('');
  const [atendimentoVariacaoId, setAtendimentoVariacaoId] = useState('');
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



  const fetchClienteData = async () => {
    if (!id || !estabelecimentoId) return;
    setLoading(true);
    try {
      // 1. Fetch client info — validando que pertence ao estabelecimento logado
      const { data: clientData, error: clientError } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .eq('estabelecimento_id', estabelecimentoId)
        .single();

      if (clientError) throw clientError;
      setCliente(clientData);

      // Load Form states - Personal
      setNome(clientData.nome || '');
      setSobrenome(clientData.sobrenome || '');
      setWhatsapp(applyPhoneMask(clientData.whatsapp || ''));
      setEmail(clientData.email || '');
      setDataNascimento(clientData.data_nascimento || '');
      setCpf(applyCpfMask(clientData.cpf || ''));
      setEndereco(clientData.endereco || '');
      setComoConheceu(clientData.como_conheceu || '');

      // Load Form states - Anamnese
      setAlergias(clientData.alergias || '');
      setMedicamentos(clientData.medicamentos || '');
      setGestante(!!clientData.gestante);
      setDoencasCronicas(clientData.doencas_cronicas || '');
      setObservacoes(clientData.observacoes || '');

      // Load Form states - Anamnese Lash
      const lashData = clientData.anamnese_lash || {};
      setFezExtensaoAntes(!!lashData.fez_extensao_antes);
      setReacaoAlergicaAnterior(!!lashData.reacao_alergica_anterior);
      setUsaLentesContato(!!lashData.usa_lentes_contato);
      setOlhosSensiveis(!!lashData.olhos_sensiveis);
      setDoencasOculares(!!lashData.doencas_oculares);
      setHabitoEsfregarOlhos(!!lashData.habito_esfregar_olhos);
      setPosicaoDormir(lashData.posicao_dormir || '');
      setMaquiagemProvaAgua(!!lashData.maquiagem_prova_agua);
      setExposicaoCalorAgua(!!lashData.exposicao_calor_agua);
      setProblemasTireoide(!!lashData.problemas_tireoide);
      setQuimioterapiaRecente(!!lashData.quimioterapia_recente);
      setQuedaCabeloAlopecia(!!lashData.queda_cabelo_alopecia);
      setAlergiaProdutos(!!lashData.alergia_produtos);

      // 2. Fetch history (combine manual records and concluded appointments)
      const [histRes, concludedRes, faltasRes] = await Promise.all([
        supabase
          .from('atendimentos')
          .select('*, servicos(nome), variacoes_servico(nome)')
          .eq('cliente_id', id),
        supabase
          .from('agendamentos')
          .select(`
            id, data_hora, status, valor_cobrado, observacoes,
            agendamento_servicos (
              servico:servicos(nome),
              variacao:variacoes_servico(nome)
            )
          `)
          .eq('cliente_id', id)
          .eq('status', 'concluido'),
        supabase
          .from('agendamentos')
          .select(`
            id, data_hora, status, observacoes,
            agendamento_servicos (
              servico:servicos(nome),
              variacao:variacoes_servico(nome)
            )
          `)
          .eq('cliente_id', id)
          .eq('status', 'falta')
          .order('data_hora', { ascending: false })
      ]);

      if (histRes.error) throw histRes.error;
      if (concludedRes.error) throw concludedRes.error;
      if (faltasRes.error) throw faltasRes.error;
      setTotalFaltas(faltasRes.data?.length ?? 0);

      const manualItems = (histRes.data || []).map((a: any) => ({
        id: a.id,
        data: a.data_atendimento,
        valor_cobrado: Number(a.valor_cobrado || 0),
        observacoes: a.observacoes,
        servico_name: a.servicos?.nome || 'Serviço Personalizado',
        variacao_name: a.variacoes_servico?.nome || null,
        tipo: 'manual' as const
      }));

      const apptItems = (concludedRes.data || []).map((a: any) => {
        const servicesList = (a.agendamento_servicos || []).map((as: any) => {
          const sName = as.servico?.nome || 'Serviço';
          const vName = as.variacao?.nome;
          return vName ? `${sName} (${vName})` : sName;
        });
        
        return {
          id: a.id,
          data: a.data_hora.split('T')[0],
          valor_cobrado: Number(a.valor_cobrado || 0),
          observacoes: a.observacoes,
          servico_name: servicesList.join(', ') || 'Nenhum serviço',
          variacao_name: null,
          tipo: 'agendamento' as const
        };
      });

      const faltaItems = (faltasRes.data || []).map((a: any) => {
        const servicesList = (a.agendamento_servicos || []).map((as: any) => {
          const sName = as.servico?.nome || 'Serviço';
          const vName = as.variacao?.nome;
          return vName ? `${sName} (${vName})` : sName;
        });
        return {
          id: a.id,
          data: a.data_hora.split('T')[0],
          valor_cobrado: 0,
          observacoes: a.observacoes,
          servico_name: servicesList.join(', ') || 'Serviço não especificado',
          variacao_name: null,
          tipo: 'falta' as const
        };
      });

      const combined = [...manualItems, ...apptItems, ...faltaItems].sort((a, b) => {
        return new Date(a.data).getTime() - new Date(b.data).getTime();
      });

      setAtendimentos(combined);

      // 3. Fetch active services (with variations)
      const { data: srvData, error: srvError } = await supabase
        .from('servicos')
        .select('*, variacoes_servico(*)')
        .eq('ativo', true)
        .order('nome', { ascending: true });

      if (srvError) throw srvError;
      setServicos(srvData || []);

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
        })
        .eq('id', cliente.id);

      if (error) {
        if (error.code === '23505') {
          throw new Error('Este número de WhatsApp já está cadastrado para outro cliente.');
        }
        throw error;
      }

      await registrarLog('editou', 'cliente', cliente.id, `Editou dados pessoais de "${nome} ${sobrenome}"`);
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
          medicamentos: medicamentos.trim() || null,
          gestante,
          doencas_cronicas: doencasCronicas.trim() || null,
          observacoes: observacoes.trim() || null,
          anamnese_lash: {
            fez_extensao_antes: fezExtensaoAntes,
            reacao_alergica_anterior: reacaoAlergicaAnterior,
            usa_lentes_contato: usaLentesContato,
            olhos_sensiveis: olhosSensiveis,
            doencas_oculares: doencasOculares,
            habito_esfregar_olhos: habitoEsfregarOlhos,
            posicao_dormir: posicaoDormir,
            maquiagem_prova_agua: maquiagemProvaAgua,
            exposicao_calor_agua: exposicaoCalorAgua,
            problemas_tireoide: problemasTireoide,
            quimioterapia_recente: quimioterapiaRecente,
            queda_cabelo_alopecia: quedaCabeloAlopecia,
            alergia_produtos: alergiaProdutos,
          }
        })
        .eq('id', cliente.id);

      if (error) throw error;

      await registrarLog('editou', 'cliente', cliente.id, `Atualizou a ficha clínica (anamnese) de "${cliente.nome} ${cliente.sobrenome}"`);
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
    const todayStr = new Date().toISOString().split('T')[0];
    setAtendimentoData(todayStr);
    setAtendimentoServicoId('');
    setAtendimentoVariacaoId('');
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
      setAtendimentoValor(Number(service.valor));
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

    if (!atendimentoData || !atendimentoServicoId) {
      showTemporaryError('Data e serviço são obrigatórios.');
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
        estabelecimento_id: cliente.estabelecimento_id,
        cliente_id: cliente.id,
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

      await registrarLog(
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

  const initials = `${cliente.nome[0] || ''}${(cliente.sobrenome || '')[0] || ''}`.toUpperCase();
  const selectedService = servicos.find(s => s.id === atendimentoServicoId);

  return (
    <div className="space-y-6">
      {/* Floating Centered Alerts */}
      {errorMessage && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 bg-black/20 backdrop-blur-[1px] pointer-events-auto">
          <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-xl flex items-center gap-3 shadow-2xl animate-scale-in max-w-md">
            <AlertCircle className="w-6 h-6 flex-shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-semibold">Erro</p>
              <p className="text-xs mt-0.5 leading-relaxed">{errorMessage}</p>
            </div>
            <button onClick={() => setErrorMessage(null)} className="ml-auto text-red-600 hover:text-red-800 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      {successMessage && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-[14px] border border-border shadow-xl w-full max-w-sm p-6 text-center animate-slide-up space-y-4">
            
            {/* Animated Check Icon */}
            <div className="mx-auto w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-green-600 animate-pulse">
              <CheckCircle className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <h3 className="font-title font-bold text-xl text-text-primary">
                Salvo com Sucesso!
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                {successMessage}
              </p>
            </div>

            {/* Actions */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSuccessMessage(null)}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Concluir
              </button>
            </div>

          </div>
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

            {totalFaltas > 0 && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <UserX className="w-4 h-4 text-red-600 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-red-700 uppercase font-bold">Faltas registradas</p>
                  <p className="text-sm font-bold text-red-800">{totalFaltas} {totalFaltas === 1 ? 'falta' : 'faltas'}</p>
                </div>
              </div>
            )}

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
                      onChange={(e) => setWhatsapp(applyPhoneMask(e.target.value))}
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
                      onChange={(e) => setCpf(applyCpfMask(e.target.value))}
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
                    className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-rose-600 hover:bg-rose-800 disabled:bg-rose-400 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Salvando...' : 'Salvar Dados Pessoais'}
                  </button>
                </div>
              </form>
            )}

                   {/* TAB: ANAMNESE */}
            {activeTab === 'anamnese' && (
              <form onSubmit={handleSaveAnamnese} className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* CARD 1: Histórico & Cuidados Oculares */}
                  <div className="bg-bg/10 border border-border/80 rounded-xl p-5 space-y-4 shadow-sm">
                    <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                      <Eye className="w-4 h-4 text-rose-500" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">Histórico & Cuidados Oculares</h3>
                    </div>
                    
                    <div className="space-y-3">
                      {/* Já fez extensão de cílios antes */}
                      <label className="flex items-center gap-3 p-2.5 bg-bg/25 rounded-lg border border-border/40 cursor-pointer select-none w-full transition-colors hover:bg-bg/40">
                        <input 
                          type="checkbox"
                          checked={fezExtensaoAntes}
                          onChange={(e) => setFezExtensaoAntes(e.target.checked)}
                          className="w-4.5 h-4.5 accent-rose-600 cursor-pointer"
                        />
                        <span className="text-xs font-medium text-text-secondary">Já realizou extensão de cílios anteriormente?</span>
                      </label>

                      {/* Se sim, teve reação alérgica anterior? */}
                      {fezExtensaoAntes && (
                        <label className="flex items-center gap-3 p-2.5 bg-rose-50/20 rounded-lg border border-rose-100/40 cursor-pointer select-none w-full transition-colors hover:bg-rose-50/35 pl-6 animate-slide-up">
                          <input 
                            type="checkbox"
                            checked={reacaoAlergicaAnterior}
                            onChange={(e) => setReacaoAlergicaAnterior(e.target.checked)}
                            className="w-4.5 h-4.5 accent-rose-600 cursor-pointer"
                          />
                          <span className="text-xs font-semibold text-rose-800">Teve reação alérgica a extensões anteriores?</span>
                        </label>
                      )}

                      {/* Usa lentes de contato */}
                      <label className="flex items-center gap-3 p-2.5 bg-bg/25 rounded-lg border border-border/40 cursor-pointer select-none w-full transition-colors hover:bg-bg/40">
                        <input 
                          type="checkbox"
                          checked={usaLentesContato}
                          onChange={(e) => setUsaLentesContato(e.target.checked)}
                          className="w-4.5 h-4.5 accent-rose-600 cursor-pointer"
                        />
                        <span className="text-xs font-medium text-text-secondary">Usa lentes de contato? (remover no procedimento)</span>
                      </label>

                      {/* Olhos sensíveis / lacrimejamento */}
                      <label className="flex items-center gap-3 p-2.5 bg-bg/25 rounded-lg border border-border/40 cursor-pointer select-none w-full transition-colors hover:bg-bg/40">
                        <input 
                          type="checkbox"
                          checked={olhosSensiveis}
                          onChange={(e) => setOlhosSensiveis(e.target.checked)}
                          className="w-4.5 h-4.5 accent-rose-600 cursor-pointer"
                        />
                        <span className="text-xs font-medium text-text-secondary">Olhos sensíveis, lacrimejamento fácil ou olho seco?</span>
                      </label>

                      {/* Doenças oculares recentes */}
                      <label className="flex items-center gap-3 p-2.5 bg-bg/25 rounded-lg border border-border/40 cursor-pointer select-none w-full transition-colors hover:bg-bg/40">
                        <input 
                          type="checkbox"
                          checked={doencasOculares}
                          onChange={(e) => setDoencasOculares(e.target.checked)}
                          className="w-4.5 h-4.5 accent-rose-600 cursor-pointer"
                        />
                        <span className="text-xs font-medium text-text-secondary">Infecção ocular recente (blefarite, conjuntivite, terçol)?</span>
                      </label>

                      {/* Hábito de esfregar os olhos */}
                      <label className="flex items-center gap-3 p-2.5 bg-bg/25 rounded-lg border border-border/40 cursor-pointer select-none w-full transition-colors hover:bg-bg/40">
                        <input 
                          type="checkbox"
                          checked={habitoEsfregarOlhos}
                          onChange={(e) => setHabitoEsfregarOlhos(e.target.checked)}
                          className="w-4.5 h-4.5 accent-rose-600 cursor-pointer"
                        />
                        <span className="text-xs font-medium text-text-secondary">Hábito de esfregar ou tocar os olhos/cílios?</span>
                      </label>
                    </div>
                  </div>

                  {/* CARD 2: Hábitos & Estilo de Vida */}
                  <div className="bg-bg/10 border border-border/80 rounded-xl p-5 space-y-4 shadow-sm h-fit">
                    <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                      <Moon className="w-4 h-4 text-rose-500" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">Hábitos & Retenção</h3>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Posição de dormir */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Como costuma dormir?</label>
                        <select
                          value={posicaoDormir}
                          onChange={(e) => setPosicaoDormir(e.target.value as any)}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400 cursor-pointer"
                        >
                          <option value="">Selecione...</option>
                          <option value="lado">De Lado (impacta lateral da extensão)</option>
                          <option value="costas">De Costas (ideal para retenção)</option>
                          <option value="de_brucos">De Bruços (atrito severo)</option>
                          <option value="variada">Variada / Alternada</option>
                        </select>
                      </div>

                      <div className="space-y-3 pt-1">
                        {/* Costuma usar rímel/maquiagem à prova d'água */}
                        <label className="flex items-center gap-3 p-2.5 bg-bg/25 rounded-lg border border-border/40 cursor-pointer select-none w-full transition-colors hover:bg-bg/40">
                          <input 
                            type="checkbox"
                            checked={maquiagemProvaAgua}
                            onChange={(e) => setMaquiagemProvaAgua(e.target.checked)}
                            className="w-4.5 h-4.5 accent-rose-600 cursor-pointer"
                          />
                          <span className="text-xs font-medium text-text-secondary">Usa rímel ou maquiagem à prova d'água nos olhos?</span>
                        </label>

                        {/* Contato frequente com calor, piscina, vapor */}
                        <label className="flex items-center gap-3 p-2.5 bg-bg/25 rounded-lg border border-border/40 cursor-pointer select-none w-full transition-colors hover:bg-bg/40">
                          <input 
                            type="checkbox"
                            checked={exposicaoCalorAgua}
                            onChange={(e) => setExposicaoCalorAgua(e.target.checked)}
                            className="w-4.5 h-4.5 accent-rose-600 cursor-pointer"
                          />
                          <span className="text-xs font-medium text-text-secondary">Contato frequente com vapor, calor, sauna ou piscina?</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* CARD 3: Condições Clínicas & Hormonais */}
                  <div className="bg-bg/10 border border-border/80 rounded-xl p-5 space-y-4 md:col-span-2 shadow-sm">
                    <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                      <HeartPulse className="w-4 h-4 text-rose-500" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">Condições Clínicas & Fatores Hormonais (Podem afetar a retenção)</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        {/* Gestante ou Lactante */}
                        <label className="flex items-center gap-3 p-2.5 bg-bg/25 rounded-lg border border-border/40 cursor-pointer select-none w-full transition-colors hover:bg-bg/40">
                          <input 
                            type="checkbox"
                            checked={gestante}
                            onChange={(e) => setGestante(e.target.checked)}
                            className="w-4.5 h-4.5 accent-rose-600 cursor-pointer"
                          />
                          <span className="text-xs font-medium text-text-secondary">Gestante ou Lactante?</span>
                        </label>

                        {/* Problemas de tireoide */}
                        <label className="flex items-center gap-3 p-2.5 bg-bg/25 rounded-lg border border-border/40 cursor-pointer select-none w-full transition-colors hover:bg-bg/40">
                          <input 
                            type="checkbox"
                            checked={problemasTireoide}
                            onChange={(e) => setProblemasTireoide(e.target.checked)}
                            className="w-4.5 h-4.5 accent-rose-600 cursor-pointer"
                          />
                          <span className="text-xs font-medium text-text-secondary">Problemas de tireoide ou alteração hormonal recente?</span>
                        </label>
                      </div>

                      <div className="space-y-3">
                        {/* Quimioterapia recente */}
                        <label className="flex items-center gap-3 p-2.5 bg-bg/25 rounded-lg border border-border/40 cursor-pointer select-none w-full transition-colors hover:bg-bg/40">
                          <input 
                            type="checkbox"
                            checked={quimioterapiaRecente}
                            onChange={(e) => setQuimioterapiaRecente(e.target.checked)}
                            className="w-4.5 h-4.5 accent-rose-600 cursor-pointer"
                          />
                          <span className="text-xs font-medium text-text-secondary">Passou por quimioterapia nos últimos 6 meses?</span>
                        </label>

                        {/* Queda de cabelo / alopecia */}
                        <label className="flex items-center gap-3 p-2.5 bg-bg/25 rounded-lg border border-border/40 cursor-pointer select-none w-full transition-colors hover:bg-bg/40">
                          <input 
                            type="checkbox"
                            checked={quedaCabeloAlopecia}
                            onChange={(e) => setQuedaCabeloAlopecia(e.target.checked)}
                            className="w-4.5 h-4.5 accent-rose-600 cursor-pointer"
                          />
                          <span className="text-xs font-medium text-text-secondary">Queda acentuada de cabelo ou diagnóstico de alopecia?</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* CARD 4: Alergias & Detalhes Clínicos */}
                  <div className="bg-bg/10 border border-border/80 rounded-xl p-5 space-y-4 md:col-span-2 shadow-sm">
                    <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                      <ShieldAlert className="w-4 h-4 text-rose-500" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">Alergias & Detalhes Clínicos</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Alergias conhecidas</label>
                        <input 
                          type="text" 
                          placeholder="Ex: Esmalte, cosméticos, cianoacrilato (cola), fita micropore, látex..."
                          value={alergias}
                          onChange={(e) => setAlergias(e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400 placeholder:text-text-muted"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Medicamentos em uso</label>
                        <input 
                          type="text" 
                          placeholder="Ex: Roacutan, colírios frequentes, corticoides..."
                          value={medicamentos}
                          onChange={(e) => setMedicamentos(e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400 placeholder:text-text-muted"
                        />
                      </div>

                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Doenças Crônicas</label>
                        <input 
                          type="text" 
                          placeholder="Ex: Diabetes, labirintite (dificulta ficar deitada muito tempo), asma..."
                          value={doencasCronicas}
                          onChange={(e) => setDoencasCronicas(e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400 placeholder:text-text-muted"
                        />
                      </div>

                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Observações de Design & Mapping</label>
                        <textarea 
                          rows={3}
                          placeholder="Anotações gerais, técnica preferida, mapping (ex: gatinho, boneca), curvaturas (C, D, L), espessuras (0.07, 0.15) e notas de atendimentos..."
                          value={observacoes}
                          onChange={(e) => setObservacoes(e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400 placeholder:text-text-muted"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-rose-600 hover:bg-rose-800 disabled:bg-rose-400 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
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
                      const dateObj = new Date(atend.data + 'T12:00:00'); // Prevent timezone offset
                      const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
                      const isFalta = atend.tipo === 'falta';

                      return (
                        <div key={atend.id} className="relative group">
                          {/* Dot indicator */}
                          <div className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 bg-white transition-colors
                            ${isFalta ? 'border-red-400 group-hover:bg-red-500' : 'border-rose-400 group-hover:bg-rose-600'}`}
                          />

                          <div className={`border p-4 rounded-xl transition-all max-w-2xl
                            ${isFalta
                              ? 'bg-red-50/30 hover:bg-red-50/60 border-red-200'
                              : 'bg-bg/15 hover:bg-bg/40 border-border'}`}
                          >
                            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1">
                                <Clock className={`w-3 h-3 ${isFalta ? 'text-red-400' : 'text-rose-400'}`} />
                                {formattedDate}
                                {isFalta ? (
                                  <span className="ml-2 bg-red-100 border border-red-200 text-red-700 text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase flex items-center gap-0.5">
                                    <UserX className="w-2.5 h-2.5" />
                                    Falta
                                  </span>
                                ) : atend.tipo === 'agendamento' ? (
                                  <span className="ml-2 bg-rose-50 border border-rose-100 text-rose-700 text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase">Agendado</span>
                                ) : (
                                  <span className="ml-2 bg-gray-50 border border-gray-150 text-gray-500 text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase">Manual</span>
                                )}
                              </span>
                              {!isFalta && (
                                <span className="text-sm font-bold text-rose-800 bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded-full">
                                  R$ {Number(atend.valor_cobrado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              )}
                            </div>

                            <h4 className={`text-sm font-bold flex items-center gap-1.5 ${isFalta ? 'text-red-800 line-through opacity-70' : 'text-text-primary'}`}>
                              {atend.servico_name}
                              {atend.variacao_name && (
                                <span className="text-[10px] bg-gold-light/40 text-gold border border-gold-light/60 px-1.5 py-0.5 rounded font-normal font-sans">
                                  {atend.variacao_name}
                                </span>
                              )}
                            </h4>

                            {isFalta && (
                              <p className="text-[11px] text-red-600 mt-1">Cliente não compareceu ao agendamento.</p>
                            )}

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
          <div className="bg-white rounded-[14px] border border-border shadow-xl w-full max-w-lg flex flex-col max-h-[calc(100vh-2rem)] overflow-hidden my-8 animate-slide-up">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-rose-50/10 flex-shrink-0">
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
            
            <form onSubmit={handleSaveAtendimento} className="p-6 space-y-5 overflow-y-auto flex-1">
              
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
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-800 disabled:bg-rose-400 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
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
