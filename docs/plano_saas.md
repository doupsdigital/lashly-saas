# Plano Estratégico: Transformando o Sistema em SaaS (Multi-Tenant)

Este documento apresenta um plano de negócios e de arquitetura técnica detalhado para converter o atual sistema de Lash Designer solo em um modelo **SaaS (Software as a Service)**. Nele, múltiplas profissionais (clientes) podem se cadastrar, escolher planos e gerenciar seus próprios negócios sob o mesmo site, com total segurança e isolamento de dados.

---

## 1. O que é um SaaS e como ele funciona?

SaaS é um modelo de distribuição onde o software fica hospedado na nuvem e os usuários pagam uma assinatura mensal/anual para usá-lo. 

Em vez de você vender e instalar o código em servidores individuais para cada cliente (White-Label), você mantém **um único código rodando na nuvem** (ex: `app.meusite.com.br`) e todos os seus clientes o acessam.

### O Conceito de Multi-Tenancy (Multi-inquilinato)
* Cada profissional ou estúdio cadastrado é chamado de **Tenant** (Inquilino).
* Todos os inquilinos compartilham o mesmo banco de dados e o mesmo código frontend.
* A separação das informações de quem é quem é feita de forma lógica no banco de dados por um identificador exclusivo (ex: `estabelecimento_id`).

---

## 2. Mudanças no Banco de Dados (Supabase)

Para suportar o multi-inquilinato, o banco de dados atual sofrerá as seguintes modificações estruturais:

### A. Criação da Tabela `estabelecimentos` (ou `negocios`)
Esta tabela conterá as informações do estúdio assinante e gerenciará o controle de assinaturas e planos.

```sql
CREATE TABLE public.estabelecimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_negocio TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- Ex: "estudio-rosa" para a URL meusite.com/estudio-rosa
  plano TEXT NOT NULL DEFAULT 'basico' CHECK (plano IN ('basico', 'premium')),
  status_assinatura TEXT NOT NULL DEFAULT 'trial' CHECK (status_assinatura IN ('trial', 'ativo', 'cancelado', 'suspenso')),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### B. Vinculação das Tabelas Existentes
Todas as tabelas de dados que pertencem a um estúdio específico precisam receber uma nova coluna de chave estrangeira apontando para o seu estúdio:

* `clientes` -> Adicionar `estabelecimento_id UUID REFERENCES estabelecimentos(id) ON DELETE CASCADE`
* `servicos` -> Adicionar `estabelecimento_id UUID REFERENCES estabelecimentos(id) ON DELETE CASCADE`
* `agendamentos` -> Adicionar `estabelecimento_id UUID REFERENCES estabelecimentos(id) ON DELETE CASCADE`
* `horarios_atendimento` -> Adicionar `estabelecimento_id UUID REFERENCES estabelecimentos(id) ON DELETE CASCADE`
* `bloqueios_agenda` -> Adicionar `estabelecimento_id UUID REFERENCES estabelecimentos(id) ON DELETE CASCADE`
* `configuracao_negocio` -> Adicionar `estabelecimento_id UUID REFERENCES estabelecimentos(id) ON DELETE CASCADE`

### C. Isolamento de Segurança por RLS (Row Level Security)
No Supabase, usamos o RLS para garantir que um estúdio nunca possa ler ou alterar os dados de outro. 

Modificaremos as políticas RLS para ler o `estabelecimento_id` injetado no token JWT de autenticação do usuário. Exemplo de política para a tabela `clientes`:

```sql
CREATE POLICY "profissional_isolamento_clientes" ON clientes
  FOR ALL USING (
    estabelecimento_id = (SELECT cliente_id FROM usuarios WHERE id = auth.uid()) -- Para clientes
    OR 
    estabelecimento_id = (SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid() AND role = 'profissional')
  );
