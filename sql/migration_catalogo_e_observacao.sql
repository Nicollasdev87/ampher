-- ============================================================
-- AMPHER — Migração: catálogo de itens predefinidos + observação
-- por item do orçamento.
-- Rode este arquivo no SQL Editor do Supabase se o banco já
-- existia antes dessas mudanças.
-- Se você está criando o banco do zero, não precisa rodar este
-- arquivo — ele já está incluído em schema.sql.
-- ============================================================

alter table itens_orcamento
  add column if not exists observacao text;

create table if not exists itens_catalogo (
  id uuid primary key default gen_random_uuid(),
  categoria text not null,
  nome text not null,
  valor_unitario numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_itens_catalogo_categoria on itens_catalogo (categoria);

alter table itens_catalogo enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'itens_catalogo' and policyname = 'acesso total itens_catalogo'
  ) then
    create policy "acesso total itens_catalogo" on itens_catalogo
      for all using (true) with check (true);
  end if;
end $$;

-- Alguns itens de exemplo pra começar (apague ou edite pela tela de
-- Configurações depois).
insert into itens_catalogo (categoria, nome, valor_unitario)
select * from (values
  ('Elétrica', 'Instalação de disjuntor monofásico', 80.00),
  ('Elétrica', 'Instalação de disjuntor trifásico', 150.00),
  ('Elétrica', 'Instalação de tomada 20A', 60.00),
  ('Mecânica', 'Manutenção preventiva de motor', 250.00)
) as v(categoria, nome, valor_unitario)
where not exists (select 1 from itens_catalogo);
