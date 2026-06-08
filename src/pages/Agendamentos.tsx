import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  CalendarDays,
  Search, 
  AlertCircle, 
  X, 
  Clock, 
  Coins, 
  Sparkles, 
  Users
} from 'lucide-react';
import type { 
  Agendamento, 
  Cliente, 
  Profissional, 
  Servico, 
  VariacaoServico,
  HorarioProfissional
} from '../types';

interface AgendamentoServicoInput {
  servico_id: string;
  variacao_id: string;
  nome: string;
  duracao: number;
  valor: number;
}

interface AgendamentoWithRelations extends Omit<Agendamento, 'cliente' | 'profissional'> {
  cliente?: { nome: string; sobrenome: string; whatsapp: string };
  profissional?: { nome: string; sobrenome: string };
  agendamento_servicos?: {
    valor_cobrado: number;
    servico?: { nome: string };
    variacao?: { nome: string };
  }[];
}

const DIAS_SEMANA = [
  { valor: 0, nome: 'Domingo', sigla: 'Dom' },
  { valor: 1, nome: 'Segunda-feira', sigla: 'Seg' },
  { valor: 2, nome: 'Terça-feira', sigla: 'Ter' },
  { valor: 3, nome: 'Quarta-feira', sigla: 'Qua' },
  { valor: 4, nome: 'Quinta-feira', sigla: 'Qui' },
  { valor: 5, nome: 'Sexta-feira', sigla: 'Sex' },
  { valor: 6, nome: 'Sábado', sigla: 'Sáb' }
];

