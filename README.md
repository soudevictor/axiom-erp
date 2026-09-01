# 🏢 AxiomERP — B2B Supply Chain & Financial Suite

![Angular](https://img.shields.io/badge/Angular-22-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0_Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![NgRx Signals](https://img.shields.io/badge/@ngrx/signals-19-BA2BD2?style=for-the-badge&logo=ngrx&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-Modular_4px-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Dexie.js](https://img.shields.io/badge/IndexedDB-Dexie.js-007ACC?style=for-the-badge)
![Vitest](https://img.shields.io/badge/Vitest-Passing-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

SaaS B2B corporativo de gestão de cadeia de suprimentos, controle de estoque multi-armazém e tesouraria de alta densidade de dados. Projetado para demonstrar padrões arquiteturais avançados no ecossistema **Angular**, com foco em reatividade granular, performance de renderização (Zero CLS / INP otimizado), acessibilidade nativa e usabilidade corporativa anti-clichê de IA.

---

## 🎯 Arquitetura & Decisões Técnicas

| Camada | Tecnologia | Função Arquitetural |
| :--- | :--- | :--- |
| **Framework Core** | Angular v22+ | Standalone Components, Signals, novos blocos de controle (`@if`, `@for`, `@defer`) e detecção de mudanças `OnPush` em 100% dos componentes. |
| **State Management** | `@ngrx/signals` | Reatividade granular via `signalStore` com computed properties e mutações otimistas com suporte a rollback (Undo). |
| **Banco Local NoSQL** | `Dexie.js` (IndexedDB) | Persistência local transparente no navegador, eliminando limites de 5MB do `localStorage` e mantendo persistência permanente sem custos de servidor. |
| **Mock Server Engine** | `HttpInterceptorFn` | Interceptação funcional de rotas `/api/v1/*` com paginação server-side simulada, filtros multicritério, ordenação dinâmica e latência de rede realista (200ms a 500ms). |
| **Design System** | Tailwind CSS + SCSS | Arquitetura de tokens centralizada (`Cobalt Titanium & Deep Carbon`), grade modular estrita de múltiplos de 4px/8px e tipografia tabular monoespaciada. |
| **Componentes & A11y** | `@angular/cdk` | Renderizador `cdk-virtual-scroll-viewport` para tabelas de 1.000+ registros em 60 FPS, Command Palette via `Overlay` e atalhos corporativos (WCAG 2.2 AA). |
| **Testes Automatizados** | `Vitest` (`@analogjs/vitest-angular`) | Suíte de testes unitários rápidos e testes de estado sobre ambiente `jsdom`. |

---

## ⚡ Funcionalidades Principais

- 📦 **Gestão de Estoque Multi-Armazém:**
  - DataGrid com **CDK Virtual Scroll** para grandes volumes de dados.
  - Ordenação dinâmica por colunas (`SKU`, `Quantidade`, `Preço Unitário`, `Status`, `Data`).
  - Busca reativa com *debounce* de 300ms e filtros multicritério por armazém e categoria.
  - Ações em lote (*Bulk Actions*) para transferências ou exclusão em massa.
  - Exportação direta dos dados filtrados para planilha **CSV UTF-8**.
  - Modal com validação reativa e máscara monetária em tempo real (`R$ 0,00`).
  - Mutações otimistas com notificação Toast e ação de **Desfazer (Undo)** ativa por 5 segundos.

- 💰 **Tesouraria & Finanças Corporativas:**
  - Painel de **Aging List** categorizando contas a pagar e a receber por maturidade de vencimento (*Hoje*, *7 dias*, *30 dias* e *Vencidas*).
  - Gráfico de projeção de fluxo de caixa futuro diferido via `@defer (on viewport)`.

- 🤝 **Gestão de Parceiros & Fornecedores (CRM B2B):**
  - Cadastro completo com validação por algoritmo oficial de dígitos verificadores de **CNPJ/CPF (Módulo 11)**.
  - Barra de progresso visual exibindo limite de crédito comprometido vs. disponível.

- ⌨️ **Command Palette Global (`Ctrl + K` / `Cmd + K`):**
  - Menu estilo Spotlight para navegação instantânea entre módulos e disparo de ações rápidas via teclado.

- 🛠️ **Dev Resilience Playground:**
  - Painel de engenharia integrado para simular latência de rede lenta (2s), forçar erro HTTP 500 para testes de resiliência e resetar a base de dados via `@faker-js/faker`.

---

## 🏗️ Estrutura do Projeto

```
src/
├── app/
│   ├── core/                        # Núcleo da aplicação (Singletons e Data Layer)
│   │   ├── database/                # Schema Dexie.js e DatabaseSeedService (@faker-js/faker)
│   │   ├── interceptors/            # Mock API HttpInterceptorFn e DevResilienceService
│   │   └── models/                  # Interfaces e Tipos globais (Estoque, Tesouraria, Paginação)
│   ├── shared/                      # UI Kit, layout, diretivas e utilitários
│   │   ├── directives/              # Máscara e validação de CNPJ
│   │   ├── layout/                  # MainLayout, Sidebar retrátil e Header com Breadcrumbs
│   │   ├── ui/                      # DataGrid, Modal, Skeleton, Toast, StatCard, Badge, CommandPalette
│   │   └── utils/                   # Exportador CSV, formatadores monetários e datas
│   └── features/                    # Módulos de domínio Lazy Loaded
│       ├── dashboard/               # Métricas executivas e KPIs de tesouraria
│       ├── inventory/               # Tabela de estoque com CDK Virtual Scroll e SignalStore
│       ├── treasury/                # Fluxo de caixa e Aging List
│       └── partners/                # Gestão de empresas parceiras e limites de crédito
└── styles.scss                      # Tokens de Design System e diretivas Tailwind
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- Node.js `v20.0.0` ou superior
- npm

### Passo a Passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/soudevictor/axiom-erp.git
   cd axiom-erp
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm start
   ```
   Acesse `http://localhost:4200` no seu navegador. O banco de dados local será populado automaticamente com o seed de dados no primeiro acesso.

4. **Executar a Suíte de Testes com Vitest:**
   ```bash
   npm test
   ```

5. **Validar a Tipagem TypeScript:**
   ```bash
   npm run type-check
   ```

---

## 🌐 Configuração de Deploy na Vercel

1. Importe o repositório no dashboard da [Vercel](https://vercel.com).
2. O framework preset será detectado automaticamente como **Angular**.
3. **Build Command:** `npm run build`
4. **Output Directory:** `dist/axiom-erp/browser` (ou `dist/axiom-erp`)
5. O arquivo `vercel.json` na raiz garantirá o redirecionamento correto das rotas SPA para `/index.html`.

---

## 👤 Autor

Desenvolvido por **João Victor Carvalho de Souza (`soudevictor`)**
* **Portfolio:** [soudevictor.vercel.app](https://soudevictor.vercel.app/)
* **LinkedIn:** [linkedin.com/in/soudevictor](https://www.linkedin.com/in/soudevictor/)
* **GitHub:** [@soudevictor](https://github.com/soudevictor)

---

## 📝 Licença

Este projeto está sob a licença [MIT](LICENSE).