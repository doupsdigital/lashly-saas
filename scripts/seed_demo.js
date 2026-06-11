import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = 'https://bgqnbhabddqkaiaztjzr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJncW5iaGFiZGRxa2FpYXp0anpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NzQxNzksImV4cCI6MjA5NjU1MDE3OX0.h4lqqIcrdlcjhR3bC-7L2w1avH_uc0Fj198iSW9uzJs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const femaleNames = [
  { nome: 'Ana', sobrenome: 'Souza', email: 'ana.souza@gmail.com' },
  { nome: 'Beatriz', sobrenome: 'Santos', email: 'biadesantos@hotmail.com' },
  { nome: 'Camila', sobrenome: 'Oliveira', email: 'cami.oliveira@outlook.com' },
  { nome: 'Daniela', sobrenome: 'Costa', email: 'dani.costa92@gmail.com' },
  { nome: 'Eliana', sobrenome: 'Almeida', email: 'eliana.almeida@yahoo.com.br' },
  { nome: 'Fernanda', sobrenome: 'Ribeiro', email: 'fernandinha.ribeiro@gmail.com' },
  { nome: 'Gabriela', sobrenome: 'Carvalho', email: 'gabi.carvalho@hotmail.com' },
  { nome: 'Helena', sobrenome: 'Lopes', email: 'helena.lopes98@outlook.com' },
  { nome: 'Isabela', sobrenome: 'Ramos', email: 'isabelaramos@gmail.com' },
  { nome: 'Julia', sobrenome: 'Mendes', email: 'julia.mendes@uol.com.br' },
  { nome: 'Karina', sobrenome: 'Lima', email: 'karina.lima.sp@gmail.com' },
  { nome: 'Larissa', sobrenome: 'Fonseca', email: 'larifonseca@yahoo.com' },
  { nome: 'Mariana', sobrenome: 'Rocha', email: 'mari.rocha@gmail.com' },
  { nome: 'Natália', sobrenome: 'Nunes', email: 'naty.nunes@outlook.com' },
  { nome: 'Olivia', sobrenome: 'Neves', email: 'olivia.neves@gmail.com' },
  { nome: 'Patrícia', sobrenome: 'Barros', email: 'patricia.barros@gmail.com' },
  { nome: 'Renata', sobrenome: 'Cardoso', email: 're.cardoso@hotmail.com' },
  { nome: 'Sandra', sobrenome: 'Martins', email: 'sandra.martins@gmail.com' },
  { nome: 'Tatiana', sobrenome: 'Araujo', email: 'tati.araujo@outlook.com' },
  { nome: 'Valéria', sobrenome: 'Moreira', email: 'valeria.moreira@uol.com.br' },
  { nome: 'Vanessa', sobrenome: 'Dias', email: 'vanessa.dias90@gmail.com' },
  { nome: 'Yasmin', sobrenome: 'Castro', email: 'yasmin.castro@hotmail.com' },
  { nome: 'Amanda', sobrenome: 'Teixeira', email: 'amanda.teixeira@gmail.com' },
  { nome: 'Carolina', sobrenome: 'Azevedo', email: 'carol.azevedo@gmail.com' },
  { nome: 'Letícia', sobrenome: 'Correia', email: 'leticia.correia@outlook.com' }
];

