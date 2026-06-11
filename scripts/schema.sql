-- ================================================
-- SCHEMA v2 - Sistema para Profissional Autônoma
-- Execute no SQL Editor do Supabase na ordem abaixo
-- ================================================

-- ================================================
-- BLOCO 1 — Tabelas principais
-- ================================================

CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  sobrenome TEXT,
  email TEXT,
  whatsapp TEXT,
  data_nascimento DATE,
  cpf TEXT,
  endereco TEXT,
  observacoes TEXT,
  alergias TEXT,
  medicamentos TEXT,
  doencas_cronicas TEXT,
  gestante BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'cliente' CHECK (role IN ('profissional', 'cliente')),
  cliente_id UUID REFERENCES clientes(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE categorias_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID REFERENCES categorias_servico(id),
  nome TEXT NOT NULL,
  descricao TEXT,
  duracao_minutos INTEGER NOT NULL DEFAULT 60,
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE variacoes_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servico_id UUID NOT NULL REFERENCES servicos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  duracao_minutos INTEGER,
  valor NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================
-- BLOCO 2 — Agenda e agendamentos
-- ================================================

CREATE TABLE horarios_atendimento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE bloqueios_agenda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  motivo TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  data_hora TIMESTAMPTZ NOT NULL,
  duracao_minutos INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'confirmado', 'cancelado', 'concluido')),
  origem TEXT DEFAULT 'admin' CHECK (origem IN ('admin', 'portal')),
  observacoes TEXT,
  valor_cobrado NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE agendamento_servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id UUID NOT NULL REFERENCES agendamentos(id) ON DELETE CASCADE,
  servico_id UUID NOT NULL REFERENCES servicos(id),
  variacao_id UUID REFERENCES variacoes_servico(id),
  valor_cobrado NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE atendimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  servico_id UUID NOT NULL REFERENCES servicos(id),
  variacao_id UUID REFERENCES variacoes_servico(id),
  data_atendimento DATE NOT NULL,
  valor_cobrado NUMERIC(10,2) NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================
-- BLOCO 3 — Configurações e logs
-- ================================================

CREATE TABLE configuracao_negocio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_negocio TEXT NOT NULL DEFAULT 'Meu Studio',
  descricao TEXT,
  instagram TEXT,
  endereco TEXT,
  logo_url TEXT,
  aprovacao_automatica BOOLEAN DEFAULT false,
  antecedencia_cancelamento_horas INTEGER DEFAULT 24,
  mensagem_pos_agendamento TEXT DEFAULT 'Seu agendamento foi recebido! Aguarde a confirmação.',
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO configuracao_negocio (nome_negocio) VALUES ('Meu Studio');

CREATE TABLE logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id),
  acao TEXT NOT NULL,
  detalhes JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================
-- BLOCO 4 — Row Level Security (RLS)
-- ================================================

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE atendimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamento_servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE horarios_atendimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE bloqueios_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracao_negocio ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE variacoes_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- Profissional tem acesso total a tudo
CREATE POLICY "profissional_full_access_clientes" ON clientes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role = 'profissional')
  );

CREATE POLICY "profissional_full_access_agendamentos" ON agendamentos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role = 'profissional')
  );

CREATE POLICY "profissional_full_access_atendimentos" ON atendimentos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role = 'profissional')
  );

CREATE POLICY "profissional_full_access_horarios" ON horarios_atendimento
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role = 'profissional')
  );

CREATE POLICY "profissional_full_access_bloqueios" ON bloqueios_agenda
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role = 'profissional')
  );

CREATE POLICY "profissional_full_access_config" ON configuracao_negocio
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role = 'profissional')
  );

CREATE POLICY "profissional_full_access_servicos" ON servicos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role = 'profissional')
  );

CREATE POLICY "profissional_full_access_categorias" ON categorias_servico
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role = 'profissional')
  );

CREATE POLICY "profissional_full_access_variacoes" ON variacoes_servico
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role = 'profissional')
  );

CREATE POLICY "profissional_full_access_logs" ON logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role = 'profissional')
  );

-- Clientes: acesso apenas aos próprios dados
CREATE POLICY "clientes_own_data" ON clientes
  FOR SELECT USING (
    id = (SELECT cliente_id FROM usuarios WHERE id = auth.uid())
  );

CREATE POLICY "clientes_own_agendamentos_select" ON agendamentos
  FOR SELECT USING (
    cliente_id = (SELECT cliente_id FROM usuarios WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role = 'profissional')
  );

CREATE POLICY "clientes_create_agendamento" ON agendamentos
  FOR INSERT WITH CHECK (
    cliente_id = (SELECT cliente_id FROM usuarios WHERE id = auth.uid())
  );

CREATE POLICY "clientes_cancel_agendamento" ON agendamentos
  FOR UPDATE USING (
    cliente_id = (SELECT cliente_id FROM usuarios WHERE id = auth.uid())
  );

CREATE POLICY "clientes_own_agendamento_servicos" ON agendamento_servicos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agendamentos a
      WHERE a.id = agendamento_id
      AND (
        a.cliente_id = (SELECT cliente_id FROM usuarios WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role = 'profissional')
      )
    )
  );

-- Leitura pública (clientes veem catálogo e slots disponíveis)
CREATE POLICY "servicos_public_read" ON servicos
  FOR SELECT USING (true);

CREATE POLICY "categorias_public_read" ON categorias_servico
  FOR SELECT USING (true);

CREATE POLICY "variacoes_public_read" ON variacoes_servico
  FOR SELECT USING (true);

CREATE POLICY "horarios_public_read" ON horarios_atendimento
  FOR SELECT USING (true);

CREATE POLICY "bloqueios_public_read" ON bloqueios_agenda
  FOR SELECT USING (true);

CREATE POLICY "config_public_read" ON configuracao_negocio
  FOR SELECT USING (true);

-- Usuários: cada um vê apenas o próprio registro
CREATE POLICY "usuarios_own_data" ON usuarios
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "usuarios_insert_own" ON usuarios
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "usuarios_update_own" ON usuarios
  FOR UPDATE USING (id = auth.uid());

-- ================================================
-- STORAGE: bucket de avatares
-- ================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatar publico" ON storage.objects;
CREATE POLICY "Avatar publico" ON storage.objects
  FOR ALL TO public
  USING (bucket_id = 'avatars')
  WITH CHECK (bucket_id = 'avatars');
