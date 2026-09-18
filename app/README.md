# Ampher — Orçamentos

App simples para criar e consultar orçamentos da Ampher Engenharia & Automação, com geração de PDF no mesmo padrão visual usado hoje.

## O que o app faz

- Tela inicial: **Criar orçamento** ou **Verificar orçamento**.
- Criação de orçamento em 3 passos: dados gerais → itens (descrição, quantidade, valor unitário, nível de dificuldade, observação opcional) → logística (dias, técnicos, desconto, condições) e geração automática do PDF.
- Campos em R$ são formatados automaticamente no padrão brasileiro enquanto a pessoa digita (ex: digitar "2500" já exibe "R$ 2.500,00").
- Ao cadastrar um item, dá pra escolher um item do catálogo (select "Adicionar novo item"), já filtrado pelo tipo do orçamento (Elétrica/Mecânica/Outros) e agrupado por subcategoria (ex: Residencial, Industrial, Comercial) — a escolha já preenche o valor unitário. Os itens do catálogo são gerenciados pela tela de Configurações.
- Cada item pode ter uma **observação** (até 200 caracteres), que também aparece no PDF, abaixo da descrição.
- Busca de orçamentos por nome do cliente ou número.
- **Cadastro de clientes** (tela própria, e também na hora de criar um orçamento): nome, vários telefones e localização (endereço em texto + ponto marcado num mapa, com opção de usar a localização atual do dispositivo). Ao criar um orçamento, a pessoa escolhe se o cliente já está cadastrado (busca e seleciona) ou é novo (cadastra na hora ou usa só naquele orçamento, sem salvar).
- Tela de **Configurações** para ajustar, sem mexer em código:
  - Valor do deslocamento (por dia)
  - Valor da refeição (por técnico, por dia)
  - Valor da diária técnica (por técnico, por dia)
  - Percentual da NFe embutido no total
  - Níveis de dificuldade e seus multiplicadores
  - Itens predefinidos do catálogo (nome + valor unitário), organizados por categoria (Elétrica/Mecânica/Outros) e subcategoria
- O **nível de dificuldade nunca aparece no PDF nem para o cliente** — ele só multiplica o valor unitário internamente, como margem de risco. O PDF mostra apenas o valor final já com isso embutido.
- **Login obrigatório**: ninguém acessa o app sem entrar com usuário e senha. Cadastro de conta exige um **código de acesso** (só quem tem esse código consegue criar uma conta nova). Dá pra mostrar/ocultar a senha digitada em qualquer campo de senha, e redefinir a senha (via código de acesso) caso esqueça. Ao criar um orçamento, o nome do responsável já vem preenchido automaticamente com o nome de quem está logado.

## 0. Login e código de acesso

- O **código de acesso** para cadastrar uma conta nova é `182010`, definido em [`src/lib/auth.ts`](./src/lib/auth.ts) (constante `CODIGO_ACESSO`) — pra trocar, edite esse arquivo e rode o build de novo.
- A senha precisa ter entre 8 e 15 caracteres, com ao menos uma letra maiúscula, uma minúscula, um número e um caractere especial (regra em [`src/lib/senha.ts`](./src/lib/senha.ts)).
- Sem servidor de e-mail configurado, "Esqueci minha senha" funciona com o mesmo código de acesso (em vez de link por e-mail): a pessoa informa o usuário, o código de acesso e a nova senha.
- Já logado, dá pra trocar a senha em **Configurações → Minha conta** (pedindo a senha atual).
- As senhas nunca ficam em texto puro no banco — são gravadas como hash (bcrypt), gerado no navegador antes de qualquer leitura/escrita na tabela `usuarios`.