const servicos = [
  { id: 'b1000000-0000-0000-0000-000000000011', nome: 'Fio a Fio Clássico', duracao: 120, valor: 150.00, variacao_id: null },
  { id: 'b1000000-0000-0000-0000-000000000012', nome: 'Volume Russo', duracao: 150, valor: 200.00, variacao_id: null },
  { id: 'b1000000-0000-0000-0000-000000000013', nome: 'Volume Híbrido', duracao: 135, valor: 180.00, variacao_id: null },
  { id: 'b1000000-0000-0000-0000-000000000014', nome: 'Volume Brasileiro (Cílios Y)', duracao: 120, valor: 160.00, variacao_id: null },
  { id: 'b1000000-0000-0000-0000-000000000021', nome: 'Lash Lifting Completo', duracao: 60, valor: 120.00, variacao_id: null },
  { id: 'b1000000-0000-0000-0000-000000000022', nome: 'Spa de Cílios', duracao: 30, valor: 50.00, variacao_id: null },
  { id: 'b1000000-0000-0000-0000-000000000031', nome: 'Design de Sobrancelhas Simples', duracao: 45, valor: 50.00, variacao_id: null },
  { id: 'b1000000-0000-0000-0000-000000000032', nome: 'Design com Henna', duracao: 60, valor: 70.00, variacao_id: null },
  { id: 'b1000000-0000-0000-0000-000000000033', nome: 'Brow Lamination', duracao: 60, valor: 130.00, variacao_id: null },
  // Manutenções com variações específicas
  { id: 'b1000000-0000-0000-0000-000000000041', nome: 'Manutenção de Extensão', duracao: 90, valor: 100.00, variacao_id: 'f1000000-0000-0000-0000-000000000002' }, // Volume Brasileiro
  { id: 'b1000000-0000-0000-0000-000000000041', nome: 'Manutenção de Extensão', duracao: 120, valor: 120.00, variacao_id: 'f1000000-0000-0000-0000-000000000004' }, // Volume Russo
  { id: 'b1000000-0000-0000-0000-000000000042', nome: 'Remoção de Extensão', duracao: 45, valor: 40.00, variacao_id: null }
];

