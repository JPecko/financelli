# Financelli

Dashboard de financas pessoais construído com React, TypeScript e Vite.

## Instruções para agentes

Antes de qualquer tarefa, ler `CLAUDE.md`.

Esse é o ficheiro principal de instruções do projeto para arquitetura, convenções de implementação, prioridades mobile-first e compatibilidade PWA.

O foco da app é gestão financeira pessoal com suporte para:
- contas bancárias e cash
- transações manuais e transferências
- regras recorrentes
- despesas partilhadas
- grupos
- investimentos

É uma SPA client-side. Não existe SSR, SEO avançado ou rendering híbrido neste projeto.

## Stack

- React 19
- TypeScript
- Vite
- React Router
- TanStack Query
- React Hook Form + Zod
- Zustand
- Supabase
- Tailwind CSS v4
- Vitest

## Como correr localmente

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Criar um ficheiro `.env.local` com:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### 3. Arrancar a app

```bash
npm run dev
```

### 4. Outros comandos úteis

```bash
npm run build
npm run preview
npm run lint
npm run test
npm run test:watch
```

## Arquitetura

O projeto segue uma organização por domínio/feature.

```text
src/
  app/                  bootstrapping global, providers, router, query client
  data/                 cliente Supabase, query keys e repositories
  domain/               tipos e regras de domínio partilhadas
  features/
    auth/
    dashboard/
    accounts/
    transactions/
    recurring/
    groups/
    investments/
    settings/
  shared/
    components/         layout, UI base e componentes reutilizáveis
    hooks/              hooks transversais
    store/              Zustand stores
    i18n/               traduções e helper useT()
    config/             navegação, bancos, mobile chrome
    utils/              helpers puros
```

### Princípios do projeto

- feature-first: cada área funcional vive no seu domínio
- lógica de dados separada da UI através de `repositories` e `hooks`
- estado remoto em React Query
- estado local/global simples em Zustand
- formulários com React Hook Form
- tipos centrais em `src/domain/types.ts`
- valores monetários guardados em cêntimos para evitar erros de precisão

## Roteamento

O projeto usa `createBrowserRouter` com rotas protegidas por autenticação.

### Estrutura atual

- `/login`
- `/dashboard`
- `/accounts`
- `/transactions`
- `/recurring`
- `/groups`
- `/groups/:id`
- `/investments`
- `/settings`

### Como funciona

- `src/app/router.tsx` define a árvore de rotas
- `ProtectedRoute` bloqueia acesso quando não existe sessão
- `Layout` fornece sidebar, navegação mobile e `<Outlet />`
- a app é SPA e depende do browser history, não de file-based routing

## Dados e autenticação

O backend é Supabase.

- autenticação via `AuthProvider`
- sessão carregada em arranque
- cache e queries geridas por TanStack Query
- repositories em `src/data/repositories/*`
- o cliente Supabase vive em `src/data/supabase.ts`

Quando o utilizador faz logout:
- a query cache é limpa
- preferências locais relacionadas com contas são resetadas

## Funcionalidades principais

### Accounts

- criação e edição de contas
- suporte para contas partilhadas
- reavaliação de saldo

### Transactions

- income, expense e transfer
- categorias
- ligação opcional a holdings em contas de investimento
- despesas pessoais vs partilhadas
- duplicar um movimento a partir do menu da linha (abre o formulário pré-preenchido e grava como novo)

### Recurring

- regras recorrentes
- aplicação automática de regras vencidas após login

### Groups

- grupos com membros
- entradas de grupo e divisão de valores
- detalhe por grupo

### Investments

- ativos e holdings
- contas de investimento
- registo de operações ligadas a holdings

## UI e experiência

- layout responsivo com sidebar em desktop
- header e bottom nav em mobile
- suporte de i18n com `pt` e `en`
- PWA configurada com `vite-plugin-pwa`

## Convenções importantes

- usar alias `@/` para imports de `src`
- preferir lógica de acesso a dados em hooks/repos em vez de fetch direto nos componentes
- manter componentes pequenos e orientados à feature
- reutilizar `shared/components/ui` para base visual
- evitar guardar dinheiro em `float` no modelo persistido

## Testes

Os testes usam Vitest.

Atualmente existem testes em `tests/`, com setup dedicado em:
- `tests/setup.ts`

## Deploy e build

- build com Vite
- output estático
- configuração adicional em `vercel.json`

## Ficheiros de referência

- `src/app/router.tsx`: rotas
- `src/app/providers.tsx`: providers globais
- `src/features/auth/AuthContext.tsx`: autenticação e sessão
- `src/data/supabase.ts`: cliente Supabase
- `src/domain/types.ts`: tipos centrais do domínio
- `src/shared/config/nav.ts`: navegação principal

## Notas

- este projeto não precisa de SEO técnico nem SSR
- qualquer documentação futura deve assumir SPA em Vite
- alterações de routing devem respeitar a árvore definida em `createBrowserRouter`
