-- =========================================================================
-- RLS POLICIES — Lashly SaaS Multi-Tenant
-- Execute no SQL Editor do Supabase (Project → SQL Editor → New query)
-- IMPORTANTE: Teste o sistema completamente após executar.
-- Para reverter, use o script de rollback no final deste arquivo.
-- =========================================================================

-- =========================================================================
-- PASSO 1 — Habilitar RLS em todas as tabelas críticas
-- =========================================================================
ALTER TABLE public.clientes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estabelecimentos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_servico     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variacoes_servico      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horarios_atendimento   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bloqueios_agenda       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamento_servicos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atendimentos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracao_negocio   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs                   ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- PASSO 2 — Políticas de segurança por tabela
-- As funções get_auth_user_establishment() e get_auth_user_role()
-- já estão definidas no schema de produção como SECURITY DEFINER.
-- =========================================================================

-- -------------------------------------------------------------------------
-- ESTABELECIMENTOS
-- -------------------------------------------------------------------------
-- Portal: leitura pública para lookup por slug (sem autenticação)
CREATE POLICY "estabelecimentos_anon_select"
ON public.estabelecimentos FOR SELECT TO anon
USING (true);

-- Profissional: ver e editar apenas seu próprio estabelecimento
CREATE POLICY "estabelecimentos_profissional"
ON public.estabelecimentos FOR ALL TO authenticated
USING (id = public.get_auth_user_establishment())
WITH CHECK (id = public.get_auth_user_establishment());

-- -------------------------------------------------------------------------
-- USUARIOS
-- -------------------------------------------------------------------------
-- Cada usuário autenticado acessa apenas seu próprio registro
CREATE POLICY "usuarios_self"
ON public.usuarios FOR ALL TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- -------------------------------------------------------------------------
-- CLIENTES
-- -------------------------------------------------------------------------
-- Profissional: acesso total aos clientes do seu estabelecimento
CREATE POLICY "clientes_profissional"
ON public.clientes FOR ALL TO authenticated
USING (
  estabelecimento_id = public.get_auth_user_establishment()
  AND public.get_auth_user_role() = 'profissional'
)
WITH CHECK (
  estabelecimento_id = public.get_auth_user_establishment()
  AND public.get_auth_user_role() = 'profissional'
);

-- Cliente autenticado: ver e editar apenas seu próprio registro
CREATE POLICY "clientes_self_select"
ON public.clientes FOR SELECT TO authenticated
USING (
  id = (SELECT cliente_id FROM public.usuarios WHERE id = auth.uid())
  AND public.get_auth_user_role() = 'cliente'
);

CREATE POLICY "clientes_self_update"
ON public.clientes FOR UPDATE TO authenticated
USING (
  id = (SELECT cliente_id FROM public.usuarios WHERE id = auth.uid())
  AND public.get_auth_user_role() = 'cliente'
)
WITH CHECK (
  id = (SELECT cliente_id FROM public.usuarios WHERE id = auth.uid())
  AND public.get_auth_user_role() = 'cliente'
);

-- Anon: INSERT apenas (para cadastro no portal antes do login)
CREATE POLICY "clientes_anon_insert"
ON public.clientes FOR INSERT TO anon
WITH CHECK (true);

-- -------------------------------------------------------------------------
-- CATEGORIAS DE SERVIÇO
-- -------------------------------------------------------------------------
-- Leitura pública (exibida no catálogo do portal sem login)
CREATE POLICY "categorias_public_select"
ON public.categorias_servico FOR SELECT TO anon, authenticated
USING (true);

-- Profissional: CRUD no seu estabelecimento
CREATE POLICY "categorias_profissional_write"
ON public.categorias_servico FOR ALL TO authenticated
USING (
  estabelecimento_id = public.get_auth_user_establishment()
  AND public.get_auth_user_role() = 'profissional'
)
WITH CHECK (
  estabelecimento_id = public.get_auth_user_establishment()
  AND public.get_auth_user_role() = 'profissional'
);

-- -------------------------------------------------------------------------
-- SERVIÇOS
-- -------------------------------------------------------------------------
-- Leitura pública (exibida no catálogo do portal sem login)
CREATE POLICY "servicos_public_select"
ON public.servicos FOR SELECT TO anon, authenticated
USING (true);

