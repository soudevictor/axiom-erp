# Spec: AxiomERP — Demo de ERP B2B

> **Status:** implementada (v2.0.0) · **Autor:** João Victor Carvalho · **Data:** 2026-10-27
> **Módulo:** `axiom-erp`
>
> **Gate:** mudanças de escopo, design ou arquitetura passam por esta spec e por aprovação
> humana antes de virar código. A implementação atual está registrada abaixo como estado
> verificado; itens de dívida estão marcados como pendentes.

---

## 1. Objetivo

**Problema:** demonstrar, em uma aplicação realista, como estruturar um ERP B2B de alta
densidade no front-end — estado reativo, tabelas grandes, filtros profundos, persistência
local e regras de domínio — sem depender de backend.

**Para quem:** recrutadores técnicos, tech leads e desenvolvedores avaliando arquitetura
Angular moderna, Signals, testes e design system.

**Sucesso significa:**

- As quatro áreas (dashboard, estoque, parceiros, tesouraria) funcionam de ponta a ponta
  com dados persistidos localmente.
- O estado sobrevive à navegação entre rotas e ao refresh do navegador.
- Regras de negócio são aplicadas no "servidor" simulado e exibidas com mensagem em pt-BR.
- `npm run type-check && npm test && npm run build` passam.
- A UI é operável por teclado e legível em desktop e mobile.

---

## 2. Escopo

### Dentro

- Dashboard com KPIs, gráfico de fluxo e alertas acionáveis.
- Estoque multi-armazém com busca, filtros, ordenação, movimentações, undo e CSV.
- Parceiros com CRUD, validação de CNPJ, transições de status e scroll infinito.
- Tesouraria com aging list, filtros, paginação e CRUD.
- Shell com tema claro/escuro, command palette e ferramentas de demonstração.
- Persistência em IndexedDB (Dexie) e API simulada por interceptor.
- Testes unitários/integração com Vitest.

### Fora

- Backend real, autenticação, RBAC, multiusuário e sincronização.
- E-mail, upload, PWA, offline sync, relatórios avançados e módulo de compras.
- i18n — a UI é pt-BR por decisão de produto.
- E2E automatizado (Playwright) — não implementado.

---

## 3. Suposições

1. **Client-only é suficiente** para o objetivo de portfólio; o interceptor faz o papel de
   backend e o Dexie faz o papel de banco.
2. **Angular 22 + Signals** é a stack de demonstração; `@ngrx/signals` cobre o estado de
   feature sem RxJS store.
3. **Dados determinísticos** são preferíveis a Faker no runtime: mesma seed, mesmo catálogo.
4. **pt-BR é o único idioma**; não haverá camada de tradução.
5. **Vercel** é o destino de deploy, com fallback SPA para deep links.

---

## 4. Fluxos de UX

### 4.1 Dashboard

1. O usuário abre `/dashboard` e vê 4 KPIs, gráfico de 6 meses, 3 alertas e estoque por armazém.
2. Clica em um alerta de estoque crítico e vai para `/inventory` com o filtro aplicado na URL.
3. Clica em contas vencidas e abre o drawer correspondente.
4. Alterna o tema; a preferência persiste.

### 4.2 Estoque

1. Busca por SKU/nome com debounce; filtros de status, categoria e armazém sincronizam a URL.
2. Ordena por coluna, seleciona linhas e executa exclusão em lote com confirmação.
3. Registra entrada/saída/ajuste; o ledger recebe um movimento imutável.
4. Desfaz a última movimentação restaurando o mesmo ID, quantidade e ledger.
5. Exporta CSV com BOM UTF-8, separador `;` e labels pt-BR.
6. Em viewport < 768 px, a tabela vira cards sem overflow horizontal.

### 4.3 Parceiros

1. Lista paginada em blocos de 20 com scroll infinito.
2. Filtra por busca (nome/CNPJ/e-mail), categoria, status e UF.
3. Cria/edita parceiro com validação de CNPJ (dígitos verificadores e unicidade).
4. Homologa ou bloqueia respeitando `PARTNER_STATUS_TRANSITIONS`.
5. Exclui apenas se não houver crédito usado nem transações.
6. Abre `/partners?status=BLOQUEADO` direto e vê o filtro aplicado.

### 4.4 Tesouraria

