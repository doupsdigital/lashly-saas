import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Plus, 
  Search, 
  AlertCircle, 
  X, 
  UserPlus, 
  ChevronLeft, 
  ChevronRight,
  Filter
} from 'lucide-react';
import type { Cliente } from '../types';

interface ClienteWithAttendances extends Cliente {
  atendimentos?: { data_atendimento: string }[];
}

export default function Clientes() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<ClienteWithAttendances[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativos' | 'inativos'>('todos');
  const [periodFilter, setPeriodFilter] = useState<string>('este_mes');
  
  // Custom period dates
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form States
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [cpf, setCpf] = useState('');
  const [endereco, setEndereco] = useState('');
  const [comoConheceu, setComoConheceu] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch clients and join with their attendances
      const { data, error } = await supabase
        .from('clientes')
        .select(`
          *,
          atendimentos (
            data_atendimento
          )
        `)
        .order('nome', { ascending: true });

      if (error) throw error;
      setClientes(data || []);
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
      showTemporaryError('Falha ao carregar clientes do banco.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showTemporaryError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 5000);
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

  // Helper to determine date ranges for filter on created_at
  const getPeriodInterval = (period: string) => {
    const now = new Date();
    let start = new Date(0); // far past
    let end = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 365); // far future
    
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    switch (period) {
      case 'hoje':
        start = startOfToday;
        end = endOfToday;
        break;
      case 'ontem':
        start = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
        end = new Date(endOfToday.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7dias':
        start = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
        end = endOfToday;
        break;
      case 'este_mes':
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'mes_passado':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      case 'este_ano':
        start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      case 'personalizado':
        if (customStart) {
          const [y, m, d] = customStart.split('-').map(Number);
          start = new Date(y, m - 1, d, 0, 0, 0, 0);
        }
        if (customEnd) {
          const [y, m, d] = customEnd.split('-').map(Number);
          end = new Date(y, m - 1, d, 23, 59, 59, 999);
        }
        break;
    }
    return { start, end };
  };

  const handleOpenModal = () => {
    setNome('');
    setSobrenome('');
    setWhatsapp('');
    setEmail('');
    setDataNascimento('');
    setCpf('');
    setEndereco('');
    setComoConheceu('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim() || !sobrenome.trim() || !whatsapp.trim()) {
      showTemporaryError('Nome, sobrenome e WhatsApp são obrigatórios.');
      return;
    }

    try {
      // 1. Check if WhatsApp is unique
      const { data: existing, error: checkError } = await supabase
        .from('clientes')
        .select('id')
        .eq('whatsapp', whatsapp)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        showTemporaryError('Já existe um cliente cadastrado com este número de WhatsApp.');
        return;
      }

      // 2. Insert new client
      const clientPayload = {
        nome,
        sobrenome,
        whatsapp,
        email: email.trim() || null,
        data_nascimento: dataNascimento || null,
        cpf: cpf.trim() || null,
        endereco: endereco.trim() || null,
        como_conheceu: comoConheceu || null,
        ativo: true
      };

      const { data: newClient, error: insertError } = await supabase
        .from('clientes')
        .insert(clientPayload)
        .select()
        .single();

      if (insertError) throw insertError;
      if (!newClient) throw new Error('Erro ao salvar cliente.');

      await logAction('criou', 'cliente', newClient.id, `Cadastrou o cliente "${nome} ${sobrenome}"`);
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      showTemporaryError('Falha ao salvar o cliente.');
    }
  };

  // Helper to determine last attendance date
  const getLastAttendanceDate = (client: ClienteWithAttendances) => {
    if (!client.atendimentos || client.atendimentos.length === 0) {
      return 'Nenhum';
    }
    const dates = client.atendimentos.map(a => new Date(a.data_atendimento).getTime());
    const maxDate = new Date(Math.max(...dates));
    return maxDate.toLocaleDateString('pt-BR');
  };

  // Filter clients
  const filterInterval = getPeriodInterval(periodFilter);

  const filteredClientes = clientes.filter(client => {
    // 1. Search text (name or whatsapp)
    const fullName = `${client.nome} ${client.sobrenome}`.toLowerCase();
    const searchMatch = 
      fullName.includes(searchTerm.toLowerCase()) || 
      client.whatsapp.includes(searchTerm);

    // 2. Status filter
    const statusMatch = 
      statusFilter === 'todos' ||
      (statusFilter === 'ativos' && client.ativo) ||
      (statusFilter === 'inativos' && !client.ativo);

    // 3. Period filter (on created_at)
    if (!client.created_at) return searchMatch && statusMatch;
    const createdAtDate = new Date(client.created_at);
    const periodMatch = 
      createdAtDate >= filterInterval.start && 
      createdAtDate <= filterInterval.end;

    return searchMatch && statusMatch && periodMatch;
  });

  // Paginated clients calculation
  const totalPages = Math.ceil(filteredClientes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClientes = filteredClientes.slice(startIndex, startIndex + itemsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, periodFilter, customStart, customEnd]);

  return (
    <div className="space-y-6">
      {/* Top Banner Alert for Errors */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-3 animate-fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
          <p className="text-sm font-medium">{errorMessage}</p>
        </div>
      )}

      {/* Period Filter Selector */}
      <div className="bg-white border border-border rounded-[14px] p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-2.5">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-rose-600" />
            Filtrar Clientes por Período de Cadastro
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'hoje', label: 'Hoje' },
              { id: 'ontem', label: 'Ontem' },
              { id: '7dias', label: 'Últimos 7 dias' },
              { id: 'este_mes', label: 'Este mês' },
              { id: 'mes_passado', label: 'Mês passado' },
              { id: 'este_ano', label: 'Este ano' },
              { id: 'personalizado', label: 'Personalizado' },
            ].map(period => (
              <button
                key={period.id}
                onClick={() => setPeriodFilter(period.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${periodFilter === period.id 
                  ? 'bg-rose-600 border-rose-600 text-white font-semibold' 
                  : 'bg-white border-border text-text-secondary hover:bg-rose-50 hover:text-rose-600'}`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom date range fields */}
        {periodFilter === 'personalizado' && (
          <div className="flex flex-wrap items-center gap-3 bg-bg/40 p-3 rounded-lg border border-border/60 animate-fade-in max-w-lg">
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary">De:</span>
              <input 
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2 py-1 border border-border rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-rose-400"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary">Até:</span>
              <input 
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2 py-1 border border-border rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-rose-400"
              />
            </div>
          </div>
        )}
      </div>

      {/* Search & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-border rounded-[14px] p-5 shadow-sm">
        {/* Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-muted" />
            <input 
              type="text" 
              placeholder="Buscar por nome ou WhatsApp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400 placeholder:text-text-muted"
            />
          </div>

          {/* Status selector */}
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400 cursor-pointer"
          >
            <option value="todos">Todos os Status</option>
            <option value="ativos">Apenas Ativos</option>
            <option value="inativos">Apenas Inativos</option>
          </select>
        </div>

        {/* Create button */}
        <button
          onClick={handleOpenModal}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-800 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Adicionar Cliente
        </button>
      </div>

      {/* Main List Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600 mb-2"></div>
          <p className="text-sm">Carregando clientes...</p>
        </div>
      ) : filteredClientes.length === 0 ? (
        <div className="bg-white border border-border rounded-[14px] p-12 text-center text-text-secondary shadow-sm">
          <UserPlus className="w-12 h-12 text-rose-200 mx-auto mb-3" />
          <p className="font-title font-medium text-lg text-text-primary">Nenhum cliente cadastrado no período</p>
          <p className="text-sm text-text-muted mt-1">Experimente alterar os filtros ou cadastrar novos clientes.</p>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-[14px] overflow-hidden shadow-sm flex flex-col justify-between">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-rose-50/10 border-b border-border text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">WhatsApp</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Último Atendimento</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedClientes.map(client => {
                  const initials = `${client.nome[0] || ''}${client.sobrenome[0] || ''}`.toUpperCase();
                  const lastAttendance = getLastAttendanceDate(client);
                  
                  return (
                    <tr 
                      key={client.id}
                      onClick={() => navigate(`/clientes/${client.id}`)}
                      className={`hover:bg-bg/25 transition-colors cursor-pointer group ${!client.ativo ? 'opacity-60 bg-gray-50/20' : ''}`}
                    >
                      {/* Avatar + Name */}
                      <td className="px-6 py-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-rose-100 border border-rose-200 text-rose-800 flex items-center justify-center font-title font-semibold text-sm">
                          {initials}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-text-primary group-hover:text-rose-600 transition-colors">
                            {client.nome} {client.sobrenome}
                          </p>
                          <p className="text-[10px] text-text-muted">
                            Cadastrado em: {new Date(client.created_at || '').toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </td>
                      {/* WhatsApp */}
                      <td className="px-6 py-4 text-sm text-text-primary">
                        {client.whatsapp}
                      </td>
                      {/* Email */}
                      <td className="px-6 py-4 text-sm text-text-secondary">
                        {client.email || <span className="text-text-muted italic">Não informado</span>}
                      </td>
                      {/* Last Attendance */}
                      <td className="px-6 py-4 text-sm text-text-secondary">
                        {lastAttendance}
                      </td>
                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${client.ativo 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-500'}`}
                        >
                          {client.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-border flex items-center justify-between text-xs text-text-secondary bg-rose-50/5">
              <span>Página {currentPage} de {totalPages} ({filteredClientes.length} total)</span>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 border border-border rounded-lg bg-white hover:bg-bg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 border border-border rounded-lg bg-white hover:bg-bg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-[14px] border border-border shadow-xl w-full max-w-lg overflow-hidden my-8 animate-slide-up">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-rose-50/10">
              <h4 className="font-title font-semibold text-lg text-text-primary flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-rose-600" />
                Cadastrar Novo Cliente
              </h4>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-text-secondary hover:text-rose-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-5">
              {/* Mandatory Fields */}
              <div className="space-y-4">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border pb-1">Dados Obrigatórios</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      Nome <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ex: Maria"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      Sobrenome <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ex: Oliveira"
                      value={sobrenome}
                      onChange={(e) => setSobrenome(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    WhatsApp <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: (11) 99999-9999 (apenas números)"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ''))} // Save numbers only
                    className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400"
                  />
                </div>
              </div>

              {/* Optional Fields */}
              <div className="space-y-4 pt-1">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border pb-1">Dados Opcionais</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      Email
                    </label>
                    <input 
                      type="email" 
                      placeholder="maria@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      Data de Nascimento
                    </label>
                    <input 
                      type="date" 
                      value={dataNascimento}
                      onChange={(e) => setDataNascimento(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      CPF
                    </label>
                    <input 
                      type="text" 
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      Como conheceu a clínica?
                    </label>
                    <select
                      value={comoConheceu}
                      onChange={(e) => setComoConheceu(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400 cursor-pointer"
                    >
                      <option value="">Selecione uma opção</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Indicação">Indicação</option>
                      <option value="Google">Google</option>
                      <option value="Passando na rua">Passando na rua</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    Endereço Completo
                  </label>
                  <input 
                    type="text" 
                    placeholder="Rua, Número, Bairro, Cidade..."
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-rose-400"
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-border rounded-lg text-xs font-medium text-text-secondary hover:bg-bg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-800 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
