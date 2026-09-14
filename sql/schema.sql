-- ============================================================
-- AMPHER — Orçamentos
-- Schema completo para rodar no SQL Editor do Supabase.
-- Rode este arquivo inteiro de uma vez, em um projeto novo.
-- ============================================================

-- Extensão usada para gerar UUIDs
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Tabela: config
-- Guarda os valores padrão usados em todo orçamento novo.
-- Existe sempre UMA linha só nessa tabela (a primeira criada).
-- ------------------------------------------------------------
create table if not exists config (
  id uuid primary key default gen_random_uuid(),
  valor_deslocamento numeric(12,2) not null default 0,       -- valor fixo do deslocamento, por dia
  valor_refeicao numeric(12,2) not null default 0,            -- valor por técnico, por dia
  valor_diaria_tecnico numeric(12,2) not null default 0,      -- diária de cada técnico
  percentual_nfe numeric(5,2) not null default 0,             -- ex: 6.00 = 6%
  validade_proposta_dias integer not null default 15,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Tabela: dificuldades
-- Níveis de dificuldade e seus multiplicadores de risco.
-- O multiplicador é aplicado ao valor unitário do item, mas
-- NUNCA aparece separadamente no PDF nem para o cliente —
-- isso é regra do aplicativo (camada de front-end), não do banco.
-- ------------------------------------------------------------
create table if not exists dificuldades (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  multiplicador numeric(6,3) not null default 1,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Tabela: orcamentos
-- Um registro por orçamento gerado.
-- ------------------------------------------------------------
create table if not exists orcamentos (
  id uuid primary key default gen_random_uuid(),
  numero integer not null unique,
  responsavel text not null,
  cliente_nome text not null,
  cliente_contato text,
  local_servico text,
  tipo text not null check (tipo in ('Elétrica', 'Mecânica', 'Outros')),
  dias integer not null default 1,
  num_tecnicos integer not null default 1,
  desconto numeric(12,2) not null default 0,
  forma_pagamento text,
  prazo_execucao text,
  garantia_servico text,
  observacoes text,
  status text not null default 'pendente'
    check (status in ('pendente', 'aprovado', 'recusado', 'concluido')),

  -- valores calculados no momento da criação (histórico fica congelado
  -- mesmo se as configurações mudarem depois)
  subtotal_itens numeric(12,2) not null default 0,
  valor_deslocamento_total numeric(12,2) not null default 0,
  valor_refeicao_total numeric(12,2) not null default 0,
  valor_diaria_tecnicos_total numeric(12,2) not null default 0,
  valor_nfe numeric(12,2) not null default 0,
  total_geral numeric(12,2) not null default 0,

  created_at timestamptz not null default now()
);

create index if not exists idx_orcamentos_numero on orcamentos (numero);

-- Necessário para busca por nome com ILIKE performática (opcional, mas ajuda)
create extension if not exists pg_trgm;
create index if not exists idx_orcamentos_cliente_nome on orcamentos using gin (cliente_nome gin_trgm_ops);

-- ------------------------------------------------------------
-- Tabela: itens_orcamento
-- Itens de cada orçamento.
-- ------------------------------------------------------------
create table if not exists itens_orcamento (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references orcamentos (id) on delete cascade,
  descricao text not null,
  quantidade numeric(12,2) not null default 1,
  valor_unitario numeric(12,2) not null default 0,
  dificuldade_id uuid references dificuldades (id) on delete set null,
  ordem integer not null default 0,
  secao text,
  created_at timestamptz not null default now()
);

create index if not exists idx_itens_orcamento_orcamento_id on itens_orcamento (orcamento_id);

-- ============================================================
-- Row Level Security
--
-- Esta primeira versão do app NÃO tem login — qualquer pessoa com o
-- link do app consegue ler e escrever. As políticas abaixo liberam
-- acesso total para a chave "anon" (a mesma usada no .env do app).
--
-- Quando quiser adicionar login no futuro, troque estas políticas
-- por regras baseadas em auth.uid().
-- ============================================================

alter table config enable row level security;
alter table dificuldades enable row level security;
alter table orcamentos enable row level security;
alter table itens_orcamento enable row level security;

create policy "acesso total config" on config
  for all using (true) with check (true);

create policy "acesso total dificuldades" on dificuldades
  for all using (true) with check (true);

create policy "acesso total orcamentos" on orcamentos
  for all using (true) with check (true);

create policy "acesso total itens_orcamento" on itens_orcamento
  for all using (true) with check (true);

-- ============================================================
-- Dados iniciais
-- ============================================================

-- Uma linha de configuração inicial — ajuste os valores pela
-- tela de Configurações do app depois.
insert into config (valor_deslocamento, valor_refeicao, valor_diaria_tecnico, percentual_nfe, validade_proposta_dias)
select 150.00, 40.00, 200.00, 6.00, 15
where not exists (select 1 from config);

-- Níveis de dificuldade de exemplo — edite/renomeie pela tela de Configurações.
insert into dificuldades (nome, multiplicador)
select * from (values
  ('Baixa', 1.00),
  ('Média', 1.15),
  ('Alta', 1.35)
) as v(nome, multiplicador)
where not exists (select 1 from dificuldades);
