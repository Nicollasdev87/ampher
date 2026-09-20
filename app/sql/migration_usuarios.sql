-- ============================================================
-- AMPHER — Migração: login/senha para acessar o app.
-- Rode este arquivo no SQL Editor do Supabase se o banco já
-- existia antes dessa versão. Se você está criando o banco do
-- zero, não precisa rodar este arquivo — já está em schema.sql.
-- ============================================================

create table if not exists usuarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  usuario text not null,
  senha_hash text not null,
  created_at timestamptz not null default now()
);

-- Login é único, sem diferenciar maiúsculas/minúsculas (ex: "Nicollas"
-- e "nicollas" são o mesmo login).
create unique index if not exists idx_usuarios_usuario_unico
  on usuarios (lower(usuario));

alter table usuarios enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'usuarios' and policyname = 'acesso total usuarios'
  ) then
    create policy "acesso total usuarios" on usuarios
      for all using (true) with check (true);
  end if;
end $$;

-- Nota de segurança: assim como as demais tabelas deste projeto, o
-- acesso é liberado via chave anônima (não há backend próprio). A senha
-- nunca é gravada em texto puro — o app grava e confere um hash
-- (bcrypt) gerado no navegador antes de qualquer leitura/escrita nesta
-- tabela.
