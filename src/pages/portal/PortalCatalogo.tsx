import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Tag, Calendar, AlertCircle, Sparkles, RefreshCw, MessageSquare, ChevronDown, HelpCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { CategoriaServico, Servico, VariacaoServico } from '../../types';
import { usePortal } from '../../contexts/PortalContext';

interface ServicoComVariacoes extends Servico {
  variacoes: VariacaoServico[];
}

interface CategoriaComServicos extends CategoriaServico {
  servicos: ServicoComVariacoes[];
}

function formatDuracao(minutos: number): string {
  if (minutos <= 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (resto === 0) return `${horas}h`;
  return `${horas}h ${resto}min`;
}

function formatValor(valor: number): string {
  return `R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

const FAQ_ITEMS = [
  {
    pergunta: 'Quais formas de pagamento são aceitas?',
    resposta: 'O portal serve para reservar o seu horário e garantir a sua vaga na agenda da profissional. O pagamento é feito diretamente no estúdio no dia do atendimento (dinheiro, Pix, cartão, etc.), salvo combinação prévia com a profissional.',
  },
  {
    pergunta: 'O que acontece se eu me atrasar?',
    resposta: 'Cada profissional define seu próprio tempo de tolerância. Se se atrasar, entre em contato imediatamente com ela via WhatsApp.',
  },
  {
    pergunta: 'Como eu sei se meu agendamento foi aprovado?',
    resposta: 'Na aba Meus Agendamentos, o status exibirá Confirmado (horário garantido) ou Pendente (aguardando aprovação da profissional).',
  },
  {
    pergunta: 'Por que o botão de cancelar sumiu?',
    resposta: 'O cancelamento online só é permitido com uma antecedência mínima definida pela profissional (ex: 24h antes). Se o prazo já passou, entre em contato diretamente com ela.',
  },
  {
    pergunta: 'Não consigo agendar online, só aparece um botão de WhatsApp. Por quê?',
    resposta: 'Isso significa que o estúdio utiliza o agendamento via WhatsApp. Entre em contato com a profissional pelo botão exibido no portal para solicitar seu horário.',
  },
];

function SkeletonCard() {
  return (
    <div className="bg-white border border-border rounded-2xl p-5 animate-pulse">
      <div className="h-5 bg-gray-200 rounded-lg w-3/4 mb-3"></div>
      <div className="h-3 bg-gray-100 rounded w-full mb-1.5"></div>
      <div className="h-3 bg-gray-100 rounded w-2/3 mb-5"></div>
      <div className="flex items-center gap-3 mb-5">
        <div className="h-4 bg-gray-200 rounded w-20"></div>
        <div className="h-4 bg-gray-200 rounded w-24"></div>
      </div>
      <div className="h-9 bg-rose-100 rounded-xl w-full"></div>
    </div>
  );
}

interface ServicoCardProps {
  servico: ServicoComVariacoes;
  onAgendar: () => void;
  isBasico: boolean;
  nomeNegocio: string | null;
}

function ServicoCard({ servico, onAgendar, isBasico, nomeNegocio }: ServicoCardProps) {
  if (isBasico) {
    const whatsappText = `Olá! Gostaria de agendar o serviço *${servico.nome}* (${formatValor(servico.valor)}) no *${nomeNegocio || 'Estúdio'}*.`;
    const whatsappUrl = `https://wa.me/5511999999999?text=${encodeURIComponent(whatsappText)}`;
    
    return (
      <div className="bg-white border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col gap-3">
        <h3 className="font-title font-semibold text-xl text-text-primary leading-snug">
          {servico.nome}
        </h3>

        {servico.descricao && (
          <p className="text-sm text-text-secondary leading-relaxed">{servico.descricao}</p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-sm text-text-secondary">
            <Clock className="w-4 h-4 text-rose-400" />
            {formatDuracao(servico.duracao_minutos)}
          </span>
          <span className="flex items-center gap-1.5 text-base font-semibold text-text-primary">
            <Tag className="w-4 h-4 text-gold" />
            {formatValor(servico.valor)}
          </span>
        </div>

        {servico.variacoes.length > 0 && (
          <div className="border-t border-border pt-3 space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Opções</p>
            {servico.variacoes.map(v => (
              <div key={v.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-text-secondary">{v.nome}</span>
                <div className="flex items-center gap-1.5 text-text-secondary shrink-0">
                  {v.valor != null && (
                    <span className="font-medium text-text-primary">{formatValor(v.valor)}</span>
                  )}
                  {v.duracao_minutos != null && (
                    <span className="text-xs text-text-muted">• {formatDuracao(v.duracao_minutos)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors duration-200 flex items-center justify-center gap-2 text-center"
        >
          <MessageSquare className="w-4 h-4" />
          Agendar via WhatsApp
        </a>
      </div>
    );
  }

  return (
    <div className="bg-white border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col gap-3">
      <h3 className="font-title font-semibold text-xl text-text-primary leading-snug">
        {servico.nome}
      </h3>

      {servico.descricao && (
        <p className="text-sm text-text-secondary leading-relaxed">{servico.descricao}</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 text-sm text-text-secondary">
          <Clock className="w-4 h-4 text-rose-400" />
          {formatDuracao(servico.duracao_minutos)}
        </span>
        <span className="flex items-center gap-1.5 text-base font-semibold text-text-primary">
          <Tag className="w-4 h-4 text-gold" />
          {formatValor(servico.valor)}
        </span>
      </div>

      {servico.variacoes.length > 0 && (
        <div className="border-t border-border pt-3 space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Opções</p>
          {servico.variacoes.map(v => (
            <div key={v.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-text-secondary">{v.nome}</span>
              <div className="flex items-center gap-1.5 text-text-secondary shrink-0">
                {v.valor != null && (
                  <span className="font-medium text-text-primary">{formatValor(v.valor)}</span>
                )}
                {v.duracao_minutos != null && (
                  <span className="text-xs text-text-muted">• {formatDuracao(v.duracao_minutos)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onAgendar}
        className="mt-auto w-full py-2.5 bg-rose-600 hover:bg-rose-800 text-white rounded-xl text-sm font-semibold transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer"
      >
        <Calendar className="w-4 h-4" />
        Agendar
      </button>
    </div>
  );
}

export default function PortalCatalogo() {
  const navigate = useNavigate();
  const { establishmentId, slug, plano, nomeNegocio } = usePortal();
  const [categorias, setCategorias] = useState<CategoriaComServicos[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('todas');
  const [faqAberto, setFaqAberto] = useState<number | null>(null);

  const isBasico = plano === 'basico';

  const fetchData = async () => {
    if (!establishmentId) return;
    setLoading(true);
    setError(false);
    try {
      const [catResult, servResult] = await Promise.all([
        supabase
          .from('categorias_servico')
          .select('*')
          .eq('estabelecimento_id', establishmentId)
          .order('ordem', { ascending: true }),
        supabase
          .from('servicos')
          .select('*, variacoes_servico(*)')
          .eq('estabelecimento_id', establishmentId)
          .eq('ativo', true)
          .order('nome', { ascending: true }),
      ]);

      if (catResult.error) throw catResult.error;
      if (servResult.error) throw servResult.error;

      const servicos = servResult.data || [];

      const mapped: CategoriaComServicos[] = (catResult.data || [])
        .map(cat => ({
          ...cat,
          servicos: servicos
            .filter(s => s.categoria_id === cat.id)
            .map(s => ({
              ...s,
              variacoes: (s as any).variacoes_servico || [],
            })),
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
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [establishmentId]);

  const categoriasExibidas =
    categoriaAtiva === 'todas'
      ? categorias
      : categorias.filter(c => c.id === categoriaAtiva);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded-lg w-48 animate-pulse"></div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-8 bg-gray-100 rounded-full w-24 shrink-0 animate-pulse"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <AlertCircle className="w-12 h-12 text-rose-400" />
        <p className="font-semibold text-text-primary">Não foi possível carregar os serviços.</p>
        <p className="text-sm text-text-secondary">Tente novamente.</p>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-800 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Tentar novamente
        </button>
      </div>
    );
  }

  if (categorias.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <Sparkles className="w-12 h-12 text-rose-200" />
        <p className="font-title text-lg font-medium text-text-primary">
          Nenhum serviço disponível no momento.
        </p>
        <p className="text-sm text-text-muted">Em breve novidades!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-title font-bold text-3xl text-text-primary">Nossos Serviços</h1>
        <button
          onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-text-secondary hover:text-rose-600 hover:border-rose-300 text-xs font-medium transition-colors cursor-pointer shrink-0"
        >
          <HelpCircle className="w-4 h-4" />
          Dúvidas?
        </button>
      </div>

      {/* WhatsApp banner if studio is on basic plan */}
      {isBasico && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
          <div className="flex gap-3 items-start flex-1">
            <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center shrink-0 mt-0.5">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div className="space-y-1">
              <h3 className="font-title font-semibold text-base text-green-900">
                Agendamentos via WhatsApp
              </h3>
              <p className="text-sm text-green-800 leading-relaxed">
                Neste estúdio, os horários são marcados diretamente via WhatsApp. Escolha o serviço abaixo para solicitar ou clique no botão para conversar conosco.
              </p>
            </div>
          </div>
          <a
            href={`https://wa.me/5511999999999?text=${encodeURIComponent(`Olá! Gostaria de agendar um serviço no *${nomeNegocio || 'Estúdio'}*.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors shrink-0 self-start md:self-auto"
          >
            <MessageSquare className="w-4 h-4" />
            Conversar no WhatsApp
          </a>
        </div>
      )}

      {/* Pills de categoria */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setCategoriaAtiva('todas')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
            categoriaAtiva === 'todas'
              ? 'bg-rose-600 text-white'
              : 'bg-white border border-border text-text-secondary hover:border-rose-300 hover:text-rose-600'
          }`}
        >
          Todas
        </button>
        {categorias.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategoriaAtiva(cat.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              categoriaAtiva === cat.id
                ? 'bg-rose-600 text-white'
                : 'bg-white border border-border text-text-secondary hover:border-rose-300 hover:text-rose-600'
            }`}
          >
            {cat.nome}
          </button>
        ))}
      </div>

      {/* Seções por categoria */}
      <div className="space-y-10">
        {categoriasExibidas.map(cat => (
          <section key={cat.id}>
            <h2 className="font-title font-semibold text-2xl text-text-primary mb-4 pb-2 border-b border-border">
              {cat.nome}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cat.servicos.map(serv => (
                <ServicoCard
                  key={serv.id}
                  servico={serv}
                  onAgendar={() => navigate(`/portal/${slug}/agendar?servico=${serv.id}`)}
                  isBasico={isBasico}
                  nomeNegocio={nomeNegocio}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Dúvidas Frequentes */}
      <section id="faq" className="pt-4 border-t border-border">
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="w-5 h-5 text-rose-500" />
          <h2 className="font-title font-semibold text-xl text-text-primary">Dúvidas Frequentes</h2>
        </div>
        <div className="space-y-2">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className="bg-white border border-border rounded-2xl overflow-hidden">
              <button
                onClick={() => setFaqAberto(faqAberto === i ? null : i)}
                className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left cursor-pointer hover:bg-rose-50/40 transition-colors"
              >
                <span className="font-medium text-sm text-text-primary">{item.pergunta}</span>
                <ChevronDown
                  className={`w-4 h-4 text-rose-400 shrink-0 transition-transform duration-200 ${faqAberto === i ? 'rotate-180' : ''}`}
                />
              </button>
              {faqAberto === i && (
                <div className="px-5 pb-4 pt-3 text-sm text-text-secondary leading-relaxed border-t border-border">
                  {item.resposta}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
