# Guia de Uso Completo: LashCenter (Painel da Profissional)

Bem-vinda ao **LashCenter**! Este manual foi projetado para ajudar você, profissional da beleza e estética (Lash Designers, Micropigmentadoras, Esteticistas, etc.), a dominar todas as funcionalidades da sua nova plataforma de gestão.

Com o LashCenter, você centraliza seu controle de clientes, serviços, faturamento, agenda e ainda oferece um portal de agendamentos online para as suas clientes marcarem sozinhas, reduzindo o tempo gasto respondendo mensagens no WhatsApp.

---

## Sumário
1. [Primeiro Acesso e Onboarding](#1-primeiro-acesso-e-onboarding)
2. [Configurações Iniciais do Estúdio](#2-configurações-iniciais-do-estúdio)
3. [Gestão de Serviços](#3-gestão-de-serviços)
4. [Gestão de Clientes e Ficha Cadastral](#4-gestão-de-clientes-e-ficha-cadastral)
5. [Configuração de Expediente (Meus Horários)](#5-configuração-de-expediente-meus-horários)
6. [Controle da Agenda (Agendamentos)](#6-controle-da-agenda-agendamentos)
7. [Entendendo o Dashboard (Métricas)](#7-entendendo-o-dashboard-métricas)
8. [Faturamento, Planos e Bloqueio Financeiro](#8-faturamento-planos-e-bloqueio-financeiro)
9. [Prompts de Apoio (Vídeos e Marketing)](#9-prompts-de-apoio-vídeos-e-marketing)

---

## 1. Primeiro Acesso e Onboarding

O primeiro passo para utilizar o LashCenter é criar sua conta de acesso como administradora do estúdio.

### Passo a Passo:
1. Acesse a tela de cadastro em `/cadastro`.
2. Preencha seus dados de forma cuidadosa:
   * **Nome Completo**: Seu nome profissional.
   * **E-mail**: Escolha um e-mail de uso profissional ativo.
   * **WhatsApp**: Insira seu celular principal.
   * **Senha**: Crie uma senha segura (mínimo de 6 caracteres).
3. Clique em **Criar Conta**.
4. O sistema irá criar seu cadastro e criar automaticamente uma estrutura isolada para o seu estúdio no banco de dados.
5. Você será redirecionada automaticamente para a página de **Configurações** para preencher as informações do seu negócio.

> [!NOTE]
> O LashCenter separa os dados de cada estúdio de forma totalmente segura. Nenhuma outra profissional cadastrada no sistema terá acesso às suas clientes, serviços ou faturamento.

---

## 2. Configurações Iniciais do Estúdio
*Rota: `/configuracoes` (Menu Lateral -> Configurações)*

Antes de começar a atender ou enviar o link para suas clientes, você precisa configurar os detalhes do seu estúdio. Esta página é dividida em três abas ou blocos:

### A. Dados do Perfil
* **O que ajustar**: Seu nome de exibição e sua foto de perfil.
* **Redefinição de Senha**: Caso queira alterar sua senha, você pode digitar a nova senha e clicar em salvar.

### B. Dados do Negócio (Estúdio)
* **Nome do Negócio**: Nome do seu estúdio (ex: *Bruna Lash Center*). Este nome aparecerá no topo do portal do cliente.
* **Descrição do Estúdio**: Uma mini-biografia explicando seus diferenciais ou especialidades (pode ser o mesmo texto da bio do seu Instagram).
* **Instagram**: Seu usuário do Instagram (sem o `@`). O sistema gerará um link clicável direto no portal da cliente.
* **Endereço do Estúdio**: Endereço físico completo. Essencial para que as clientes saibam onde ir no dia do atendimento.
* **Logotipo**: Clique em **Carregar Logo** para enviar uma foto quadrada com o logotipo da sua marca. Ela aparecerá no menu lateral e no portal de agendamentos.

### C. Identidade Visual (Design Personalizado)
* **Paleta de Cores**: Escolha a cor que melhor combina com a sua marca. O LashCenter oferece cores elegantes pensadas no ramo da estética (como *Rosa Rose*, *Nude Clássico*, *Cereja Intenso*, *Lavanda Suave*, etc.).
* **Modo Escuro**: Ative para visualizar o painel em um layout escuro e moderno, ideal para reduzir a fadiga visual.

### D. Regras de Agendamento Online
* **Aprovação Automática**:
  * **Ativado (Recomendado)**: Quando a cliente escolhe um horário no portal, o agendamento é marcado e confirmado instantaneamente na sua agenda.
  * **Desativado**: O agendamento entra como "Pendente" e você precisará aprovar ou recusar manualmente na aba de *Agendamentos*.
* **Antecedência Mínima para Cancelamento**: Defina quantas horas de antecedência a cliente precisa ter para conseguir cancelar ou remarcar um horário sozinha (ex: 24 horas). Se ela tentar cancelar com menos tempo, o portal bloqueará e mandará ela falar direto com você.
* **Mensagem Pós-Agendamento**: Texto personalizado exibido para a cliente assim que ela conclui um agendamento (ex: *"Olá! Por favor, venha sem maquiagem nos olhos e evite trazer acompanhantes. Nos vemos em breve!"*).

---

## 3. Gestão de Serviços
*Rota: `/servicos` (Menu Lateral -> Serviços)*

Para que a agenda funcione, você precisa definir quais serviços oferece, quanto cobra e qual a duração de cada um.

### Facilitador de Início:
* Ao acessar a tela de serviços pela primeira vez, o LashCenter pode vir com alguns serviços comuns pré-carregados (como *Extensão Fio a Fio*, *Volume Russo*, *Lash Lifting*). Você pode usá-los como base, editando-os ou removendo-os.

### Como Cadastrar um Novo Serviço:
1. No canto superior direito, clique em **Novo Serviço**.
2. Preencha os campos:
   * **Nome do Serviço**: Nome claro e atraente (ex: *Volume Brasileiro - Aplicação*).
   * **Preço (R$)**: Valor cobrado pelo procedimento.
   * **Duração (Minutos)**: Tempo exato de duração em minutos (ex: 120 para 2 horas). **Atenção:** Essa duração é crucial, pois o sistema usará esse valor para calcular os horários livres na sua agenda.
   * **Descrição**: Explique brevemente o que está incluso no serviço ou para quem ele é indicado.
3. Clique em **Salvar**.

### Como Editar ou Excluir:
* Na listagem, clique no ícone de lápis para editar valores, tempos ou nomes.
* Clique no ícone de lixeira vermelha para excluir. Excluir um serviço não apaga os agendamentos antigos que já foram realizados com ele.

---

## 4. Gestão de Clientes e Ficha Cadastral
*Rota: `/clientes` (Menu Lateral -> Clientes)*

Aqui fica o seu banco de dados de clientes, que funciona como um CRM dedicado.

### Como Cadastrar uma Cliente Manualmente:
1. Clique em **Nova Cliente**.
2. Preencha as informações obrigatórias:
   * **Nome e Sobrenome**.
   * **WhatsApp**: Digite o número com DDD. O sistema formata automaticamente.
3. Preencha as informações opcionais:
   * **Email, Data de Nascimento e Endereço**
   * **CPF**: Opcional, útil se você emitir notas ou precisar de maior controle.
4. Clique em **Salvar**.

> [!TIP]
> Você não precisa cadastrar todas as clientes manualmente! Sempre que uma nova cliente acessar seu portal online e fizer um cadastro para agendar, ela será inserida nesta lista de forma automática com o status de cadastro ativo.

### Visualizando o Histórico Detalhado (Perfil da Cliente):
Clique sobre o nome de qualquer cliente na tabela para abrir o perfil avançado dela, que é organizado da seguinte forma:
* **Resumo Rápido (Painel Lateral)**: Exibe rapidamente os principais dados cadastrais (WhatsApp, e-mail, idade/data de nascimento, canal de origem/como conheceu o estúdio e a data/hora exata do cadastro).
* **Aba Dados Pessoais**: Permite visualizar e editar as informações cadastrais básicas da cliente (nome, sobrenome, contato, CPF e origem). Também há um botão rápido no topo da página para criar um **Novo Agendamento** direto para ela.
* **Aba Ficha Clínica (Anamnese)**: Ficha com perguntas fundamentais para a segurança do procedimento, dividida entre:
  * *Histórico & Cuidados Oculares*: Informações sobre procedimentos anteriores, uso de lentes de contato, sensibilidade nos olhos ou infecções recentes.
  * *Hábitos & Retenção*: Detalhes como posição ao dormir (como costuma dormir), uso de maquiagem à prova d'água e contato com fontes de vapor/calor.
* **Aba Histórico de Atendimentos**: Lista de todos os registros de procedimentos realizados e cobrados. Através do botão **+ Registrar Atendimento**, você pode lançar manualmente novos atendimentos, adicionando o relatório detalhado e os valores cobrados.

---

## 5. Configuração de Expediente (Meus Horários)
*Rota: `/meus-horarios` (Menu Lateral -> Meus Horários)*

> [!IMPORTANT]
> Esta funcionalidade está disponível apenas no **Plano Premium**.

Para que suas clientes agendem online de forma correta, você precisa definir os dias e horários em que trabalha.

### Configurando o Turno Semanal:
Para cada dia da semana (Segunda a Domingo), você pode:
1. **Ativar/Desativar o Dia**: Marque ou desmarque a chave(quadrado) ao lado do dia. Dias desativados não estarão disponíveis para agendamento.
2. **Definir Horário de Início e Término**: Horário que você abre o estúdio e horário que encerra as atividades.


### Bloqueios de Agenda (Férias, Feriados ou Imprevistos):
Precisa ir ao médico na próxima terça à tarde ou vai tirar férias de uma semana? 
1. Na aba **Bloqueios**, clique em **Adicionar Bloqueio**.
2. Preencha:
   * **Data do Bloqueio**: O dia do imprevisto/folga.
   * **Tipo de Bloqueio**:
     * **Dia Inteiro**: Fica indisponível o dia todo.
     * **Horário Específico**: Define a hora inicial e final do bloqueio (ex: bloqueado das 14:00 às 17:00).
   * **Motivo**: Apenas para seu controle interno (ex: *"Consulta médica"*).
3. Salve. As clientes não conseguirão marcar nada nesse período.

---

## 6. Controle da Agenda (Agendamentos)
*Rota: `/agendamentos` (Menu Lateral -> Agendamentos)*

> [!IMPORTANT]
> Esta funcionalidade está disponível apenas no **Plano Premium**.

Esta é a tela principal de operação do dia a dia do estúdio.

### Visualizações Disponíveis:
* **Calendário**: Visão gráfica clássica. Você pode alternar os botões no topo para ver o **Mês**, a **Semana** ou apenas o **Dia** atual.
* **Aguardando Confirmação**: Caso você tenha desativado a *Aprovação Automática*, todos os agendamentos feitos por clientes pelo portal aparecerão aqui aguardando seu clique em "Aprovar" ou "Recusar".

### Como Criar um Agendamento Manual:
Se uma cliente ligar ou mandar mensagem direta no WhatsApp e você quiser reservar o horário dela:
1. Clique no botão **Novo Agendamento** (ou clique diretamente em um espaço vazio no calendário).
2. Selecione a **Cliente** (pesquise digitando o nome).
3. Escolha o **Serviço**.
4. Defina a **Data** e o **Horário**.
5. Clique em **Criar Agendamento**. O sistema calculará o término com base na duração do serviço escolhido e marcará o bloco de tempo na agenda.

### Alterando o Status de um Agendamento:
Clique sobre o card de um agendamento no calendário para abrir os detalhes e alterar seu status:
* **Confirmado**: Agendamento agendado e garantido.
* **Concluído**: Atendimento finalizado. O valor deste agendamento será computado no seu faturamento mensal do Dashboard.
* **Falta (No-show)**: A cliente não apareceu e não avisou. O sistema registrará essa falta no perfil dela para que você saiba do histórico de faltas no futuro.
* **Cancelado**: O horário é liberado imediatamente no portal para outras clientes poderem agendar.

---

## 7. Entendendo o Dashboard (Métricas)
*Rota: `/dashboard` (Menu Lateral -> Dashboard)*

O Dashboard consolida a saúde financeira e operacional do seu negócio. Ele atualiza em tempo real sempre que você altera o status dos agendamentos.

### Filtro de Período
No topo do dashboard há atalhos para filtrar os dados por período: **Hoje**, **Ontem**, **Últimos 7 dias**, **Este mês**, **Mês passado**, **Este ano** e **Personalizado** (onde você define um intervalo de datas livremente). Todos os cards e gráficos respondem ao período selecionado.

### Cards de Indicadores Rápidos
1. **Valor Total Ganho (R$)**: A soma do valor de todos os agendamentos com status **Concluído** no período selecionado. É o seu faturamento real do período.
2. **Total de Agendamentos**: Quantidade total de agendamentos criados no período, independente do status.
3. **Aguardando Confirmação**: Quantidade de agendamentos feitos pelas clientes pelo portal que ainda não foram aprovados. Clique no card para ir direto ao painel de pendentes.
4. **Novos Clientes**: Número de clientes cadastradas no período (manualmente pela profissional ou via portal).

### Próximos Atendimentos de Hoje
Lista todos os agendamentos do dia atual ainda não concluídos, exibindo o horário, nome da cliente, serviço e status de cada um. Útil para ter uma visão rápida do que vem a seguir sem precisar abrir a agenda.

### Gráficos e Análises

**Receita ao longo do tempo**
Gráfico de linha mostrando a evolução do faturamento (soma dos agendamentos concluídos) ao longo do período selecionado. Ideal para identificar tendências de crescimento ou quedas em determinadas semanas/meses.

**Agendamentos por dia da semana**
Gráfico de barras que mostra em quais dias da semana você tem mais agendamentos. Ajuda a entender quais dias são mais movimentados e planejar melhor sua agenda.

**Clientes novas vs recorrentes**
Gráfico de barras empilhadas comparando, ao longo do tempo, quantas clientes atendidas eram novas (primeiro atendimento) e quantas eram recorrentes (já atendidas anteriormente). Indica o quanto o seu negócio retém clientes.

**Serviços mais realizados**
Gráfico de barras horizontais mostrando os procedimentos com maior número de execuções no período. Ajuda a identificar quais serviços são carro-chefe do seu estúdio.

**Receita por categoria de serviço**
Gráfico de pizza com a distribuição percentual do faturamento por tipo de serviço. Mostra quais categorias geram mais receita para o negócio.

---

## 8. Minha Assinatura
*Rota: `/assinatura` (Menu Lateral -> Minha Assinatura)*

Nesta tela você gerencia seu plano ativo e visualiza os planos disponíveis do Lashly.

### Painel de Assinatura Atual
À esquerda da tela fica o resumo do seu plano vigente, com o nome do plano e o status da assinatura. Os possíveis status são:
* **Assinatura Ativa**: Tudo funcionando normalmente.
* **Trial (período de testes)**: Você está no período gratuito de avaliação. A data de encerramento do trial é exibida abaixo do status.
* **Suspenso**: A assinatura está suspensa por falta de pagamento.
* **Cancelado**: A assinatura foi encerrada.

### Comparativo de Planos

**Plano Básico (CRM) — R$ 59,90/mês**
Ideal para profissionais que querem organizar a carteira de clientes e prontuários:
* Cadastro de Clientes ilimitado
* Fichas de Anamnese Customizadas
* Dashboard de Relatórios
* Histórico de Atendimentos
* Suporte por E-mail

**Plano Premium (Agenda) — R$ 99,90/mês**
Para quem quer automatizar a recepção de agendamentos 24h por dia:
* Tudo do Plano Básico
* Portal de Agendamento Online (link exclusivo do seu estúdio)
* Horários Dinâmicos
* Bloqueios Rápidos de Agenda
* Aprovação Manual ou Automática de agendamentos
* Suporte Prioritário

### Como Assinar ou Trocar de Plano
1. Na tela de **Minha Assinatura**, localize o card do plano desejado.
2. Clique em **Assinar via Pix**.
3. O sistema exibirá o código Pix (copia e cola). Realize o pagamento pelo aplicativo do seu banco.
4. Clique em **Confirmar Pagamento Pix**. O plano é ativado imediatamente após a confirmação.

### Em caso de Suspensão
Caso sua assinatura fique suspensa por falta de pagamento, o sistema exibirá uma tela de bloqueio total — você não conseguirá acessar a agenda, clientes ou serviços. Para regularizar, acesse **Minha Assinatura** pela própria tela de bloqueio, realize o pagamento via Pix e confirme. O desbloqueio é imediato.

---

## 9. Prompts de Apoio (Vídeos e Marketing)

Copie e cole os textos abaixo nas suas ferramentas de IA favoritas (ChatGPT, Claude, Gemini) para gerar os materiais de marketing e treinamento do LashHub.

### Prompt A: Roteiro para Vídeo de Demonstração (YouTube/Instagram)
```text
Com base no manual do LashHub para profissionais de cílios e estética, crie um roteiro de vídeo narrado de 3 minutos. O vídeo deve mostrar a tela do sistema.
O roteiro deve conter:
1. Uma introdução chamativa focando na dor da profissional ("Cansada de passar horas respondendo cliente no WhatsApp para marcar horário?").
2. Demonstração prática do painel: cadastrando uma cliente com ficha de anamnese, criando um serviço de Extensão de Cílios e configurando os horários de trabalho em Meus Horários.
3. Demonstração de como a cliente acessa o portal exclusivo do estúdio, escolhe o serviço, seleciona o horário disponível e agenda em segundos.
4. Demonstração do painel de agendamentos: aprovando um agendamento pendente, concluindo um atendimento e visualizando as métricas no Dashboard.
5. Conclusão destacando o ganho de tempo, o controle financeiro pelo dashboard e chamada para ação para assinar o LashHub (Plano Básico R$ 59,90/mês ou Premium R$ 99,90/mês).
Use uma linguagem leve, dinâmica, feminina e profissional.
```

### Prompt B: Copy para Página de Vendas (Landing Page)
```text
Atue como um Copywriter especialista em lançamentos de ferramentas SaaS. Escreva os textos estruturados de uma página de vendas para o "LashHub".
A página de vendas deve ter:
- Headline chamativa conectando controle de agenda + aumento de faturamento.
- Sub-headline focando na liberdade de ter um portal agendando para você 24h por dia, sem precisar responder WhatsApp.
- Sessão de "Dores Comuns" (clientes que desistem por demora no atendimento, agenda confusa no papel, esquecimento de horários, falta de histórico das clientes).
- Sessão de Recursos com base nas funcionalidades reais do sistema:
  * Portal de agendamento online com link exclusivo do estúdio
  * Ficha clínica de anamnese completa com histórico de atendimentos
  * Dashboard financeiro com gráficos de receita, serviços mais realizados e clientes novas vs recorrentes
  * Calendário com visualização mensal, semanal e diária
  * Bloqueios de agenda para férias, feriados e horários indisponíveis
  * Aprovação manual ou automática de agendamentos
  * Registro de faltas (no-show) no histórico da cliente
- Tabela comparativa de planos: Básico CRM (R$ 59,90/mês — gestão de clientes e fichas) e Premium Agenda (R$ 99,90/mês — tudo do básico mais portal e agenda completa).
- Seção de FAQ (Perguntas Frequentes) curta.
```

### Prompt C: Mensagem de Lançamento da Agenda para Clientes (WhatsApp)
```text
Crie 3 modelos de mensagens de WhatsApp para a profissional enviar para sua lista de clientes anunciando que agora ela usa o LashHub e que as clientes podem agendar sozinhas pelo portal online.
Modelo 1: Mensagem curta e direta para clientes recorrentes.
Modelo 2: Mensagem detalhada com benefícios (ex: ver todos os horários disponíveis, escolher o serviço, agendar a qualquer hora do dia ou da noite).
Modelo 3: Mensagem de incentivo (ex: "Agende seu primeiro horário pelo portal e ganhe um mimo/desconto no dia do atendimento").
Deixe espaços demarcados como [Link do Portal] e [Nome da Cliente] para substituição de dados.
```