1. Lista transações com aging (vencidas, hoje, 7 dias, 30 dias).
2. Filtra, ordena e pagina.
3. Cria/edita transação em modal com validação.
4. Vê status `PENDING`, `COMPLETED` e `CANCELLED` com rótulos e cores semânticas.

### 4.5 Shell e ferramentas

1. `Ctrl+K` abre a command palette com focus trap e navegação por teclado.
2. O header permite alternar tema e repopular os dados de demonstração.
3. O skip link leva ao conteúdo principal.

---

## 5. Máquina de estados da interface

### 5.1 Listagens (estoque, parceiros, tesouraria)

| Estado | Gatilho | UI obrigatória | Acessibilidade |
| --- | --- | --- | --- |
| **Loading** | Carga inicial ou troca de filtro | Skeleton com a geometria da tabela/cards | `aria-busy="true"` |
| **Empty** | Consulta válida sem resultados | Explicação + ação para limpar filtro | Texto no DOM |
| **Error** | 4xx/5xx/timeout | Mensagem pt-BR + "Tentar de novo" | `role="alert"` + foco |
| **Success** | Dados disponíveis | Tabela desktop ou cards mobile | Semântica de tabela |
| **Refreshing** | Revalidação após mutation | Conteúdo permanece; feedback discreto | `aria-live="polite"` |

### 5.2 Formulários e modais

| Estado | Comportamento |
| --- | --- |
| Idle | Campos vazios ou preenchidos; validação só ao tocar/enviar |
| Validating | Erros por campo com `aria-describedby` e `aria-invalid` |
| Submitting | Botão desabilitado + label de progresso; impede duplo envio |
| Success | Fecha, atualiza a lista e mostra toast |
| Error | Mantém o formulário, exibe `message` do interceptor, permite retry |

### 5.3 Dashboard

| Estado | Comportamento |
| --- | --- |
| Loading | Skeleton dos KPIs, gráfico e tabela |
| Error | Mensagem + retry; não mostra número inventado |
| Success | KPIs, gráfico com tabela acessível alternativa e alertas |

---

## 6. Estados de borda

| Caso | Comportamento esperado | Coberto por |
| --- | --- | --- |
| 500 SKUs / 62 parceiros / 120 transações | Virtual scroll, paginação ou scroll infinito sem travar | Testes de store + uso manual |
| Busca sem resultado | Estado vazio com ação de limpar | Specs de componente |
| Filtros combinados | URL reflete todos; refresh preserva | Specs de query params |
| CNPJ inválido | Erro de validação em pt-BR, sem chamada | Teste de validador |
| CNPJ duplicado | `409` do interceptor; mensagem exibida | Spec de API/store |
| Transição de status inválida | Bloqueada no interceptor e na UI | Spec de modelos |
| Exclusão com crédito/transação | Bloqueada com motivo | Spec de store |
| Undo de movimentação | Restaura ID, quantidade e ledger | Spec de store |
| Conta vencida / hoje / 7 / 30 dias | Aging correto, sem off-by-one | Spec de tesouraria |
| Erro 500 forçado por header | Estado de erro com retry | Spec de interceptor |
| IndexedDB vazio | Seed inicial preenche | Spec de seed |
| IndexedDB já populado | Seed não sobrescreve; repopular é explícito | Spec de seed |
| Viewport < 768 px | Cards sem overflow horizontal | Manual/inspeção |
| Nome/descrição longa | Trunca ou quebra sem estourar a célula | `break-ui` recomendado |
| Valores zero/negativos | Formatação e sinais corretos | Specs de utils |
| CSV com `;`, aspas ou acento | Escapa corretamente; BOM UTF-8 | Spec de CSV |

---

## 7. Contratos de dados e API

### 7.1 Camadas

```text
Componente
  → signalStore (features/<feature>/data-access)
    → InventoryApi | PartnersApi | TreasuryApi (core/api)
      → mock-api.interceptor (core/interceptors)
        → AppDatabase (Dexie/IndexedDB)
```

- Nenhum componente ou store injeta `HttpClient`.
- Regras e validações ficam no interceptor; modelos e transições em `core/models`.

### 7.2 Endpoints simulados

Base: `/api/v1`.

| Recurso | Operações principais |
| --- | --- |
| `inventory` | Listar com filtros/paginação, criar/editar, excluir, movimentar |
| `partners` | Listar com filtros, criar/editar, homologar/bloquear, excluir |
| `treasury` | Listar com filtros, criar/editar, excluir |

