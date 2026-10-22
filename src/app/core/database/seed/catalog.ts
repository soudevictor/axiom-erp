import type { InventoryCategory } from '@/core/models/inventory.model';
import type { PartnerCategory, PartnerStatus } from '@/core/models/partner.model';
import type { TransactionType } from '@/core/models/treasury.model';

export const SEED = 0xa7102026;
export const SEED_INVENTORY_COUNT = 500;
export const SEED_TRANSACTION_COUNT = 120;

export const INVENTORY_CATEGORY_PREFIX: Record<InventoryCategory, string> = {
  ELECTRONICS: 'ELE',
  HARDWARE: 'HAR',
  LOGISTICS: 'LOG',
  OFFICE: 'OFF',
};

export const PRODUCT_NAMES: Record<InventoryCategory, readonly string[]> = {
  ELECTRONICS: [
    'Cabo HDMI 2.1',
    'Fonte ATX Modular',
    'SSD NVMe Gen4',
    'Memória DDR5',
    'Placa de Rede 10GbE',
    'Hub USB-C',
    'Webcam Ultra HD',
    'Mouse Sem Fio',
    'Teclado Mecânico',
    'Monitor LED 27"',
    'Dock Station USB-C',
    'Adaptador DisplayPort',
  ],
  HARDWARE: [
    'Parafuso Phillips M3',
    'Porca Sextavada M6',
    'Arruela de Pressão',
    'Broca HSS 6 mm',
    'Serra Circular',
    'Chave Torx T25',
    'Alicate Universal',
    'Trena Laser 50 m',
    'Nível a Laser',
    'Jogo de Chaves Combinadas',
    'Disco de Corte',
    'Martelo de Borracha',
  ],
  LOGISTICS: [
    'Caixa de Papelão 40x30',
    'Fita Adesiva 48 mm',
    'Pallet PBR 1200x1000',
    'Stretch Film 500 mm',
    'Etiqueta Térmica 100x50',
    'Cinta de Amarração 5 t',
    'Contentor Plástico',
    'Lacre de Segurança',
    'Cantoneira de Proteção',
    'Filme Bolha 1 m',
  ],
  OFFICE: [
    'Resma de Papel A4',
    'Caneta Esferográfica',
    'Grampeador de Mesa',
    'Clips Niquelado 2/0',
    'Pasta Catálogo A4',
    'Bloco Adesivo 76x76',
    'Marcador Permanente',
    'Tesoura de Mesa',
    'Calculadora Financeira',
    'Organizador de Mesa',
  ],
};

export const PRODUCT_VARIANTS = [
  'Compacto',
  'Profissional',
  'Industrial',
  'Série 2',
  'Alta Performance',
  'Reforçado',
  'Econômico',
  'Premium',
] as const;

export interface SeedPartner {
  readonly id: string;
  readonly cnpjBase: string;
  readonly companyName: string;
  readonly tradeName: string;
  readonly category: PartnerCategory;
  readonly status: PartnerStatus;
  readonly creditLimit: number;
  readonly creditUsed: number;
  readonly state: string;
  readonly contactName: string;
  readonly email: string;
  readonly phone: string;
  readonly statusReason?: string;
  readonly createdAtDaysAgo: number;
  readonly updatedAtDaysAgo: number;
}

