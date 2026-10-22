import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { B2BPartner, PartnerInput, PartnerStatus } from '@/core/models/partner.model';

const API_URL = '/api/v1/partners';

@Injectable({ providedIn: 'root' })
export class PartnersApi {
  private readonly http = inject(HttpClient);

  list(search?: string): Promise<B2BPartner[]> {
    let params = new HttpParams();
    if (search?.trim()) params = params.set('search', search.trim());
    return firstValueFrom(this.http.get<B2BPartner[]>(API_URL, { params }));
  }

  create(input: PartnerInput): Promise<B2BPartner> {
    return firstValueFrom(this.http.post<B2BPartner>(API_URL, input));
  }

  update(id: string, input: PartnerInput): Promise<B2BPartner> {
    return firstValueFrom(this.http.put<B2BPartner>(`${API_URL}/${id}`, input));
  }

  changeStatus(id: string, status: PartnerStatus, reason?: string): Promise<B2BPartner> {
    return firstValueFrom(
      this.http.patch<B2BPartner>(`${API_URL}/${id}/status`, { status, reason })
    );
  }

  remove(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${API_URL}/${id}`));
  }
}
