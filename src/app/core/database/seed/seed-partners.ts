import type { B2BPartner } from '@/core/models/partner.model';
import { buildCnpj } from '@/shared/utils/cnpj-validator';
import { SEED_PARTNERS } from './catalog';

const DAY = 86_400_000;

export function buildPartners(now: Date = new Date()): B2BPartner[] {
  return SEED_PARTNERS.map((definition) => {
    const createdAt = new Date(now.getTime() - definition.createdAtDaysAgo * DAY).toISOString();
    const updatedAt = new Date(now.getTime() - definition.updatedAtDaysAgo * DAY).toISOString();

    return {
      id: definition.id,
      cnpj: buildCnpj(definition.cnpjBase),
      companyName: definition.companyName,
      tradeName: definition.tradeName,
      category: definition.category,
      status: definition.status,
      creditLimit: definition.creditLimit,
      creditUsed: definition.creditUsed,
      state: definition.state,
      contactName: definition.contactName,
      email: definition.email,
      phone: definition.phone,
      statusReason: definition.statusReason,
      statusUpdatedAt: updatedAt,
      createdAt,
      updatedAt,
    } satisfies B2BPartner;
  });
}