-- Profissional: CRUD no seu estabelecimento
CREATE POLICY "servicos_profissional_write"
ON public.servicos FOR ALL TO authenticated
USING (
  estabelecimento_id = public.get_auth_user_establishment()
  AND public.get_auth_user_role() = 'profissional'
)
WITH CHECK (
  estabelecimento_id = public.get_auth_user_establishment()
  AND public.get_auth_user_role() = 'profissional'
);

-- -------------------------------------------------------------------------
-- VARIAÇÕES DE SERVIÇO
-- -------------------------------------------------------------------------
-- Leitura pública (exibida no catálogo do portal)
CREATE POLICY "variacoes_public_select"
ON public.variacoes_servico FOR SELECT TO anon, authenticated
USING (true);

-- Profissional: CRUD nas variações dos seus serviços
CREATE POLICY "variacoes_profissional_write"
ON public.variacoes_servico FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.servicos s
    WHERE s.id = servico_id
    AND s.estabelecimento_id = public.get_auth_user_establishment()
  )
  AND public.get_auth_user_role() = 'profissional'
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.servicos s
    WHERE s.id = servico_id
    AND s.estabelecimento_id = public.get_auth_user_establishment()
  )
  AND public.get_auth_user_role() = 'profissional'
);

-- -------------------------------------------------------------------------
-- HORÁRIOS DE ATENDIMENTO
-- -------------------------------------------------------------------------
-- Leitura pública (usado pelo portal para gerar slots disponíveis)
CREATE POLICY "horarios_public_select"
ON public.horarios_atendimento FOR SELECT TO anon, authenticated
USING (true);

-- Profissional: CRUD no seu estabelecimento
CREATE POLICY "horarios_profissional_write"
ON public.horarios_atendimento FOR ALL TO authenticated
USING (
  estabelecimento_id = public.get_auth_user_establishment()
  AND public.get_auth_user_role() = 'profissional'
)
WITH CHECK (
  estabelecimento_id = public.get_auth_user_establishment()
  AND public.get_auth_user_role() = 'profissional'
);

-- -------------------------------------------------------------------------
-- BLOQUEIOS DE AGENDA
-- -------------------------------------------------------------------------
-- Leitura pública (usado pelo portal para bloquear datas)
CREATE POLICY "bloqueios_public_select"
ON public.bloqueios_agenda FOR SELECT TO anon, authenticated
USING (true);

-- Profissional: CRUD no seu estabelecimento
CREATE POLICY "bloqueios_profissional_write"
ON public.bloqueios_agenda FOR ALL TO authenticated
USING (
  estabelecimento_id = public.get_auth_user_establishment()
  AND public.get_auth_user_role() = 'profissional'
)
WITH CHECK (
  estabelecimento_id = public.get_auth_user_establishment()
  AND public.get_auth_user_role() = 'profissional'
);

-- -------------------------------------------------------------------------
-- CONFIGURAÇÃO DO NEGÓCIO
-- -------------------------------------------------------------------------
-- Leitura pública (tema/cores/config usados no portal sem login)
CREATE POLICY "config_public_select"
ON public.configuracao_negocio FOR SELECT TO anon, authenticated
USING (true);

-- Profissional: editar apenas a configuração do seu estabelecimento
CREATE POLICY "config_profissional_write"
ON public.configuracao_negocio FOR ALL TO authenticated
USING (
  estabelecimento_id = public.get_auth_user_establishment()
  AND public.get_auth_user_role() = 'profissional'
)
WITH CHECK (
  estabelecimento_id = public.get_auth_user_establishment()
  AND public.get_auth_user_role() = 'profissional'
);

-- -------------------------------------------------------------------------
-- AGENDAMENTOS
-- -------------------------------------------------------------------------
-- Profissional: acesso total ao seu estabelecimento
CREATE POLICY "agendamentos_profissional"
ON public.agendamentos FOR ALL TO authenticated
USING (
  estabelecimento_id = public.get_auth_user_establishment()
  AND public.get_auth_user_role() = 'profissional'
)
WITH CHECK (
  estabelecimento_id = public.get_auth_user_establishment()
  AND public.get_auth_user_role() = 'profissional'
);

