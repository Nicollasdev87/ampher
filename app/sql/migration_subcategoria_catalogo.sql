-- ============================================================
-- AMPHER — Migração: subcategoria nos itens de catálogo + categoria
-- alinhada ao tipo do orçamento (Elétrica / Mecânica / Outros).
-- Rode este arquivo se você já rodou schema.sql ou
-- migration_catalogo_e_observacao.sql antes dessa mudança.
-- Se você está criando o banco do zero, não precisa rodar este
-- arquivo — ele já está incluído em schema.sql.
-- ============================================================

alter table itens_catalogo
  add column if not exists subcategoria text not null default 'Geral';

-- Se algum item de catálogo já existente tiver uma categoria fora de
-- Elétrica/Mecânica/Outros, ajuste-o manualmente antes de rodar a
-- restrição abaixo (ela vai barrar categorias fora dessa lista).
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_name = 'itens_catalogo' and constraint_name = 'itens_catalogo_categoria_check'
  ) then
    alter table itens_catalogo
      add constraint itens_catalogo_categoria_check
      check (categoria in ('Elétrica', 'Mecânica', 'Outros'));
  end if;
end $$;
