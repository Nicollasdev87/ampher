-- ============================================================
-- AMPHER — Migração: Livro caixa (entradas, saídas, dashboard).
-- Rode este arquivo no SQL Editor do Supabase se o banco já
-- existia antes dessa versão. Se você está criando o banco do
-- zero, não precisa rodar este arquivo — já está em schema.sql.
-- ============================================================

create table if not exists lancamentos_caixa (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('entrada', 'saida')),
  categoria text not null,
  descricao text not null,
  valor numeric(12, 2) not null check (valor >= 0),
  data date not null default current_date,
  observacao text,
  created_at timestamptz not null default now()
);

create index if not exists idx_lancamentos_caixa_data on lancamentos_caixa (data);
create index if not exists idx_lancamentos_caixa_tipo on lancamentos_caixa (tipo);

alter table lancamentos_caixa enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'lancamentos_caixa' and policyname = 'acesso total lancamentos_caixa'
  ) then
    create policy "acesso total lancamentos_caixa" on lancamentos_caixa
      for all using (true) with check (true);
  end if;
end $$;