## 1. Configurar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (gratuito).
2. Abra **SQL Editor** no painel do projeto.
3. Cole todo o conteúdo do arquivo [`sql/schema.sql`](./sql/schema.sql) e rode. Isso cria as 6 tabelas (`usuarios`, `config`, `dificuldades`, `orcamentos`, `itens_orcamento`, `itens_catalogo`), já com uma configuração inicial, 3 níveis de dificuldade e alguns itens de catálogo de exemplo (edite os valores depois pela tela de Configurações do app).

   **Já tinha um banco criado antes dessa versão?** Não precisa rodar o `schema.sql` de novo:
   - Se ainda não tinha a tabela de login, rode [`sql/migration_usuarios.sql`](./sql/migration_usuarios.sql).
   - Se ainda não tinha o catálogo de itens, rode [`sql/migration_catalogo_e_observacao.sql`](./sql/migration_catalogo_e_observacao.sql).
   - Se já tinha o catálogo (sem subcategoria), rode também [`sql/migration_subcategoria_catalogo.sql`](./sql/migration_subcategoria_catalogo.sql).
   - Se ainda não tinha a tabela de clientes, rode também [`sql/migration_clientes.sql`](./sql/migration_clientes.sql).
4. Vá em **Project Settings → API** e copie:
   - **Project URL**
   - **anon public key**

## 2. Configurar o app

Na raiz do projeto:

```bash
cp .env.example .env
```

Edite o `.env` e cole os dois valores do Supabase:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

## 3. Rodar localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`.

## 4. Gerar a versão de produção (buildar)

```bash
npm run build
```

Isso gera a pasta `dist/` — pronta para subir em qualquer hospedagem estática (Vercel, Netlify, Cloudflare Pages, ou até um servidor simples). Também dá pra testar o build de produção localmente com:

```bash
npm run preview
```

### Publicar rápido (opcional)

O jeito mais rápido de colocar no ar hoje mesmo é a Vercel ou a Netlify:

- **Vercel**: `npx vercel --prod` (pede login na primeira vez) — lembre de configurar as duas variáveis de ambiente (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`) no painel do projeto na Vercel também, não só no `.env` local.
- **Netlify**: `npx netlify deploy --prod` (mesma observação sobre variáveis de ambiente).

## Sobre o cálculo do orçamento

Toda a lógica de cálculo está isolada em `src/lib/calculo.ts`, comentada, para ser fácil de revisar ou ajustar:

- **Itens**: quantidade × valor unitário × multiplicador de dificuldade.
- **Deslocamento**: valor fixo por dia (considerando um deslocamento por dia de execução, não por técnico).
- **Alimentação** e **diária técnica**: por técnico, por dia.
- **Desconto**: subtraído antes de calcular a NFe.
- **NFe**: percentual aplicado sobre o valor já com desconto, e somado ao total.

Se a regra de negócio para deslocamento (por exemplo, se deveria multiplicar pelo número de técnicos também) for diferente do que você usa hoje, é só ajustar a função `calcularOrcamento` nesse arquivo — o resto do app não precisa mudar.

## Estrutura do projeto

```
src/
  lib/
    types.ts        → tipos de dados
    calculo.ts      → toda a lógica de cálculo do orçamento
    formatacao.ts   → formatação de moeda (R$), telefone e limites de texto
    api.ts          → funções que conversam com o Supabase
    pdf.ts          → geração do PDF
    supabase.ts     → cliente do Supabase
  screens/
    Home.tsx
    NovoOrcamento.tsx
    BuscarOrcamento.tsx
    Configuracoes.tsx
  components/       → botões, campos de formulário (Field, NumberField, MoneyField, SelectField…), marca Ampher
sql/
  schema.sql                              → schema completo do banco (rodar uma vez, banco novo)
  migration_status_secao.sql              → migração antiga (status + seção nos itens)
  migration_catalogo_e_observacao.sql     → migração (catálogo de itens + observação por item)
  migration_subcategoria_catalogo.sql     → migração desta versão (subcategoria + categoria restrita ao tipo)
```

## Próximos passos possíveis (fora do escopo desta versão)

- Login por usuário (hoje qualquer pessoa com o link acessa e edita tudo — as políticas de RLS no Supabase estão abertas de propósito, por não haver autenticação ainda).
- Edição de orçamentos já criados (hoje dá pra consultar e baixar o PDF de novo, mas não editar).
- Envio do PDF direto por e-mail/WhatsApp pelo próprio app.