URLs fora desses prefixos passam para a rede real.

### 7.3 Envelope de erro

```ts
interface ApiErrorBody {
  code: string;
  message: string; // pt-BR, exibível
}
```

A store lê `error.error.message` via `messageFrom`; o componente não reescreve a mensagem.

### 7.4 Persistência

| Tabela | Conteúdo |
| --- | --- |
| `inventory` | SKUs e saldos por armazém |
| `stockMovements` | Ledger imutável de movimentações |
| `transactions` | Contas a pagar/receber |
| `partners` | Cadastro e status |

- Dexie v4; mudanças de schema exigem nova `version(n).stores(...)`.
- Seed determinístico com `mulberry32`; preenche apenas tabelas vazias.

### 7.5 Estado na URL

`?search=`, `?status=`, `?category=`, `?warehouseId=` em estoque/parceiros/tesouraria.
Filtro novo deve entrar no mesmo contrato.

---

## 8. Conteúdo e dados

| Conteúdo | Arquivo/Local |
| --- | --- |
| Catálogo e seeds | `src/app/core/database/seed/` |
| PRNG determinístico | `src/app/core/database/seed/prng.ts` |
| Regras e labels de domínio | `src/app/core/models/` |
| Endpoints e validações | `src/app/core/interceptors/mock-api.interceptor.ts` |
| Tokens visuais | `src/styles.scss` + `tailwind.config.js` |
| Copy de UI | **Dívida:** ainda inline; destino `src/data/` |

- [x] Seeds isolados e determinísticos.
- [x] Regras de domínio fora do componente.
- [ ] Copy de UI migrado para `src/data/`.
- [ ] Nenhuma string de interface nova hardcoded.

---

## 9. Stack e comandos

| Item | Valor |
| --- | --- |
| Framework | Angular 22 (standalone, signals, OnPush) |
| Estado | `@ngrx/signals` 19 |
| Persistência | Dexie.js 4 (IndexedDB) |
| Estilo | Tailwind CSS 3.4 + SCSS |
| Testes | Vitest 4 + `@analogjs/vitest-angular` (jsdom) |
| Deploy | Vercel (`dist/axiom-erp/browser`) |

```bash
npm install
npm start
npm run type-check
npm test
npm run build
```

Checkpoint: `npm run type-check && npm test && npm run build`.

---

## 10. Estrutura afetada

```text
src/app/core/          # API, banco, interceptor, modelos, serviços
src/app/shared/        # UI reutilizável, diretivas, utils
src/app/features/      # dashboard, inventory, partners, treasury
src/styles.scss        # tokens e base
src/test-setup.ts      # IndexedDB falso, zona, TestBed
```

---

## 11. Estilo de código

- TypeScript strict; sem `any` sem justificativa.
- Componentes standalone, `OnPush`, templates/styles inline, `inject()`, signals.
- `@if`/`@for` no template; sem `*ngIf`/`*ngFor` em código novo.
- Tokens semânticos; sem hex cru fora de `styles.scss`.
- Regra de negócio em `core/models` ou no interceptor; nunca no template.
- Store só orquestra: chama API, expõe estado e converte erro em mensagem.

```ts
// Exemplo de forma, não de implementação existente
readonly items = computed(() => this.store.items().filter(...));
```

---

## 12. Estratégia de testes

| Nível | Onde | Cobre |
| --- | --- | --- |
| Unitário | `core/models/*.spec.ts`, `shared/utils/*.spec.ts` | Regras, CNPJ, CSV, moeda, chart |
| Store | `features/*/data-access/*.store.spec.ts` | Carga, filtro, mutation, erro, undo |
| Integração | `core/interceptors/*.spec.ts` | Endpoints, validação, latência, erro |
| Componente | `shared/ui/*.spec.ts`, layout | Render, interação, acessibilidade |
| Seed | `core/database/seed/seed.spec.ts` | Determinismo e volume |

- A latência de 200–500 ms é real; espere com `setTimeout` ou fake timers.
- Todo P0/P1 corrigido ganha regressão.
- Sem E2E; a decisão está registrada em §18.

---

## 13. Acessibilidade e performance

- [x] Skip link, foco visível, `aria-*`, semântica de tabela.
- [x] Command palette com focus trap e teclado.
- [x] Drawer/modal com scroll lock centralizado.
- [x] Tema claro/escuro persistido; dark como padrão.
- [x] Contraste e estados não dependentes só de cor.
- [ ] Lighthouse medido e registrado no README (não há medição versionada).

