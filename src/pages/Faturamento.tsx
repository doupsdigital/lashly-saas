import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { supabase } from '../lib/supabase';
import { 
  Check, 
  CreditCard, 
  QrCode, 
  Sparkles, 
  Calendar, 
  AlertTriangle, 
  ShieldCheck,
  Users
} from 'lucide-react';

export default function Faturamento() {
  const { profile, refreshProfile } = useAuth();
  const { isSubscriptionActive, isPremium, status, trialEndsAt } = useSubscription();

  const [loading, setLoading] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<'none' | 'pix' | 'card'>('none');
  const [selectedPlanToBuy, setSelectedPlanToBuy] = useState<'basico' | 'premium'>('premium');
  
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Calcular dias restantes do trial
  const calculateDaysRemaining = () => {
    if (!trialEndsAt) return 0;
    const diffTime = new Date(trialEndsAt).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  const daysRemaining = calculateDaysRemaining();

  // Função para simular o pagamento pelo Asaas localmente
  const handleSimulateAsaasPayment = async () => {
    if (!profile?.estabelecimento_id) return;
    setLoading(true);
    try {
      // Atualiza diretamente no banco para simular a resposta do webhook do Asaas
      const { error } = await supabase
        .from('estabelecimentos')
        .update({
          plano: selectedPlanToBuy,
          status_assinatura: 'ativo',
          billing_customer_id: 'cus_simulated_asaas_' + Math.random().toString(36).substring(7),
          billing_subscription_id: 'sub_simulated_asaas_' + Math.random().toString(36).substring(7)
        })
        .eq('id', profile.estabelecimento_id);

      if (error) throw error;

      await refreshProfile();
      setCheckoutMode('none');
      alert(`Pagamento simulado com sucesso! Plano atualizado para ${selectedPlanToBuy === 'premium' ? 'Premium (Agenda Digital)' : 'Básico (Apenas CRM)'}/Ativo.`);
    } catch (err) {
      console.error(err);
      alert('Erro ao simular pagamento.');
    } finally {
      setLoading(false);
    }
  };

  // Função para simular cancelamento da assinatura
  const handleCancelSubscription = async () => {
    if (!profile?.estabelecimento_id) return;
    if (!confirm('Deseja realmente cancelar sua assinatura? Você perderá acesso às funcionalidades premium.')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('estabelecimentos')
        .update({
          plano: 'basico',
          status_assinatura: 'cancelado'
        })
        .eq('id', profile.estabelecimento_id);

      if (error) throw error;

      await refreshProfile();
      alert('Assinatura cancelada com sucesso. Retornado ao plano básico.');
    } catch (err) {
      console.error(err);
      alert('Erro ao cancelar assinatura.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto font-sans">
      
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-title font-bold text-3xl text-text-primary">Faturamento e Assinatura</h1>
          <p className="text-sm text-text-secondary mt-1">Gerencie os planos do seu estúdio e formas de pagamento no modelo SaaS.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Painel Esquerdo: Status da Assinatura */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-4">Assinatura Atual</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs text-text-secondary">Plano Ativo</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-lg font-bold font-title ${isPremium ? 'text-rose-600' : 'text-text-primary'}`}>
                    {isPremium ? 'Premium (Agenda Digital)' : 'Básico (Apenas CRM)'}
                  </span>
                  {isPremium && <Sparkles className="w-4 h-4 text-rose-500 animate-pulse" />}
                </div>
              </div>

              <div>
                <p className="text-xs text-text-secondary">Status</p>
                <div className="mt-1.5">
                  {status === 'ativo' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold rounded-full">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Assinatura Ativa
                    </span>
                  )}
                  {status === 'trial' && isSubscriptionActive() && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold rounded-full">
                      <Calendar className="w-3.5 h-3.5 animate-pulse" />
                      Período de Testes ({daysRemaining} dias restantes)
                    </span>
                  )}
                  {status === 'trial' && !isSubscriptionActive() && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-full">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Trial Expirado
                    </span>
                  )}
                  {status === 'suspenso' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-full">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Suspenso por Inadimplência
                    </span>
                  )}
                  {status === 'cancelado' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 border border-gray-200 text-gray-700 text-xs font-semibold rounded-full">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Assinatura Cancelada
                    </span>
                  )}
                </div>
              </div>

              {trialEndsAt && status === 'trial' && (
                <div>
                  <p className="text-xs text-text-secondary">Término do Teste</p>
                  <p className="text-sm font-semibold text-text-primary mt-1">
                    {new Date(trialEndsAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}

              {status === 'ativo' && (
                <div className="pt-4 border-t border-border space-y-2">
                  {isPremium ? (
                    <>
                      <button
                        onClick={async () => {
                          if (!profile?.estabelecimento_id) return;
                          setLoading(true);
                          try {
                            const { error } = await supabase
                              .from('estabelecimentos')
                              .update({ plano: 'basico' })
                              .eq('id', profile.estabelecimento_id);
                            if (error) throw error;
                            await refreshProfile();
                            alert('Plano alterado para Básico (Assinatura ativa para teste).');
                          } catch (err) {
                            console.error(err);
                          } finally {
                            setLoading(false);
                          }
                        }}
                        disabled={loading}
                        className="w-full py-2.5 px-4 text-xs font-semibold text-text-primary border border-border hover:bg-bg rounded-xl transition-all cursor-pointer"
                      >
                        Mudar para Plano Básico (Teste)
                      </button>
                      <button
                        onClick={handleCancelSubscription}
                        disabled={loading}
                        className="w-full py-2.5 px-4 text-xs font-semibold text-red-600 hover:text-red-700 border border-red-200 hover:bg-red-50/50 rounded-xl transition-all cursor-pointer"
                      >
                        {loading ? 'Cancelando...' : 'Cancelar Assinatura'}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={async () => {
                        if (!profile?.estabelecimento_id) return;
                        setLoading(true);
                        try {
                          const { error } = await supabase
                            .from('estabelecimentos')
                            .update({ plano: 'premium' })
                            .eq('id', profile.estabelecimento_id);
                          if (error) throw error;
                          await refreshProfile();
                          alert('Plano alterado para Premium (Assinatura ativa para teste).');
                        } catch (err) {
                          console.error(err);
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      className="w-full py-2.5 px-4 text-xs font-semibold text-rose-600 border border-rose-200 hover:bg-rose-50/50 rounded-xl transition-all cursor-pointer"
                    >
                      Mudar para Plano Premium (Teste)
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Painel Direito: Escolha de Planos e Simulação de Pagamento */}
        <div className="md:col-span-2 space-y-8">
          
          {checkoutMode === 'none' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* CARD PLANO BÁSICO */}
              <div className={`bg-white border rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between ${!isPremium ? 'border-text-primary ring-2 ring-text-primary/10' : 'border-border'}`}>
                <div>
                  <div className="p-6 bg-gradient-to-tr from-rose-500/10 via-pink-500/5 to-transparent border-b border-border">
                    <h2 className="font-title font-bold text-lg text-text-primary flex items-center gap-2">
                      <Users className="w-5 h-5 text-text-secondary" />
                      Plano Básico (CRM)
                    </h2>
                    <p className="text-xs text-text-secondary mt-1">Ideal para profissionais que desejam apenas organizar a carteira de clientes e prontuários.</p>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-2xl font-extrabold font-title text-text-primary">R$ 59,90</span>
                      <span className="text-xs font-semibold text-text-secondary">/ mês</span>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    {!isPremium && status === 'trial' && (
                      <div className="py-1.5 text-center text-xs font-semibold text-amber-700 bg-amber-50 rounded-lg border border-amber-200">
                        Seu plano de testes atual
                      </div>
                    )}
                    <ul className="space-y-2.5 text-xs text-text-secondary">
                      {['Cadastro de Clientes ilimitado', 'Fichas de Anamnese Customizadas', 'Dashboard de Relatórios', 'Histórico de Atendimentos', 'Suporte por E-mail'].map((feat) => (
                        <li key={feat} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="p-6 border-t border-border">
                  {!isPremium && status === 'ativo' ? (
                    <div className="py-2 text-center text-xs font-semibold text-green-700 bg-green-50 rounded-xl border border-green-200">
                      Plano Ativo
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => {
                          setSelectedPlanToBuy('basico');
                          setCheckoutMode('pix');
                        }}
                        className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        Assinar via Pix
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPlanToBuy('basico');
                          setCheckoutMode('card');
                        }}
                        className="w-full py-2.5 border border-border hover:bg-bg text-text-primary rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Assinar via Cartão
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* CARD PLANO PREMIUM */}
              <div className={`bg-white border rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between ${isPremium ? 'border-rose-600 ring-2 ring-rose-100' : 'border-border'}`}>
                <div>
                  <div className="p-6 bg-gradient-to-tr from-rose-500/10 via-pink-500/5 to-transparent border-b border-border">
                    <h2 className="font-title font-bold text-lg text-text-primary flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-rose-600" />
                      Plano Premium (Agenda)
                    </h2>
                    <p className="text-xs text-text-secondary mt-1">Perfeito para quem quer automatizar a recepção de agendamentos 24h por dia das clientes.</p>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-2xl font-extrabold font-title text-text-primary">R$ 99,90</span>
                      <span className="text-xs font-semibold text-text-secondary">/ mês</span>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    {isPremium && status === 'trial' && (
                      <div className="py-1.5 text-center text-xs font-semibold text-rose-700 bg-rose-50 rounded-lg border border-rose-200">
                        Seu plano de testes atual
                      </div>
                    )}
                    <ul className="space-y-2.5 text-xs text-text-secondary">
                      {['TUDO do Plano Básico', 'Portal de Agendamento Online', 'Horários Dinâmicos', 'Bloqueios Rápidos de Agenda', 'Aprovação Manual/Automática', 'Suporte Prioritário'].map((feat) => (
                        <li key={feat} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                          <span className={feat.startsWith('TUDO') ? 'font-semibold text-text-primary' : ''}>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="p-6 border-t border-border">
                  {isPremium && status === 'ativo' ? (
                    <div className="py-2 text-center text-xs font-semibold text-green-700 bg-green-50 rounded-xl border border-green-200">
                      Plano Ativo
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => {
                          setSelectedPlanToBuy('premium');
                          setCheckoutMode('pix');
                        }}
                        className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        Assinar via Pix
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPlanToBuy('premium');
                          setCheckoutMode('card');
                        }}
                        className="w-full py-2.5 border border-border hover:bg-bg text-text-primary rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Assinar via Cartão
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            /* Tela de Simulação de Checkout do Asaas */
            <div className="bg-white border border-border rounded-2xl shadow-sm p-6 md:p-8 animate-fade-in relative">
              <h2 className="font-title font-bold text-xl text-text-primary mb-2 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-rose-600" />
                Checkout Asaas - Plano {selectedPlanToBuy === 'premium' ? 'Premium (R$ 99,90)' : 'Básico (R$ 59,90)'}
              </h2>
              <p className="text-sm text-text-secondary mb-6">Esta tela simula o checkout seguro e emissão de cobrança do gateway Asaas.</p>

              {checkoutMode === 'pix' ? (
                <div className="space-y-6 flex flex-col items-center">
                  <div className="p-4 bg-gray-50 border border-border rounded-2xl flex flex-col items-center justify-center w-48 h-48 shadow-inner animate-pulse">
                    {/* QR Code Simulado */}
                    <svg viewBox="0 0 100 100" className="w-36 h-36 text-text-primary">
                      <rect width="100" height="100" fill="none" />
                      <path d="M10,10 h20 v20 h-20 z M15,15 h10 v10 h-10 z" fill="currentColor" />
                      <path d="M70,10 h20 v20 h-20 z M75,15 h10 v10 h-10 z" fill="currentColor" />
                      <path d="M10,70 h20 v20 h-20 z M15,75 h10 v10 h-10 z" fill="currentColor" />
                      <path d="M40,10 h10 v10 h-10 z M55,15 h10 v10 h-10 z M45,45 h20 v20 h-20 z" fill="currentColor" />
                      <path d="M75,75 h15 v5 h-15 z M85,85 h5 v5 h-5 z" fill="currentColor" />
                    </svg>
                  </div>

                  <div className="w-full text-center">
                    <p className="text-sm font-semibold text-text-primary">Código Copia e Cola Pix:</p>
                    <div className="mt-2 p-3 bg-bg border border-border rounded-xl text-xs font-mono text-text-secondary select-all break-all">
                      00020101021226830014br.gov.bcb.pix2561asaas.com/qr/v2/simulated_pix_code_{selectedPlanToBuy}_lashly
                    </div>
                  </div>

                  <div className="w-full flex gap-3 pt-4 border-t border-border">
                    <button
                      onClick={() => setCheckoutMode('none')}
                      className="flex-1 py-2.5 border border-border hover:bg-bg rounded-xl text-xs font-semibold text-text-secondary transition-all cursor-pointer"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleSimulateAsaasPayment}
                      disabled={loading}
                      className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                    >
                      {loading ? 'Confirmando...' : 'Confirmar Pagamento Pix'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Cartão de Crédito */
                <form onSubmit={(e) => { e.preventDefault(); handleSimulateAsaasPayment(); }} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-text-secondary block">Nome Impresso no Cartão</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: AMANDA SOUZA"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2.5 border border-border rounded-xl bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400 placeholder:text-text-muted"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-text-secondary block">Número do Cartão</label>
                    <input
                      type="text"
                      required
                      maxLength={19}
                      placeholder="4444 5555 6666 7777"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim())}
                      className="w-full px-3 py-2.5 border border-border rounded-xl bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400 placeholder:text-text-muted"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-text-secondary block">Validade</label>
                      <input
                        type="text"
                        required
                        maxLength={5}
                        placeholder="MM/AA"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value.replace(/\D/g, '').replace(/(\d{2})/, '$1/').substring(0, 5))}
                        className="w-full px-3 py-2.5 border border-border rounded-xl bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400 placeholder:text-text-muted"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-text-secondary block">CVV</label>
                      <input
                        type="password"
                        required
                        maxLength={3}
                        placeholder="123"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3 py-2.5 border border-border rounded-xl bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400 placeholder:text-text-muted"
                      />
                    </div>
                  </div>

                  <div className="w-full flex gap-3 pt-6 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setCheckoutMode('none')}
                      className="flex-1 py-2.5 border border-border hover:bg-bg rounded-xl text-xs font-semibold text-text-secondary transition-all cursor-pointer"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                    >
                      {loading ? 'Confirmando...' : 'Assinar com Cartão'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
