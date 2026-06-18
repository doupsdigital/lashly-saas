import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CalendarDays,
  Search,
  AlertCircle,
  X,
  Clock,
  Coins,
  Sparkles,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  UserX
} from 'lucide-react';
import type {
  Agendamento,
  Cliente,
  Servico,
  VariacaoServico,
  BloqueioAgenda,
} from '../types';
import { registrarLog } from '../utils/log';
import ConfirmModal from '../components/common/ConfirmModal';
import { useAuth } from '../contexts/AuthContext';

interface AgendamentoServicoInput {
  servico_id: string;
  variacao_id: string;
  nome: string;
  duracao: number;
  valor: number;
}

interface AgendamentoWithRelations extends Omit<Agendamento, 'cliente'> {
  cliente?: { id: string; nome: string; sobrenome: string; whatsapp: string };
  agendamento_servicos?: {
    servico_id: string;
    variacao_id: string | null;
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
  const { isProfissional, estabelecimentoId } = useAuth();
  const location = useLocation();
  const [viewMode, setViewMode] = useState<'mensal' | 'semanal' | 'diaria'>('mensal');
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  });

  // Database Data States
  const [workHoursConfig, setWorkHoursConfig] = useState<{ dia_semana: number; hora_inicio: string; hora_fim: string }[]>([]);
  const [servicos, setServicos] = useState<(Servico & { variacoes_servico?: VariacaoServico[] })[]>([]);
  const [agendamentos, setAgendamentos] = useState<AgendamentoWithRelations[]>([]);
  const [bloqueios, setBloqueios] = useState<BloqueioAgenda[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean;
    title: string;
    clientName: string;
    services: string;
    dateStr: string;
    timeStr: string;
    whatsappLink?: string;
  } | null>(null);

  // Form / Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Conclude Modal States
  const [concludeAppt, setConcludeAppt] = useState<AgendamentoWithRelations | null>(null);
  const [concludeUseCustom, setConcludeUseCustom] = useState(false);
  const [concludeCustomValue, setConcludeCustomValue] = useState(0);
  const [concludeSaving, setConcludeSaving] = useState(false);

  // Confirm Modal States
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    title: string;
    description: string;
    warningText?: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'success';
    onConfirm: () => void;
  } | null>(null);

  const openConfirmModal = (config: typeof confirmModalConfig) => {
    setConfirmModalConfig(config);
    setConfirmModalOpen(true);
  };

  // Selected entities for editing/viewing details
  const [selectedAppt, setSelectedAppt] = useState<AgendamentoWithRelations | null>(null);
  const [editingAppt, setEditingAppt] = useState<AgendamentoWithRelations | null>(null);

  // Autocomplete search states
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [foundClientes, setFoundClientes] = useState<Cliente[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const clientInputRef = useRef<HTMLInputElement>(null);

  // Form Fields
  const [formData, setFormData] = useState('');
  const [formHora, setFormHora] = useState('09:00');
  const [formDuracao, setFormDuracao] = useState(30);
  const [formObs, setFormObs] = useState('');

  const [pendingOpen, setPendingOpen] = useState(() => !!(location.state as { openPending?: boolean })?.openPending);

  const [rejectModalAppt, setRejectModalAppt] = useState<AgendamentoWithRelations | null>(null);
  const [rejectMotivo, setRejectMotivo] = useState('');
  const [rejectSaving, setRejectSaving] = useState(false);

  const [approveModalAppt, setApproveModalAppt] = useState<AgendamentoWithRelations | null>(null);
  const [approveSaving, setApproveSaving] = useState(false);
  
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

  const showSuccessFeedback = (appt: { data_hora: string; cliente?: { nome: string; sobrenome?: string | null; whatsapp?: string | null } | null; agendamento_servicos?: { servico?: { nome: string } }[] }, isNew: boolean) => {
    const clientName = appt.cliente ? `${appt.cliente.nome} ${appt.cliente.sobrenome || ''}`.trim() : 'Cliente';
    const dateObj = new Date(appt.data_hora);
    const dateStr = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const servicesList = appt.agendamento_servicos?.map(s => s.servico?.nome).join(', ') || 'Procedimento';

    // Format phone for WhatsApp: only numbers
    const phoneDigits = appt.cliente?.whatsapp ? appt.cliente.whatsapp.replace(/\D/g, '') : '';
    
    // Construct WhatsApp message
    const message = `Olá, ${appt.cliente?.nome || 'cliente'}! Seu agendamento para *${servicesList}* no dia *${dateStr}* às *${timeStr}* está confirmado. Te aguardamos! 💖`;
    const whatsappLink = phoneDigits ? `https://wa.me/55${phoneDigits}?text=${encodeURIComponent(message)}` : undefined;

    setSuccessModal({
      isOpen: true,
      title: isNew ? 'Agendamento Cadastrado!' : 'Agendamento Confirmado!',
      clientName,
      services: servicesList,
      dateStr,
      timeStr,
      whatsappLink
    });
  };

  // Fetch initial configuration data
  const fetchSetupData = async () => {
    if (!estabelecimentoId) return;
    try {
      const [horariosRes, srvsRes, bloqRes] = await Promise.all([
        supabase.from('horarios_atendimento').select('dia_semana, hora_inicio, hora_fim').eq('estabelecimento_id', estabelecimentoId),
        supabase.from('servicos').select('*, variacoes_servico(*)').eq('ativo', true).eq('estabelecimento_id', estabelecimentoId).order('nome'),
        supabase.from('bloqueios_agenda').select('*').eq('estabelecimento_id', estabelecimentoId)
      ]);
      if (horariosRes.error) throw horariosRes.error;
      if (srvsRes.error) throw srvsRes.error;
      if (bloqRes.error) throw bloqRes.error;
      setWorkHoursConfig(horariosRes.data || []);
      setServicos(srvsRes.data || []);
      setBloqueios(bloqRes.data || []);
    } catch (err) {
      console.error('Erro de setup:', err);
      showTemporaryError('Falha ao carregar catálogo de serviços.');
    }
  };

  // Fetch appointments (including cancelled ones now)
  const fetchAppointments = async () => {
    if (!estabelecimentoId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          *,
          cliente:clientes(id, nome, sobrenome, whatsapp),
          agendamento_servicos(
            servico_id,
            variacao_id,
            valor_cobrado,
            servico:servicos(nome),
            variacao:variacoes_servico(nome)
          )
        `)
        .eq('estabelecimento_id', estabelecimentoId);

      if (error) throw error;
      setAgendamentos(data || []);
      
      // Update currently viewed detail if it is open (so status or services update on screen)
      if (selectedAppt) {
        const updated = (data || []).find(a => a.id === selectedAppt.id);
        if (updated) {
          setSelectedAppt(updated);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar agendamentos:', err);
      showTemporaryError('Erro ao carregar calendário.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (estabelecimentoId) {
      fetchSetupData();
      fetchAppointments();
    }
  }, [estabelecimentoId]);

  // CLIENT AUTOCOMPLETE SEARCH
  useEffect(() => {
    const searchClients = async () => {
      if (clientSearchQuery.trim().length < 2) {
        setFoundClientes([]);
        return;
      }
      if (!estabelecimentoId) return;

      try {
        const { data, error } = await supabase
          .from('clientes')
          .select('*')
          .eq('estabelecimento_id', estabelecimentoId)
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
  }, [clientSearchQuery, estabelecimentoId]);



  // Date helper functions
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
      day.setHours(12, 0, 0, 0);
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

  // DATE NAVIGATION
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
  const handleOpenForm = (date?: Date, hourStr?: string) => {
    setEditingAppt(null);
    setSelectedCliente(null);
    setClientSearchQuery('');
    setFormObs('');
    setSelectedServices({});
    setFormDuracao(0);
    
    const targetDate = date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    setFormData(targetDate);

    if (hourStr) {
      setFormHora(hourStr);
    } else {
      const selectedDay = date || new Date();
      const dayOfWeek = selectedDay.getDay();
      const sched = workHoursConfig.find(h => h.dia_semana === dayOfWeek);
      if (sched) {
        setFormHora(sched.hora_inicio.substring(0, 5));
      } else {
        setFormHora('09:00');
      }
    }
    setIsModalOpen(true);
  };

  const handleDateChange = (newDateStr: string) => {
    setFormData(newDateStr);
    const dateObj = new Date(`${newDateStr}T12:00:00`);
    const dayOfWeek = dateObj.getDay();
    const sched = workHoursConfig.find(h => h.dia_semana === dayOfWeek);
    if (sched) {
      setFormHora(sched.hora_inicio.substring(0, 5));
    } else {
      setFormHora('09:00');
    }
  };

  // OPEN EDIT FORM
  const handleOpenEditForm = (appt: AgendamentoWithRelations) => {
    setIsDetailOpen(false);
    setEditingAppt(appt);

    // Populate Client
    if (appt.cliente) {
      setSelectedCliente({
        id: appt.cliente.id,
        nome: appt.cliente.nome,
        sobrenome: appt.cliente.sobrenome,
        whatsapp: appt.cliente.whatsapp,
        ativo: true,
        gestante: false
      } as Cliente);
    }

    setFormObs(appt.observacoes || '');
    setFormDuracao(appt.duracao_minutos);

    const dateObj = new Date(appt.data_hora);
    setFormData(dateObj.toISOString().split('T')[0]);
    
    const h = dateObj.getHours().toString().padStart(2, '0');
    const m = dateObj.getMinutes().toString().padStart(2, '0');
    setFormHora(`${h}:${m}`);

    // Populate Services record map
    const servicesMap: Record<string, AgendamentoServicoInput> = {};
    if (appt.agendamento_servicos) {
      appt.agendamento_servicos.forEach(as => {
        const fullSrv = servicos.find(s => s.id === as.servico_id);
        servicesMap[as.servico_id] = {
          servico_id: as.servico_id,
          variacao_id: as.variacao_id || '',
          nome: as.servico?.nome || fullSrv?.nome || '',
          duracao: fullSrv?.duracao_minutos || 30,
          valor: Number(as.valor_cobrado)
        };
      });
    }
    setSelectedServices(servicesMap);
    setIsModalOpen(true);
  };

  // OPEN DETAILS MODAL
  const handleOpenDetail = (appt: AgendamentoWithRelations) => {
    setSelectedAppt(appt);
    setIsDetailOpen(true);
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
        valor: firstVar ? Number(firstVar.valor) : Number(serv.valor)
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

  // SAVE APPOINTMENT (CREATE OR EDIT)
  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCliente) {
      showTemporaryError('Você deve selecionar um cliente cadastrado.');
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

      // Check if the date falls in a blocked period (full day or overlapping time slot)
      const isBlocked = bloqueios.some(b => {
        if (formData >= b.data_inicio && formData <= b.data_fim) {
          if (b.dia_inteiro !== false) {
            return true; // full day block
          }
          if (b.hora_inicio && b.hora_fim) {
            return startHourStr < b.hora_fim && endHourStr > b.hora_inicio; // hourly overlap
          }
        }
        return false;
      });

      if (isBlocked) {
        showTemporaryError('O horário ou dia selecionado está bloqueado.');
        setSaving(false);
        return;
      }

      // 2. Expediente check: consult global horarios_atendimento (skip if not configured)
      if (workHoursConfig.length > 0) {
        const daySched = workHoursConfig.find(h => h.dia_semana === dayOfWeek);
        if (!daySched) {
          showTemporaryError('Não há atendimento configurado para o dia selecionado.');
          setSaving(false);
          return;
        }
        if (startHourStr < daySched.hora_inicio || endHourStr > daySched.hora_fim) {
          showTemporaryError(`Horário fora do expediente (${daySched.hora_inicio.substring(0, 5)} - ${daySched.hora_fim.substring(0, 5)}).`);
          setSaving(false);
          return;
        }
      }

      // 3. Overlap check against global agenda (excluding itself if editing)
      let agendaQuery = supabase
        .from('agendamentos')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .neq('status', 'cancelado')
        .gte('data_hora', `${formData}T00:00:00Z`)
        .lte('data_hora', `${formData}T23:59:59Z`);

      if (editingAppt) {
        agendaQuery = agendaQuery.neq('id', editingAppt.id);
      }

      const { data: agendaAppts, error: agendaErr } = await agendaQuery;
      if (agendaErr) throw agendaErr;

      const agendaConflict = (agendaAppts || []).some(appt => {
        const apptStart = new Date(appt.data_hora);
        const apptEnd = new Date(apptStart.getTime() + appt.duracao_minutos * 60000);
        return startDateTime < apptEnd && endDateTime > apptStart;
      });

      if (agendaConflict) {
        showTemporaryError('Já existe outro agendamento neste mesmo horário.');
        setSaving(false);
        return;
      }

      let apptId = '';
      const clientName = `${selectedCliente.nome} ${selectedCliente.sobrenome}`;

      if (editingAppt) {
        const { error } = await supabase
          .from('agendamentos')
          .update({
            cliente_id: selectedCliente.id,
            data_hora: startDateTime.toISOString(),
            duracao_minutos: formDuracao,
            observacoes: formObs.trim() || null
          })
          .eq('id', editingAppt.id);

        if (error) throw error;
        apptId = editingAppt.id;

        await supabase.from('agendamento_servicos').delete().eq('agendamento_id', apptId);
        await registrarLog('editou', 'agendamento', apptId, `Editou agendamento de "${clientName}"`);
      } else {
        const { data: apptResult, error: apptError } = await supabase
          .from('agendamentos')
          .insert({
            estabelecimento_id: estabelecimentoId,
            cliente_id: selectedCliente.id,
            data_hora: startDateTime.toISOString(),
            duracao_minutos: formDuracao,
            status: 'confirmado',
            origem: 'admin',
            observacoes: formObs.trim() || null
          })
          .select()
          .single();

        if (apptError) throw apptError;
        if (!apptResult) throw new Error('Falha ao criar agendamento.');
        apptId = apptResult.id;

        await registrarLog('criou', 'agendamento', apptId, `Criou agendamento para "${clientName}"`);
      }

      // 5. Inserir Agendamento Serviços
      const relPayloads = servicesList.map(s => ({
        agendamento_id: apptId,
        servico_id: s.servico_id,
        variacao_id: s.variacao_id || null,
        valor_cobrado: s.valor
      }));

      const { error: relError } = await supabase
        .from('agendamento_servicos')
        .insert(relPayloads);

      if (relError) throw relError;

      setIsModalOpen(false);
      if (editingAppt) {
        showTemporarySuccess('Agendamento atualizado com sucesso!');
      } else {
        const client = selectedCliente;
        const apptDataForFeedback = {
          data_hora: startDateTime.toISOString(),
          cliente: client ? { nome: client.nome, sobrenome: client.sobrenome, whatsapp: client.whatsapp } : undefined,
          agendamento_servicos: servicesList.map(s => ({ servico: { nome: s.nome } }))
        };
        showSuccessFeedback(apptDataForFeedback, true);
      }
      fetchAppointments();
    } catch (err) {
      console.error(err);
      showTemporaryError('Falha ao salvar agendamento.');
    } finally {
      setSaving(false);
    }
  };

  const openWhatsApp = (appt: AgendamentoWithRelations, tipo: 'aprovado' | 'recusado', motivo?: string) => {
    const whatsapp = appt.cliente?.whatsapp;
    if (!whatsapp) return;
    const phone = '55' + whatsapp.replace(/\D/g, '');
    const apptDate = new Date(appt.data_hora);
    const dateStr = apptDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const timeStr = apptDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const servicos = appt.agendamento_servicos?.map(s => s.servico?.nome).filter(Boolean).join(', ') || '';
    const firstName = appt.cliente?.nome || 'cliente';
    let msg: string;
    if (tipo === 'aprovado') {
      msg = `Olá ${firstName}! 🎉 Seu agendamento foi *confirmado*!\n\n📅 *Data:* ${dateStr}\n🕐 *Horário:* ${timeStr}\n💆 *Serviço:* ${servicos}\n\nTe esperamos! 😊`;
    } else {
      const motivoLinha = motivo?.trim() ? `\n\n_${motivo.trim()}_` : '';
      msg = `Olá ${firstName}! Infelizmente precisamos recusar seu agendamento de *${dateStr} às ${timeStr}*.${motivoLinha}\n\nEntre em contato para reagendarmos. 💗`;
    }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleOpenRejectModal = (appt: AgendamentoWithRelations) => {
    setRejectMotivo('');
    setRejectModalAppt(appt);
  };

  const handleRejectConfirm = async (sendWhatsApp: boolean) => {
    if (!rejectModalAppt) return;
    setRejectSaving(true);
    const appt = rejectModalAppt;
    const clientName = appt.cliente ? `${appt.cliente.nome} ${appt.cliente.sobrenome}` : 'Cliente';
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({ status: 'cancelado' })
        .eq('id', appt.id);
      if (error) throw error;
      await registrarLog('editou', 'agendamento', appt.id, `Recusou agendamento de "${clientName}"`);
      setRejectModalAppt(null);
      setIsDetailOpen(false);
      fetchAppointments();
      if (sendWhatsApp) openWhatsApp(appt, 'recusado', rejectMotivo);
      const dateObj = new Date(appt.data_hora);
      setSuccessModal({
        isOpen: true,
        title: 'Agendamento Recusado',
        clientName: appt.cliente ? `${appt.cliente.nome} ${appt.cliente.sobrenome || ''}`.trim() : 'Cliente',
        services: appt.agendamento_servicos?.map(s => s.servico?.nome).join(', ') || '—',
        dateStr: dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
        timeStr: dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        whatsappLink: undefined,
      });
    } catch (err) {
      console.error(err);
      showTemporaryError('Falha ao recusar agendamento.');
    } finally {
      setRejectSaving(false);
    }
  };

  const handleOpenApproveModal = (appt: AgendamentoWithRelations) => {
    setApproveModalAppt(appt);
  };

  const handleApproveConfirm = async (sendWhatsApp: boolean) => {
    if (!approveModalAppt) return;
    setApproveSaving(true);
    const appt = approveModalAppt;
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({ status: 'confirmado' })
        .eq('id', appt.id);
      if (error) throw error;
      const clientName = appt.cliente ? `${appt.cliente.nome} ${appt.cliente.sobrenome}` : 'Cliente';
      await registrarLog('editou', 'agendamento', appt.id, `Confirmou agendamento de "${clientName}"`);
      setApproveModalAppt(null);
      setIsDetailOpen(false);
      showSuccessFeedback(appt, false);
      fetchAppointments();
      if (sendWhatsApp) openWhatsApp(appt, 'aprovado');
    } catch (err) {
      console.error(err);
      showTemporaryError('Falha ao confirmar agendamento.');
    } finally {
      setApproveSaving(false);
    }
  };

  // Open the conclude modal (instead of the generic confirm)
  const handleOpenConcludeModal = (appt: AgendamentoWithRelations) => {
    const total = appt.agendamento_servicos?.reduce((sum, s) => sum + Number(s.valor_cobrado || 0), 0) || 0;
    setConcludeAppt(appt);
    setConcludeUseCustom(false);
    setConcludeCustomValue(total);
    setConcludeSaving(false);
  };

  // Confirm conclusion: save status + valor_cobrado
  const handleConcludeConfirm = async () => {
    if (!concludeAppt) return;
    const appt = concludeAppt;
    const clientName = appt.cliente ? `${appt.cliente.nome} ${appt.cliente.sobrenome}` : 'Cliente';
    const totalServicos = appt.agendamento_servicos?.reduce((sum, s) => sum + Number(s.valor_cobrado || 0), 0) || 0;
    const valorFinal = concludeUseCustom ? concludeCustomValue : totalServicos;

    setConcludeSaving(true);
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({ status: 'concluido', valor_cobrado: valorFinal })
        .eq('id', appt.id);

      if (error) throw error;

      const desconto = concludeUseCustom ? ` com valor recebido de R$ ${valorFinal.toFixed(2)}` : '';
      await registrarLog(
        'editou',
        'agendamento',
        appt.id,
        `Concluiu atendimento de "${clientName}"${desconto}`
      );

      setConcludeAppt(null);
      setIsDetailOpen(false);
      showTemporarySuccess('Atendimento concluído com sucesso!');
      fetchAppointments();
    } catch (err) {
      console.error(err);
      showTemporaryError('Falha ao concluir atendimento.');
    } finally {
      setConcludeSaving(false);
    }
  };

  const handleChangeStatus = async (appt: AgendamentoWithRelations, newStatus: 'cancelado' | 'concluido') => {
    if (newStatus === 'concluido') {
      handleOpenConcludeModal(appt);
      return;
    }

    const clientName = appt.cliente ? `${appt.cliente.nome} ${appt.cliente.sobrenome}` : 'Cliente';
    
    openConfirmModal({
      title: 'Cancelar Agendamento?',
      description: `Tem certeza que deseja cancelar o agendamento de "${clientName}"?`,
      confirmText: 'Cancelar Agendamento',
      cancelText: 'Voltar',
      type: 'warning',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('agendamentos')
            .update({ status: newStatus })
            .eq('id', appt.id);

          if (error) throw error;

          await registrarLog(
            'editou',
            'agendamento',
            appt.id,
            `Alterou status do agendamento de "${clientName}" para "${newStatus}"`
          );

          setIsDetailOpen(false);
          showTemporarySuccess(`Agendamento cancelado!`);
          fetchAppointments();
          if (appt.status === 'pendente') openWhatsApp(appt, 'recusado');
        } catch (err) {
          console.error(err);
          showTemporaryError(`Falha ao alterar status do agendamento.`);
        }
      }
    });
  };

  const handleDeleteAppointment = async (appt: AgendamentoWithRelations) => {
    const clientName = appt.cliente ? `${appt.cliente.nome} ${appt.cliente.sobrenome}` : 'Cliente';
    
    openConfirmModal({
      title: 'Excluir Agendamento?',
      description: `Tem certeza que deseja excluir permanentemente o agendamento de "${clientName}"?`,
      warningText: 'Esta ação é permanente e não pode ser desfeita.',
      confirmText: 'Excluir',
      type: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('agendamentos')
            .delete()
            .eq('id', appt.id);

          if (error) throw error;

          await registrarLog('excluiu', 'agendamento', appt.id, `Excluiu permanentemente agendamento de "${clientName}"`);

          setIsDetailOpen(false);
          showTemporarySuccess('Agendamento excluído com sucesso!');
          fetchAppointments();
        } catch (err) {
          console.error(err);
          showTemporaryError('Falha ao excluir agendamento.');
        }
      }
    });
  };

  const handleMarkNoShow = (appt: AgendamentoWithRelations) => {
    const clientName = appt.cliente ? `${appt.cliente.nome} ${appt.cliente.sobrenome}` : 'Cliente';
    openConfirmModal({
      title: 'Registrar Falta?',
      description: `Confirma que "${clientName}" não compareceu ao agendamento sem aviso prévio?`,
      warningText: 'Esta falta será registrada no histórico da cliente.',
      confirmText: 'Registrar Falta',
      cancelText: 'Voltar',
      type: 'warning',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('agendamentos')
            .update({ status: 'falta' })
            .eq('id', appt.id);
          if (error) throw error;
          await registrarLog('editou', 'agendamento', appt.id, `Registrou falta de "${clientName}" no agendamento`);
          setIsDetailOpen(false);
          const dateObj = new Date(appt.data_hora);
          setSuccessModal({
            isOpen: true,
            title: 'Falta Registrada',
            clientName: appt.cliente ? `${appt.cliente.nome} ${appt.cliente.sobrenome || ''}`.trim() : 'Cliente',
            services: appt.agendamento_servicos?.map(s => s.servico?.nome).join(', ') || '—',
            dateStr: dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
            timeStr: dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            whatsappLink: undefined,
          });
          fetchAppointments();
        } catch (err) {
          console.error(err);
          showTemporaryError('Falha ao registrar falta.');
        }
      }
    });
  };

  // Visual status mapper for calendar blocks
  const getStatusColorStyles = (status: string = 'confirmado') => {
    switch (status) {
      case 'cancelado':
        return { border: 'border-gray-200', bg: 'bg-gray-100 hover:bg-gray-200 text-gray-400 line-through opacity-50', badge: 'bg-gray-200 text-gray-600', text: 'text-gray-500' };
      case 'concluido':
        return { border: 'border-emerald-300', bg: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800', badge: 'bg-emerald-200 text-emerald-950', text: 'text-emerald-900' };
      case 'pendente':
        return { border: 'border-amber-300', bg: 'bg-amber-50 hover:bg-amber-100 text-amber-800', badge: 'bg-amber-200 text-amber-900', text: 'text-amber-900' };
      case 'falta':
        return { border: 'border-red-400', bg: 'bg-red-50 hover:bg-red-100 text-red-800 opacity-70', badge: 'bg-red-200 text-red-900', text: 'text-red-900' };
      default: // confirmado
        return { border: 'border-rose-300', bg: 'bg-rose-50 hover:bg-rose-100 text-rose-800', badge: 'bg-rose-200 text-rose-900', text: 'text-rose-900' };
    }
  };

  // Calendar parameters
  const startHour = 8;
  const endHour = 20;
  const halfHourSlots = Array.from({ length: (endHour - startHour) * 2 }, (_, i) => ({
    hour: startHour + Math.floor(i / 2),
    minute: (i % 2) * 30,
  }));

  const formatDateStr = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Availability validation using global horarios_atendimento and bloqueios
  const isHourAvailable = (date: Date, hour: number, minute = 0) => {
    const ds = formatDateStr(date);

    const isFullDayBlocked = bloqueios.some(b => b.dia_inteiro !== false && ds >= b.data_inicio && ds <= b.data_fim);
    if (isFullDayBlocked) return false;

    const hh = hour.toString().padStart(2, '0');
    const mm = minute.toString().padStart(2, '0');
    const slotStrStart = `${hh}:${mm}:00`;
    const endTotal = hour * 60 + minute + 30;
    const slotStrEnd = `${Math.floor(endTotal / 60).toString().padStart(2, '0')}:${(endTotal % 60).toString().padStart(2, '0')}:00`;

    const isSlotBlocked = bloqueios.some(b => {
      if (b.dia_inteiro === false && b.hora_inicio && b.hora_fim && ds >= b.data_inicio && ds <= b.data_fim) {
        return slotStrStart < b.hora_fim && slotStrEnd > b.hora_inicio;
      }
      return false;
    });
    if (isSlotBlocked) return false;

    if (workHoursConfig.length === 0) return true;
    const dayOfWeek = date.getDay();
    const sched = workHoursConfig.find(h => h.dia_semana === dayOfWeek);
    if (!sched) return false;
    return slotStrStart >= sched.hora_inicio && slotStrStart < sched.hora_fim;
  };

  const visibleAppointments = agendamentos;
  const pendingAppts = agendamentos
    .filter(a => a.status === 'pendente')
    .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());

  useEffect(() => {
    if (pendingAppts.length > 0) setPendingOpen(true);
    else setPendingOpen(false);
  }, [pendingAppts.length]);

  return (
    <div className="space-y-6">
      {/* Floating Toasts */}
      {errorMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-lg px-4 pointer-events-none">
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-3 shadow-lg animate-fade-in pointer-events-auto">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
            <p className="text-sm font-medium">{errorMessage}</p>
          </div>
        </div>
      )}
      {successMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-lg px-4 pointer-events-none">
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-3 shadow-lg animate-fade-in pointer-events-auto">
            <Sparkles className="w-5 h-5 flex-shrink-0 text-green-600" />
            <p className="text-sm font-medium">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Control Header Box */}
      <div className="bg-white border border-border rounded-[14px] p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Title & Navigation */}
          <div className="flex items-center gap-4">
            <h2 className="font-title font-semibold text-2xl text-text-primary">Agendamentos</h2>
            
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

            <span className="font-title font-medium text-lg text-text-primary">
              {viewMode === 'diaria' && currentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              {viewMode === 'semanal' && `Semana de ${getStartOfWeek(currentDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`}
              {viewMode === 'mensal' && currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
            </span>
          </div>

          {/* Filters & Actions */}
          <div className="flex flex-wrap items-center gap-3">

            {/* View switcher */}
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

            {/* Create button */}
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

      {/* Pending Appointments Panel */}
      {pendingAppts.length > 0 && (
        <div className="bg-white border border-amber-200 rounded-[14px] shadow-sm overflow-hidden">
          <button
            onClick={() => setPendingOpen(o => !o)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-amber-50/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="font-title font-semibold text-base text-text-primary">Aguardando confirmação</span>
              <span className="bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingAppts.length}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform duration-200 ${pendingOpen ? 'rotate-180' : ''}`} />
          </button>

          {pendingOpen && (
            <div className="border-t border-amber-100 divide-y divide-border/40">
              {pendingAppts.map(appt => {
                const apptDate = new Date(appt.data_hora);
                const dateLabel = apptDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                const timeLabel = apptDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const servicos = appt.agendamento_servicos?.map(s => s.servico?.nome).filter(Boolean).join(', ') || '—';
                return (
                  <div key={appt.id} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-amber-50/30 transition-colors">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-text-primary truncate">
                          {appt.cliente?.nome} {appt.cliente?.sobrenome}
                        </p>
                        <p className="text-xs text-text-secondary mt-0.5">{dateLabel} às {timeLabel}</p>
                      </div>
                      <p className="text-xs text-text-muted truncate hidden sm:block">{servicos}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenApproveModal(appt)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Aprovar
                      </button>
                      <button
                        onClick={() => handleOpenRejectModal(appt)}
                        className="flex items-center gap-1 px-3 py-1.5 border border-red-300 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Recusar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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
            {/* Grid Header */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border bg-rose-50/10 text-center">
              <div className="py-3 border-r border-border" />
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
            <div className="grid grid-cols-[60px_repeat(7,1fr)] h-[720px] overflow-y-auto relative bg-bg/5">

              {/* Hour slot labels */}
              <div className="border-r border-border bg-white text-right pr-2 text-[10px] font-bold text-text-secondary select-none">
                {halfHourSlots.map(({ hour, minute }) => (
                  <div key={`${hour}-${minute}`} className={`h-[30px] border-b border-border/50 flex items-center justify-end pr-1 ${minute === 0 ? 'font-bold' : 'font-normal text-[8px] text-text-muted/60'}`}>
                    <span>{hour.toString().padStart(2, '0')}:{minute.toString().padStart(2, '0')}</span>
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
                    {/* Half-hour slots background */}
                    {halfHourSlots.map(({ hour, minute }) => {
                      const isAvailable = isHourAvailable(day, hour, minute);
                      return (
                        <div
                          key={`${hour}-${minute}`}
                          onClick={() => isAvailable && handleOpenForm(day, `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`)}
                          className={`h-[30px] transition-colors cursor-pointer flex items-center justify-center
                            ${minute === 30 ? 'border-b border-border/50' : ''}
                            ${isAvailable ? 'hover:bg-rose-50/30' : 'bg-gray-100/55 cursor-not-allowed text-text-muted/40 font-semibold text-[10px]'}`}
                          title={isAvailable ? 'Clique para agendar' : 'Horário indisponível / Fechado'}
                        >
                          {!isAvailable && minute === 0 && '🔒'}
                        </div>
                      );
                    })}

                    {/* Absolute Blocks */}
                    {dayAppts.map(appt => {
                      const apptDate = new Date(appt.data_hora);
                      const startHourVal = apptDate.getHours() + apptDate.getMinutes() / 60;
                      const top = (startHourVal - startHour) * 60;
                      const height = (appt.duracao_minutos / 60) * 60;
                      const colors = getStatusColorStyles(appt.status);
                      return (
                        <div
                          key={appt.id}
                          style={{ top: `${top}px`, height: `${height}px` }}
                          onClick={(e) => { e.stopPropagation(); handleOpenDetail(appt); }}
                          className={`absolute left-1.5 right-1.5 rounded-lg border px-2 py-1.5 text-[10px] flex flex-col justify-between overflow-hidden shadow-sm cursor-pointer z-10 transition-all ${colors.border} ${colors.bg}`}
                          title={`${appt.cliente?.nome} ${appt.cliente?.sobrenome} - ${appt.agendamento_servicos?.map(s => s.servico?.nome).join(', ')}`}
                        >
                          <div className="truncate min-w-0">
                            <p className="font-bold truncate leading-tight">{appt.cliente?.nome} {appt.cliente?.sobrenome}</p>
                            <p className="text-[9px] truncate mt-0.5 opacity-80">
                              {appt.agendamento_servicos?.map(s => s.servico?.nome).join(', ')}
                            </p>
                          </div>
                          <div className="flex items-center justify-between border-t border-black/5 pt-0.5 mt-0.5 text-[8px] font-semibold opacity-75">
                            <span>🕒 {apptDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                            <span className={`px-1 py-0.5 rounded text-[7px] font-bold ${appt.origem === 'portal' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                              {appt.origem === 'portal' ? 'Portal' : 'Manual'}
                            </span>
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
          <div className="grid grid-cols-[60px_1fr] border-b border-border bg-rose-50/10 text-center">
            <div className="py-3 border-r border-border" />
            <div className="py-3 flex items-center justify-center gap-1.5 font-title font-semibold text-lg text-text-primary">
              <CalendarDays className="w-5 h-5 text-rose-600" />
              {currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).toUpperCase()}
            </div>
          </div>

          <div className="grid grid-cols-[60px_1fr] h-[720px] overflow-y-auto relative bg-bg/5">
            {/* Hours Labels */}
            <div className="border-r border-border bg-white text-right pr-2 text-[10px] font-bold text-text-secondary select-none">
              {halfHourSlots.map(({ hour, minute }) => (
                <div key={`${hour}-${minute}`} className={`h-[30px] border-b border-border/50 flex items-center justify-end pr-1 ${minute === 0 ? 'font-bold' : 'font-normal text-[8px] text-text-muted/60'}`}>
                  <span>{hour.toString().padStart(2, '0')}:{minute.toString().padStart(2, '0')}</span>
                </div>
              ))}
            </div>

            {/* Time Grid */}
            <div className="relative h-full">
              {halfHourSlots.map(({ hour, minute }) => {
                const isAvailable = isHourAvailable(currentDate, hour, minute);
                return (
                  <div
                    key={`${hour}-${minute}`}
                    onClick={() => isAvailable && handleOpenForm(currentDate, `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`)}
                    className={`h-[30px] transition-colors cursor-pointer flex items-center justify-center
                      ${minute === 30 ? 'border-b border-border/50' : ''}
                      ${isAvailable ? 'hover:bg-rose-50/30' : 'bg-gray-100/55 cursor-not-allowed text-text-muted/40'}`}
                  >
                    {!isAvailable && minute === 0 && '🔒'}
                  </div>
                );
              })}

              {/* Render Appointments */}
              {visibleAppointments
                .filter(appt => new Date(appt.data_hora).toDateString() === currentDate.toDateString())
                .map(appt => {
                  const apptDate = new Date(appt.data_hora);
                  const startHourVal = apptDate.getHours() + apptDate.getMinutes() / 60;
                  const top = (startHourVal - startHour) * 60;
                  const height = (appt.duracao_minutos / 60) * 60;

                  const colors = getStatusColorStyles(appt.status);

                  return (
                    <div
                      key={appt.id}
                      style={{ top: `${top}px`, height: `${height}px` }}
                      onClick={() => handleOpenDetail(appt)}
                      className={`absolute left-3 right-3 rounded-lg border px-3 py-2 flex flex-col justify-between shadow-sm cursor-pointer z-10 transition-all ${colors.border} ${colors.bg}`}
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
                        <span className={`text-[10px] font-bold border px-2.5 py-0.5 rounded-full ${colors.badge}`}>
                          🕒 {apptDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ({appt.duracao_minutos} min)
                        </span>
                      </div>
                      <div className="border-t border-black/5 pt-1 mt-1 text-[10px] font-semibold text-text-secondary flex justify-between">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${appt.origem === 'portal' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                          {appt.origem === 'portal' ? 'Portal' : 'Manual'}
                        </span>
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
          <div className="grid grid-cols-7 border-b border-border bg-rose-50/10 text-center text-xs font-bold text-text-secondary py-3">
            {DIAS_SEMANA.map(d => (
              <span key={d.valor}>{d.nome}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 grid-rows-6 h-[550px] bg-bg/5 divide-x divide-y divide-border">
            {getDaysOfMonthGrid(currentDate).map((day, idx) => {
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const isToday = new Date().toDateString() === day.toDateString();
              const activeBlock = bloqueios.find(b => {
                const ds = formatDateStr(day);
                return b.dia_inteiro !== false && ds >= b.data_inicio && ds <= b.data_fim;
              });
              const isDayClosed = (workHoursConfig.length > 0 && !workHoursConfig.some(h => h.dia_semana === day.getDay())) || !!activeBlock;
              
              const dayAppts = visibleAppointments.filter(appt => 
                new Date(appt.data_hora).toDateString() === day.toDateString()
              );

              return (
                <div 
                  key={idx}
                  onClick={() => !isDayClosed && handleOpenForm(day)}
                  className={`p-2 flex flex-col justify-between overflow-hidden transition-all ${
                    isDayClosed 
                      ? 'bg-gray-100/50 cursor-not-allowed text-text-muted/40' 
                      : `cursor-pointer hover:bg-rose-50/20 ${isCurrentMonth ? 'bg-white' : 'bg-gray-50/40'}`
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold ${isToday ? 'bg-rose-600 text-white font-bold' : 'text-text-secondary'}`}>
                      {day.getDate()}
                    </span>
                    {isDayClosed && (
                      <span className="text-[10px] text-text-muted" title={activeBlock ? `Bloqueado: ${activeBlock.motivo || 'Folga'}` : "Dia Fechado"}>🔒</span>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-1 mt-1.5">
                    {dayAppts.slice(0, 3).map(appt => {
                      const colors = getStatusColorStyles(appt.status);
                      return (
                        <div 
                          key={appt.id} 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(appt);
                          }}
                          className={`px-1.5 py-0.5 rounded text-[8px] font-semibold border truncate transition-all ${colors.border} ${colors.bg}`}
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

      {/* DETAIL MODAL / PANEL */}
      {isDetailOpen && selectedAppt && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-[14px] border border-border shadow-xl w-full max-w-md flex flex-col max-h-[calc(100vh-2rem)] overflow-hidden animate-slide-up">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-rose-50/10 flex-shrink-0">
              <h4 className="font-title font-semibold text-lg text-text-primary">
                Detalhes do Agendamento
              </h4>
              <button 
                onClick={() => setIsDetailOpen(false)}
                className="text-text-secondary hover:text-rose-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              
              {/* Client Info (Link to Profile) */}
              <div className="bg-rose-50/20 border border-border/80 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider">Cliente</span>
                  <Link 
                    to={`/clientes/${selectedAppt.cliente?.id}`}
                    className="block font-title font-semibold text-base text-rose-800 hover:text-rose-950 underline leading-snug mt-0.5"
                    title="Ver ficha clínica da cliente"
                  >
                    {selectedAppt.cliente?.nome} {selectedAppt.cliente?.sobrenome}
                  </Link>
                  <p className="text-[10px] text-text-secondary mt-0.5">WhatsApp: {selectedAppt.cliente?.whatsapp}</p>
                </div>
                
                {/* Status Badge */}
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider
                  ${selectedAppt.status === 'confirmado' ? 'bg-rose-100 text-rose-800 border border-rose-200' : ''}
                  ${selectedAppt.status === 'pendente' ? 'bg-amber-100 text-amber-700 border border-amber-200' : ''}
                  ${selectedAppt.status === 'concluido' ? 'bg-green-100 text-green-800 border border-green-200' : ''}
                  ${selectedAppt.status === 'cancelado' ? 'bg-gray-100 text-gray-500 border border-gray-200' : ''}
                  ${selectedAppt.status === 'falta' ? 'bg-red-100 text-red-800 border border-red-200' : ''}
                `}>
                  {selectedAppt.status === 'falta' ? 'Falta' : selectedAppt.status}
                </span>
              </div>

              {/* Main parameters */}
              <div className="space-y-3.5 text-xs">

                {/* Origem */}
                <div className="grid grid-cols-[100px_1fr] border-b border-border/40 pb-2">
                  <span className="font-bold text-text-secondary uppercase text-[10px] tracking-wider">Origem:</span>
                  <span>
                    {selectedAppt.origem === 'portal' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Portal</span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Manual</span>
                    )}
                  </span>
                </div>

                {/* Date / Time */}
                <div className="grid grid-cols-[100px_1fr] border-b border-border/40 pb-2">
                  <span className="font-bold text-text-secondary uppercase text-[10px] tracking-wider">Data / Horário:</span>
                  <span className="text-text-primary font-medium">
                    {new Date(selectedAppt.data_hora).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} às{' '}
                    {new Date(selectedAppt.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Duration */}
                <div className="grid grid-cols-[100px_1fr] border-b border-border/40 pb-2">
                  <span className="font-bold text-text-secondary uppercase text-[10px] tracking-wider">Duração:</span>
                  <span className="text-text-primary font-medium">{selectedAppt.duracao_minutos} minutos</span>
                </div>

                {/* List of services in details view */}
                <div className="border-b border-border/40 pb-2">
                  <span className="font-bold text-text-secondary uppercase text-[10px] tracking-wider block mb-1">Procedimentos:</span>
                  <div className="space-y-1 mt-1 bg-bg/25 border border-border/60 p-2.5 rounded-lg max-h-[120px] overflow-y-auto">
                    {selectedAppt.agendamento_servicos?.map((s, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs text-text-primary">
                        <span>
                          {s.servico?.nome} 
                          {s.variacao?.nome && <span className="text-[10px] bg-gold-light/40 text-gold border border-gold-light/60 px-1 py-0.5 rounded font-normal ml-1">{s.variacao.nome}</span>}
                        </span>
                        <span className="font-semibold text-rose-800">R$ {Number(s.valor_cobrado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price Display */}
                <div className="grid grid-cols-[100px_1fr] border-b border-border/40 pb-2">
                  <span className="font-bold text-text-secondary uppercase text-[10px] tracking-wider">Valor Cobrado:</span>
                  <span className="text-rose-800 font-title font-bold text-base">
                    R$ {selectedAppt.agendamento_servicos?.reduce((sum, s) => sum + Number(s.valor_cobrado), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Observations */}
                {selectedAppt.observacoes && (
                  <div className="grid grid-cols-[100px_1fr] border-b border-border/40 pb-2">
                    <span className="font-bold text-text-secondary uppercase text-[10px] tracking-wider">Anotações:</span>
                    <span className="text-text-secondary italic">"{selectedAppt.observacoes}"</span>
                  </div>
                )}
              </div>

              {/* Status & Edit Controls */}
              <div className="pt-2 border-t border-border flex flex-col gap-2">

                {selectedAppt.status === 'pendente' && (
                  <>
                    <button
                      onClick={() => handleOpenApproveModal(selectedAppt)}
                      className="flex items-center justify-center gap-1.5 py-2 w-full bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Confirmar Agendamento
                    </button>
                    <button
                      onClick={() => handleOpenRejectModal(selectedAppt)}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 border border-red-200 hover:bg-red-50 text-red-600 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      Recusar / Cancelar
                    </button>
                  </>
                )}

                {selectedAppt.status === 'confirmado' && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleChangeStatus(selectedAppt, 'concluido')}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 bg-green-600 hover:bg-green-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Concluir Atendimento
                      </button>
                      <button
                        onClick={() => handleChangeStatus(selectedAppt, 'cancelado')}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 border border-red-200 hover:bg-red-50 text-red-600 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        Cancelar
                      </button>
                    </div>
                    {new Date(selectedAppt.data_hora) < new Date() && (
                      <button
                        onClick={() => handleMarkNoShow(selectedAppt)}
                        className="flex items-center justify-center gap-1.5 py-2 w-full border border-red-300 hover:bg-red-50 text-red-700 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        <UserX className="w-4 h-4" />
                        Marcar Falta (No-show)
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenEditForm(selectedAppt)}
                      className="flex items-center justify-center gap-1.5 py-2 w-full bg-rose-600 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                      Editar Agendamento
                    </button>
                  </>
                )}

                {(selectedAppt.status === 'concluido' || selectedAppt.status === 'cancelado' || selectedAppt.status === 'falta') && (
                  <p className="text-[11px] text-text-secondary italic text-center py-1 bg-bg rounded">
                    Agendamentos concluídos, cancelados ou com falta não podem ser editados.
                  </p>
                )}

                {/* Delete button (Admin only) */}
                {isProfissional && (
                  <button
                    onClick={() => handleDeleteAppointment(selectedAppt)}
                    className="flex items-center justify-center gap-1.5 py-2 w-full border border-border hover:bg-red-50 hover:text-red-600 text-text-secondary rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir permanentemente
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONCLUDE MODAL */}
      {concludeAppt && (() => {
        const totalServicos = concludeAppt.agendamento_servicos?.reduce((sum, s) => sum + Number(s.valor_cobrado || 0), 0) || 0;
        const clientName = concludeAppt.cliente ? `${concludeAppt.cliente.nome} ${concludeAppt.cliente.sobrenome}` : 'Cliente';
        return (
          <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[60] flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
            <div className="bg-white rounded-[14px] border border-border shadow-xl w-full max-w-md flex flex-col max-h-[calc(100vh-2rem)] overflow-hidden animate-slide-up">
              {/* Header */}
              <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-green-50/30 flex-shrink-0">
                <h4 className="font-title font-semibold text-lg text-text-primary flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Concluir Atendimento
                </h4>
                <button
                  onClick={() => setConcludeAppt(null)}
                  className="text-text-secondary hover:text-rose-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* Client */}
                <div className="text-sm text-text-primary">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block mb-0.5">Cliente</span>
                  <span className="font-semibold">{clientName}</span>
                </div>

                {/* Services summary */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block mb-1.5">Procedimentos</span>
                  <div className="bg-bg/25 border border-border/60 p-3 rounded-lg space-y-1.5">
                    {concludeAppt.agendamento_servicos?.map((s, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs text-text-primary">
                        <span>
                          {s.servico?.nome}
                          {s.variacao?.nome && (
                            <span className="text-[10px] bg-gold-light/40 text-gold border border-gold-light/60 px-1 py-0.5 rounded font-normal ml-1">
                              {s.variacao.nome}
                            </span>
                          )}
                        </span>
                        <span className="font-semibold text-text-primary">
                          R$ {Number(s.valor_cobrado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                    <div className="border-t border-border/40 pt-1.5 mt-1.5 flex justify-between items-center text-sm font-bold text-text-primary">
                      <span>Total</span>
                      <span className="text-rose-800">
                        R$ {totalServicos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Custom value toggle */}
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 bg-bg/40 rounded-lg border border-border/60 cursor-pointer select-none hover:bg-bg/60 transition-colors">
                    <input
                      type="checkbox"
                      checked={concludeUseCustom}
                      onChange={(e) => {
                        setConcludeUseCustom(e.target.checked);
                        if (e.target.checked) setConcludeCustomValue(totalServicos);
                      }}
                      className="w-4 h-4 accent-rose-600 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-semibold text-text-primary">Valor recebido diferente?</span>
                      <span className="text-[10px] text-text-muted block">Habilite se houve desconto ou valor negociado.</span>
                    </div>
                  </label>

                  {concludeUseCustom && (
                    <div className="space-y-1.5 animate-fade-in">
                      <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                        Valor recebido (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={concludeCustomValue}
                        onChange={(e) => setConcludeCustomValue(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2.5 border border-border rounded-lg bg-bg text-text-primary text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-400"
                      />
                      {concludeCustomValue < totalServicos && concludeCustomValue >= 0 && (
                        <p className="text-[10px] text-amber-600 font-medium">
                          Desconto de R$ {(totalServicos - concludeCustomValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} aplicado.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Final value summary */}
                <div className="bg-green-50/50 border border-green-200/60 rounded-xl p-4 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-green-700 block mb-1">Valor a registrar</span>
                  <span className="text-2xl font-title font-bold text-green-800">
                    R$ {(concludeUseCustom ? concludeCustomValue : totalServicos).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setConcludeAppt(null)}
                    disabled={concludeSaving}
                    className="px-4 py-2 border border-border rounded-lg text-xs font-medium text-text-secondary hover:bg-bg transition-colors cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handleConcludeConfirm}
                    disabled={concludeSaving}
                    className="px-5 py-2.5 bg-green-600 hover:bg-green-800 disabled:bg-green-300 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {concludeSaving ? 'Salvando...' : 'Concluir Atendimento'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* FORM MODAL (CREATE OR EDIT) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-[14px] border border-border shadow-xl w-full max-w-lg flex flex-col max-h-[calc(100vh-2rem)] overflow-hidden my-8 animate-slide-up">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-rose-50/10 flex-shrink-0">
              <h4 className="font-title font-semibold text-lg text-text-primary flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-rose-600" />
                {editingAppt ? 'Editar Agendamento' : 'Agendar Novo Procedimento'}
              </h4>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-text-secondary hover:text-rose-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveAppointment} className="p-6 space-y-5 overflow-y-auto flex-1">
              
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
                        {selectedCliente.nome[0]}{(selectedCliente.sobrenome || '')[0]}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-text-primary">{selectedCliente.nome} {selectedCliente.sobrenome}</p>
                        <p className="text-[10px] text-text-secondary">Whats: {selectedCliente.whatsapp}</p>
                      </div>
                    </div>
                    {/* Only allow changing client when creating new appointment */}
                    {!editingAppt && (
                      <button
                        type="button"
                        onClick={() => setSelectedCliente(null)}
                        className="p-1 hover:bg-rose-100 rounded text-rose-600 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
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
                    onChange={(e) => handleDateChange(e.target.value)}
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

              {/* Serviços Selection */}
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
                              <p className="text-[10px] text-text-secondary mt-0.5">{srv.duracao_minutos} min • R$ {Number(srv.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                          </label>

                          {/* Variation Selection dropdown */}
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

                          {/* Price Input */}
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

              {/* Recalculated outputs */}
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

              {/* Form Actions */}
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
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-800 disabled:bg-rose-400 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  {saving ? 'Salvando...' : (editingAppt ? 'Salvar Alterações' : 'Criar Agendamento')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUCCESS CONFIRMATION MODAL */}
      {successModal && successModal.isOpen && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-[14px] border border-border shadow-xl w-full max-w-md p-6 text-center animate-slide-up space-y-4">
            
            {/* Animated Check Icon */}
            <div className="mx-auto w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-green-600 animate-pulse">
              <CheckCircle className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <h3 className="font-title font-bold text-xl text-text-primary">
                {successModal.title}
              </h3>
              <p className="text-xs text-text-secondary">
                Os dados da reserva foram registrados com sucesso no sistema.
              </p>
            </div>

            {/* Details Box */}
            <div className="bg-bg/40 border border-border/80 rounded-xl p-4 text-left text-xs space-y-2.5">
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="font-bold text-text-secondary uppercase text-[10px] tracking-wider">Cliente</span>
                <span className="font-semibold text-text-primary">{successModal.clientName}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="font-bold text-text-secondary uppercase text-[10px] tracking-wider">Procedimento(s)</span>
                <span className="font-semibold text-text-primary max-w-[200px] truncate text-right">{successModal.services}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="font-bold text-text-secondary uppercase text-[10px] tracking-wider">Data</span>
                <span className="font-semibold text-text-primary">{successModal.dateStr}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-text-secondary uppercase text-[10px] tracking-wider">Horário</span>
                <span className="font-semibold text-text-primary">{successModal.timeStr}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSuccessModal(null)}
                className="py-2 border border-border hover:bg-bg rounded-lg text-xs font-semibold text-text-secondary transition-colors cursor-pointer"
              >
                Concluir e Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={confirmModalConfig?.onConfirm || (() => {})}
        title={confirmModalConfig?.title || ''}
        description={confirmModalConfig?.description || ''}
        warningText={confirmModalConfig?.warningText}
        confirmText={confirmModalConfig?.confirmText}
        cancelText={confirmModalConfig?.cancelText}
        type={confirmModalConfig?.type}
      />

      {/* Approve Modal */}
      {approveModalAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-title font-semibold text-lg text-text-primary">Confirmar agendamento</h3>
                <p className="text-sm text-text-secondary mt-0.5">
                  {approveModalAppt.cliente?.nome} {approveModalAppt.cliente?.sobrenome} —{' '}
                  {new Date(approveModalAppt.data_hora).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })} às{' '}
                  {new Date(approveModalAppt.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button onClick={() => setApproveModalAppt(null)} className="text-text-muted hover:text-text-primary cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3 text-sm text-emerald-800 space-y-1">
              <p className="font-semibold">Serviço(s):</p>
              <p>{approveModalAppt.agendamento_servicos?.map(s => s.servico?.nome).filter(Boolean).join(', ') || '—'}</p>
              {approveModalAppt.observacoes && (
                <p className="text-emerald-700 italic text-xs mt-1">"{approveModalAppt.observacoes}"</p>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={() => handleApproveConfirm(true)}
                disabled={approveSaving}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                {approveSaving ? 'Confirmando...' : 'Confirmar e enviar pelo WhatsApp'}
              </button>
              <button
                onClick={() => handleApproveConfirm(false)}
                disabled={approveSaving}
                className="flex items-center justify-center gap-2 w-full py-2.5 border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                {approveSaving ? 'Confirmando...' : 'Confirmar sem enviar'}
              </button>
              <button
                onClick={() => setApproveModalAppt(null)}
                disabled={approveSaving}
                className="w-full py-2.5 border border-border hover:bg-bg text-text-secondary rounded-lg text-sm font-semibold transition-colors cursor-pointer"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-title font-semibold text-lg text-text-primary">Recusar agendamento</h3>
                <p className="text-sm text-text-secondary mt-0.5">
                  {rejectModalAppt.cliente?.nome} {rejectModalAppt.cliente?.sobrenome} —{' '}
                  {new Date(rejectModalAppt.data_hora).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })} às{' '}
                  {new Date(rejectModalAppt.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button onClick={() => setRejectModalAppt(null)} className="text-text-muted hover:text-text-primary cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Motivo <span className="font-normal normal-case text-text-muted">(opcional)</span>
              </label>
              <textarea
                value={rejectMotivo}
                onChange={e => setRejectMotivo(e.target.value)}
                placeholder="Ex: Desculpe, não vou conseguir atender nesse horário :("
                rows={3}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none"
              />
              <p className="text-[11px] text-text-muted">
                Se preenchido, o motivo será incluído na mensagem enviada pelo WhatsApp.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={() => handleRejectConfirm(true)}
                disabled={rejectSaving}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                {rejectSaving ? 'Recusando...' : 'Recusar e notificar pelo WhatsApp'}
              </button>
              <button
                onClick={() => handleRejectConfirm(false)}
                disabled={rejectSaving}
                className="flex items-center justify-center gap-2 w-full py-2.5 border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                {rejectSaving ? 'Recusando...' : 'Recusar sem notificar'}
              </button>
              <button
                onClick={() => setRejectModalAppt(null)}
                disabled={rejectSaving}
                className="w-full py-2.5 border border-border hover:bg-bg text-text-secondary rounded-lg text-sm font-semibold transition-colors cursor-pointer"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
