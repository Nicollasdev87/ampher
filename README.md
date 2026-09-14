# Ampher — Orçamentos

App simples para criar e consultar orçamentos da Ampher Engenharia & Automação, com geração de PDF no mesmo padrão visual usado hoje.

## O que o app faz

- Tela inicial: **Criar orçamento** ou **Verificar orçamento**.
- Criação de orçamento em 3 passos: dados gerais → itens (descrição, quantidade, valor unitário, nível de dificuldade) → logística (dias, técnicos, desconto, condições) e geração automática do PDF.
- Busca de orçamentos por nome do cliente ou número.
- Tela de **Configurações** para ajustar, sem mexer em código:
  - Valor do deslocamento (por dia)
  - Valor da refeição (por técnico, por dia)
  - Valor da diária técnica (por técnico, por dia)
  - Percentual da NFe embutido no total
  - Níveis de dificuldade e seus multiplicadores
- O **nível de dificuldade nunca aparece no PDF nem para o cliente** — ele só multiplica o valor unitário internamente, como margem de risco. O PDF mostra apenas o valor final já com isso embutido.
- Não tem login nesta primeira versão — só pede o nome de quem está criando o orçamento.

## 1. Configurar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (gratuito).
2. Abra **SQL Editor** no painel do projeto.
3. Cole todo o conteúdo do arquivo [`sql/schema.sql`](./sql/schema.sql) e rode. Isso cria as 4 tabelas (`config`, `dificuldades`, `orcamentos`, `itens_orcamento`), já com uma configuração inicial e 3 níveis de dificuldade de exemplo (edite os valores depois pela tela de Configurações do app).
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
    types.ts       → tipos de dados
    calculo.ts      → toda a lógica de cálculo do orçamento
    api.ts          → funções que conversam com o Supabase
    pdf.ts          → geração do PDF
    supabase.ts     → cliente do Supabase
  screens/
    Home.tsx
    NovoOrcamento.tsx
    BuscarOrcamento.tsx
    Configuracoes.tsx
  components/       → botões, campos de formulário, marca Ampher
sql/
  schema.sql        → schema completo do banco (rodar uma vez no Supabase)
```

## Próximos passos possíveis (fora do escopo desta versão)

- Login por usuário (hoje qualquer pessoa com o link acessa e edita tudo — as políticas de RLS no Supabase estão abertas de propósito, por não haver autenticação ainda).
- Edição de orçamentos já criados (hoje dá pra consultar e baixar o PDF de novo, mas não editar).
- Envio do PDF direto por e-mail/WhatsApp pelo próprio app.