async function seed() {
  console.log('Iniciando o login...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'rosae@clinic.com',
    password: 'rosae2025',
  });

  if (authError) {
    console.error('Falha de Autenticação:', authError.message);
    return;
  }
  console.log('Login efetuado com sucesso!');

  // 1. Limpeza
  console.log('Limpando dados anteriores...');
  await supabase.from('agendamento_servicos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('atendimentos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('agendamentos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('clientes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Limpeza de dados concluída!');

  // Re-inserir usuário profissional caso tenha sido deletado por CASCADE
  const { data: userExists, error: checkError } = await supabase
    .from('usuarios')
    .select('id')
    .eq('id', authData.user.id)
    .maybeSingle();
  
  if (!userExists) {
    console.log('Usuário profissional não encontrado em "usuarios". Re-inserindo...');
    const { error: userInsertError } = await supabase.from('usuarios').insert({
      id: authData.user.id,
      nome: 'admin',
      email: 'rosae@clinic.com',
      role: 'profissional',
      cliente_id: null
    });
    if (userInsertError) {
      console.error('Erro ao re-inserir usuário profissional:', userInsertError.message);
      return;
    }
    console.log('Usuário profissional re-inserido com sucesso!');
  }

  // 2. Inserir Clientes
  console.log('Inserindo 25 clientes...');
  const clientRecords = [];
  for (let i = 0; i < femaleNames.length; i++) {
    const item = femaleNames[i];
    const phone = `(11) 9${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const day = String(Math.floor(1 + Math.random() * 28)).padStart(2, '0');
    const month = String(Math.floor(1 + Math.random() * 12)).padStart(2, '0');
    const year = Math.floor(1985 + Math.random() * 20);
    const dob = `${year}-${month}-${day}`;

    // Anamnese simulada
    const anamnese = {
      curvatura_desejada: ['C', 'D', 'L', 'L+'][Math.floor(Math.random() * 4)],
      espessura_desejada: ['0.05', '0.07', '0.15', '0.20'][Math.floor(Math.random() * 4)],
      tecnica_desejada: ['Fio a Fio Clássico', 'Volume Russo', 'Volume Brasileiro', 'Volume Híbrido'][Math.floor(Math.random() * 4)],
      problemas_oculares: Math.random() > 0.85,
      alergia_adesivo: Math.random() > 0.9,
      lentes_contato: Math.random() > 0.7,
      dorme_de_brucos: Math.random() > 0.6,
      gestante: Math.random() > 0.92,
      maquiagem_diaria: Math.random() > 0.4
    };

    const client = {
      id: crypto.randomUUID(),
      nome: item.nome,
      sobrenome: item.sobrenome,
      email: item.email,
      whatsapp: phone,
      data_nascimento: dob,
      cpf: `${Math.floor(100 + Math.random() * 900)}.${Math.floor(100 + Math.random() * 900)}.${Math.floor(100 + Math.random() * 900)}-${Math.floor(10 + Math.random() * 90)}`,
      endereco: `Av. Paulista, ${Math.floor(100 + Math.random() * 2500)}, São Paulo - SP`,
      observacoes: i % 3 === 0 ? 'Prefere cílios bem discretos, com efeito natural.' : i % 5 === 0 ? 'Possui olhos levemente sensíveis ao adesivo.' : 'Cílios naturais cheios e fortes.',
      alergias: i % 7 === 0 ? 'Alergia a esmalte.' : null,
      medicamentos: null,
      doencas_cronicas: null,
      gestante: anamnese.gestante,
      anamnese_lash: anamnese,
      created_at: new Date(Date.now() - Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000).toISOString()
    };
    clientRecords.push(client);
  }

  const { data: insertedClients, error: clientInsertError } = await supabase
    .from('clientes')
    .insert(clientRecords)
    .select();

  if (clientInsertError) {
    console.error('Erro ao inserir clientes:', clientInsertError.message);
    return;
  }
  console.log(`Sucesso! Inseridas ${insertedClients.length} clientes.`);

  // 3. Gerar histórico e agenda (Agendamentos e Atendimentos)
  console.log('Gerando histórico financeiro e agenda...');
  const appointments = [];
  const appointmentServices = [];
  const attendances = [];

  // Data atual de referência para os cálculos de datas
  const now = new Date();
  
  // Vamos gerar de forma realista:
  // - 35 agendamentos PASSADOS (nos últimos 45 dias) -> que viram ATENDIMENTOS e status 'concluido'
  // - 10 agendamentos FUTUROS (próximos 14 dias) -> status 'confirmado'
  // - 5 agendamentos PENDENTES (próximos 7 dias) -> status 'pendente'
  // - 5 agendamentos CANCELADOS (mistura de passados e futuros) -> status 'cancelado'

  // PASSADOS (Concluídos)
  for (let i = 0; i < 35; i++) {
    const client = insertedClients[Math.floor(Math.random() * insertedClients.length)];
    const service = servicos[Math.floor(Math.random() * servicos.length)];
    
    // Data aleatória entre 45 dias atrás e ontem
    const daysAgo = Math.floor(1 + Math.random() * 44);
    const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    date.setHours(9 + Math.floor(Math.random() * 9), Math.random() > 0.5 ? 30 : 0, 0, 0);

    const apptId = crypto.randomUUID();
    appointments.push({
      id: apptId,
      cliente_id: client.id,
      data_hora: date.toISOString(),
      duracao_minutos: service.duracao,
      status: 'concluido',
      origem: Math.random() > 0.3 ? 'portal' : 'admin',
      observacoes: Math.random() > 0.7 ? 'Cliente chegou no horário.' : null,
      valor_cobrado: service.valor,
      created_at: new Date(date.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
    });

    appointmentServices.push({
      id: crypto.randomUUID(),
      agendamento_id: apptId,
      servico_id: service.id,
      variacao_id: service.variacao_id,
      valor_cobrado: service.valor
    });

    attendances.push({
      id: crypto.randomUUID(),
      cliente_id: client.id,
      servico_id: service.id,
      variacao_id: service.variacao_id,
      data_atendimento: date.toISOString().split('T')[0],
      valor_cobrado: service.valor,
      observacoes: 'Procedimento finalizado com retenção excelente.',
      created_at: date.toISOString()
    });
  }

  // CONFIRMADOS (Futuros)
  for (let i = 0; i < 10; i++) {
    const client = insertedClients[Math.floor(Math.random() * insertedClients.length)];
    const service = servicos[Math.floor(Math.random() * servicos.length)];
    
    // Data aleatória nos próximos 14 dias
    const daysAhead = Math.floor(1 + Math.random() * 13);
    const date = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    date.setHours(9 + Math.floor(Math.random() * 9), Math.random() > 0.5 ? 30 : 0, 0, 0);

    const apptId = crypto.randomUUID();
    appointments.push({
      id: apptId,
      cliente_id: client.id,
      data_hora: date.toISOString(),
      duracao_minutos: service.duracao,
      status: 'confirmado',
      origem: Math.random() > 0.5 ? 'portal' : 'admin',
      observacoes: null,
      valor_cobrado: service.valor,
      created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()
    });

    appointmentServices.push({
      id: crypto.randomUUID(),
      agendamento_id: apptId,
      servico_id: service.id,
      variacao_id: service.variacao_id,
      valor_cobrado: service.valor
    });
  }

  // PENDENTES
  for (let i = 0; i < 5; i++) {
    const client = insertedClients[Math.floor(Math.random() * insertedClients.length)];
    const service = servicos[Math.floor(Math.random() * servicos.length)];
    
    // Data nos próximos 7 dias
    const daysAhead = Math.floor(1 + Math.random() * 6);
    const date = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    date.setHours(9 + Math.floor(Math.random() * 9), Math.random() > 0.5 ? 30 : 0, 0, 0);

    const apptId = crypto.randomUUID();
    appointments.push({
      id: apptId,
      cliente_id: client.id,
      data_hora: date.toISOString(),
      duracao_minutos: service.duracao,
      status: 'pendente',
      origem: 'portal', // Solicitações de aprovação vêm sempre do portal
      observacoes: 'Gostaria de agendar este horário.',
      valor_cobrado: service.valor,
      created_at: new Date(now.getTime()).toISOString()
    });

    appointmentServices.push({
      id: crypto.randomUUID(),
      agendamento_id: apptId,
      servico_id: service.id,
      variacao_id: service.variacao_id,
      valor_cobrado: service.valor
    });
  }

  // CANCELADOS
  for (let i = 0; i < 5; i++) {
    const client = insertedClients[Math.floor(Math.random() * insertedClients.length)];
    const service = servicos[Math.floor(Math.random() * servicos.length)];
    
    // Data aleatória (pode ser passada ou futura)
    const daysOffset = Math.floor(-15 + Math.random() * 30);
    const date = new Date(now.getTime() + daysOffset * 24 * 60 * 60 * 1000);
    date.setHours(9 + Math.floor(Math.random() * 9), Math.random() > 0.5 ? 30 : 0, 0, 0);

    const apptId = crypto.randomUUID();
    appointments.push({
      id: apptId,
      cliente_id: client.id,
      data_hora: date.toISOString(),
      duracao_minutos: service.duracao,
      status: 'cancelado',
      origem: Math.random() > 0.5 ? 'portal' : 'admin',
      observacoes: 'Desistiu por motivos pessoais.',
      valor_cobrado: service.valor,
      created_at: new Date(date.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
    });

    appointmentServices.push({
      id: crypto.randomUUID(),
      agendamento_id: apptId,
      servico_id: service.id,
      variacao_id: service.variacao_id,
      valor_cobrado: service.valor
    });
  }

  console.log('Enviando agendamentos para o Supabase...');
  const { error: apptError } = await supabase.from('agendamentos').insert(appointments);
  if (apptError) {
    console.error('Erro ao inserir agendamentos:', apptError.message);
    return;
  }

  console.log('Enviando vínculo de serviços para o Supabase...');
  const { error: apptServError } = await supabase.from('agendamento_servicos').insert(appointmentServices);
  if (apptServError) {
    console.error('Erro ao inserir serviços dos agendamentos:', apptServError.message);
    return;
  }

  console.log('Enviando históricos de atendimentos (Dashboard Financeiro)...');
  const { error: attendError } = await supabase.from('atendimentos').insert(attendances);
  if (attendError) {
    console.error('Erro ao inserir atendimentos:', attendError.message);
    return;
  }

  console.log('#############################################');
  console.log('   MOCK DE DADOS CONCLUÍDO COM SUCESSO!     ');
  console.log(`   - 25 Clientes Brasileiras inseridas      `);
  console.log(`   - ${appointments.length} Agendamentos inseridos       `);
  console.log(`   - ${attendances.length} Atendimentos passados gerados `);
  console.log('#############################################');
}

seed();
