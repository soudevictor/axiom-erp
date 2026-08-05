# Specification & Coding Rules: AxiomERP — B2B Supply Chain & Financial Suite

## 1. Contexto do Projeto & Perfil
* **Nome do Projeto:** AxiomERP (Plataforma B2B de Gestão de Cadeia de Suprimentos e Tesouraria Corporativa)
* **Desenvolvedor:** João Victor Carvalho de Souza (`soudevictor`)
* **Objetivo do Projeto:** Portfólio de alto nível para demonstrar domínio em arquitetura Angular moderna, alta densidade de dados, performance de renderização, usabilidade B2B e acessibilidade.
* **Inspiração de Domínio:** Experiência prática em ecossistemas B2B/ERP (módulos de Carteira, Rendimentos, Empresas, Políticas de Abastecimento e Gestão de Estoque).

---

## 2. Tech Stack Obrigatória

| Camada | Tecnologia / Biblioteca |
| :--- | :--- |
| **Framework Core** | Angular (Versão mais recente, Standalone Components, Signals, Control Flow `@if`/`@for`/`@switch`, `@defer`) |
| **Linguagem** | TypeScript (Modo `strict: true`, Zero `any`) |
| **Estilização** | Tailwind CSS + SCSS/Sass (Uso híbrido: Design Tokens e variáveis em SCSS + utilitários do Tailwind) |
| **Gerenciamento de Estado** | `@ngrx/signals` (SignalStore para reatividade granular) |
| **Persistência Local (Mock Data)** | `Dexie.js` (IndexedDB) + Angular `HttpInterceptorFn` (Simulação de requisições HTTP RESTful) |
| **Componentes e Acessibilidade** | `@angular/cdk` (Virtual Scroll, Overlays, Accessibility primitives) + `lucide-angular` |
| **Testes Automatizados** | `Vitest` (Unitários e Componentes via `@analogjs/vitest-angular`) + `Playwright` (End-to-End) |

---

## 3. Arquitetura de Pastas (Domain-Driven / Clean Architecture)

```
src/
├── app/
│   ├── core/                        # Singleton services, interceptors, guards e inicializadores
│   │   ├── database/                # Dexie.js database schema e seed loader
│   │   ├── interceptors/            # Mock API interceptor (delay, paginação e simulação de erros)
│   │   └── models/                  # Interfaces e Tipos globais
│   ├── shared/                      # Componentes reutilizáveis, diretivas e pipes
│   │   ├── ui/                      # DataGrid, Modal, Skeleton, Toast, StatCard, Badge
│   │   ├── directives/              # A11y, Keyboard Shortcuts, Tooltip
│   │   └── utils/                   # Formatadores (Moeda, CNPJ/CPF, Datas)
│   └── features/                    # Módulos operacionais por domínio (Lazy Loaded)
│       ├── dashboard/               # Métricas de tesouraria e KPIs visuais
│       ├── inventory/               # Gestão de estoque multi-armazém (Virtual Scroll)
│       ├── treasury/                # Controle de carteira, pagamentos e recebimentos
│       └── partners/                # Gestão de empresas e parceiros B2B
├── assets/                          # Seed JSON data (5.000+ registros iniciais)
└── styles/                          # SCSS globals, design tokens e Tailwind directives
```

---

## 4. Diretrizes de UX, Design System e Performance

### Estilo e UI/UX B2B Empresarial
* **Estética:** Minimalista, limpa, densa em dados e focada na produtividade do usuário corporativo.
* **Animações:** Sutis e de alta performance (`transform` e `opacity` via CSS Transitions/Keyframes). Proibido animações lentas que atrasem o fluxo de trabalho.
* **Estados de Borda Obligatórios (4 States Pattern):**
  1. *Empty State:* Ilustrações SVG contextuais com CTAs para inserção de dados.
  2. *Loading State:* Skeleton screens fiéis à estrutura da tabela/dashboard (zero CLS).
  3. *Error State:* Toasts não-bloqueantes e banners de erro com opção de *Retry* manual.
  4. *Success State:* Feedbacks visuais limpos e atualizações otimistas no front-end.

### Performance (Core Web Vitals & Change Detection)
* **100% `OnPush`:** Todos os componentes devem utilizar `changeDetection: ChangeDetectionStrategy.OnPush`.
* **Virtual Scrolling:** Tabelas com mais de 50 registros DEVEM utilizar `@angular/cdk/scrolling`.
* **Deferrable Views:** Utilizar `@defer (on viewport)` para carregamento preguiçoso de gráficos e módulos pesados.

### Acessibilidade (WCAG 2.2 Level AA)
* Suporte nativo a navegação por teclado (`Tab`, `Enter`, `Space`, setas direcionais em grids).
* Atributos `aria-live="polite"` para anúncio de atualizações dinâmicas e filtros em tempo real.
* Suporte a `prefers-reduced-motion` para desativar transições se solicitado pelo sistema operacional.

---

## 5. Estratégia de Dados 100% Front-End (Custo Zero)
1. **Mock HTTP Interceptor:** Intercepta rotas `/api/v1/*`, aplicando paginação em memória, ordens de classificação e atraso artificial de rede (200ms a 500ms).
2. **IndexedDB (Dexie.js):** Permite operações reais de CRUD (Criar, Ler, Atualizar, Deletar) com persistência local permanente no navegador.
3. **Seed Script:** Na primeira execução, se a base estiver vazia, popula o banco local com 5.000 itens de produtos e transações financeiras mocadas.

---

## 6. Regras de Comportamento para o Agente de IA (Cursor/Copilot/Antigravity)
1. **Sem Código de Exemplo Desnecessário:** Gere apenas o código diretamente aplicável à tarefa solicitada.
2. **Execução Direta:** NUNCA crie resumos longos ou planos de implementação detalhados antes de gerar ou editar arquivos, a menos que explicitamente solicitado pelo usuário.
3. **Strict TypeScript:** NUNCA utilize `any`. Tipagem estrita em todas as propriedades e retornos de função.
4. **Respeito às Normas Globais:** Siga estritamente as especificações deste documento em qualquer tarefa de código.