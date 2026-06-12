-- 1. Limpeza segura das tabelas na ordem de dependência
TRUNCATE TABLE 
  agendamento_servicos, 
  atendimentos, 
  agendamentos, 
  variacoes_servico, 
  servicos, 
  categorias_servico 
  CASCADE;

-- 2. Inserção das Categorias de Lash Designer
INSERT INTO categorias_servico (id, nome, descricao, ordem) VALUES
('c1000000-0000-0000-0000-000000000001', 'Extensão de Cílios', 'Técnicas de alongamento de cílios fio a fio e volumes.', 1),
('c1000000-0000-0000-0000-000000000002', 'Lash Lifting & Tratamentos', 'Curvatura e tratamentos para cílios naturais.', 2),
('c1000000-0000-0000-0000-000000000003', 'Design de Sobrancelhas', 'Modelagem, alinhamento e coloração para sobrancelhas.', 3),
('c1000000-0000-0000-0000-000000000004', 'Manutenções e Remoções', 'Cuidados periódicos e remoção segura de extensões.', 4);

-- 3. Inserção dos Serviços de Lash Designer
INSERT INTO servicos (id, categoria_id, nome, descricao, duracao_minutos, valor, ativo) VALUES
-- Extensão de Cílios
('b1000000-0000-0000-0000-000000000011', 'c1000000-0000-0000-0000-000000000001', 'Fio a Fio Clássico', 'Um fio sintético acoplado a cada cílio natural. Efeito natural e discreto para o dia a dia.', 120, 150.00, true),
('b1000000-0000-0000-0000-000000000012', 'c1000000-0000-0000-0000-000000000001', 'Volume Russo', 'Fans artesanais de 3 a 6 fios super finos aplicados em cada cílio. Efeito volumoso, denso e marcante.', 150, 200.00, true),
('b1000000-0000-0000-0000-000000000013', 'c1000000-0000-0000-0000-000000000001', 'Volume Híbrido', 'Mescla perfeita de Fio a Fio com Volume Russo. Oferece volume com textura e leveza.', 135, 180.00, true),
('b1000000-0000-0000-0000-000000000014', 'c1000000-0000-0000-0000-000000000001', 'Volume Brasileiro (Cílios Y)', 'Extensões em formato de Y aplicadas individualmente. Proporciona olhar preenchido e moderno.', 120, 160.00, true),

-- Lash Lifting & Tratamentos
('b1000000-0000-0000-0000-000000000021', 'c1000000-0000-0000-0000-000000000002', 'Lash Lifting Completo', 'Curvatura natural e elevação dos cílios com aplicação de nutrição (Lash Botox) e tintura escura.', 60, 120.00, true),
('b1000000-0000-0000-0000-000000000022', 'c1000000-0000-0000-0000-000000000002', 'Spa de Cílios', 'Higienização profunda dos fios, hidratação terapêutica e massagem relaxante na área dos olhos.', 30, 50.00, true),

-- Design de Sobrancelhas
('b1000000-0000-0000-0000-000000000031', 'c1000000-0000-0000-0000-000000000003', 'Design de Sobrancelhas Simples', 'Modelagem personalizada respeitando a simetria e visagismo facial. Feito com pinça/linha.', 45, 50.00, true),
('b1000000-0000-0000-0000-000000000032', 'c1000000-0000-0000-0000-000000000003', 'Design com Henna', 'Modelagem personalizada com aplicação de Henna de alta fixação para preencher falhas e destacar o design.', 60, 70.00, true),
('b1000000-0000-0000-0000-000000000033', 'c1000000-0000-0000-0000-000000000003', 'Brow Lamination', 'Procedimento de alinhamento, estilização e nutrição química dos fios naturais das sobrancelhas.', 60, 130.00, true),

-- Manutenções e Remoções
('b1000000-0000-0000-0000-000000000041', 'c1000000-0000-0000-0000-000000000004', 'Manutenção de Extensão', 'Reposição dos fios crescidos ou caídos. Válido até 20 dias após a aplicação original.', 90, 100.00, true),
('b1000000-0000-0000-0000-000000000042', 'c1000000-0000-0000-0000-000000000004', 'Remoção de Extensão', 'Retirada segura e indolor de extensões antigas usando removedor em gel profissional que protege os cílios naturais.', 45, 40.00, true);

INSERT INTO variacoes_servico (id, servico_id, nome, duracao_minutos, valor) VALUES
('f1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000041', 'Manutenção Fio a Fio', 90, 90.00),
('f1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000041', 'Manutenção Volume Brasileiro', 90, 100.00),
('f1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000041', 'Manutenção Volume Híbrido', 100, 110.00),
('f1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000041', 'Manutenção Volume Russo', 120, 120.00);
