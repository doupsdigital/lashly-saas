import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Check, Calendar, Clock, Tag,
  CheckCircle, AlertCircle, Loader2, Heart,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { CategoriaServico, Servico, VariacaoServico, HorarioAtendimento, BloqueioAgenda } from '../../types';
import { usePortal } from '../../contexts/PortalContext';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ServicoComVariacoes extends Servico {
  variacoes: VariacaoServico[];
}

interface CategoriaComServicos extends CategoriaServico {
  servicos: ServicoComVariacoes[];
}

interface ItemSelecionado {
  servico: ServicoComVariacoes;
  variacao: VariacaoServico | null;
}

type Etapa = 1 | 2 | 3 | 4 | 'sucesso';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DIAS_SEMANA_PT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const DIAS_SEMANA_LONGO = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
const MESES_GENITIVO = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

function formatDuracao(min: number): string {
  if (min <= 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

function formatValor(val: number): string {
  return `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function dateToStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDataExtenso(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${DIAS_SEMANA_LONGO[date.getDay()]}, ${d} de ${MESES_GENITIVO[m - 1]} de ${y}`;
}

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function fromMin(total: number): string {
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function getDuracaoEfetiva(item: ItemSelecionado): number {
  if (item.variacao?.duracao_minutos != null) return item.variacao.duracao_minutos;
  return item.servico.duracao_minutos;
}

function getValorEfetivo(item: ItemSelecionado): number {
  if (item.variacao?.valor != null) return Number(item.variacao.valor);
  return Number(item.servico.valor);
}

function gerarSlots(
  horaInicio: string,
  horaFim: string,
  duracaoTotal: number,
  agendamentos: { data_hora: string; duracao_minutos: number }[],
): string[] {
  const ini = toMin(horaInicio);
  const fim = toMin(horaFim);
  const slots: string[] = [];

  for (let t = ini; t + duracaoTotal <= fim; t += 30) {
    const slotFim = t + duracaoTotal;
    const ocupado = agendamentos.some(ag => {
      // Usa Date para converter UTC → hora local corretamente
      const d = new Date(ag.data_hora);
      const agIni = d.getHours() * 60 + d.getMinutes();
      const agFim = agIni + ag.duracao_minutos;
      return t < agFim && slotFim > agIni;
    });
    if (!ocupado) slots.push(fromMin(t));
  }

  return slots;
}

// ─── Progress indicator ───────────────────────────────────────────────────────

const LABELS_ETAPA = ['Serviços', 'Data', 'Horário', 'Confirmação'];

function IndicadorProgresso({ etapaAtual }: { etapaAtual: number }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {LABELS_ETAPA.map((label, i) => {
        const num = i + 1;
        const ativa = num === etapaAtual;
        const concluida = num < etapaAtual;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                concluida
                  ? 'bg-rose-600 text-white'
                  : ativa
                  ? 'bg-rose-600 text-white ring-4 ring-rose-100'
                  : 'bg-gray-100 text-text-muted'
              }`}>
                {concluida ? <Check className="w-4 h-4" /> : num}
              </div>
              <span className={`text-[10px] font-medium hidden sm:block ${
                ativa ? 'text-rose-600' : concluida ? 'text-text-secondary' : 'text-text-muted'
              }`}>
                {label}
              </span>
            </div>
            {i < LABELS_ETAPA.length - 1 && (
              <div className={`w-10 sm:w-16 h-0.5 mx-1 mb-4 sm:mb-5 transition-colors ${
                concluida ? 'bg-rose-600' : 'bg-gray-200'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PortalAgendar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clienteId } = useAuth();
  const { establishmentId, slug, plano, loading: loadingPortal } = usePortal();

  // Redirect to catalog if salon is on basic plan
  useEffect(() => {
    if (!loadingPortal && plano === 'basico') {
      navigate(`/portal/${slug}/catalogo`, { replace: true });
    }
  }, [loadingPortal, plano, slug, navigate]);

  // Capture the query param only once at mount
  const preSelectedId = useRef(searchParams.get('servico')).current;

  const [etapa, setEtapa] = useState<Etapa>(1);

  // ── Step 1 ──────────────────────────────────────────────────────────────────
  const [categorias, setCategorias] = useState<CategoriaComServicos[]>([]);
  const [loadingServicos, setLoadingServicos] = useState(true);
  const [selecionados, setSelecionados] = useState<Map<string, ItemSelecionado>>(new Map());

  // ── Step 2 ──────────────────────────────────────────────────────────────────
  const [horarios, setHorarios] = useState<HorarioAtendimento[]>([]);
  const [bloqueios, setBloqueios] = useState<BloqueioAgenda[]>([]);
  const [loadingCalendario, setLoadingCalendario] = useState(false);
  const [calendarioCarregado, setCalendarioCarregado] = useState(false);
  const hoje = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const [mesAtual, setMesAtual] = useState({ year: hoje.getFullYear(), month: hoje.getMonth() });
  const [dataSelecionada, setDataSelecionada] = useState<string | null>(null);

  // ── Step 3 ──────────────────────────────────────────────────────────────────
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [horarioSelecionado, setHorarioSelecionado] = useState<string | null>(null);

  // ── Step 4 ──────────────────────────────────────────────────────────────────
  const [observacoes, setObservacoes] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<'generic' | 'race' | 'perm' | null>(null);

  // ── Success ──────────────────────────────────────────────────────────────────
  const [mensagemPos, setMensagemPos] = useState('Obrigada pelo seu agendamento!');
  const [foiConfirmado, setFoiConfirmado] = useState(false);

  // ─── Computed values ─────────────────────────────────────────────────────────

  const itens = useMemo(() => Array.from(selecionados.values()), [selecionados]);

  const duracaoTotal = useMemo(
    () => itens.reduce((acc, it) => acc + getDuracaoEfetiva(it), 0),
    [itens],
  );

  const valorTotal = useMemo(
    () => itens.reduce((acc, it) => acc + getValorEfetivo(it), 0),
    [itens],
  );

  const podeAvancar1 =
    itens.length > 0 &&
    itens.every(it => !(it.servico.variacoes.length > 0 && it.variacao === null));

  const diasDoMes = useMemo(() => {
    const { year, month } = mesAtual;
    const primeiroDia = new Date(year, month, 1).getDay();
    const diasNoMes = new Date(year, month + 1, 0).getDate();
    const dias: (Date | null)[] = [];
    for (let i = 0; i < primeiroDia; i++) dias.push(null);
    for (let d = 1; d <= diasNoMes; d++) dias.push(new Date(year, month, d));
    while (dias.length % 7 !== 0) dias.push(null);
    return dias;
  }, [mesAtual]);

  // ─── Data fetching ────────────────────────────────────────────────────────────

  // Step 1: services + pre-selection
  useEffect(() => {
    if (!establishmentId) return;
    (async () => {
      setLoadingServicos(true);
      try {
        const [catRes, servRes, varRes] = await Promise.all([
          supabase
            .from('categorias_servico')
            .select('*')
            .eq('estabelecimento_id', establishmentId)
            .order('ordem', { ascending: true }),
          supabase
            .from('servicos')
            .select('*')
            .eq('estabelecimento_id', establishmentId)
            .eq('ativo', true)
            .order('nome', { ascending: true }),
          supabase.from('variacoes_servico').select('*'),
        ]);

        if (catRes.error) throw catRes.error;
        if (servRes.error) throw servRes.error;
        if (varRes.error) throw varRes.error;

        const servicos = servRes.data || [];
        const variacoes = varRes.data || [];

        const mapped: CategoriaComServicos[] = (catRes.data || [])
          .map(cat => ({
            ...cat,
            servicos: servicos
              .filter(s => s.categoria_id === cat.id)
              .map(s => ({ ...s, variacoes: variacoes.filter(v => v.servico_id === s.id) })),
          }))
          .filter(cat => cat.servicos.length > 0)
          .sort((a, b) => {
            const nameA = a.nome.toLowerCase().trim();
            const nameB = b.nome.toLowerCase().trim();
            
            const isCiliosA = nameA.includes('extensão de cílios') || nameA.includes('extensão de cilios');
            const isCiliosB = nameB.includes('extensão de cílios') || nameB.includes('extensão de cilios');
            const isSobrancelhasA = nameA.includes('design de sobrancelhas');
            const isSobrancelhasB = nameB.includes('design de sobrancelhas');

            if (isCiliosA && !isCiliosB) return -1;
            if (!isCiliosA && isCiliosB) return 1;
            if (isSobrancelhasA && !isSobrancelhasB) return 1;
            if (!isSobrancelhasA && isSobrancelhasB) return -1;
            
            return nameA.localeCompare(nameB);
          });

        setCategorias(mapped);

        if (preSelectedId) {
          for (const cat of mapped) {
            const serv = cat.servicos.find(s => s.id === preSelectedId);
            if (serv) {
              setSelecionados(new Map([[serv.id, { servico: serv, variacao: null }]]));
              break;
            }
          }
        }
      } finally {
        setLoadingServicos(false);
      }
    })();
  }, [establishmentId]);

  // Step 2: calendar data (loaded once on first entry)
  useEffect(() => {
    if (etapa !== 2 || calendarioCarregado || !establishmentId) return;

    (async () => {
      setLoadingCalendario(true);
      try {
        const [horRes, bloqRes] = await Promise.all([
          supabase.from('horarios_atendimento').select('*').eq('estabelecimento_id', establishmentId),
          supabase.from('bloqueios_agenda').select('*').eq('estabelecimento_id', establishmentId),
        ]);
        setHorarios(horRes.data || []);
        setBloqueios(bloqRes.data || []);
        setCalendarioCarregado(true);
      } finally {
        setLoadingCalendario(false);
      }
    })();
  }, [etapa, calendarioCarregado, establishmentId]);

  // Step 3: compute available slots
  useEffect(() => {
    if (etapa !== 3 || !dataSelecionada || horarios.length === 0 || !establishmentId) return;

    (async () => {
      setLoadingSlots(true);
      setHorarioSelecionado(null);
      try {
        const [y, m, d] = dataSelecionada.split('-').map(Number);
        const diaSemana = new Date(y, m - 1, d).getDay();
        const horarioDia = horarios.find(h => h.dia_semana === diaSemana);

        if (!horarioDia) { setSlots([]); return; }

        const { data: agData } = await supabase
          .from('agendamentos')
          .select('data_hora, duracao_minutos')
          .eq('estabelecimento_id', establishmentId)
          .gte('data_hora', `${dataSelecionada}T00:00:00Z`)
          .lte('data_hora', `${dataSelecionada}T23:59:59Z`)
          .in('status', ['pendente', 'confirmado']);

        setSlots(gerarSlots(horarioDia.hora_inicio, horarioDia.hora_fim, duracaoTotal, agData || []));
      } finally {
        setLoadingSlots(false);
      }
    })();
  }, [etapa, dataSelecionada, horarios, duracaoTotal, establishmentId]);

  // ─── Handlers ────────────────────────────────────────────────────────────────

  function toggleServico(serv: ServicoComVariacoes) {
    setSelecionados(prev => {
      const next = new Map(prev);
      if (next.has(serv.id)) next.delete(serv.id);
      else next.set(serv.id, { servico: serv, variacao: null });
      return next;
    });
  }

  function selecionarVariacao(servicoId: string, variacao: VariacaoServico) {
    setSelecionados(prev => {
      const next = new Map(prev);
      const item = next.get(servicoId);
      if (item) next.set(servicoId, { ...item, variacao });
      return next;
    });
  }

  function isDiaDisponivel(date: Date): boolean {
    if (date < hoje) return false;
    if (!horarios.some(h => h.dia_semana === date.getDay())) return false;
    const ds = dateToStr(date);
    if (bloqueios.some(b => ds >= b.data_inicio && ds <= b.data_fim)) return false;
    return true;
  }

  async function confirmarAgendamento() {
    if (!clienteId || !dataSelecionada || !horarioSelecionado) return;

    setSalvando(true);
    setErroSalvar(null);

    try {
      // 1. Read config
      const { data: config } = await supabase
        .from('configuracao_negocio')
        .select('aprovacao_automatica, mensagem_pos_agendamento')
        .eq('estabelecimento_id', establishmentId)
        .maybeSingle();

      const aprovAuto = config?.aprovacao_automatica ?? false;
      const msg = config?.mensagem_pos_agendamento || 'Obrigada pelo seu agendamento!';

      // 2. Re-verify slot (race condition check)
      const [yy, mm, dd] = dataSelecionada.split('-').map(Number);
      const diaSemana = new Date(yy, mm - 1, dd).getDay();
      const horarioDia = horarios.find(h => h.dia_semana === diaSemana);

      if (horarioDia) {
        const { data: agRecentes } = await supabase
          .from('agendamentos')
          .select('data_hora, duracao_minutos')
          .eq('estabelecimento_id', establishmentId)
          .gte('data_hora', `${dataSelecionada}T00:00:00Z`)
          .lte('data_hora', `${dataSelecionada}T23:59:59Z`)
          .in('status', ['pendente', 'confirmado']);

        const slotsAtuais = gerarSlots(
          horarioDia.hora_inicio,
          horarioDia.hora_fim,
          duracaoTotal,
          agRecentes || [],
        );

        if (!slotsAtuais.includes(horarioSelecionado)) {
          setSlots(slotsAtuais);
          setHorarioSelecionado(null);
          setErroSalvar('race');
          setEtapa(3);
          return;
        }
      }

      // 3. Insert agendamento — UUID gerado no cliente para evitar SELECT após INSERT
      const agendamentoId = crypto.randomUUID();

      // Converte horário local → UTC (igual ao painel da profissional)
      const dataHoraISO = new Date(`${dataSelecionada}T${horarioSelecionado}:00`).toISOString();

      const { error: agError } = await supabase
        .from('agendamentos')
        .insert({
          id: agendamentoId,
          cliente_id: clienteId,
          estabelecimento_id: establishmentId,
          data_hora: dataHoraISO,
          duracao_minutos: duracaoTotal,
          status: aprovAuto ? 'confirmado' : 'pendente',
          origem: 'portal',
          observacoes: observacoes.trim() || null,
        });

      if (agError) throw agError;

      // 4. Insert agendamento_servicos
      for (const item of itens) {
        const { error: asError } = await supabase
          .from('agendamento_servicos')
          .insert({
            agendamento_id: agendamentoId,
            servico_id: item.servico.id,
            variacao_id: item.variacao?.id ?? null,
            valor_cobrado: getValorEfetivo(item),
          });
        if (asError) throw asError;
      }

      setMensagemPos(msg);
      setFoiConfirmado(aprovAuto);
      setEtapa('sucesso');
    } catch (err: unknown) {
      console.error('Erro ao confirmar agendamento:', err);
      const msg =
        err instanceof Error
          ? err.message
          : err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : '';
      if (msg.includes('permission') || msg.includes('policy') || msg.includes('violat') || msg.includes('42501')) {
        setErroSalvar('perm');
      } else {
        setErroSalvar('generic');
      }
    } finally {
      setSalvando(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  if (etapa === 'sucesso') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-5 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center">
          <Heart className="w-8 h-8 text-rose-600 fill-rose-600" />
        </div>
        <div className="space-y-2">
          <h2 className="font-title text-2xl font-bold text-text-primary">{mensagemPos}</h2>
          <p className={`text-sm font-medium ${foiConfirmado ? 'text-green-600' : 'text-amber-600'}`}>
            {foiConfirmado
              ? 'Seu agendamento está confirmado!'
              : 'Seu agendamento está pendente de confirmação.'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mt-2 w-full">
          <button
            onClick={() => navigate(`/portal/${slug}/meus-agendamentos`)}
            className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-800 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
          >
            Ver meus agendamentos
          </button>
          <button
            onClick={() => navigate(`/portal/${slug}/catalogo`)}
            className="flex-1 py-2.5 border border-border text-text-secondary hover:bg-bg rounded-xl text-sm font-semibold transition-colors cursor-pointer"
          >
            Voltar ao catálogo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h1 className="font-title font-bold text-3xl text-text-primary">Agendar Serviço</h1>

      <IndicadorProgresso etapaAtual={etapa as number} />

      {/* ─── ETAPA 1 — Serviços ───────────────────────────────────────────────── */}
      {etapa === 1 && (
        <div className="space-y-5">
          {loadingServicos ? (
            <div className="flex flex-col items-center py-16 gap-3 text-text-secondary">
              <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
              <p className="text-sm">Carregando serviços...</p>
            </div>
          ) : categorias.length === 0 ? (
            <p className="text-center text-text-muted py-16">Nenhum serviço disponível no momento.</p>
          ) : (
            <>
              {categorias.map(cat => (
                <div key={cat.id} className="bg-white border border-border rounded-2xl overflow-hidden">
                  <div className="bg-rose-50/30 px-5 py-3 border-b border-border">
                    <h3 className="font-title font-semibold text-lg text-text-primary">{cat.nome}</h3>
                  </div>
                  <div className="divide-y divide-border">
                    {cat.servicos.map(serv => {
                      const isChecked = selecionados.has(serv.id);
                      const item = selecionados.get(serv.id);
                      return (
                        <div key={serv.id} className="p-5 space-y-3">
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleServico(serv)}
                              className="mt-1 w-4 h-4 accent-rose-600 cursor-pointer shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 flex-wrap">
                                <span className="font-semibold text-text-primary">{serv.nome}</span>
                                <div className="flex items-center gap-3 text-sm text-text-secondary shrink-0">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-rose-400" />
                                    {formatDuracao(serv.duracao_minutos)}
                                  </span>
                                  <span className="flex items-center gap-1 font-semibold text-text-primary">
                                    <Tag className="w-3.5 h-3.5 text-gold" />
                                    {formatValor(serv.valor)}
                                  </span>
                                </div>
                              </div>
                              {serv.descricao && (
                                <p className="text-sm text-text-secondary mt-0.5">{serv.descricao}</p>
                              )}
                            </div>
                          </label>

                          {/* Variações */}
                          {isChecked && serv.variacoes.length > 0 && (
                            <div className="ml-7 bg-rose-50/30 border border-rose-100 rounded-xl p-3 space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                                Escolha uma opção <span className="text-red-500">*</span>
                              </p>
                              {serv.variacoes.map(v => (
                                <label key={v.id} className="flex items-center gap-2.5 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`variacao-${serv.id}`}
                                    checked={item?.variacao?.id === v.id}
                                    onChange={() => selecionarVariacao(serv.id, v)}
                                    className="w-3.5 h-3.5 accent-rose-600 cursor-pointer"
                                  />
                                  <span className="text-sm text-text-secondary flex-1">{v.nome}</span>
                                  <div className="flex items-center gap-2 text-xs text-text-secondary shrink-0">
                                    {v.valor != null && (
                                      <span className="font-medium text-text-primary">{formatValor(v.valor)}</span>
                                    )}
                                    {v.duracao_minutos != null && (
                                      <span className="text-text-muted">• {formatDuracao(v.duracao_minutos)}</span>
                                    )}
                                  </div>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Resumo dinâmico */}
              {itens.length > 0 && (
                <div className="bg-rose-50/40 border border-rose-200 rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    Resumo da seleção
                  </h4>
                  {itens.map(it => (
                    <div key={it.servico.id} className="flex justify-between text-sm text-text-secondary">
                      <span>
                        {it.servico.nome}
                        {it.variacao ? ` — ${it.variacao.nome}` : ''}
                      </span>
                      <span className="font-medium text-text-primary">{formatValor(getValorEfetivo(it))}</span>
                    </div>
                  ))}
                  <div className="border-t border-rose-200 pt-3 flex justify-between text-sm font-semibold text-text-primary">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-rose-400" />
                      {formatDuracao(duracaoTotal)}
                    </span>
                    <span>{formatValor(valorTotal)}</span>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex justify-end pt-2">
            <button
              disabled={!podeAvancar1}
              onClick={() => setEtapa(2)}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-800 disabled:bg-rose-200 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {/* ─── ETAPA 2 — Calendário ─────────────────────────────────────────────── */}
      {etapa === 2 && (
        <div className="space-y-5">
          <div className="bg-white border border-border rounded-2xl p-5">
            {loadingCalendario ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
              </div>
            ) : (
              <>
                {/* Month navigation */}
                <div className="flex items-center justify-between mb-5">
                  <button
                    onClick={() => setMesAtual(prev => {
                      const d = new Date(prev.year, prev.month - 1, 1);
                      return { year: d.getFullYear(), month: d.getMonth() };
                    })}
                    className="p-1.5 rounded-lg hover:bg-bg text-text-secondary hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h3 className="font-title font-semibold text-lg text-text-primary">
                    {MESES_PT[mesAtual.month]} {mesAtual.year}
                  </h3>
                  <button
                    onClick={() => setMesAtual(prev => {
                      const d = new Date(prev.year, prev.month + 1, 1);
                      return { year: d.getFullYear(), month: d.getMonth() };
                    })}
                    className="p-1.5 rounded-lg hover:bg-bg text-text-secondary hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Day-of-week header */}
                <div className="grid grid-cols-7 mb-1">
                  {DIAS_SEMANA_PT.map(d => (
                    <div key={d} className="text-center text-xs font-semibold text-text-muted py-1">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {diasDoMes.map((date, i) => {
                    if (!date) return <div key={i} />;
                    const disponivel = isDiaDisponivel(date);
                    const ds = dateToStr(date);
                    const selecionado = ds === dataSelecionada;
                    const isHoje = date.getTime() === hoje.getTime();
                    return (
                      <button
                        key={i}
                        disabled={!disponivel}
                        onClick={() => {
                          setDataSelecionada(ds);
                          setEtapa(3);
                        }}
                        className={`aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                          selecionado
                            ? 'bg-rose-600 text-white'
                            : disponivel
                            ? `text-text-primary hover:bg-rose-50 hover:text-rose-600 cursor-pointer${isHoje ? ' ring-2 ring-rose-300' : ''}`
                            : 'text-gray-300 cursor-not-allowed'
                        }`}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setEtapa(1)}
              className="flex items-center gap-1.5 px-4 py-2.5 border border-border text-text-secondary hover:bg-bg rounded-xl text-sm font-semibold transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Voltar
            </button>
          </div>
        </div>
      )}

      {/* ─── ETAPA 3 — Horários ───────────────────────────────────────────────── */}
      {etapa === 3 && (
        <div className="space-y-5">
          <div className="bg-white border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-5 pb-4 border-b border-border">
              <Calendar className="w-4 h-4 text-rose-400 shrink-0" />
              <p className="text-sm font-medium text-text-secondary">
                {dataSelecionada ? formatDataExtenso(dataSelecionada) : ''}
              </p>
            </div>

            {loadingSlots ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
              </div>
            ) : slots.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-text-secondary text-sm">
                  Não há horários disponíveis para esta data. Escolha outra data.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {slots.map(slot => (
                  <button
                    key={slot}
                    onClick={() => setHorarioSelecionado(slot)}
                    className={`py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      horarioSelecionado === slot
                        ? 'bg-rose-600 text-white'
                        : 'bg-bg hover:bg-rose-50 hover:text-rose-600 text-text-primary border border-border'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </div>

          {erroSalvar === 'race' && (
            <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Este horário acabou de ser reservado. Por favor, escolha outro horário.
            </div>
          )}

          <div className="flex justify-between pt-2">
            <button
              onClick={() => { setErroSalvar(null); setEtapa(2); }}
              className="flex items-center gap-1.5 px-4 py-2.5 border border-border text-text-secondary hover:bg-bg rounded-xl text-sm font-semibold transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Voltar
            </button>
            {slots.length > 0 && (
              <button
                disabled={!horarioSelecionado}
                onClick={() => { setErroSalvar(null); setEtapa(4); }}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-800 disabled:bg-rose-200 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
              >
                Continuar
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── ETAPA 4 — Confirmação ────────────────────────────────────────────── */}
      {etapa === 4 && (
        <div className="space-y-5">
          {/* Resumo */}
          <div className="bg-white border border-border rounded-2xl p-5 space-y-4">
            <h3 className="font-title font-semibold text-lg text-text-primary">
              Resumo do agendamento
            </h3>

            <div className="space-y-2">
              {itens.map(it => (
                <div key={it.servico.id} className="flex justify-between text-sm">
                  <span className="text-text-secondary">
                    {it.servico.nome}
                    {it.variacao ? ` — ${it.variacao.nome}` : ''}
                  </span>
                  <span className="font-medium text-text-primary">{formatValor(getValorEfetivo(it))}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-start gap-2 text-sm text-text-secondary">
                <Calendar className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                <span>{dataSelecionada ? formatDataExtenso(dataSelecionada) : ''}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Clock className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{horarioSelecionado}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Clock className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Duração: {formatDuracao(duracaoTotal)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                <Tag className="w-4 h-4 text-gold shrink-0" />
                <span>Total: {formatValor(valorTotal)}</span>
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="bg-white border border-border rounded-2xl p-5 space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block">
              Observações{' '}
              <span className="font-normal normal-case text-text-muted">(opcional)</span>
            </label>
            <textarea
              rows={3}
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              placeholder="Alguma informação adicional para a profissional?"
              className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400 placeholder:text-text-muted resize-none"
            />
          </div>

          {erroSalvar && erroSalvar !== 'race' && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {erroSalvar === 'perm'
                ? 'Ocorreu um erro de permissão. Faça login novamente.'
                : 'Não foi possível realizar o agendamento. Tente novamente.'}
            </div>
          )}

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setEtapa(3)}
              className="flex items-center gap-1.5 px-4 py-2.5 border border-border text-text-secondary hover:bg-bg rounded-xl text-sm font-semibold transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Voltar
            </button>
            <button
              disabled={salvando}
              onClick={confirmarAgendamento}
              className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-800 disabled:bg-rose-400 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
            >
              {salvando ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
              ) : (
                <><CheckCircle className="w-4 h-4" /> Confirmar Agendamento</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
