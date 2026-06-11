import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bgqnbhabddqkaiaztjzr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJncW5iaGFiZGRxa2FpYXp0anpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NzQxNzksImV4cCI6MjA5NjU1MDE3OX0.h4lqqIcrdlcjhR3bC-7L2w1avH_uc0Fj198iSW9uzJs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function purge() {
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

  console.log('Limpando todas as informações transacionais...');
  
  // Apaga vínculos de serviços, atendimentos, agendamentos, clientes e logs
  const { error: err1 } = await supabase.from('agendamento_servicos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const { error: err2 } = await supabase.from('atendimentos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const { error: err3 } = await supabase.from('agendamentos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const { error: err4 } = await supabase.from('clientes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const { error: err5 } = await supabase.from('logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  if (err1 || err2 || err3 || err4 || err5) {
    console.error('Ocorreu um erro ao limpar o banco:', { err1, err2, err3, err4, err5 });
    return;
  }

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

  console.log('#############################################');
  console.log('   BANCO DE DADOS LIMPO COM SUCESSO!        ');
  console.log('   - Clientes, Agendamentos e Históricos    ');
  console.log('     foram completamente removidos.          ');
  console.log('   - Estrutura de serviços preservada.      ');
  console.log('#############################################');
}

purge();
