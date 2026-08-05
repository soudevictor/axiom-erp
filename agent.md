# Specification & Coding Rules: AxiomERP — B2B Supply Chain & Financial Suite

## 1. Visão Geral & Contexto Corporativo

### 1.1 Objetivo do Projeto
O **AxiomERP** é um SaaS B2B de Gestão de Cadeia de Suprimentos, Tesouraria e Estoque Multi-Armazém de alta performance. O projeto foi concebido para atuar como portfólio técnico sênior de **João Victor Carvalho de Souza (`soudevictor`)**, demonstrando domínio avançado na construção de sistemas corporativos em **Angular**, com foco em alta densidade de dados, performance de renderização, usabilidade defensiva e acessibilidade nativa.

### 1.2 Premissas de Infraestrutura (Custo Zero)
* **Hospedagem:** Vercel (SPA estático de alta disponibilidade).
* **Arquitetura 100% Client-Side:** Toda a lógica de backend, persistência de dados, paginação no servidor, ordenação, filtro multicritério e latência de rede é simulada localmente no navegador via **IndexedDB (Dexie.js)** e **Angular `HttpInterceptorFn`**.
* **Zero Backend Pago:** Elimina dependências de APIs ou bancos em nuvem com limites de inatividade (ex: Supabase/Firebase sleeping instances).

---

## 2. Tech Stack & Dependências Oficializadas

| Camada | Tecnologia / Biblioteca | Especificação & Função |
| :--- | :--- | :--- |
| **Framework Core** | Angular v22+ | Standalone Components, Control Flow (`@if`, `@for`, `@switch`), `@defer`, Signals. |
| **Linguagem** | TypeScript v6+ | Modo `strict: true`, Alias de caminho (`@/*` -> `src/app/*`), **Zero `any`**. |
| **Estilização** | Tailwind CSS v3+ e SCSS | Arquitetura híbrida: Tokens de cores/fontes em SCSS + Utilitários do Tailwind. |
| **Gerenciamento de Estado**| `@ngrx/signals` v19+ | `signalStore` reativo com estados imutáveis e propriedades computadas. |
| **Banco Local & Seed** | `Dexie.js` v4+ e `@faker-js/faker` v9+ | IndexedDB NoSQL nativo no navegador + Gerador de dados realistas (500+ registros). |
| **Mock API Engine** | `HttpInterceptorFn` | Interceptação de rotas `/api/v1/*` com latência de rede (200-500ms) e HTTP errors. |
| **Componentes e A11y** | `@angular/cdk` v22+ e `lucide-angular` | CDKs para Virtual Scroll, Overlays e ícones vetoriais responsivos. |
| **Testes Automatizados** | `Vitest` v4+ (`@analogjs/vitest-angular`) | Suíte de testes unitários rápidos e testes de integração de componentes (`jsdom`). |

---

## 3. Arquitetura de Pastas (Domain-Driven / Clean Architecture)

```
src/
├── app/
│   ├── core/                        # Núcleo da aplicação (Singletons, Services Globais e Data Layer)
│   │   ├── database/                # Schema Dexie.js e DatabaseSeedService (@faker-js/faker)
│   │   ├── interceptors/            # Mock API HttpInterceptorFn (paginação, delays e tratamento de erros)
│   │   ├── models/                  # Interfaces, Tipos globais e Contratos de API
│   │   └── services/                # Serviços de infraestrutura (Notificações Toast, Theme Manager)
│   ├── shared/                      # UI Kit interno, diretivas e utilitários reutilizáveis
│   │   ├── ui/                      # DataGrid (Virtual Scroll), Modal, Skeleton, Toast, StatCard, Badge
│   │   ├── layout/                  # MainLayoutComponent, Sidebar, Topbar, Breadcrumbs
│   │   ├── directives/              # A11y, Keyboard Shortcuts, Tooltip, Click outside
│   │   └── utils/                   # Formatadores (Moeda BRL, CNPJ/CPF, Data, Porcentagem)
│   └── features/                    # Módulos de domínio operacionais (Lazy Loaded)
│       ├── dashboard/               # Métricas de tesouraria, gráficos e KPIs visuais
│       ├── inventory/               # Gestão de estoque multi-armazém (Tabela CDKs + SignalStore)
│       ├── treasury/                # Gestão de carteira, contas a pagar/receber e fluxo de caixa
│       └── partners/                # Cadastro e gestão de fornecedores e clientes B2B
├── assets/                          # Recursos estáticos
└── styles.scss                      # Diretivas Tailwind, Tokens SCSS e estilos globais
```

---

## 4. Modelagem de Dados & Tipagem TypeScript (Domain Schemas)

Todos os modelos de dados devem residir em `src/app/core/models/` com tipagem estrita:

### 4.1 Módulo de Estoque (`inventory.model.ts`)
```typescript
export type InventoryCategory = 'ELECTRONICS' | 'HARDWARE' | 'LOGISTICS' | 'OFFICE';
export type InventoryStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: InventoryCategory;
  warehouseId: string;
  quantity: number;
  minThreshold: number;
  unitPrice: number;
  status: InventoryStatus;
  updatedAt: string; // ISO Date String
}

export interface InventoryFilter {
  search: string;
  category: InventoryCategory | 'ALL';
  status: InventoryStatus | 'ALL';
  page: number;
  limit: number;
  sortBy: keyof InventoryItem;
  sortOrder: 'asc' | 'desc';
}
```

