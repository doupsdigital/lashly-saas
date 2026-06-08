import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Users, 
  CalendarDays, 
  Coins, 
  Sparkles, 
  AlertCircle,
  TrendingUp,
  Briefcase
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

type PeriodType = 'hoje' | 'ontem' | '7dias' | 'esteMes' | 'mesPassado' | 'esteAno' | 'personalizado';

const COLORS = ['#A85560', '#C9A96E', '#7A2E38', '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899'];

// Helpers for Date management
const formatDateStr = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getPeriodDates = (period: PeriodType, customStart?: string, customEnd?: string) => {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);

  switch (period) {
    case 'hoje':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'ontem':
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case '7dias':
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'esteMes':
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    case 'mesPassado':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    case 'esteAno':
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
    case 'personalizado':
      if (customStart && customEnd) {
        const [sy, sm, sd] = customStart.split('-').map(Number);
        const [ey, em, ed] = customEnd.split('-').map(Number);
        start = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
        end = new Date(ey, em - 1, ed, 23, 59, 59, 999);
      }
      break;
  }
  return { start, end };
};

const getWeekLabel = (date: Date, start: Date) => {
  const diffTime = Math.abs(date.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) return 'Semana 1';
  if (diffDays <= 14) return 'Semana 2';
  if (diffDays <= 21) return 'Semana 3';
  return 'Semana 4';
};

