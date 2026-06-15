# Roadmap de Produção e Integração Asaas (Lashly SaaS)

Este guia orienta sobre os passos técnicos e operacionais necessários para publicar o **Lashly SaaS** em produção, configurar o gateway de pagamentos **Asaas** em ambiente real e realizar testes antes de disponibilizar a plataforma para as profissionais de estética.

---

## 1. Cadastro e Configuração no Asaas (Produção)

Para receber pagamentos reais por Pix e Cartão de Crédito, é necessário criar e homologar uma conta comercial no Asaas.

### Passos:
1. **Criar Conta**: Acesse [Asaas.com](https://www.asaas.com/) e crie uma conta (de preferência como Pessoa Jurídica para taxas melhores e emissão de notas se necessário).
2. **Homologação**: Envie os documentos solicitados pelo Asaas no menu de validação cadastral para liberar saques e transferências.
3. **Gerar API Key**:
   * No menu lateral do Asaas, acesse **Configurações da Conta** > **Integrações**.
   * Clique em **Gerar API Key** (Guarde essa chave em local seguro, pois ela é exibida apenas uma vez).
4. **Definir Token de Webhook**:
   * No mesmo menu **Integrações**, localize a seção de **Webhook de Cobranças**.
   * Crie um token personalizado para autenticar as requisições de webhook (ex: uma string alfanumérica forte e aleatória). Esse token será configurado no Supabase como `ASAAS_WEBHOOK_TOKEN`.

---

## 2. Preparação do Banco de Dados em Produção (Supabase)

Não misture o banco de desenvolvimento local/staging com o de produção. Crie um novo projeto no Supabase especificamente para a versão oficial.

### Passos:
1. **Novo Projeto**: Crie um projeto no Supabase e anote a **Project URL** e a **Service Role Key** (esta chave concede bypass no RLS e é necessária para as Edge Functions).
2. **Executar Schemas Básicos**: Crie todas as tabelas originais do projeto (clientes, profissionais, serviços, agendamentos, etc.) rodando o script DDL no SQL Editor do Supabase.
3. **Executar Migração de Billing**: Execute o conteúdo atualizado de [etapa5_migracao.sql](file:///c:/Users/doni.silva/Downloads/lashly-saas/scripts/etapa5_migracao.sql) no SQL Editor para criar as novas colunas e a trigger de onboarding do Trial Premium.

---

## 3. Deploy da Edge Function do Webhook no Supabase

A Edge Function [asaas-webhook](file:///c:/Users/doni.silva/Downloads/lashly-saas/supabase/functions/asaas-webhook/index.ts) precisa ser enviada para a nuvem da Supabase.

### Passos no Terminal:
1. Faça login na CLI do Supabase (caso ainda não esteja logado):
   ```bash
   npx supabase login
   ```
2. Associe seu repositório local ao projeto do Supabase em produção:
   ```bash
   npx supabase link --project-ref <seu-project-ref-de-producao>
   ```
3. Realize o deploy da função:
   ```bash
   npx supabase functions deploy asaas-webhook
   ```
4. Configure os **Secrets (Variáveis de Ambiente)** na nuvem do Supabase para que a Edge Function possa rodar e acessar o banco de dados:
   ```bash
   npx supabase secrets set ASAAS_WEBHOOK_TOKEN="O_TOKEN_QUE_VOCE_CRIOU_NO_ASAAS"
   npx supabase secrets set SUPABASE_URL="https://<seu-project-ref>.supabase.co"
   npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY="SUA_SERVICE_ROLE_KEY"
   ```
   > [!IMPORTANT]
   > Nunca exponha a `SUPABASE_SERVICE_ROLE_KEY` no frontend. Ela deve ficar apenas nos secrets protegidos do backend.

---

## 4. Configurar a URL do Webhook no Asaas

Agora que a função está publicada na Supabase, precisamos instruir o Asaas a enviar as notificações de pagamento para ela.

### Passos no Asaas:
1. No menu de **Integrações** > **Webhook**, configure a URL do endpoint de produção da Supabase:
   * **URL**: `https://<seu-project-ref-de-producao>.supabase.co/functions/v1/asaas-webhook`
   * **Token**: Digite exatamente o mesmo token definido na variável `ASAAS_WEBHOOK_TOKEN`.
   * **Versão do Webhook**: Mantenha na versão padrão (v3).
2. **Eventos a Selecionar** (Habilite apenas os necessários para a nossa regra de negócios):
   * `PAYMENT_RECEIVED` (Pagamento recebido - ativa assinatura)
   * `PAYMENT_CONFIRMED` (Pagamento confirmado - ativa assinatura)
   * `PAYMENT_OVERDUE` (Pagamento vencido/atrasado - suspende assinatura)
   * `SUBSCRIPTION_DELETED` (Assinatura cancelada no painel do Asaas - volta para plano básico)
   * `SUBSCRIPTION_INACTIVATED` (Assinatura inativada - volta para plano básico)
   * `PAYMENT_REFUNDED` (Pagamento estornado - suspende assinatura)
   * `PAYMENT_CHARGEBACK_REQUESTED` (Contestação de pagamento - suspende assinatura)
3. Clique em **Salvar**.

---

## 5. Build e Deploy do Frontend (React + Vite)

### Passos:
1. **Configurar as Variáveis de Ambiente de Produção**:
   Crie ou edite o arquivo `.env.production` na raiz do projeto contendo as credenciais de produção do Supabase:
   ```env
   VITE_SUPABASE_URL=https://<seu-project-ref-de-producao>.supabase.co
   VITE_SUPABASE_ANON_KEY=<sua-anon-public-key-de-producao>
   ```
2. **Gerar a Build**:
   Execute o script de build do Vite:
   ```bash
   npm run build
   ```
3. **Deploy**:
   Envie a pasta resultante `dist/` para a sua plataforma de hospedagem estática escolhida (Vercel, Netlify, Cloudflare Pages ou host próprio).

---

## 6. Homologação e Testes Iniciais em Produção (Smoke Tests)

Antes de abrir a plataforma publicamente, é crucial validar a integração com transações reais de baixo valor.

### Plano de Teste Rápido:
1. **Criar Conta de Teste Real**: 
   * Acesse a URL de produção do seu SaaS e faça o cadastro de uma nova profissional (`/cadastro`).
   * Verifique se a conta foi criada como **Premium Trial (14 dias)** e se o painel da profissional e portal de agendamentos funcionam perfeitamente.
2. **Simular Compra com Pix Real**:
   * Vá em `/faturamento` e solicite a assinatura via Pix. Como você está em produção, o QR Code e código copia e cola Pix exibidos serão reais.
   * Transfira um valor pequeno de teste (se as assinaturas estiverem precificadas oficialmente a R$ 59,90 e R$ 99,90, você pode temporariamente criar um plano de teste de R$ 5,00 no Asaas para validação, ou pagar o valor integral e depois fazer o reembolso no próprio painel do Asaas).
   * Após o pagamento, verifique no painel do Lashly se o status mudou imediatamente para **Assinatura Ativa** (sem o aviso de testes).
3. **Simular Cancelamento**:
   * Cancele a assinatura no painel do Lashly.
   * Verifique se o status é atualizado para **Cancelado** e se as funcionalidades premium voltam a ser bloqueadas gradativamente de acordo com a regra estipulada.
4. **Reembolso**:
   * Acesse o painel do Asaas, localize a transação de teste recebida e clique em **Estornar Transação** (devolvendo o Pix de teste para sua conta).
   * Garanta que o webhook do Asaas enviou a notificação `PAYMENT_REFUNDED` e que a conta de teste correspondente no Lashly foi automaticamente **Suspensa**.