### 4.2 Módulo de Tesouraria (`treasury.model.ts`)
```typescript
export type TransactionType = 'INCOME' | 'EXPENSE';
export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

export interface TreasuryTransaction {
  id: string;
  description: string;
  type: TransactionType;
  amount: number;
  category: 'SUPPLIER_PAYMENT' | 'CLIENT_RECEIPT' | 'LOGISTICS' | 'TAXES';
  partnerId: string;
  partnerName: string;
  status: TransactionStatus;
  dueDate: string;
  paymentDate?: string;
}
```

### 4.3 Padrão Universal de Paginação (`pagination.model.ts`)
```typescript
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    totalItems: number;
    currentPage: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
```

---

## 5. Camada de Persistência Local & Mock Server Engine

### 5.1 Banco de Dados Local (`app-database.ts`)
Implementado via **Dexie.js**. As tabelas possuem índices compostos para viabilizar buscas performáticas:
* **Tabela `inventory`:** `++id, sku, name, category, status, warehouseId, updatedAt`
* **Tabela `transactions`:** `++id, type, status, category, partnerId, dueDate`

### 5.2 Gerador de Seed Dinâmico (`database-seed.service.ts`)
* Se a contagem na tabela `inventory` for `0` na inicialização do app (`provideAppInitializer`), o serviço popula automaticamente **500 registros realistas** usando `@faker-js/faker`.
* Deve oferecer um método `resetDatabase()` para limpar e repopular a base sob demanda do usuário via interface.

### 5.3 Angular Functional Interceptor (`mock-api.interceptor.ts`)
O `HttpInterceptorFn` captura chamadas iniciadas por `HttpClient` para a base `/api/v1/*`:
1. **GET `/api/v1/inventory`**:
   - Lê dados do Dexie.js.
   - Aplica busca textual case-insensitive (`sku` ou `name`).
   - Aplica filtros exatos de `category` e `status`.
   - Aplica ordenação dinâmica (`sortBy`, `sortOrder`).
   - Retorna um objeto `PaginatedResponse<InventoryItem>` envelopado em `HttpResponse(200)`.
   - Injeta latência artificial aleatória entre 200ms e 500ms usando RxJS `delay()`.
2. **POST / PUT / DELETE `/api/v1/inventory`**:
   - Executa mutações em tempo real no banco local Dexie.js.
   - Retorna os dados modificados com status `201 Created` ou `200 OK`.
3. **Simulação de Injeção de Erros (Resiliência de UI):**
   - Se a requisição contiver o header `X-Simulate-Error: true`, ignora a leitura do banco e dispara um `HttpErrorResponse` de status 500 para validar os componentes de fallback da interface.

---

## 6. Gerenciamento de Estado Reativo com `@ngrx/signals`

Cada funcionalidade core terá sua própria `SignalStore` isolada em `features/<domain>/data-access/`.

### 6.1 Arquitetura da Store de Estoque (`inventory.store.ts`)
* **State:**
  - `items`: `InventoryItem[]` (dados da página atual)
  - `totalItems`: `number`
  - `loading`: `boolean`
  - `error`: `string | null`
  - `filters`: `InventoryFilter`
* **Computed Properties (`withComputed`):**
  - `lowStockCount`: Conta itens com `status === 'LOW_STOCK'` ou `quantity <= minThreshold`.
  - `totalStockValue`: Acumula a soma `quantity * unitPrice` de todos os itens carregados.
  - `hasActiveFilters`: Retorna `true` se `search`, `category` ou `status` forem alterados do padrão.
* **Methods (`withMethods`):**
  - `loadItems()`: Dispara chamada via `HttpClient` e atualiza `items`, `totalItems`, `loading` e `error`.
  - `setFilters(partialFilters)`: Atualiza os filtros e recarrega os itens reativamente.
  - `addItem(item)` / `updateItem(id, item)` / `deleteItem(id)`: Executa atualizações otimistas e sincroniza com o mock backend.

---

## 7. Shell Layout, Rotas & Navegação

### 7.1 Estrutura de Roteamento (`app.routes.ts`)
```typescript
export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { 
        path: 'dashboard', 
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) 
      },
      { 
        path: 'inventory', 
        loadComponent: () => import('./features/inventory/inventory.component').then(m => m.InventoryComponent) 
      },
      { 
        path: 'treasury', 
        loadComponent: () => import('./features/treasury/treasury.component').then(m => m.TreasuryComponent) 
      },
      { 
        path: 'partners', 
        loadComponent: () => import('./features/partners/partners.component').then(m => m.PartnersComponent) 
      }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
```