export const SEED_PARTNERS: readonly SeedPartner[] = [
  {
    id: 'PART-001',
    cnpjBase: '112223330001',
    companyName: 'TechSupply Brasil Distribuidora Ltda',
    tradeName: 'TechSupply Brasil',
    category: 'FORNECEDOR',
    status: 'HOMOLOGADO',
    creditLimit: 550000,
    creditUsed: 385000,
    state: 'SP',
    contactName: 'Renata Almeida',
    email: 'renata.almeida@techsupply.com.br',
    phone: '11987451230',
    createdAtDaysAgo: 920,
    updatedAtDaysAgo: 4,
  },
  {
    id: 'PART-002',
    cnpjBase: '223334440001',
    companyName: 'MegaLogística Soluções de Transporte S.A.',
    tradeName: 'MegaLogística',
    category: 'DISTRIBUIDOR',
    status: 'HOMOLOGADO',
    creditLimit: 720000,
    creditUsed: 540000,
    state: 'RJ',
    contactName: 'Bruno Tavares',
    email: 'bruno.tavares@megalog.com.br',
    phone: '21996541220',
    createdAtDaysAgo: 760,
    updatedAtDaysAgo: 2,
  },
  {
    id: 'PART-003',
    cnpjBase: '334445550001',
    companyName: 'Escritório Central de Eletrônicos Eireli',
    tradeName: 'Central Eletrônicos',
    category: 'CLIENTE_DIRETO',
    status: 'EM_ANALISE',
    creditLimit: 180000,
    creditUsed: 0,
    state: 'MG',
    contactName: 'Camila Rocha',
    email: 'camila@centraleletronicos.com.br',
    phone: '31988117744',
    createdAtDaysAgo: 18,
    updatedAtDaysAgo: 18,
  },
  {
    id: 'PART-004',
    cnpjBase: '445556660001',
    companyName: 'Hardware & Cia Suprimentos Industriais Ltda',
    tradeName: 'Hardware & Cia',
    category: 'FORNECEDOR',
    status: 'HOMOLOGADO',
    creditLimit: 420000,
    creditUsed: 260000,
    state: 'PR',
    contactName: 'Diego Martins',
    email: 'diego.martins@hardwarecia.com.br',
    phone: '41991234455',
    createdAtDaysAgo: 610,
    updatedAtDaysAgo: 9,
  },
  {
    id: 'PART-005',
    cnpjBase: '556667770001',
    companyName: 'Global Logistics & Freight Corp',
    tradeName: 'Global Freight',
    category: 'DISTRIBUIDOR',
    status: 'BLOQUEADO',
    creditLimit: 900000,
    creditUsed: 810000,
    state: 'RS',
    contactName: 'Eduardo Nunes',
    email: 'eduardo.nunes@globalfreight.com',
    phone: '51992558877',
    statusReason: 'Parcela vencida há mais de 30 dias; cadastro suspenso para renegociação.',
    createdAtDaysAgo: 1040,
    updatedAtDaysAgo: 6,
  },
  {
    id: 'PART-006',
    cnpjBase: '667778880001',
    companyName: 'Nexus Componentes S.A.',
    tradeName: 'Nexus Componentes',
    category: 'FORNECEDOR',
    status: 'HOMOLOGADO',
    creditLimit: 380000,
    creditUsed: 300000,
    state: 'SP',
    contactName: 'Patrícia Lima',
    email: 'patricia.lima@nexuscomponentes.com.br',
    phone: '11996334422',
    createdAtDaysAgo: 880,
    updatedAtDaysAgo: 1,
  },
  {
    id: 'PART-007',
    cnpjBase: '778889990001',
    companyName: 'Aurora Papelaria Corporativa Ltda',
    tradeName: 'Aurora Papelaria',
    category: 'CLIENTE_DIRETO',
    status: 'HOMOLOGADO',
    creditLimit: 160000,
    creditUsed: 96000,
    state: 'MG',
    contactName: 'Sofia Andrade',
    email: 'sofia.andrade@aurorapapelaria.com.br',
    phone: '31987445566',
    createdAtDaysAgo: 540,
    updatedAtDaysAgo: 12,
  },
  {
    id: 'PART-008',
    cnpjBase: '889990010001',
    companyName: 'Vetor Ferramentas Industriais Ltda',
    tradeName: 'Vetor Ferramentas',
    category: 'FORNECEDOR',
    status: 'EM_ANALISE',
    creditLimit: 240000,
    creditUsed: 12000,
    state: 'PR',
    contactName: 'Marcos Vieira',
    email: 'marcos.vieira@vetorferramentas.com.br',
    phone: '41988776655',
    createdAtDaysAgo: 11,
    updatedAtDaysAgo: 11,
  },
  {
    id: 'PART-009',
    cnpjBase: '990011120001',
    companyName: 'Comercial Sul Distribuidora de Suprimentos S.A.',
    tradeName: 'Comercial Sul',
    category: 'DISTRIBUIDOR',
    status: 'HOMOLOGADO',
    creditLimit: 610000,
    creditUsed: 380000,
    state: 'RS',
    contactName: 'Luciana Prado',
    email: 'luciana.prado@comercialsul.com.br',
    phone: '51991336677',
    createdAtDaysAgo: 700,
    updatedAtDaysAgo: 3,
  },
  {
    id: 'PART-010',
    cnpjBase: '101112130001',
    companyName: 'Prisma Tecnologia B2B Ltda',
    tradeName: 'Prisma Tech',
    category: 'CLIENTE_DIRETO',
    status: 'HOMOLOGADO',
    creditLimit: 300000,
    creditUsed: 165000,
    state: 'SP',
    contactName: 'Thiago Barros',
    email: 'thiago.barros@prismatech.com.br',
    phone: '11994667788',
    createdAtDaysAgo: 430,
    updatedAtDaysAgo: 7,
  },
  {
    id: 'PART-011',
    cnpjBase: '121314150001',
    companyName: 'NorteLog Transportes Ltda',
    tradeName: 'NorteLog',
    category: 'DISTRIBUIDOR',
    status: 'EM_ANALISE',
    creditLimit: 130000,
    creditUsed: 8000,
    state: 'RJ',
    contactName: 'Aline Freitas',
    email: 'aline.freitas@nortelog.com.br',
    phone: '21987334411',
    createdAtDaysAgo: 6,
    updatedAtDaysAgo: 6,
  },
  {
    id: 'PART-012',
    cnpjBase: '141516170001',
    companyName: 'Atlas Office Supplies Ltda',
    tradeName: 'Atlas Office',
    category: 'CLIENTE_DIRETO',
    status: 'BLOQUEADO',
    creditLimit: 210000,
    creditUsed: 180000,
    state: 'MG',
    contactName: 'Gustavo Reis',
    email: 'gustavo.reis@atlasoffice.com.br',
    phone: '31993112233',
    statusReason: 'Limite de crédito excedido; aguardando regularização financeira.',
    createdAtDaysAgo: 380,
    updatedAtDaysAgo: 5,
  },
];