Build atual: 541,18 kB raw / 147,72 kB transfer (initial).

---

## 14. Limites

**Always**

- Rodar `npm run type-check && npm test && npm run build` antes de propor commit.
- Manter copy em pt-BR e mensagens de erro vindas do interceptor.
- Reutilizar regras de `core/models` e tokens de `styles.scss`.
- Preservar query params e os quatro estados de listagem.
- Atualizar README/SPEC/tasks quando o comportamento mudar.

**Ask first**

- Adicionar dependência.
- Mudar schema Dexie, contrato de endpoint ou regra de transição.
- Alterar estrutura de pastas, rotas ou design system.
- Migrar copy legado em massa.
- **Commitar ou fazer push — sempre.**

**Never**

- Chamar `HttpClient` fora de `core/api`.
- Editar uma versão existente do Dexie.
- Commitar `dist/`, `.angular/`, `node_modules/` ou segredo.
- Remover teste que falha sem aprovação.
- Declarar performance ou acessibilidade sem medição.
- Executar `git commit`/`git push` sem autorização explícita prévia.

---

## 15. Critérios de aceite

### P0 — implementado

- [x] Quatro rotas lazy com deep link.
- [x] Estoque com busca, filtros, ordenação, movimentação, undo e CSV.
- [x] Parceiros com CRUD, CNPJ, transições e scroll infinito.
- [x] Tesouraria com aging, filtros, paginação e CRUD.
- [x] Dashboard com KPIs, gráfico e alertas acionáveis.
- [x] Quatro estados em todas as listagens.
- [x] Persistência IndexedDB + seed determinístico.
- [x] Tema claro/escuro, command palette e acessibilidade básica.
- [x] 57 testes verdes e build de produção.

### P1 — dívida

- [ ] Migrar copy de UI para `src/data/`.
- [ ] Resolver `npm run lint` (configurar ESLint ou remover o script).
- [ ] Adicionar smoke E2E dos quatro fluxos principais.
- [ ] Medir Lighthouse e registrar números reais.

### P2 — polimento

- [ ] Revisar textos de estado vazio e erro para consistência.
- [ ] Documentar orçamento de bundle no CI/local.

---

## 16. Definition of Done

- [ ] Requisito atendido; nada fora do escopo foi inventado.
- [ ] Copy novo em `src/data/`; legado não foi ampliado.
- [ ] Estados erro/loading/vazio/dados na listagem tocada.
- [ ] Query params preservados quando o filtro mudou.
- [ ] Teclado, foco, labels e contraste verificados.
- [ ] `npm run type-check && npm test && npm run build` verdes.
- [ ] Nenhum `console.log`, código morto ou artefato gerado no diff.
- [ ] README/SPEC/tasks sincronizados.
- [ ] `git status` revisado; **nenhum commit ou push sem autorização**.

---

## 17. Registro de decisões

| Data | Decisão | Motivo | Impacto |
| --- | --- | --- | --- |
| 2026 | Client-only com Dexie + interceptor | Demonstrar arquitetura sem custo de backend | Sem auth/RBAC; dados locais |
| 2026 | `@ngrx/signals` em vez de store RxJS | Estado granular e menos boilerplate | Stores por feature |
| 2026 | Seed determinístico (`mulberry32`) | Reprodutibilidade em demo e testes | Sem Faker no runtime |
| 2026 | Query params como fonte de filtro | Deep link e refresh coerentes | Contrato de URL a preservar |
| 2026 | Tokens semânticos, sem paleta crua | Consistência do design system | Novo UI segue `styles.scss` |
| 2026 | Sem E2E | Custo/benefício no escopo de portfólio | Cobertura fica em Vitest |
| 2026-10 | Copy de UI ainda inline | Entrega inicial priorizou fluxo | Dívida P1 para `src/data/` |

---

## 18. Questões abertas

| # | Pergunta | Bloqueia? | Status |
| --- | --- | --- | --- |
| 1 | Configurar ESLint ou remover o script `lint`? | Não | aberta |
| 2 | Migrar todo o copy para `src/data/` em um ciclo ou por feature? | Não | aberta |
| 3 | Adicionar Playwright smoke ou manter só Vitest? | Não | aberta |
| 4 | Medir Lighthouse e definir budget de bundle? | Não | aberta |