### 7.2 Componentes do Shell Layout
1. **`MainLayoutComponent`:** Container principal flexível mantendo a estrutura fixa de Sidebar + Header + Container Principal de Conteúdo.
2. **`SidebarComponent`:** Navegação corporativa expansível/retrátil com links para Dashboard, Estoque, Tesouraria e Parceiros, incluindo indicador visual de rota ativa (`routerLinkActive`) e atalhos por teclado.
3. **`HeaderComponent`:** Topbar contendo Breadcrumbs dinâmicos, barra de busca rápida global, indicador visual do banco local IndexedDB e seletor de perfil de usuário mocado (RBAC: Admin / Operador).

---

## 8. Diretrizes de UX/UI, Design System e Performance

### 8.1 Padrão de 4 Estados de Borda (Obligatório em todas as visões)
1. **Loading State:** Uso exclusivo de *Skeleton Loaders* espelhados com a geometria exata da tabela ou dashboard para eliminar oscilações de layout (**Zero CLS - Cumulative Layout Shift**).
2. **Empty State:** Exibição de componente visual amigável com SVG minimalista e CTA claro para inclusão de novos dados quando as buscas não retornarem resultados.
3. **Error State:** Tratamento com Toasts de erro não-bloqueantes e opção de *Retry* manual visível no topo da página.
4. **Success State:** Feedback visual sutil (animação suave de opacidade/transform) e atualização imediata do estado.

### 8.2 Performance de Renderização
* **Change Detection:** `changeDetection: ChangeDetectionStrategy.OnPush` em 100% dos componentes Angular.
* **Virtual Scroll (`@angular/cdk/scrolling`):** Obrigatório no renderizador de tabelas para listas superiores a 50 itens, mantendo a taxa de atualização em 60 FPS e reduzindo o impacto no **INP (Interaction to Next Paint)**.
* **Deferrable Views (`@defer`):** Utilização de `@defer (on viewport)` para desacoplar e adiar o carregamento de gráficos estatísticos e tabelas secundárias.

### 8.3 Acessibilidade Nível WCAG 2.2 AA
* **Navegação por Teclado:** Foco visível estilizado via Tailwind em todas as áreas interativas. Suporte total a `Tab`, `Enter`, `Space` e setas em listas e modais.
* **Anúncios Dinâmicos:** Elementos de busca e contadores utilizam `aria-live="polite"` para notificar atualizações a leitores de tela sem interromper o usuário.
* **Modo Reduzido:** CSS media query `@media (prefers-reduced-motion: reduce)` para desativar transições em dispositivos configurados para acessibilidade.

---

## 9. Estratégia de Testes Automatizados (Vitest)

* **Ferramenta:** `Vitest` configurado com `@analogjs/vitest-angular` e `jsdom`.
* **Escopo de Cobertura Obrigatório:**
  1. **SignalStores:** Validação de inicialização de estado, mutações via métodos e cálculos de propriedades computadas (`lowStockCount`, `totalStockValue`).
  2. **HttpInterceptor:** Testes garantindo que chamadas HTTP a `/api/v1/inventory` retornem a resposta paginada e que requisições com o header `X-Simulate-Error` disparem exceção.
  3. **Componentes da UI:** Validação da renderização correta de `StatCard`, comportamento do menu `Sidebar` e alteração de estados do `DataGrid`.

---

## 10. Roadmap de Execução (Guia de Fases para o Agente)

* **FASE 1 (Camada de Dados & Core):** Modelos de domínio TypeScript, schema Dexie.js, serviço de Seed com `@faker-js/faker`, `mockApiInterceptor` funcional e `InventoryStore` com Vitest.
* **FASE 2 (App Shell Layout & Design System):** Configuração do roteamento lazy-loaded, `MainLayoutComponent`, `SidebarComponent`, `HeaderComponent`, Breadcrumbs e componentes base reutilizáveis (`StatCard`, `SkeletonLoader`, `Badge`, `Toast`).
* **FASE 3 (Módulo de Estoque Completo):** Construção da tabela de alta performance com `@angular/cdk/scrolling` Virtual Scroll, filtros reativos por busca/categoria, paginação e modal para criação/edição de produtos.
* **FASE 4 (Dashboard & Tesouraria):** Construção do dashboard executivo com KPIs visuais, gráficos diferidos com `@defer` e módulo de fluxo de caixa da tesouraria.
* **FASE 5 (Ajustes Finais, A11y & Homologação):** Garantia de 100% de conformidade com WCAG 2.2 AA, navegabilidade total por teclado, validação de Core Web Vitals e suíte final de testes Vitest.

---

## 11. Regras de Comportamento para o Agente de IA (Cursor/Copilot/Antigravity)

1. **Escrita Direta de Código:** NUNCA crie planos de implementação extensos ou resumos informativos antes de gerar código. Modifique e crie os arquivos de código imediatamente.
2. **Zero `any`:** Empregue tipagem estrita do TypeScript em 100% das variáveis, parâmetros e retornos de função.
3. **Respeito aos Aliases de Importação:** Utilize exclusivamente `@/*` para fazer referências internas a `src/app/*`.
4. **Padrões Angular Modernos:** Empregue nativamente Standalone Components, detecção de mudanças `OnPush`, SignalStores do `@ngrx/signals` e diretivas de controle de fluxo nativas (`@if`, `@for`, `@switch`, `@defer`).