export default function Dashboard() {
  const [period, setPeriod] = useState<PeriodType>('esteMes');
  
  // Custom date range states
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    return formatDateStr(new Date(d.getFullYear(), d.getMonth(), 1));
  });
  const [customEndDate, setCustomEndDate] = useState(() => formatDateStr(new Date()));

  // KPI states
  const [totalClients, setTotalClients] = useState(0);
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);

  // Chart states
  const [revenueTimeData, setRevenueTimeData] = useState<any[]>([]);
  const [appointmentsWeekdayData, setAppointmentsWeekdayData] = useState<any[]>([]);
  const [clientsNewRecurrentData, setClientsNewRecurrentData] = useState<any[]>([]);
  const [topServicesData, setTopServicesData] = useState<any[]>([]);
  const [appointmentsProfData, setAppointmentsProfData] = useState<any[]>([]);
  const [revenueCategoryData, setRevenueCategoryData] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { start, end } = getPeriodDates(period, customStartDate, customEndDate);
      const startIso = start.toISOString();
      const endIso = end.toISOString();
      const startDateStr = formatDateStr(start);
      const endDateStr = formatDateStr(end);

      // 1. Fetch metadata in memory to avoid join errors
      const [catsRes, servsRes] = await Promise.all([
        supabase.from('categorias_servico').select('id, nome'),
        supabase.from('servicos').select('id, nome, categoria_id')
      ]);

      if (catsRes.error) throw catsRes.error;
      if (servsRes.error) throw servsRes.error;

      const categoryMap = new Map<string, string>();
      catsRes.data?.forEach(c => categoryMap.set(c.id, c.nome));

      const serviceMap = new Map<string, { nome: string; categoriaNome: string }>();
      servsRes.data?.forEach(s => {
        const catName = categoryMap.get(s.categoria_id) || 'Sem Categoria';
        serviceMap.set(s.id, { nome: s.nome, categoriaNome: catName });
      });

      // 2. Fetch main tables data for the active period
      const [clientsRes, apptsRes, atendsRes] = await Promise.all([
        // Clients registered in the period
        supabase
          .from('clientes')
          .select('id, created_at')
          .gte('created_at', startIso)
          .lte('created_at', endIso),
        // Appointments in the period
        supabase
          .from('agendamentos')
          .select('id, data_hora, status, profissional_id, profissional:profissionais(nome, sobrenome)')
          .gte('data_hora', startIso)
          .lte('data_hora', endIso),
        // Atendimentos in the period
        supabase
          .from('atendimentos')
          .select('id, cliente_id, data_atendimento, valor_cobrado, servico_id')
          .gte('data_atendimento', startDateStr)
          .lte('data_atendimento', endDateStr)
      ]);

      if (clientsRes.error) throw clientsRes.error;
      if (apptsRes.error) throw apptsRes.error;
      if (atendsRes.error) throw atendsRes.error;

      const clientRecords = clientsRes.data || [];
      const apptRecords = apptsRes.data || [];
      const atendRecords = atendsRes.data || [];

      // Update KPI Cards
      setTotalClients(clientRecords.length);
      setTotalAppointments(apptRecords.length);
      
      const earnedSum = atendRecords.reduce((sum, a) => sum + Number(a.valor_cobrado), 0);
      setTotalEarned(earnedSum);

      // --- Chart 1: Revenue over time ---
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 31) {
        // Daily revenue
        const dailyMap = new Map<string, number>();
        let current = new Date(start);
        while (current <= end) {
          dailyMap.set(formatDateStr(current), 0);
          current.setDate(current.getDate() + 1);
        }

        atendRecords.forEach(a => {
          if (dailyMap.has(a.data_atendimento)) {
            dailyMap.set(a.data_atendimento, dailyMap.get(a.data_atendimento)! + Number(a.valor_cobrado));
          }
        });

        const dailyChart = Array.from(dailyMap.entries()).map(([dateStr, valor]) => {
          const [, m, d] = dateStr.split('-');
          return {
            name: `${d}/${m}`,
            Valor: valor,
            dateStr
          };
        }).sort((a, b) => a.dateStr.localeCompare(b.dateStr));

        setRevenueTimeData(dailyChart);
      } else {
        // Monthly revenue
        const monthlyMap = new Map<string, number>();
        let current = new Date(start);
        while (current <= end) {
          const mKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
          monthlyMap.set(mKey, 0);
          current.setMonth(current.getMonth() + 1);
        }

        atendRecords.forEach(a => {
          const mKey = a.data_atendimento.substring(0, 7);
          if (monthlyMap.has(mKey)) {
            monthlyMap.set(mKey, monthlyMap.get(mKey)! + Number(a.valor_cobrado));
          }
        });

        const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const monthlyChart = Array.from(monthlyMap.entries()).map(([mKey, valor]) => {
          const [y, m] = mKey.split('-');
          const name = MONTHS[parseInt(m) - 1];
          return {
            name: `${name}/${y.substring(2)}`,
            Valor: valor,
            mKey
          };
        }).sort((a, b) => a.mKey.localeCompare(b.mKey));

        setRevenueTimeData(monthlyChart);
      }

      // --- Chart 2: Appointments by weekday ---
      const weekdayCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 0: 0 };
      apptRecords.forEach(a => {
        const d = new Date(a.data_hora);
        const wDay = d.getDay();
        weekdayCounts[wDay as keyof typeof weekdayCounts] += 1;
      });

      setAppointmentsWeekdayData([
        { name: 'Seg', Quantidade: weekdayCounts[1] },
        { name: 'Ter', Quantidade: weekdayCounts[2] },
        { name: 'Qua', Quantidade: weekdayCounts[3] },
        { name: 'Qui', Quantidade: weekdayCounts[4] },
        { name: 'Sex', Quantidade: weekdayCounts[5] },
        { name: 'Sáb', Quantidade: weekdayCounts[6] },
        { name: 'Dom', Quantidade: weekdayCounts[0] }
      ]);

      // --- Chart 3: Clients new vs recurrent ---
      const uniqueClientIds = [...new Set(atendRecords.map(a => a.cliente_id))];
      let recurrentSet = new Set<string>();

      if (uniqueClientIds.length > 0) {
        // Query if they have atendimentos before startDateStr
        const { data: pastAtends, error: pastError } = await supabase
          .from('atendimentos')
          .select('cliente_id')
          .in('cliente_id', uniqueClientIds)
          .lt('data_atendimento', startDateStr);

        if (pastError) throw pastError;
        pastAtends?.forEach(p => recurrentSet.add(p.cliente_id));
      }

      // Map client absolute first visit in the period or past
      const clientFirstDate = new Map<string, string>();
      atendRecords.forEach(a => {
        // If they had a past visit, their absolute first visit is in the past
        if (recurrentSet.has(a.cliente_id)) {
          clientFirstDate.set(a.cliente_id, 'past');
        } else {
          const cur = clientFirstDate.get(a.cliente_id);
          if (!cur || a.data_atendimento < cur) {
            clientFirstDate.set(a.cliente_id, a.data_atendimento);
          }
        }
      });

      // Group clients into slots
      if (diffDays <= 7) {
        // Group by Day
        const slotsMap = new Map<string, { Novos: Set<string>; Recorrentes: Set<string> }>();
        let current = new Date(start);
        while (current <= end) {
          slotsMap.set(formatDateStr(current), { Novos: new Set(), Recorrentes: new Set() });
          current.setDate(current.getDate() + 1);
        }

        atendRecords.forEach(a => {
          const slot = slotsMap.get(a.data_atendimento);
          if (slot) {
            const first = clientFirstDate.get(a.cliente_id);
            if (first === a.data_atendimento) {
              slot.Novos.add(a.cliente_id);
            } else {
              slot.Recorrentes.add(a.cliente_id);
            }
          }
        });

        const newRecChart = Array.from(slotsMap.entries()).map(([dateStr, sets]) => {
          const [, m, d] = dateStr.split('-');
          return {
            name: `${d}/${m}`,
            Novos: sets.Novos.size,
            Recorrentes: sets.Recorrentes.size,
            dateStr
          };
        }).sort((a, b) => a.dateStr.localeCompare(b.dateStr));

        setClientsNewRecurrentData(newRecChart);
      } else if (diffDays <= 31) {
        // Group by Week
        const weeks = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'];
        const slotsMap = new Map<string, { Novos: Set<string>; Recorrentes: Set<string> }>();
        weeks.forEach(w => slotsMap.set(w, { Novos: new Set(), Recorrentes: new Set() }));

        atendRecords.forEach(a => {
          const wLabel = getWeekLabel(new Date(a.data_atendimento + 'T12:00:00'), start);
          const slot = slotsMap.get(wLabel) || slotsMap.get('Semana 4')!;
          
          const first = clientFirstDate.get(a.cliente_id);
          // Determine if they are new in this week (first ever visit falls in this week)
          const isFirstVisitInThisWeek = first !== 'past' && getWeekLabel(new Date(first! + 'T12:00:00'), start) === wLabel;

          if (isFirstVisitInThisWeek) {
            slot.Novos.add(a.cliente_id);
          } else {
            slot.Recorrentes.add(a.cliente_id);
          }
        });

        setClientsNewRecurrentData(weeks.map(w => ({
          name: w,
          Novos: slotsMap.get(w)!.Novos.size,
          Recorrentes: slotsMap.get(w)!.Recorrentes.size
        })));
      } else {
        // Group by Month
        const slotsMap = new Map<string, { Novos: Set<string>; Recorrentes: Set<string> }>();
        let current = new Date(start);
        while (current <= end) {
          const mKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
          slotsMap.set(mKey, { Novos: new Set(), Recorrentes: new Set() });
          current.setMonth(current.getMonth() + 1);
        }

        atendRecords.forEach(a => {
          const mKey = a.data_atendimento.substring(0, 7);
          const slot = slotsMap.get(mKey);
          if (slot) {
            const first = clientFirstDate.get(a.cliente_id);
            const isFirstVisitInThisMonth = first !== 'past' && first!.substring(0, 7) === mKey;
            
            if (isFirstVisitInThisMonth) {
              slot.Novos.add(a.cliente_id);
            } else {
              slot.Recorrentes.add(a.cliente_id);
            }
          }
        });

        const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const newRecChart = Array.from(slotsMap.entries()).map(([mKey, sets]) => {
          const [y, m] = mKey.split('-');
          const name = MONTHS[parseInt(m) - 1];
          return {
            name: `${name}/${y.substring(2)}`,
            Novos: sets.Novos.size,
            Recorrentes: sets.Recorrentes.size,
            mKey
          };
        }).sort((a, b) => a.mKey.localeCompare(b.mKey));

        setClientsNewRecurrentData(newRecChart);
      }

      // --- Chart 4: Top 8 services performed ---
      const srvMapCounts = new Map<string, number>();
      atendRecords.forEach(a => {
        const sName = serviceMap.get(a.servico_id)?.nome || 'Serviço Excluído/Desconhecido';
        srvMapCounts.set(sName, (srvMapCounts.get(sName) || 0) + 1);
      });

      const topServices = Array.from(srvMapCounts.entries())
        .map(([nome, quantidade]) => ({ name: nome, Quantidade: quantidade }))
        .sort((a, b) => b.Quantidade - a.Quantidade)
        .slice(0, 8);

      // Recharts bar horizontal usually renders bottom-to-top, reverse it so highest is at the top
      setTopServicesData(topServices.reverse());

      // --- Chart 5: Appointments by professional ---
      const profMapCounts = new Map<string, number>();
      apptRecords.forEach(a => {
        const prof = Array.isArray(a.profissional) ? a.profissional[0] : (a.profissional as any);
        const pName = prof 
          ? `${prof.nome} ${prof.sobrenome}`
          : 'Sem Profissional';
        profMapCounts.set(pName, (profMapCounts.get(pName) || 0) + 1);
      });

      setAppointmentsProfData(
        Array.from(profMapCounts.entries()).map(([nome, quantidade]) => ({
          name: nome,
          Quantidade: quantidade
        }))
      );

      // --- Chart 6: Revenue by service category ---
      const catMapRevenue = new Map<string, number>();
      atendRecords.forEach(a => {
        const catName = serviceMap.get(a.servico_id)?.categoriaNome || 'Sem Categoria';
        catMapRevenue.set(catName, (catMapRevenue.get(catName) || 0) + Number(a.valor_cobrado));
      });

      setRevenueCategoryData(
        Array.from(catMapRevenue.entries()).map(([nome, valor]) => ({
          name: nome,
          value: valor
        }))
      );

    } catch (err: any) {
      console.error(err);
      setErrorMsg('Falha ao processar e carregar dados do dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [period, customStartDate, customEndDate]);

  const handlePeriodChange = (p: PeriodType) => {
    setPeriod(p);
  };

  // Render empty state component
  const renderEmptyState = (message: string = 'Nenhum dado encontrado para o período.') => (
    <div className="flex flex-col items-center justify-center py-20 text-center text-text-muted bg-rose-50/5 border border-dashed border-border/60 rounded-xl h-[300px]">
      <Sparkles className="w-8 h-8 text-rose-200 mb-2.5 animate-pulse" />
      <p className="text-xs font-semibold">{message}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      
      {/* Top Banner Error */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-3 animate-fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      {/* Control Header Filter Box */}
      <div className="bg-white border border-border rounded-[14px] p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="font-title font-semibold text-2xl text-text-primary">Dashboard</h2>
            <p className="text-xs text-text-secondary mt-0.5">Visão geral do desempenho e saúde financeira da clínica.</p>
          </div>

          {/* Period presets */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'hoje', label: 'Hoje' },
              { id: 'ontem', label: 'Ontem' },
              { id: '7dias', label: 'Últimos 7 dias' },
              { id: 'esteMes', label: 'Este mês' },
              { id: 'mesPassado', label: 'Mês passado' },
              { id: 'esteAno', label: 'Este ano' },
              { id: 'personalizado', label: 'Personalizado' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => handlePeriodChange(item.id as PeriodType)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  period === item.id
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-bg text-text-secondary hover:text-rose-600 border border-border/30'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Calendar Inputs */}
        {period === 'personalizado' && (
          <div className="flex items-center gap-3 bg-bg/30 p-3 rounded-lg border border-border/40 w-fit animate-fade-in">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-text-secondary uppercase">Início:</label>
              <input 
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1 border border-border rounded bg-white text-text-primary text-xs focus:outline-none focus:ring-1 focus:ring-rose-400"
              />
            </div>
            <span className="text-xs text-text-muted">—</span>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-text-secondary uppercase">Fim:</label>
              <input 
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1 border border-border rounded bg-white text-text-primary text-xs focus:outline-none focus:ring-1 focus:ring-rose-400"
              />
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 text-text-secondary bg-surface border rounded-[14px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600 mb-2"></div>
          <p className="text-sm">Carregando métricas e estatísticas...</p>
        </div>
      ) : (
        <>
          {/* KPI CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* KPI 1: Clientes */}
            <div className="bg-white border border-border rounded-[14px] p-5 flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Novos Clientes</span>
                <p className="text-3xl font-title font-semibold text-text-primary">{totalClients}</p>
                <p className="text-[10px] text-text-muted">Cadastrados no período</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                <Users className="w-5 h-5" />
              </div>
            </div>

            {/* KPI 2: Agendamentos */}
            <div className="bg-white border border-border rounded-[14px] p-5 flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Total de Agendamentos</span>
                <p className="text-3xl font-title font-semibold text-text-primary">{totalAppointments}</p>
                <p className="text-[10px] text-text-muted">Agendados no período</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                <CalendarDays className="w-5 h-5" />
              </div>
            </div>

            {/* KPI 3: Valor Total Ganho */}
            <div className="bg-white border border-border rounded-[14px] p-5 flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Valor Total Ganho</span>
                <p className="text-3xl font-title font-semibold text-rose-800">
                  R$ {totalEarned.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-text-muted">Atendimentos finalizados</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                <Coins className="w-5 h-5" />
              </div>
            </div>

          </div>

          {/* CHARTS CONTAINER GRID */}
          <div className="space-y-6">
            
            {/* Chart 1: Revenue over time (Full row) */}
            <div className="bg-white border border-border rounded-[14px] p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-title font-semibold text-lg text-text-primary flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-rose-600" />
                  Receita ao longo do tempo
                </h3>
              </div>
              {revenueTimeData.length === 0 || revenueTimeData.every(d => d.Valor === 0) ? (
                renderEmptyState('Sem receita registrada no período selecionado.')
              ) : (
                <div className="h-[300px] w-full font-sans text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueTimeData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(180,150,130,0.12)" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} stroke="var(--text-secondary)" />
                      <YAxis 
                        tickLine={false} 
                        axisLine={false} 
                        stroke="var(--text-secondary)" 
                        tickFormatter={(value) => `R$ ${value}`}
                      />
                      <Tooltip 
                        formatter={(value: any) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Receita']}
                        contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid rgba(180,150,130,0.2)' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="Valor" 
                        stroke="#A85560" 
                        strokeWidth={2.5} 
                        dot={{ r: 4, stroke: '#A85560', strokeWidth: 1, fill: 'white' }} 
                        activeDot={{ r: 6 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Row 2: Weekday appointments and new vs recurrent clients (2 columns) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Chart 2: Weekday appointments */}
              <div className="bg-white border border-border rounded-[14px] p-5 shadow-sm">
                <h3 className="font-title font-semibold text-lg text-text-primary flex items-center gap-2 mb-4">
                  <CalendarDays className="w-5 h-5 text-rose-600" />
                  Agendamentos por dia da semana
                </h3>
                {appointmentsWeekdayData.length === 0 || appointmentsWeekdayData.every(d => d.Quantidade === 0) ? (
                  renderEmptyState('Sem agendamentos no período selecionado.')
                ) : (
                  <div className="h-[300px] w-full font-sans text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={appointmentsWeekdayData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(180,150,130,0.12)" />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} stroke="var(--text-secondary)" />
                        <YAxis tickLine={false} axisLine={false} stroke="var(--text-secondary)" allowDecimals={false} />
                        <Tooltip 
                          formatter={(value) => [value, 'Agendamentos']}
                          contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid rgba(180,150,130,0.2)' }}
                        />
                        <Bar dataKey="Quantidade" fill="#C9A96E" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Chart 3: New vs recurrent clients */}
              <div className="bg-white border border-border rounded-[14px] p-5 shadow-sm">
                <h3 className="font-title font-semibold text-lg text-text-primary flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-rose-600" />
                  Clientes novos vs recorrentes
                </h3>
                {clientsNewRecurrentData.length === 0 || clientsNewRecurrentData.every(d => d.Novos === 0 && d.Recorrentes === 0) ? (
                  renderEmptyState('Sem atendimentos de clientes no período selecionado.')
                ) : (
                  <div className="h-[300px] w-full font-sans text-xs flex flex-col justify-between">
                    <div className="flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={clientsNewRecurrentData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(180,150,130,0.12)" />
                          <XAxis dataKey="name" tickLine={false} axisLine={false} stroke="var(--text-secondary)" />
                          <YAxis tickLine={false} axisLine={false} stroke="var(--text-secondary)" allowDecimals={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid rgba(180,150,130,0.2)' }}
                          />
                          <Legend verticalAlign="top" height={36} iconType="circle" />
                          <Bar dataKey="Novos" stackId="a" fill="#A85560" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="Recorrentes" stackId="a" fill="#B0A097" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Row 3: Top services and professional appointments (2 columns) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Chart 4: Top services */}
              <div className="bg-white border border-border rounded-[14px] p-5 shadow-sm">
                <h3 className="font-title font-semibold text-lg text-text-primary flex items-center gap-2 mb-4">
                  <Briefcase className="w-5 h-5 text-rose-600" />
                  Serviços mais realizados
                </h3>
                {topServicesData.length === 0 || topServicesData.every(d => d.Quantidade === 0) ? (
                  renderEmptyState('Sem atendimentos registrados no período.')
                ) : (
                  <div className="h-[300px] w-full font-sans text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        layout="vertical" 
                        data={topServicesData} 
                        margin={{ top: 10, right: 15, left: 25, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(180,150,130,0.12)" />
                        <XAxis type="number" tickLine={false} axisLine={false} stroke="var(--text-secondary)" allowDecimals={false} />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          tickLine={false} 
                          axisLine={false} 
                          stroke="var(--text-secondary)" 
                          width={100}
                          tick={{ fontSize: 10 }}
                        />
                        <Tooltip 
                          formatter={(value) => [value, 'Realizado']}
                          contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid rgba(180,150,130,0.2)' }}
                        />
                        <Bar dataKey="Quantidade" fill="#7A2E38" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Chart 5: Professional appointments */}
              <div className="bg-white border border-border rounded-[14px] p-5 shadow-sm">
                <h3 className="font-title font-semibold text-lg text-text-primary flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-rose-600" />
                  Agendamentos por profissional
                </h3>
                {appointmentsProfData.length === 0 || appointmentsProfData.every(d => d.Quantidade === 0) ? (
                  renderEmptyState('Sem agendamentos no período.')
                ) : (
                  <div className="h-[300px] w-full font-sans text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={appointmentsProfData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(180,150,130,0.12)" />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} stroke="var(--text-secondary)" />
                        <YAxis tickLine={false} axisLine={false} stroke="var(--text-secondary)" allowDecimals={false} />
                        <Tooltip 
                          formatter={(value) => [value, 'Agendamentos']}
                          contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid rgba(180,150,130,0.2)' }}
                        />
                        <Bar dataKey="Quantidade" fill="#A85560" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

            </div>

            {/* Row 4: Revenue by service category */}
            <div className="bg-white border border-border rounded-[14px] p-5 shadow-sm">
              <h3 className="font-title font-semibold text-lg text-text-primary flex items-center gap-2 mb-4">
                <Coins className="w-5 h-5 text-rose-600" />
                Receita por categoria de serviço
              </h3>
              {revenueCategoryData.length === 0 || revenueCategoryData.every(d => d.value === 0) ? (
                renderEmptyState('Sem receita categorizada no período.')
              ) : (
                <div className="h-[300px] w-full font-sans text-xs flex flex-col md:flex-row items-center justify-around gap-6">
                  <div className="w-full md:w-1/2 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={revenueCategoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {revenueCategoryData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Valor']}
                          contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid rgba(180,150,130,0.2)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Custom list legend with values */}
                  <div className="w-full md:w-1/2 space-y-2 max-h-[240px] overflow-y-auto pr-3">
                    {revenueCategoryData.map((item, idx) => {
                      const percentage = (item.value / totalEarned) * 100;
                      return (
                        <div key={idx} className="flex items-center justify-between text-xs border-b border-border/40 pb-2">
                          <div className="flex items-center gap-2">
                            <span 
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                            />
                            <span className="font-semibold text-text-primary">{item.name}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-rose-800">
                              R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-[9px] text-text-muted">{percentage.toFixed(1)}% do total</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          </div>
        </>
      )}

    </div>
  );
}
