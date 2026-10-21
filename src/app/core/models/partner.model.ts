export type PartnerCategory = 'FORNECEDOR' | 'CLIENTE_DIRETO' | 'DISTRIBUIDOR';
export type PartnerStatus = 'EM_ANALISE' | 'HOMOLOGADO' | 'BLOQUEADO';

export interface B2BPartner {
  readonly id: string;
  readonly cnpj: string;
  readonly companyName: string;
  readonly tradeName?: string;
  readonly category: PartnerCategory;
  readonly status: PartnerStatus;
  readonly creditLimit: number;
  readonly creditUsed: number;
  readonly state: string;
  readonly contactName?: string;
  readonly email?: string;
  readonly phone?: string;
  readonly statusReason?: string;
  readonly statusUpdatedAt?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

export interface PartnerInput {
  readonly cnpj: string;
  readonly companyName: string;
  readonly tradeName?: string;
  readonly category: PartnerCategory;
  readonly creditLimit: number;
  readonly state: string;
  readonly contactName?: string;
  readonly email?: string;
  readonly phone?: string;
}

export const PARTNER_CATEGORY_LABELS: Record<PartnerCategory, string> = {
  FORNECEDOR: 'Fornecedor',
  CLIENTE_DIRETO: 'Cliente direto',
  DISTRIBUIDOR: 'Distribuidor',
};

export const PARTNER_STATUS_LABELS: Record<PartnerStatus, string> = {
  EM_ANALISE: 'Em análise',
  HOMOLOGADO: 'Homologado',
  BLOQUEADO: 'Bloqueado',
};

export const PARTNER_CATEGORIES: readonly PartnerCategory[] = [
  'FORNECEDOR',
  'CLIENTE_DIRETO',
  'DISTRIBUIDOR',
];

export const PARTNER_STATUSES: readonly PartnerStatus[] = [
  'EM_ANALISE',
  'HOMOLOGADO',
  'BLOQUEADO',
];

export const BRAZILIAN_STATES = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const;

export const PARTNER_STATUS_TRANSITIONS: Record<PartnerStatus, readonly PartnerStatus[]> = {
  EM_ANALISE: ['HOMOLOGADO', 'BLOQUEADO'],
  HOMOLOGADO: ['BLOQUEADO'],
  BLOQUEADO: ['EM_ANALISE'],
};