const EXTRA_PARTNER_BRANDS = [
  'Aço Norte',
  'Alvorada',
  'Bandeirante',
  'Boreal',
  'Cerrado',
  'Cristal',
  'Delta',
  'Dourada',
  'Esmeralda',
  'Estrela',
  'Florença',
  'Fortaleza',
  'Gaúcha',
  'Guarani',
  'Horizonte',
  'Imperial',
  'Ipê',
  'Jacarandá',
  'Jaguar',
  'Km Zero',
  'Litoral',
  'Lumina',
  'Mercúrio',
  'Monte Verde',
  'Nordeste',
  'Nova Era',
  'Oceânica',
  'Ouro Preto',
  'Pampa',
  'Pioneira',
  'Quartzo',
  'Quinta',
  'Real',
  'Rio Verde',
  'Serra Azul',
  'Solaris',
  'Titan',
  'Tropical',
  'Uberaba',
  'União',
  'Vale',
  'Veneza',
  'Windsor',
  'Xavier',
  'Xingu',
  'Ypiranga',
  'Zênite',
  'Zenith',
  'Aurora',
  'Ápice',
] as const;

const EXTRA_PARTNER_SUFFIXES = [
  'Distribuidora Ltda',
  'Suprimentos S.A.',
  'Comércio B2B Ltda',
  'Logística Integrada Ltda',
  'Soluções Corporativas Ltda',
] as const;

const EXTRA_PARTNER_CATEGORIES: readonly PartnerCategory[] = [
  'FORNECEDOR',
  'DISTRIBUIDOR',
  'CLIENTE_DIRETO',
];

const EXTRA_PARTNER_STATES = ['SP', 'RJ', 'MG', 'PR', 'RS', 'SC', 'BA', 'PE', 'CE', 'GO'] as const;