-- Cliente: ver e cancelar apenas seus próprios agendamentos
CREATE POLICY "agendamentos_cliente_select"
ON public.agendamentos FOR SELECT TO authenticated
USING (
  cliente_id = (SELECT cliente_id FROM public.usuarios WHERE id = auth.uid())
  AND public.get_auth_user_role() = 'cliente'
);

-- Cliente: criar agendamento para si mesmo
CREATE POLICY "agendamentos_cliente_insert"
ON public.agendamentos FOR INSERT TO authenticated
WITH CHECK (
  cliente_id = (SELECT cliente_id FROM public.usuarios WHERE id = auth.uid())
  AND public.get_auth_user_role() = 'cliente'
);

-- Cliente: cancelar (update status) apenas seus próprios agendamentos
CREATE POLICY "agendamentos_cliente_update"
ON public.agendamentos FOR UPDATE TO authenticated
USING (
  cliente_id = (SELECT cliente_id FROM public.usuarios WHERE id = auth.uid())
  AND public.get_auth_user_role() = 'cliente'
)
WITH CHECK (
  cliente_id = (SELECT cliente_id FROM public.usuarios WHERE id = auth.uid())
  AND public.get_auth_user_role() = 'cliente'
);

-- -------------------------------------------------------------------------
-- AGENDAMENTO_SERVICOS
-- -------------------------------------------------------------------------
-- Profissional: acesso via agendamento do seu estabelecimento
CREATE POLICY "agendamento_servicos_profissional"
ON public.agendamento_servicos FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.agendamentos a
    WHERE a.id = agendamento_id
    AND a.estabelecimento_id = public.get_auth_user_establishment()
  )
  AND public.get_auth_user_role() = 'profissional'
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.agendamentos a
    WHERE a.id = agendamento_id
    AND a.estabelecimento_id = public.get_auth_user_establishment()
  )
  AND public.get_auth_user_role() = 'profissional'
);

-- Cliente: ver e inserir serviços dos seus próprios agendamentos
CREATE POLICY "agendamento_servicos_cliente"
ON public.agendamento_servicos FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.agendamentos a
    WHERE a.id = agendamento_id
    AND a.cliente_id = (SELECT cliente_id FROM public.usuarios WHERE id = auth.uid())
  )
  AND public.get_auth_user_role() = 'cliente'
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.agendamentos a
    WHERE a.id = agendamento_id
    AND a.cliente_id = (SELECT cliente_id FROM public.usuarios WHERE id = auth.uid())
  )
  AND public.get_auth_user_role() = 'cliente'
);

-- -------------------------------------------------------------------------
-- ATENDIMENTOS (histórico manual)
-- -------------------------------------------------------------------------
-- Profissional: acesso total ao seu estabelecimento
CREATE POLICY "atendimentos_profissional"
ON public.atendimentos FOR ALL TO authenticated
USING (
  estabelecimento_id = public.get_auth_user_establishment()
  AND public.get_auth_user_role() = 'profissional'
)
WITH CHECK (
  estabelecimento_id = public.get_auth_user_establishment()
  AND public.get_auth_user_role() = 'profissional'
);

-- -------------------------------------------------------------------------
-- LOGS
-- -------------------------------------------------------------------------
-- Profissional: ver logs do seu estabelecimento e inserir os seus
CREATE POLICY "logs_profissional_select"
ON public.logs FOR SELECT TO authenticated
USING (
  estabelecimento_id = public.get_auth_user_establishment()
  AND public.get_auth_user_role() = 'profissional'
);

CREATE POLICY "logs_profissional_insert"
ON public.logs FOR INSERT TO authenticated
WITH CHECK (
  usuario_id = auth.uid()
  AND public.get_auth_user_role() = 'profissional'
);

-- =========================================================================
-- ROLLBACK — Execute este bloco se algo quebrar após aplicar as políticas
-- =========================================================================
/*
ALTER TABLE public.clientes               DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios               DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.estabelecimentos       DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_servico     DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos               DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.variacoes_servico      DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.horarios_atendimento   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bloqueios_agenda       DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos           DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamento_servicos   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.atendimentos           DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracao_negocio   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs                   DISABLE ROW LEVEL SECURITY;
*/
