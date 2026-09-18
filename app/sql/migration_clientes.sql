-- ============================================================
-- AMPHER — Migração: cadastro de clientes
-- Rode este arquivo no SQL Editor do Supabase se o banco já
-- existia antes da tabela de clientes ser criada.
-- Se você está criando o banco do zero, não precisa rodar este
-- arquivo — ele já está incluído em schema.sql.
-- ============================================================

create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefones text[] not null default '{}',
  endereco text,
  latitude double precision,
  longitude double precision,
  observacao text,
  created_at timestamptz not null default now()
);

create extension if not exists pg_trgm;
create index if not exists idx_clientes_nome on clientes using gin (nome gin_trgm_ops);

alter table orcamentos
  add column if not exists cliente_id uuid references clientes (id) on delete set null;

alter table clientes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'clientes' and policyname = 'acesso total clientes'
  ) then
    create policy "acesso total clientes" on clientes
      for all using (true) with check (true);
  end if;
end $$;
