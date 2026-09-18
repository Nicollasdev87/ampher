-- ============================================================
-- AMPHER — Migração: status do orçamento + seções nos itens
-- Rode este arquivo no SQL Editor do Supabase se o banco já
-- existia antes dessas colunas serem criadas.
-- Se você está criando o banco do zero, não precisa rodar este
-- arquivo — ele já está incluído em schema.sql.
-- ============================================================

alter table orcamentos
  add column if not exists status text not null default 'pendente'
    check (status in ('pendente', 'aprovado', 'recusado', 'concluido'));

alter table itens_orcamento
  add column if not exists secao text;