export default function Agendamentos() {
  const [viewMode, setViewMode] = useState<'mensal' | 'semanal' | 'diaria'>('semanal');
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    // Start with today at 12:00 to avoid offset issues
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  });

  const [selectedProfId, setSelectedProfId] = useState<string>('todos');

  // Database Data States
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [activeProfissionaisWithHours, setActiveProfissionaisWithHours] = useState<(Profissional & { horarios_profissional?: HorarioProfissional[] })[]>([]);
  const [servicos, setServicos] = useState<(Servico & { variacoes_servico?: VariacaoServico[] })[]>([]);
  const [agendamentos, setAgendamentos] = useState<AgendamentoWithRelations[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form / Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Autocomplete search states
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [foundClientes, setFoundClientes] = useState<Cliente[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const clientInputRef = useRef<HTMLInputElement>(null);

  // New Appointment Fields
  const [formProfId, setFormProfId] = useState('');
  const [formData, setFormData] = useState('');
  const [formHora, setFormHora] = useState('09:00');
  const [formDuracao, setFormDuracao] = useState(30);
  const [formObs, setFormObs] = useState('');
  
  // Selected services in the form
  const [selectedServices, setSelectedServices] = useState<Record<string, AgendamentoServicoInput>>({});

  const showTemporaryError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 6000);
  };

  const showTemporarySuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Fetch initial configuration data
  const fetchSetupData = async () => {
    try {
      // 1. Fetch professionals with schedules
      const { data: profs, error: profsErr } = await supabase
        .from('profissionais')
        .select('*, horarios_profissional(*)')
        .eq('ativo', true)
        .order('nome');
      if (profsErr) throw profsErr;
      setProfissionais(profs || []);
      setActiveProfissionaisWithHours(profs || []);

      // 2. Fetch services with variations
      const { data: srvs, error: srvsErr } = await supabase
        .from('servicos')
        .select('*, variacoes_servico(*)')
        .eq('ativo', true)
        .order('nome');
      if (srvsErr) throw srvsErr;
      setServicos(srvs || []);
    } catch (err) {
      console.error('Erro de setup:', err);
      showTemporaryError('Falha ao carregar catálogo de serviços ou profissionais.');
    }
  };

  // Fetch appointments
  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          *,
          cliente:clientes(nome, sobrenome, whatsapp),
          profissional:profissionais(nome, sobrenome),
          agendamento_servicos(
            valor_cobrado,
            servico:servicos(nome),
            variacao:variacoes_servico(nome)
          )
        `)
        .neq('status', 'cancelado'); // Hide cancelled ones on calendar

      if (error) throw error;
      setAgendamentos(data || []);
    } catch (err) {
      console.error('Erro ao buscar agendamentos:', err);
      showTemporaryError('Erro ao carregar calendário.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSetupData();
    fetchAppointments();
  }, []);

  // CLIENT AUTOCOMPLETE SEARCH
  useEffect(() => {
    const searchClients = async () => {
      if (clientSearchQuery.trim().length < 2) {
        setFoundClientes([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('clientes')
          .select('*')
          .eq('ativo', true)
          .or(`nome.ilike.%${clientSearchQuery}%,sobrenome.ilike.%${clientSearchQuery}%,whatsapp.like.%${clientSearchQuery}%`)
          .limit(5);

        if (error) throw error;
        setFoundClientes(data || []);
      } catch (err) {
        console.error(err);
      }
    };

    const delayDebounce = setTimeout(() => {
      searchClients();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [clientSearchQuery]);

  // Log audit action helper
  const logAction = async (acao: 'criou' | 'editou' | 'excluiu', entidade: string, entidadeId: string, descricao: string) => {
    try {
      await supabase.from('logs').insert({
        usuario_nome: 'Dra. Amanda Rosa', // Mocked user
        acao,
        entidade,
        entidade_id: entidadeId,
        descricao
      });
    } catch (err) {
      console.error('Erro ao registrar log:', err);
    }
  };

  // Helper date functions
  const getStartOfWeek = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day; // day 0 = Sunday
    const start = new Date(date.setDate(diff));
    start.setHours(0, 0, 0, 0);
    return start;
  };

  const getDaysOfWeek = (d: Date) => {
    const start = getStartOfWeek(d);
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      day.setHours(12, 0, 0, 0); // Keep centered
      return day;
    });
  };

  const getDaysOfMonthGrid = (d: Date) => {
    const startMonth = new Date(d.getFullYear(), d.getMonth(), 1, 12, 0, 0, 0);
    const startDayOfWeek = startMonth.getDay(); // 0-6
    const gridStart = new Date(startMonth);
    gridStart.setDate(startMonth.getDate() - startDayOfWeek); // Backtrack to Sunday
    
    return Array.from({ length: 42 }, (_, i) => {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + i);
      day.setHours(12, 0, 0, 0);
      return day;
    });
  };

  // NAVEGACAO DE DATA
  const handleNavigateDate = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      setCurrentDate(today);
      return;
    }

    const value = direction === 'next' ? 1 : -1;
    const nextD = new Date(currentDate);

    if (viewMode === 'mensal') {
      nextD.setMonth(currentDate.getMonth() + value);
    } else if (viewMode === 'semanal') {
      nextD.setDate(currentDate.getDate() + value * 7);
    } else {
      nextD.setDate(currentDate.getDate() + value);
    }
    setCurrentDate(nextD);
  };

  // OPEN MODAL FOR NEW APPOINTMENT (FROM SLOT OR BUTTON)
  const handleOpenForm = (date?: Date, hourStr?: string, profId?: string) => {
    setSelectedCliente(null);
    setClientSearchQuery('');
    setFormObs('');
    setSelectedServices({});
    setFormDuracao(0);

    const activeProfs = profissionais.filter(p => p.ativo);
    setFormProfId(profId || (activeProfs.length > 0 ? activeProfs[0].id : ''));

    if (date) {
      setFormData(date.toISOString().split('T')[0]);
    } else {
      setFormData(new Date().toISOString().split('T')[0]);
    }

    if (hourStr) {
      setFormHora(hourStr);
    } else {
      setFormHora('09:00');
    }

    setIsModalOpen(true);
  };

  // FORM SERVICE CHECKBOX LOGIC
  const handleToggleServiceCheckbox = (serv: Servico & { variacoes_servico?: VariacaoServico[] }, checked: boolean) => {
    const updated = { ...selectedServices };

    if (checked) {
      const hasVars = serv.variacoes_servico && serv.variacoes_servico.length > 0;
      const firstVar = hasVars ? serv.variacoes_servico![0] : null;

      updated[serv.id] = {
        servico_id: serv.id,
        variacao_id: firstVar ? firstVar.id : '',
        nome: serv.nome,
        duracao: serv.duracao_minutos,
        valor: firstVar ? Number(firstVar.valor) : Number(serv.valor_padrao)
      };
    } else {
      delete updated[serv.id];
    }

    setSelectedServices(updated);
    recalculateDurationAndValues(updated);
  };

  const handleFormVariationChange = (servId: string, variationId: string) => {
    const service = servicos.find(s => s.id === servId);
    if (!service || !service.variacoes_servico) return;

    const variation = service.variacoes_servico.find(v => v.id === variationId);
    if (!variation) return;

    const updated = {
      ...selectedServices,
      [servId]: {
        ...selectedServices[servId],
        variacao_id: variationId,
        valor: Number(variation.valor)
      }
    };
    setSelectedServices(updated);
  };

  const handleServicePriceChange = (servId: string, val: number) => {
    const updated = {
      ...selectedServices,
      [servId]: {
        ...selectedServices[servId],
        valor: val
      }
    };
    setSelectedServices(updated);
  };

  const recalculateDurationAndValues = (servicesMap: Record<string, AgendamentoServicoInput>) => {
    const totalD = Object.values(servicesMap).reduce((sum, s) => sum + s.duracao, 0);
    setFormDuracao(totalD);
  };

  // SAVE NEW APPOINTMENT WITH CONFLICT CHECKS
  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCliente) {
      showTemporaryError('Você deve selecionar um cliente cadastrado.');
      return;
    }

    if (!formProfId) {
      showTemporaryError('Por favor, selecione um profissional.');
      return;
    }

    const servicesList = Object.values(selectedServices);
    if (servicesList.length === 0) {
      showTemporaryError('Selecione pelo menos 1 serviço.');
      return;
    }

    if (formDuracao <= 0) {
      showTemporaryError('A duração total deve ser maior que 0 minutos.');
      return;
    }

    setSaving(true);
    try {
      // 1. Calculate time coordinates
      const startDateTime = new Date(`${formData}T${formHora}:00`);
      const endDateTime = new Date(startDateTime.getTime() + formDuracao * 60000);

      const dayOfWeek = startDateTime.getDay();
      const startHourStr = startDateTime.toLocaleTimeString('pt-BR', { hour12: false });
      const endHourStr = endDateTime.toLocaleTimeString('pt-BR', { hour12: false });

      // 2. Expediente check: query horarios_profissional
      const { data: workHours, error: whError } = await supabase
        .from('horarios_profissional')
        .select('*')
        .eq('profissional_id', formProfId)
        .eq('dia_semana', dayOfWeek);

      if (whError) throw whError;

      if (!workHours || workHours.length === 0) {
        showTemporaryError('O profissional não atende no dia selecionado.');
        setSaving(false);
        return;
      }

      // Check if start and end fall inside work hours
      const professionalSched = workHours[0];
      if (startHourStr < professionalSched.hora_inicio || endHourStr > professionalSched.hora_fim) {
        showTemporaryError(`Horário fora do expediente da profissional (${professionalSched.hora_inicio.substring(0, 5)} - ${professionalSched.hora_fim.substring(0, 5)}).`);
        setSaving(false);
        return;
      }

      // 3. Overlap check for professional
      const { data: profAppts, error: profApptsErr } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('profissional_id', formProfId)
        .neq('status', 'cancelado')
        .gte('data_hora', `${formData}T00:00:00Z`)
        .lte('data_hora', `${formData}T23:59:59Z`);

      if (profApptsErr) throw profApptsErr;

      const profConflict = (profAppts || []).some(appt => {
        const apptStart = new Date(appt.data_hora);
        const apptEnd = new Date(apptStart.getTime() + appt.duracao_minutos * 60000);
        return startDateTime < apptEnd && endDateTime > apptStart;
      });

      if (profConflict) {
        showTemporaryError('Este profissional já possui outro agendamento neste mesmo horário.');
        setSaving(false);
        return;
      }

      // 4. Overlap check for client
      const { data: clientAppts, error: clientApptsErr } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('cliente_id', selectedCliente.id)
        .neq('status', 'cancelado')
        .gte('data_hora', `${formData}T00:00:00Z`)
        .lte('data_hora', `${formData}T23:59:59Z`);

      if (clientApptsErr) throw clientApptsErr;

      const clientConflict = (clientAppts || []).some(appt => {
        const apptStart = new Date(appt.data_hora);
        const apptEnd = new Date(apptStart.getTime() + appt.duracao_minutos * 60000);
        return startDateTime < apptEnd && endDateTime > apptStart;
      });

      if (clientConflict) {
        showTemporaryError('Esta cliente já possui outro agendamento conflitante neste mesmo horário.');
        setSaving(false);
        return;
      }

      // 5. Inserir Agendamento (Header)
      const { data: apptResult, error: apptError } = await supabase
        .from('agendamentos')
        .insert({
          cliente_id: selectedCliente.id,
          profissional_id: formProfId,
          data_hora: startDateTime.toISOString(),
          duracao_minutos: formDuracao,
          status: 'confirmado',
          observacoes: formObs.trim() || null
        })
        .select()
        .single();

      if (apptError) throw apptError;
      if (!apptResult) throw new Error('Falha ao inserir cabeçalho do agendamento.');

      // 6. Inserir Agendamento Serviços
      const relPayloads = servicesList.map(s => ({
        agendamento_id: apptResult.id,
        servico_id: s.servico_id,
        variacao_id: s.variacao_id || null,
        valor_cobrado: s.valor
      }));

      const { error: relError } = await supabase
        .from('agendamento_servicos')
        .insert(relPayloads);

      if (relError) throw relError;

      // Log activity
      const clientName = `${selectedCliente.nome} ${selectedCliente.sobrenome}`;
      const profObj = profissionais.find(p => p.id === formProfId);
      const profName = `${profObj?.nome} ${profObj?.sobrenome}`;
      await logAction('criou', 'agendamento', apptResult.id, `Criou agendamento para a cliente "${clientName}" com a profissional "${profName}"`);

      setIsModalOpen(false);
      showTemporarySuccess('Agendamento cadastrado com sucesso!');
      fetchAppointments();
    } catch (err) {
      console.error(err);
      showTemporaryError('Falha ao salvar agendamento.');
    } finally {
      setSaving(false);
    }
  };

  // Color mapper helper based on professional
  const getProfColorStyles = (profId: string) => {
    const idx = profissionais.findIndex(p => p.id === profId);
    const colors = [
      { border: 'border-rose-300', bg: 'bg-rose-50/95 hover:bg-rose-100 text-rose-800', badge: 'bg-rose-200 text-rose-900', text: 'text-rose-900' },
      { border: 'border-amber-300', bg: 'bg-amber-50/95 hover:bg-amber-100 text-amber-800', badge: 'bg-amber-200 text-amber-900', text: 'text-amber-900' },
      { border: 'border-teal-300', bg: 'bg-teal-50/95 hover:bg-teal-100 text-teal-800', badge: 'bg-teal-200 text-teal-900', text: 'text-teal-900' },
      { border: 'border-sky-300', bg: 'bg-sky-50/95 hover:bg-sky-100 text-sky-800', badge: 'bg-sky-200 text-sky-900', text: 'text-sky-900' },
      { border: 'border-indigo-300', bg: 'bg-indigo-50/95 hover:bg-indigo-100 text-indigo-800', badge: 'bg-indigo-200 text-indigo-900', text: 'text-indigo-900' },
      { border: 'border-purple-300', bg: 'bg-purple-50/95 hover:bg-purple-100 text-purple-800', badge: 'bg-purple-200 text-purple-900', text: 'text-purple-900' }
    ];
    return colors[idx === -1 ? 0 : idx % colors.length];
  };

  // CALENDAR CALCULATION UTILITIES
  const startHour = 8;
  const endHour = 20;
  const hourSlots = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);

  // Checks if a professional works on a given day/hour
  const isProfessionalAvailable = (profId: string, date: Date, hour: number) => {
    const prof = activeProfissionaisWithHours.find(p => p.id === profId);
    if (!prof || !prof.horarios_profissional) return false;

    const dayOfWeek = date.getDay();
    const sched = prof.horarios_profissional.find(h => h.dia_semana === dayOfWeek);
    if (!sched) return false;

    const hourStr = `${hour.toString().padStart(2, '0')}:00:00`;
    return hourStr >= sched.hora_inicio && hourStr < sched.hora_fim;
  };

  // Checks if clinic has any professional working at a given day/hour (if "Todos" is selected)
  const isAnyProfessionalAvailable = (date: Date, hour: number) => {
    return activeProfissionaisWithHours.some(prof => isProfessionalAvailable(prof.id, date, hour));
  };

  // Filtered list of appointments to render
  const visibleAppointments = agendamentos.filter(appt => {
    if (selectedProfId !== 'todos' && appt.profissional_id !== selectedProfId) return false;
    return true;
  });

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

      {/* Control Header Box */}
      <div className="bg-white border border-border rounded-[14px] p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Title & Navigation */}
          <div className="flex items-center gap-4">
            <h2 className="font-title font-semibold text-2xl text-text-primary">Agendamentos</h2>
            
            {/* Date Navigation */}
            <div className="flex items-center bg-bg rounded-lg p-0.5 border border-border/40">
              <button 
                onClick={() => handleNavigateDate('prev')}
                className="p-1.5 hover:bg-white hover:text-rose-600 rounded-md transition-all text-text-secondary cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleNavigateDate('today')}
                className="px-3 py-1 text-xs font-semibold hover:bg-white hover:text-rose-600 rounded-md transition-all text-text-secondary cursor-pointer"
              >
                Hoje
              </button>
              <button 
                onClick={() => handleNavigateDate('next')}
                className="p-1.5 hover:bg-white hover:text-rose-600 rounded-md transition-all text-text-secondary cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Selected Date Label */}
            <span className="font-title font-medium text-lg text-text-primary">
              {viewMode === 'diaria' && currentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              {viewMode === 'semanal' && `Semana de ${getStartOfWeek(currentDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`}
              {viewMode === 'mensal' && currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
            </span>
          </div>

          {/* Filters, View Switcher & Add Button */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Professional select filter */}
            <div className="flex items-center gap-1.5 bg-bg/50 px-2 py-1 rounded-lg border border-border/60">
              <Users className="w-3.5 h-3.5 text-rose-600" />
              <select
                value={selectedProfId}
                onChange={(e) => setSelectedProfId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-text-primary border-none outline-none cursor-pointer py-1 pr-4"
              >
                <option value="todos">Todos os Profissionais</option>
                {profissionais.map(p => (
                  <option key={p.id} value={p.id}>{p.nome} {p.sobrenome}</option>
                ))}
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex bg-bg rounded-lg p-0.5 border border-border/40">
              {[
                { id: 'diaria', label: 'Dia' },
                { id: 'semanal', label: 'Semana' },
                { id: 'mensal', label: 'Mês' }
              ].map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setViewMode(mode.id as any)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${viewMode === mode.id
                    ? 'bg-white text-rose-600 shadow-sm border border-border/30'
                    : 'text-text-secondary hover:text-rose-600'}`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {/* Add Appointment Button */}
            <button
              onClick={() => handleOpenForm(currentDate)}
              className="flex items-center justify-center gap-1 px-3 py-2 bg-rose-600 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Novo Agendamento
            </button>
          </div>
        </div>
      </div>

      {/* CALENDAR BODY */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 text-text-secondary bg-surface border rounded-[14px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600 mb-2"></div>
          <p className="text-sm">Carregando calendário...</p>
        </div>
      ) : (
        /* VISUALIZAÇÃO SEMANAL */
        viewMode === 'semanal' && (
          <div className="bg-white border border-border rounded-[14px] overflow-hidden shadow-sm flex flex-col">
            {/* Grid Header (Days of week) */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border bg-rose-50/10 text-center">
              <div className="py-3 border-r border-border" /> {/* Corner spacer */}
              {getDaysOfWeek(currentDate).map(day => {
                const isToday = new Date().toDateString() === day.toDateString();
                return (
                  <div key={day.toISOString()} className={`py-3 border-r border-border flex flex-col items-center justify-center gap-0.5 last:border-r-0 ${isToday ? 'bg-rose-50/40' : ''}`}>
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">{DIAS_SEMANA[day.getDay()].sigla}</span>
                    <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold font-title ${isToday ? 'bg-rose-600 text-white shadow-sm' : 'text-text-primary'}`}>
                      {day.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Grid Body */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] h-[600px] overflow-y-auto relative bg-bg/5">
              
              {/* Hour slots labels column */}
              <div className="border-r border-border bg-white text-right pr-2 text-[10px] font-bold text-text-secondary select-none">
                {hourSlots.map(hour => (
                  <div key={hour} className="h-[50px] border-b border-border/50 pt-1 flex flex-col justify-between">
                    <span>{hour.toString().padStart(2, '0')}:00</span>
                    <span className="text-[8px] text-text-muted/60 font-normal">{hour.toString().padStart(2, '0')}:30</span>
                  </div>
                ))}
              </div>

              {/* Day Columns */}
              {getDaysOfWeek(currentDate).map(day => {
                const dayAppts = visibleAppointments.filter(appt => {
                  const apptDate = new Date(appt.data_hora);
                  return apptDate.toDateString() === day.toDateString();
                });

                return (
                  <div key={day.toISOString()} className="relative border-r border-border last:border-r-0 h-full group">
                    {/* Render grid slots */}
                    {hourSlots.map(hour => {
                      const isAvailable = selectedProfId === 'todos' 
                        ? isAnyProfessionalAvailable(day, hour)
                        : isProfessionalAvailable(selectedProfId, day, hour);

                      return (
                        <div 
                          key={hour}
                          onClick={() => isAvailable && handleOpenForm(day, `${hour.toString().padStart(2, '0')}:00`, selectedProfId === 'todos' ? '' : selectedProfId)}
                          className={`h-[50px] border-b border-border/50 transition-colors cursor-pointer flex items-center justify-center
                            ${isAvailable ? 'hover:bg-rose-50/30' : 'bg-gray-100/55 cursor-not-allowed text-text-muted/40 font-semibold text-[10px]'}`}
                          title={isAvailable ? 'Clique para agendar' : 'Horário indisponível / Fechado'}
                        >
                          {!isAvailable && '🔒'}
                        </div>
                      );
                    })}

                    {/* Render Appointments as Absolute Blocks */}
                    {dayAppts.map(appt => {
                      const apptDate = new Date(appt.data_hora);
                      const startHourVal = apptDate.getHours() + apptDate.getMinutes() / 60;
                      
                      // Calculate offset relative to 08:00
                      const top = (startHourVal - startHour) * 50;
                      const height = (appt.duracao_minutos / 60) * 50;

                      const colors = getProfColorStyles(appt.profissional_id);
                      
                      return (
                        <div
                          key={appt.id}
                          style={{ top: `${top}px`, height: `${height}px` }}
                          className={`absolute left-1.5 right-1.5 rounded-lg border px-2 py-1.5 text-[10px] flex flex-col justify-between overflow-hidden shadow-sm cursor-pointer z-10 ${colors.border} ${colors.bg}`}
                          title={`${appt.cliente?.nome} ${appt.cliente?.sobrenome} - ${appt.agendamento_servicos?.map(s => s.servico?.nome).join(', ')}`}
                        >
                          <div>
                            <p className="font-bold truncate leading-tight">{appt.cliente?.nome} {appt.cliente?.sobrenome}</p>
                            <p className="text-[9px] text-text-secondary truncate mt-0.5">
                              {appt.agendamento_servicos?.map(s => s.servico?.nome).join(', ')}
                            </p>
                          </div>
                          <div className="flex items-center justify-between border-t border-black/5 pt-0.5 mt-0.5 text-[8px] font-semibold opacity-80">
                            <span>🕒 {apptDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                            <span className="truncate max-w-[50px]">👤 {appt.profissional?.nome}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}

      {/* VISUALIZAÇÃO DIÁRIA */}
      {!loading && viewMode === 'diaria' && (
        <div className="bg-white border border-border rounded-[14px] overflow-hidden shadow-sm flex flex-col">
          {/* Header columns */}
          <div className="grid grid-cols-[60px_1fr] border-b border-border bg-rose-50/10 text-center">
            <div className="py-3 border-r border-border" />
            <div className="py-3 flex items-center justify-center gap-1.5 font-title font-semibold text-lg text-text-primary">
              <CalendarDays className="w-5 h-5 text-rose-600" />
              {currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).toUpperCase()}
            </div>
          </div>

          {/* Body */}
          <div className="grid grid-cols-[60px_1fr] h-[550px] overflow-y-auto relative bg-bg/5">
            {/* Hours */}
            <div className="border-r border-border bg-white text-right pr-2 text-[10px] font-bold text-text-secondary select-none">
              {hourSlots.map(hour => (
                <div key={hour} className="h-[50px] border-b border-border/50 pt-1 flex flex-col justify-between">
                  <span>{hour.toString().padStart(2, '0')}:00</span>
                  <span className="text-[8px] text-text-muted/60 font-normal">{hour.toString().padStart(2, '0')}:30</span>
                </div>
              ))}
            </div>

            {/* Time Grid with appointments */}
            <div className="relative h-full">
              {hourSlots.map(hour => {
                const isAvailable = selectedProfId === 'todos' 
                  ? isAnyProfessionalAvailable(currentDate, hour)
                  : isProfessionalAvailable(selectedProfId, currentDate, hour);

                return (
                  <div 
                    key={hour}
                    onClick={() => isAvailable && handleOpenForm(currentDate, `${hour.toString().padStart(2, '0')}:00`, selectedProfId === 'todos' ? '' : selectedProfId)}
                    className={`h-[50px] border-b border-border/50 transition-colors cursor-pointer flex items-center justify-center
                      ${isAvailable ? 'hover:bg-rose-50/30' : 'bg-gray-100/55 cursor-not-allowed text-text-muted/40'}`}
                  >
                    {!isAvailable && '🔒 Indisponível'}
                  </div>
                );
              })}

              {/* Render Appointments */}
              {visibleAppointments
                .filter(appt => new Date(appt.data_hora).toDateString() === currentDate.toDateString())
                .map(appt => {
                  const apptDate = new Date(appt.data_hora);
                  const startHourVal = apptDate.getHours() + apptDate.getMinutes() / 60;
                  const top = (startHourVal - startHour) * 50;
                  const height = (appt.duracao_minutos / 60) * 50;

                  const colors = getProfColorStyles(appt.profissional_id);

                  return (
                    <div
                      key={appt.id}
                      style={{ top: `${top}px`, height: `${height}px` }}
                      className={`absolute left-3 right-3 rounded-lg border px-3 py-2 flex flex-col justify-between shadow-sm cursor-pointer z-10 ${colors.border} ${colors.bg}`}
                      title={`${appt.cliente?.nome} ${appt.cliente?.sobrenome}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-sm text-text-primary leading-snug">
                            {appt.cliente?.nome} {appt.cliente?.sobrenome} 
                            <span className="text-xs font-normal text-text-secondary ml-2">({appt.cliente?.whatsapp})</span>
                          </p>
                          <p className="text-xs text-text-secondary mt-0.5">
                            {appt.agendamento_servicos?.map(s => s.servico?.nome).join(', ')}
                            {appt.observacoes && <span className="text-text-muted italic block mt-0.5 text-[10px]">"{appt.observacoes}"</span>}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold bg-white/70 border border-black/10 px-2.5 py-0.5 rounded-full">
                          🕒 {apptDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ({appt.duracao_minutos} min)
                        </span>
                      </div>
                      <div className="border-t border-black/5 pt-1 mt-1 text-[10px] font-semibold text-text-secondary flex justify-between">
                        <span>Profissional: <span className="font-bold">{appt.profissional?.nome} {appt.profissional?.sobrenome}</span></span>
                        <span>Total: R$ {appt.agendamento_servicos?.reduce((sum, s) => sum + Number(s.valor_cobrado), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* VISUALIZAÇÃO MENSAL */}
      {!loading && viewMode === 'mensal' && (
        <div className="bg-white border border-border rounded-[14px] overflow-hidden shadow-sm flex flex-col">
          {/* Days labels */}
          <div className="grid grid-cols-7 border-b border-border bg-rose-50/10 text-center text-xs font-bold text-text-secondary py-3">
            {DIAS_SEMANA.map(d => (
              <span key={d.valor}>{d.nome}</span>
            ))}
          </div>

          {/* 42 days grid */}
          <div className="grid grid-cols-7 grid-rows-6 h-[550px] bg-bg/5 divide-x divide-y divide-border">
            {getDaysOfMonthGrid(currentDate).map((day, idx) => {
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const isToday = new Date().toDateString() === day.toDateString();
              
              const dayAppts = visibleAppointments.filter(appt => 
                new Date(appt.data_hora).toDateString() === day.toDateString()
              );

              return (
                <div 
                  key={idx}
                  onClick={() => handleOpenForm(day)}
                  className={`p-2 flex flex-col justify-between overflow-hidden cursor-pointer hover:bg-rose-50/20 transition-all ${isCurrentMonth ? 'bg-white' : 'bg-gray-50/40 text-text-muted/60'}`}
                >
                  <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold ${isToday ? 'bg-rose-600 text-white font-bold' : 'text-text-secondary'}`}>
                    {day.getDate()}
                  </span>

                  <div className="flex-1 overflow-y-auto space-y-1 mt-1.5">
                    {dayAppts.slice(0, 3).map(appt => {
                      const colors = getProfColorStyles(appt.profissional_id);
                      return (
                        <div 
                          key={appt.id} 
                          className={`px-1.5 py-0.5 rounded text-[8px] font-semibold border truncate ${colors.border} ${colors.bg}`}
                          title={`${appt.cliente?.nome}: ${appt.agendamento_servicos?.map(s => s.servico?.nome).join(', ')}`}
                        >
                          {new Date(appt.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {appt.cliente?.nome}
                        </div>
                      );
                    })}
                    {dayAppts.length > 3 && (
                      <div className="text-[8px] text-rose-600 font-bold text-center">
                        + {dayAppts.length - 3} mais
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* NEW APPOINTMENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-[14px] border border-border shadow-xl w-full max-w-lg overflow-hidden my-8 animate-slide-up">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-rose-50/10">
              <h4 className="font-title font-semibold text-lg text-text-primary flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-rose-600" />
                Agendar Novo Procedimento
              </h4>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-text-secondary hover:text-rose-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveAppointment} className="p-6 space-y-5">
              
              {/* Cliente Autocomplete Search */}
              <div className="space-y-1.5 relative">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex justify-between">
                  <span>Buscar Cliente *</span>
                  {selectedCliente && <span className="text-green-600">✓ Selecionada</span>}
                </label>

                {selectedCliente ? (
                  <div className="flex items-center justify-between bg-rose-50 border border-rose-200 rounded-lg p-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-rose-200 text-rose-800 flex items-center justify-center font-bold text-xs">
                        {selectedCliente.nome[0]}{selectedCliente.sobrenome[0]}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-text-primary">{selectedCliente.nome} {selectedCliente.sobrenome}</p>
                        <p className="text-[10px] text-text-secondary">Whats: {selectedCliente.whatsapp}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCliente(null)}
                      className="p-1 hover:bg-rose-100 rounded text-rose-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <input 
                        ref={clientInputRef}
                        type="text" 
                        required
                        placeholder="Nome ou WhatsApp do cliente..."
                        value={clientSearchQuery}
                        onChange={(e) => {
                          setClientSearchQuery(e.target.value);
                          setShowClientDropdown(true);
                        }}
                        onFocus={() => setShowClientDropdown(true)}
                        className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400 placeholder:text-text-muted"
                      />
                    </div>

                    {/* Autocomplete Dropdown List */}
                    {showClientDropdown && clientSearchQuery.trim().length >= 2 && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-border shadow-lg rounded-lg z-50 overflow-hidden mt-1 text-xs">
                        {foundClientes.length === 0 ? (
                          <div className="p-3 text-center text-text-muted italic">Nenhuma cliente ativa encontrada.</div>
                        ) : (
                          foundClientes.map(client => (
                            <div
                              key={client.id}
                              onClick={() => {
                                setSelectedCliente(client);
                                setShowClientDropdown(false);
                              }}
                              className="px-4 py-2.5 hover:bg-rose-50/50 cursor-pointer border-b border-border/40 last:border-0 flex items-center justify-between"
                            >
                              <div>
                                <p className="font-bold text-text-primary">{client.nome} {client.sobrenome}</p>
                                <p className="text-[10px] text-text-secondary">WhatsApp: {client.whatsapp}</p>
                              </div>
                              <span className="text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">Selecionar</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Profissional Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Profissional *
                </label>
                <select
                  required
                  value={formProfId}
                  onChange={(e) => setFormProfId(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400 cursor-pointer"
                >
                  <option value="" disabled>Selecione a profissional</option>
                  {profissionais.map(p => (
                    <option key={p.id} value={p.id}>{p.nome} {p.sobrenome}</option>
                  ))}
                </select>
              </div>

              {/* Data & Horário Início */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    Data *
                  </label>
                  <input 
                    type="date" 
                    required
                    value={formData}
                    onChange={(e) => setFormData(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    Hora de Início *
                  </label>
                  <input 
                    type="time" 
                    required
                    value={formHora}
                    onChange={(e) => setFormHora(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400"
                  />
                </div>
              </div>

              {/* Serviços Selection (Checkboxes List) */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block border-b border-border pb-1">
                  Selecione os Serviços *
                </label>
                <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                  {servicos.map(srv => {
                    const isChecked = !!selectedServices[srv.id];
                    return (
                      <div key={srv.id} className={`p-2.5 rounded-lg border transition-all ${isChecked ? 'bg-rose-50/15 border-rose-300' : 'bg-white border-border/60 hover:bg-bg/20'}`}>
                        <div className="flex items-center justify-between gap-3">
                          <label className="flex items-center gap-3 cursor-pointer flex-1">
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => handleToggleServiceCheckbox(srv, e.target.checked)}
                              className="w-4.5 h-4.5 accent-rose-600 cursor-pointer"
                            />
                            <div className="text-xs">
                              <p className="font-bold text-text-primary">{srv.nome}</p>
                              <p className="text-[10px] text-text-secondary mt-0.5">{srv.duracao_minutos} min • R$ {Number(srv.valor_padrao).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                          </label>

                          {/* Variation picker inside checkbox row */}
                          {isChecked && srv.variacoes_servico && srv.variacoes_servico.length > 0 && (
                            <select
                              value={selectedServices[srv.id].variacao_id}
                              onChange={(e) => handleFormVariationChange(srv.id, e.target.value)}
                              className="px-2 py-1 border border-border rounded text-[10px] bg-white text-text-primary cursor-pointer max-w-[130px] focus:outline-none"
                            >
                              {srv.variacoes_servico.map(v => (
                                <option key={v.id} value={v.id}>{v.nome}</option>
                              ))}
                            </select>
                          )}

                          {/* Editable price inside checkbox row */}
                          {isChecked && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-text-muted">R$</span>
                              <input 
                                type="number" 
                                step="0.01"
                                value={selectedServices[srv.id].valor}
                                onChange={(e) => handleServicePriceChange(srv.id, parseFloat(e.target.value) || 0)}
                                className="w-16 px-1.5 py-0.5 border border-border rounded text-[10px] text-right focus:outline-none focus:ring-1 focus:ring-rose-400"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Duração calculada & Valor Final Provisório */}
              <div className="grid grid-cols-2 gap-4 bg-rose-50/25 border border-rose-100 p-3 rounded-lg text-xs font-semibold text-text-primary">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-rose-600" />
                  <span>Duração:</span>
                  <input 
                    type="number"
                    min="1"
                    value={formDuracao}
                    onChange={(e) => setFormDuracao(parseInt(e.target.value) || 0)}
                    className="w-16 px-1.5 py-0.5 border border-border rounded bg-white font-bold text-center focus:outline-none focus:ring-1 focus:ring-rose-400"
                  />
                  <span>min</span>
                </div>
                
                <div className="flex items-center gap-2 justify-end">
                  <Coins className="w-4 h-4 text-rose-600" />
                  <span>Total sugerido:</span>
                  <span className="font-title font-semibold text-sm text-rose-800">
                    R$ {Object.values(selectedServices).reduce((sum, s) => sum + s.valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Observações
                </label>
                <textarea 
                  rows={2}
                  placeholder="Instruções especiais ou anotações..."
                  value={formObs}
                  onChange={(e) => setFormObs(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400 placeholder:text-text-muted"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
                  {saving ? 'Salvando...' : 'Criar Agendamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
