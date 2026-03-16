import { apiFetch } from '@/lib/api/client';
import type { PartnerDashboard } from '@/lib/api/types';

export function fetchPartnerDashboard() {
  return apiFetch<{ success: true; data: PartnerDashboard }>('/resellers/api/dashboard').then((payload) => ({
    ...payload,
    data: {
      ...payload.data,
      reseller: payload.data.reseller ?? payload.data.partner,
    },
  }));
}

export function loginPartner(email: string, password: string) {
  return apiFetch<{ success: true }>('/resellers/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}