const EXTRA_PARTNER_AREA_CODES: Record<(typeof EXTRA_PARTNER_STATES)[number], string> = {
  SP: '11',
  RJ: '21',
  MG: '31',
  PR: '41',
  RS: '51',
  SC: '48',
  BA: '71',
  PE: '81',
  CE: '85',
  GO: '62',
};

const EXTRA_PARTNER_CONTACTS = [
  'Ana Beatriz Lima',
  'Carlos Eduardo Prado',
  'Daniela Nogueira',
  'Felipe Andrade',
  'Gabriela Ribeiro',
  'Henrique Barbosa',
  'Isabela Moreira',
  'João Pedro Castro',
  'Larissa Mendes',
  'Rafael Cardoso',
] as const;

const EXTRA_PARTNER_CREDIT_LIMITS = [120000, 180000, 240000, 320000, 450000, 600000] as const;

function partnerSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function buildExtraPartner(index: number): SeedPartner {
  const brand = EXTRA_PARTNER_BRANDS[index];
  const state = EXTRA_PARTNER_STATES[index % EXTRA_PARTNER_STATES.length];
  const status: PartnerStatus =
    index % 7 === 0 ? 'BLOQUEADO' : index % 4 === 0 ? 'EM_ANALISE' : 'HOMOLOGADO';
  const creditLimit = EXTRA_PARTNER_CREDIT_LIMITS[index % EXTRA_PARTNER_CREDIT_LIMITS.length];
  const usage =
    status === 'BLOQUEADO'
      ? 0.9
      : status === 'EM_ANALISE'
        ? 0.05 + (index % 3) * 0.05
        : 0.15 + (index % 7) * 0.1;

  return {
    id: `PART-${String(index + 13).padStart(3, '0')}`,
    cnpjBase: String(170000000000 + (index + 1) * 7919),
    companyName: `${brand} ${EXTRA_PARTNER_SUFFIXES[index % EXTRA_PARTNER_SUFFIXES.length]}`,
    tradeName: brand,
    category: EXTRA_PARTNER_CATEGORIES[index % EXTRA_PARTNER_CATEGORIES.length],
    status,
    creditLimit,
    creditUsed: Math.round(creditLimit * usage),
    state,
    contactName: EXTRA_PARTNER_CONTACTS[index % EXTRA_PARTNER_CONTACTS.length],
    email: `contato@${partnerSlug(brand)}.com.br`,
    phone: `${EXTRA_PARTNER_AREA_CODES[state]}9${String(80000000 + index * 137).padStart(8, '0')}`,
    statusReason:
      status === 'BLOQUEADO'
        ? 'Limite de crédito comprometido; cadastro suspenso para renegociação.'
        : undefined,
    createdAtDaysAgo: 30 + ((index * 17) % 900),
    updatedAtDaysAgo: 1 + ((index * 3) % 25),
  };
}

/** 50 additional deterministic partners for high-volume table testing. */
export const EXTRA_SEED_PARTNERS: readonly SeedPartner[] = EXTRA_PARTNER_BRANDS.map(
  (_, index) => buildExtraPartner(index)
);

export const SEED_PARTNER_COUNT = SEED_PARTNERS.length + EXTRA_SEED_PARTNERS.length;

export const INCOME_DESCRIPTIONS = [
  'Recebimento de fatura B2B',
  'Liquidação de pedido corporativo',
  'Contrato de fornecimento mensal',
  'Venda de lote de suprimentos',
  'Recebimento de cliente distribuidor',
] as const;

export const EXPENSE_DESCRIPTIONS: Record<TransactionType, readonly string[]> = {
  INCOME: INCOME_DESCRIPTIONS,
  EXPENSE: [
    'Pagamento de fornecedor de componentes',
    'Frete e transporte de lote',
    'Recolhimento de impostos',
    'Manutenção preventiva de armazém',
    'Compra de insumos operacionais',
  ],
};

export const AGING_BUCKETS = [
  { id: 'overdue', label: 'Vencidos' },
  { id: 'today', label: 'Vencem hoje' },
  { id: 'next7', label: 'Próximos 7 dias' },
  { id: 'next30', label: 'Próximos 30 dias' },
] as const;