```

---

## 3. Mudanças na Parte Visual e Controle de Planos

No frontend (React), precisaremos controlar o que a usuária vê e quais rotas ela pode acessar com base no plano que assinou.

### A. Controle de Acesso e Recursos (Feature Flags)
Criaremos um hook (ex: `useFeatures`) ou utilizaremos o contexto de autenticação para ler o plano do estúdio logado (`plano` na tabela `estabelecimentos`).

* **Plano Básico (Ex: Cadastro de Clientes + Catálogo + CRM):**
  * O menu lateral esconde as abas "Agendamentos" e "Meus Horários".
  * Se a profissional tentar acessar manualmente a URL `/agendamentos`, o React a redireciona de volta para `/dashboard` exibindo um modal: *"Este recurso faz parte do Plano Premium. Faça o Upgrade!"*.
* **Plano Premium (Completo com Agendamento Online):**
  * Desbloqueia a visualização do calendário, configuração de expediente comercial e permite que as clientes agendem online pelo portal.

```tsx
// Exemplo prático de bloqueio visual no Sidebar.tsx
const menuItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutGrid, allowedPlans: ['basico', 'premium'] },
  { name: 'Clientes', path: '/clientes', icon: Users, allowedPlans: ['basico', 'premium'] },
  { name: 'Serviços', path: '/servicos', icon: Tag, allowedPlans: ['basico', 'premium'] },
  { name: 'Agendamentos', path: '/agendamentos', icon: Calendar, allowedPlans: ['premium'] }, // Apenas Premium
];
```

### B. Portal do Cliente Dinâmico (Por URL)
As clientes agendarão acessando uma URL que identifica o estúdio:
* **Estrutura por subcaminho:** `lashstudio.com.br/brunalash` (ou `agendar.meusite.com/estudio-rosa`)
* **Estrutura por subdomínio:** `brunalash.lashstudio.com.br` (ou `estudio-rosa.meusite.com`)

#### Como funciona o carregamento dinâmico:
1. **Leitura da URL:** O React lê o parâmetro da URL (ex: `brunalash`).
2. **Busca no Banco:** O React faz uma chamada rápida ao Supabase buscando a linha na tabela `estabelecimentos` com aquele `slug` (ex: `brunalash`).
3. **Carregamento da Identidade:** O Supabase retorna os dados da profissional (ex: ID `uuid-da-bruna`, nome do negócio, cores de preferência, logotipo e catálogo de serviços).
4. **Renderização:** A página de agendamento se adapta dinamicamente: os botões mudam para a cor do estúdio dela, o logo dela aparece no topo e apenas os serviços pertencentes ao seu ID são listados.

#### Como funciona o cadastro e login das clientes da profissional:
* **Opção A: Cadastro Rápido no Fluxo (Recomendado - Sem Senha):**
  * A cliente entra na URL `lashstudio.com.br/brunalash`, escolhe o serviço e o horário.
  * Na tela final, insere apenas **Nome**, **WhatsApp** e **E-mail** para confirmar.
  * O sistema verifica se já existe uma cliente com aquele WhatsApp/E-mail vinculada ao estúdio da Bruna (`estabelecimento_id = uuid-da-bruna`). Se sim, associa o agendamento; se não, cria um novo registro de cliente sob o ID do estúdio.
* **Opção B: Portal da Cliente Completo (Com Login/Senha):**
  * O portal tem um botão "Entrar / Cadastrar" no topo.
  * A cliente cria uma conta com e-mail e senha. Essa conta de cliente fica logicamente vinculada ao estúdio (`estabelecimento_id = uuid-da-bruna`).
  * Permite que a cliente faça login para visualizar seu histórico de agendamentos e cancelar horários de forma autônoma.

#### Como a profissional divulga o sistema:
No painel de controle dela, haverá um botão simples **"Copiar meu Link de Agendamento"** (ex: `lashstudio.com.br/brunalash`). Ela poderá colar esse link na **Bio do Instagram** (ou Linktree), configurar como mensagem automática no **WhatsApp Business**, ou enviar diretamente para as clientes que solicitarem agendamentos.

---

## 4. Integração de Pagamento e Assinaturas (Stripe / Asaas)

Para automatizar a cobrança, você integrará uma API de pagamentos (como Stripe ou Asaas):
1. **Fluxo de Registro:** A profissional se cadastra no seu site e entra no período de testes grátis (Trial de 7 ou 14 dias).
2. **Checkout:** Ao decidir assinar, ela clica em contratar e é enviada ao portal de checkout da integradora.
3. **Sincronização por Webhooks:** O Stripe envia um sinal direto para o Supabase (webhook) sempre que o pagamento for concluído com sucesso ou atrasar.
   * Pagamento aprovado: Banco atualiza `status_assinatura` para `ativo`.
   * Pagamento recusado/atrasado: Banco atualiza para `suspenso` (bloqueando o acesso ao dashboard administrativo dela até ela regularizar o pagamento).

---

## 5. Infraestrutura e Custos Estimados de Escala

Uma das grandes vantagens do modelo SaaS no Supabase é o baixo custo inicial e a alta escalabilidade técnica.

### A. Stack de Infraestrutura Sugerida
* **Frontend:** Vercel (Hospedagem rápida global com SSL automático).
* **Backend & Banco de dados:** Supabase (Postgres escalável + Auth + Storage).
* **Cobrança:** Stripe ou Asaas (Gerenciamento automático de assinaturas em cartão e Pix).

### B. Projeção de Custos e Lucro

Cobrando um valor fictício médio de **R$ 69,90/mês** para o Plano Básico e **R$ 99,90/mês** para o Plano Premium, veja a simulação dos seus custos operacionais de infraestrutura:

#### Cenário 1: Primeiros 10 Clientes (Fase de Validação)
* **Faturamento Bruto:** R$ 700,00 a R$ 1.000,00/mês
* **Custo Supabase:** US$ 0.00 (Plano gratuito atende perfeitamente até ~500MB de banco).
* **Custo Vercel:** US$ 0.00 (Hospedagem hobby ou gratuita).
* **Taxas Stripe:** ~R$ 40,00 (Descontado direto das transações aprovadas).
* **Custo Fixo Mensal:** **R$ 0,00**
* **Margem de Lucro:** **~95%**

#### Cenário 2: 100 Clientes (Negócio Consolidado)
* **Faturamento Bruto:** R$ 7.000,00 a R$ 10.000,00/mês
* **Custo Supabase (Plano Pro):** US$ 25.00/mês (~R$ 130,00). Dá direito a 8GB de banco e upgrades sob demanda.
* **Custo Vercel (Plano Pro):** US$ 20.00/mês (~R$ 100,00) para ter domínio próprio e suporte comercial.
* **Taxas Stripe:** ~R$ 350,00.
* **Custo Fixo Mensal:** **~R$ 230,00**
* **Margem de Lucro:** **~94%**

#### Cenário 3: 1000 Clientes (Alta Escala)
* **Faturamento Bruto:** R$ 70.000,00 a R$ 100.000,00/mês
* **Custo Supabase:**
  * Plano Pro: US$ 25.00/mês.
  * Armazenamento extra de banco e imagens (cerca de 50GB): ~US$ 30.00/mês.
  * Servidores otimizados (Compute Add-on para alta velocidade): US$ 60.00/mês.
  * Total Supabase: ~US$ 115.00 (~R$ 600,00).
* **Custo Vercel:** US$ 40.00/mês (~R$ 200,00).
* **Taxas Stripe:** ~R$ 3.500,00.
* **Custo Fixo Mensal:** **~R$ 800,00**
* **Margem de Lucro:** **~95%**

---

## 6. Próximos Passos para Iniciar a Transição

Se você decidir migrar o sistema para SaaS futuramente, o passo a passo técnico inicial será:
1. **Refatorar o Banco de Dados:** Criar a tabela `estabelecimentos` e associar as chaves estrangeiras em todas as tabelas de dados.
2. **Desenvolver o Fluxo de Cadastro de Novos Estúdios:** Criar uma página institucional para que uma nova profissional clique em "Criar Minha Conta", digite o nome do estúdio, e o backend crie a estrutura dela automaticamente.
3. **Ajustar as Telas:** Implementar o hook de planos no frontend para limitar botões e abas específicas do plano básico.
4. **Integrar os Webhooks do Stripe/Asaas:** Para habilitar e suspender contas a cada pagamento.
